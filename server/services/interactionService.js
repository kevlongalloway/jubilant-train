/**
 * Interaction Service
 * Handles recording user interactions and assigning weights.
 * Weights drive the personalized feed scoring algorithm.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Interaction weight map — higher = stronger signal
const INTERACTION_WEIGHTS = {
  like: 2,
  comment: 4,
  save: 6,
  click: 3,
  view: 1,
};

/**
 * Record a user interaction with a post.
 * Uses upsert so repeated views don't inflate counts, but
 * saves/likes are idempotent (only counted once per user/post/type).
 *
 * @param {string} userId
 * @param {string} postId
 * @param {string} type - like | comment | save | click | view
 * @param {number} [dwellMs] - milliseconds spent viewing (for view_time scoring)
 * @returns {Promise<Interaction>}
 */
async function recordInteraction(userId, postId, type, dwellMs = null) {
  if (!INTERACTION_WEIGHTS[type]) {
    throw new Error(`Unknown interaction type: ${type}`);
  }

  // For view interactions, value scales with dwell time (dynamic weight)
  // Capped at 30 seconds to prevent gaming
  let value = INTERACTION_WEIGHTS[type];
  if (type === 'view' && dwellMs != null) {
    const seconds = Math.min(dwellMs / 1000, 30);
    value = Math.round(seconds * 0.05 * 10) / 10; // 0.05 per second
  }

  // Upsert — update value if the interaction already exists (e.g., extended view)
  const interaction = await prisma.interaction.upsert({
    where: { userId_postId_type: { userId, postId, type } },
    update: { value, createdAt: new Date() },
    create: { userId, postId, type, value },
  });

  // Update user ink (reputation) for non-view interactions
  if (type !== 'view' && type !== 'click') {
    await prisma.user.update({
      where: { id: userId },
      data: { ink: { increment: 1 } },
    });
  }

  return interaction;
}

/**
 * Toggle a like/save interaction (idempotent on/off).
 * Returns the new state: { active: boolean }
 */
async function toggleInteraction(userId, postId, type) {
  const existing = await prisma.interaction.findUnique({
    where: { userId_postId_type: { userId, postId, type } },
  });

  if (existing) {
    await prisma.interaction.delete({
      where: { userId_postId_type: { userId, postId, type } },
    });
    return { active: false };
  }

  await recordInteraction(userId, postId, type);
  return { active: true };
}

/**
 * Get aggregated interaction counts for a set of post IDs.
 * Returns a map of postId -> { likes, comments, saves, views }
 */
async function getPostInteractionCounts(postIds) {
  if (!postIds.length) return {};

  const [rows, commentRows] = await Promise.all([
    prisma.interaction.groupBy({
      by: ['postId', 'type'],
      where: { postId: { in: postIds } },
      _count: { id: true },
      _sum: { value: true },
    }),
    // Use actual Comment table for accurate comment count
    prisma.comment.groupBy({
      by: ['postId'],
      where: { postId: { in: postIds } },
      _count: { id: true },
    }),
  ]);

  const counts = {};
  for (const row of rows) {
    if (!counts[row.postId]) {
      counts[row.postId] = { likes: 0, comments: 0, saves: 0, views: 0, clicks: 0, engagementScore: 0 };
    }
    if (row.type !== 'comment') { // comment count comes from Comment table
      counts[row.postId][row.type + 's'] = row._count.id;
    }
    counts[row.postId].engagementScore += (row._sum.value || 0);
  }

  // Override with real comment counts
  for (const row of commentRows) {
    if (!counts[row.postId]) {
      counts[row.postId] = { likes: 0, comments: 0, saves: 0, views: 0, clicks: 0, engagementScore: 0 };
    }
    counts[row.postId].comments = row._count.id;
  }

  return counts;
}

/**
 * Get which of a set of posts the user has already interacted with.
 * Returns a map of postId -> Set<type>
 */
async function getUserInteractionMap(userId, postIds) {
  if (!postIds.length) return {};

  const interactions = await prisma.interaction.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true, type: true },
  });

  const map = {};
  for (const i of interactions) {
    if (!map[i.postId]) map[i.postId] = new Set();
    map[i.postId].add(i.type);
  }
  return map;
}

module.exports = {
  recordInteraction,
  toggleInteraction,
  getPostInteractionCounts,
  getUserInteractionMap,
  INTERACTION_WEIGHTS,
};
