/**
 * Preference Builder — Background Job
 *
 * Runs hourly (via node-cron in index.js) to rebuild user preference vectors.
 *
 * Algorithm:
 * 1. For each active user (interacted in last 30 days):
 * 2. Load all their interactions + associated book genres
 * 3. Weight each genre by interaction weights (save=6, comment=4, like=2, click=3, view=1)
 * 4. Normalize vector to [0, 1] range
 * 5. Store in user_preferences table
 *
 * Result: { "fantasy": 0.8, "literary fiction": 0.6, "romance": 0.2 }
 */

const { PrismaClient } = require('@prisma/client');
const { INTERACTION_WEIGHTS } = require('../services/interactionService');

const prisma = new PrismaClient();

/**
 * Build preference vector for a single user.
 *
 * @param {string} userId
 * @returns {Promise<object>} - Normalized genre preference vector
 */
async function buildUserPreferenceVector(userId) {
  // Get all user interactions with books (via post -> book join)
  const interactions = await prisma.interaction.findMany({
    where: { userId },
    include: {
      post: {
        include: {
          book: { select: { genres: true } },
        },
      },
    },
  });

  // Accumulate weighted genre scores
  const genreScores = {};

  for (const interaction of interactions) {
    const book = interaction.post?.book;
    if (!book || !book.genres || book.genres.length === 0) continue;

    // Weight for this interaction type
    const weight = INTERACTION_WEIGHTS[interaction.type] || 1;

    // Distribute weight evenly across all genres of the book
    const perGenreWeight = weight / book.genres.length;

    for (const genre of book.genres) {
      const key = genre.toLowerCase();
      genreScores[key] = (genreScores[key] || 0) + perGenreWeight;
    }
  }

  if (Object.keys(genreScores).length === 0) return {};

  // Normalize: divide by max value so all values are in [0, 1]
  const maxScore = Math.max(...Object.values(genreScores));
  const normalized = {};
  for (const [genre, score] of Object.entries(genreScores)) {
    normalized[genre] = Math.round((score / maxScore) * 100) / 100;
  }

  return normalized;
}

/**
 * Run the preference builder for all recently active users.
 * "Recently active" = interacted in the last 30 days.
 */
async function runPreferenceBuilder() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Find users who have been active recently
  const activeUsers = await prisma.interaction.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { userId: true },
    distinct: ['userId'],
  });

  if (activeUsers.length === 0) {
    console.log('[preferenceBuilder] No active users found.');
    return;
  }

  console.log(`[preferenceBuilder] Building vectors for ${activeUsers.length} active users...`);

  let updated = 0;
  for (const { userId } of activeUsers) {
    try {
      const vector = await buildUserPreferenceVector(userId);

      await prisma.userPreference.upsert({
        where: { userId },
        update: { preferenceVector: vector },
        create: { userId, preferenceVector: vector },
      });

      updated++;
    } catch (err) {
      console.error(`[preferenceBuilder] Error for user ${userId}:`, err.message);
    }
  }

  console.log(`[preferenceBuilder] Updated ${updated}/${activeUsers.length} user vectors.`);
}

/**
 * Build preference vector for a single user immediately.
 * Called after significant interactions to keep the vector fresh.
 *
 * @param {string} userId
 */
async function refreshUserPreference(userId) {
  const vector = await buildUserPreferenceVector(userId);
  await prisma.userPreference.upsert({
    where: { userId },
    update: { preferenceVector: vector },
    create: { userId, preferenceVector: vector },
  });
  return vector;
}

module.exports = { runPreferenceBuilder, refreshUserPreference, buildUserPreferenceVector };
