/**
 * Recommendation Service
 * Provides "because you liked X" and collaborative filtering suggestions.
 *
 * Algorithms:
 * 1. Genre-based: recommend posts/books in genres user engages with
 * 2. Collaborative filtering: users who liked X also liked Y
 * 3. Trending: high-velocity engagement in last 24h
 */

const { PrismaClient } = require('@prisma/client');
const { cosineSimilarity } = require('./feedService');

const prisma = new PrismaClient();

/**
 * Get "Because you liked X" explanations for a user's feed.
 * Finds the user's strongest genre preferences and maps them to recent saves/likes.
 *
 * @param {string} userId
 * @returns {Promise<Array<{ reason: string, postId: string }>>}
 */
async function getBecauseYouLiked(userId) {
  // Get user's top interactions (saves and likes = strongest signals)
  const topInteractions = await prisma.interaction.findMany({
    where: { userId, type: { in: ['save', 'like'] } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { post: { include: { book: true } } },
  });

  const reasons = [];
  for (const interaction of topInteractions) {
    const book = interaction.post?.book;
    if (book) {
      reasons.push({
        reason: `Because you ${interaction.type}d "${book.title}"`,
        sourceBookTitle: book.title,
        genres: book.genres,
      });
    }
  }

  return reasons;
}

/**
 * Collaborative filtering: Users who liked post X also liked post Y.
 * Finds posts highly correlated with the user's liked content.
 *
 * Simple approach:
 * 1. Get posts the current user liked/saved
 * 2. Find other users who also liked those posts ("neighbors")
 * 3. Return what those neighbors liked that the current user hasn't seen
 *
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<string[]>} - Array of post IDs
 */
async function getCollaborativeRecommendations(userId, limit = 20) {
  // Step 1: Posts this user liked or saved
  const userLiked = await prisma.interaction.findMany({
    where: { userId, type: { in: ['like', 'save'] } },
    select: { postId: true },
    take: 50,
  });

  const likedPostIds = userLiked.map(i => i.postId);
  if (likedPostIds.length === 0) return [];

  // Step 2: Other users who liked the same posts (neighbors)
  const neighbors = await prisma.interaction.findMany({
    where: {
      postId: { in: likedPostIds },
      type: { in: ['like', 'save'] },
      userId: { not: userId },
    },
    select: { userId: true },
    distinct: ['userId'],
    take: 50,
  });

  const neighborIds = neighbors.map(n => n.userId);
  if (neighborIds.length === 0) return [];

  // Step 3: Posts those neighbors liked that this user hasn't seen
  const neighborLiked = await prisma.interaction.findMany({
    where: {
      userId: { in: neighborIds },
      type: { in: ['like', 'save'] },
      postId: { notIn: likedPostIds }, // Exclude already-liked posts
    },
    select: { postId: true },
    // Count frequency to find most commonly liked by neighbors
    orderBy: { createdAt: 'desc' },
    take: limit * 3,
  });

  // Count frequency (most neighbors liked = higher rank)
  const freq = {};
  for (const item of neighborLiked) {
    freq[item.postId] = (freq[item.postId] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([postId]) => postId);
}

/**
 * Get trending posts based on recent engagement velocity.
 * "Trending" = high interactions per hour in last 24 hours.
 *
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getTrending(limit = 10) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get posts with the most interactions in last 24h
  const trending = await prisma.interaction.groupBy({
    by: ['postId'],
    where: { createdAt: { gte: oneDayAgo } },
    _count: { id: true },
    _sum: { value: true },
    orderBy: { _sum: { value: 'desc' } },
    take: limit,
  });

  if (trending.length === 0) return [];

  const postIds = trending.map(t => t.postId);
  const posts = await prisma.post.findMany({
    where: { id: { in: postIds } },
    include: {
      user: { select: { id: true, username: true, handle: true, lens: true } },
      book: true,
    },
  });

  // Sort to match trending order
  const postMap = Object.fromEntries(posts.map(p => [p.id, p]));
  return trending
    .map(t => ({
      post: postMap[t.postId],
      engagementScore: t._sum.value || 0,
      interactionCount: t._count.id,
    }))
    .filter(t => t.post != null);
}

/**
 * Find books similar to a given book based on shared genre overlap.
 * Uses cosine similarity on genre vectors.
 *
 * @param {string} bookId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getSimilarBooks(bookId, limit = 5) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return [];

  // Build genre vector for source book
  const sourceVector = {};
  for (const genre of book.genres) {
    sourceVector[genre.toLowerCase()] = 1 / book.genres.length;
  }

  // Get all other books and compute similarity
  const allBooks = await prisma.book.findMany({
    where: { id: { not: bookId } },
    take: 200,
  });

  const withSimilarity = allBooks.map(b => ({
    book: b,
    similarity: cosineSimilarity(sourceVector, b.genres),
  }));

  return withSimilarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(s => s.book);
}

module.exports = {
  getBecauseYouLiked,
  getCollaborativeRecommendations,
  getTrending,
  getSimilarBooks,
};
