/**
 * Feed Service — Personalized Feed Generation Pipeline
 *
 * Pipeline:
 * 1. Candidate Generation (~300-500 posts from multiple sources)
 * 2. Scoring (engagement + user affinity + freshness decay)
 * 3. Ranking & Diversity filtering
 * 4. Cursor-based pagination
 */

const { PrismaClient } = require('@prisma/client');
const { getPostInteractionCounts, getUserInteractionMap } = require('./interactionService');

const prisma = new PrismaClient();

// ─── Constants ────────────────────────────────────────────────

const CANDIDATE_LIMIT = 400;    // Max candidates to score
const FEED_PAGE_SIZE = 20;      // Posts per page
const FRESHNESS_LAMBDA = 0.05;  // Decay rate (higher = older posts penalized more)
const MAX_SAME_GENRE = 3;       // Max consecutive posts from same genre (diversity)
const MAX_SAME_AUTHOR = 2;      // Max posts from same author per page

// ─── Scoring Functions ────────────────────────────────────────

/**
 * Compute raw engagement score for a post.
 * score = (likes × 2) + (comments × 4) + (saves × 6) + (engagementScore × 0.05)
 */
function computeEngagementScore(counts) {
  const { likes = 0, comments = 0, saves = 0, engagementScore = 0 } = counts;
  return (likes * 2) + (comments * 4) + (saves * 6) + (engagementScore * 0.05);
}

/**
 * Freshness decay using exponential decay.
 * decay = e^(-lambda * hoursOld)
 * Posts older than 7 days get near-zero score.
 */
function computeFreshnessDecay(createdAt) {
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.exp(-FRESHNESS_LAMBDA * hoursOld);
}

/**
 * Cosine similarity between user preference vector and post genre vector.
 * Both are objects like { fantasy: 0.8, romance: 0.2 }.
 * Returns 0-1 (0 = no overlap, 1 = perfect match).
 */
function cosineSimilarity(userVector, postGenres) {
  if (!postGenres || postGenres.length === 0) return 0.5; // Neutral affinity

  // Build post genre vector (uniform distribution across genres)
  const postVector = {};
  for (const genre of postGenres) {
    postVector[genre.toLowerCase()] = 1 / postGenres.length;
  }

  // Compute dot product and magnitudes
  const allKeys = new Set([...Object.keys(userVector), ...Object.keys(postVector)]);
  let dotProduct = 0;
  let userMag = 0;
  let postMag = 0;

  for (const key of allKeys) {
    const u = userVector[key] || 0;
    const p = postVector[key] || 0;
    dotProduct += u * p;
    userMag += u * u;
    postMag += p * p;
  }

  const magnitude = Math.sqrt(userMag) * Math.sqrt(postMag);
  if (magnitude === 0) return 0.5; // No preference data yet — neutral

  return dotProduct / magnitude;
}

/**
 * Final score combining engagement, affinity, and freshness.
 * finalScore = engagementScore × userAffinity × freshnessDecay
 *
 * Affinity is boosted for followed users and trending posts.
 */
function computeFinalScore(post, counts, userVector, followedIds, freshnessDecay) {
  const engagement = computeEngagementScore(counts);

  // Get genres from the associated book (if any)
  const genres = post.book?.genres || [];
  const affinity = cosineSimilarity(userVector, genres);

  // Boost posts from followed users
  const followBoost = followedIds.has(post.userId) ? 1.5 : 1.0;

  // Minimum score so all posts have some chance
  const baseScore = Math.max(engagement, 1);

  return baseScore * affinity * freshnessDecay * followBoost;
}

// ─── Candidate Generation ────────────────────────────────────

/**
 * Gather candidate posts from multiple sources.
 * Returns up to CANDIDATE_LIMIT posts.
 */
async function getCandidates(userId, followedIds) {
  const followedArray = [...followedIds];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Run 3 candidate queries in parallel for speed
  const [recentPosts, followedPosts, trendingPosts] = await Promise.all([
    // 1. Recent posts from all users (last 7 days)
    prisma.post.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, userId: { not: userId } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, username: true, handle: true, lens: true, ink: true } }, book: true },
    }),

    // 2. Posts from followed users (regardless of age)
    followedArray.length > 0
      ? prisma.post.findMany({
          where: { userId: { in: followedArray } },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { user: { select: { id: true, username: true, handle: true, lens: true, ink: true } }, book: true },
        })
      : Promise.resolve([]),

    // 3. Trending posts: high total interaction counts (join via subquery)
    prisma.post.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        userId: { not: userId },
        interactions: { some: {} }, // Has at least one interaction
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { id: true, username: true, handle: true, lens: true, ink: true } }, book: true },
    }),
  ]);

  // Deduplicate by post ID
  const seen = new Set();
  const candidates = [];
  for (const post of [...followedPosts, ...trendingPosts, ...recentPosts]) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      candidates.push(post);
      if (candidates.length >= CANDIDATE_LIMIT) break;
    }
  }

  return candidates;
}

// ─── Main Feed Generator ─────────────────────────────────────

/**
 * Generate a personalized feed for a user.
 *
 * @param {string} userId
 * @param {string|null} cursor - ISO timestamp for cursor-based pagination
 * @param {number} limit - Items per page
 * @returns {{ posts: ScoredPost[], nextCursor: string|null }}
 */
async function generateFeed(userId, cursor = null, limit = FEED_PAGE_SIZE) {
  // 1. Load user context in parallel
  const [userPreference, follows, seenPostIds] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    // Posts the user has already seen (viewed or clicked in last 48h)
    prisma.interaction.findMany({
      where: {
        userId,
        type: { in: ['view', 'click'] },
        createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      select: { postId: true },
    }),
  ]);

  const userVector = (userPreference?.preferenceVector) || {};
  const followedIds = new Set(follows.map(f => f.followingId));
  const seenIds = new Set(seenPostIds.map(s => s.postId));

  // 2. Get candidate posts
  const candidates = await getCandidates(userId, followedIds);

  if (candidates.length === 0) {
    return { posts: [], nextCursor: null };
  }

  // 3. Get interaction counts for all candidates at once (single DB query)
  const candidateIds = candidates.map(p => p.id);
  const [interactionCounts, userInteractionMap] = await Promise.all([
    getPostInteractionCounts(candidateIds),
    getUserInteractionMap(userId, candidateIds),
  ]);

  // 4. Score all candidates
  const scored = candidates.map(post => {
    const counts = interactionCounts[post.id] || {};
    const decay = computeFreshnessDecay(post.createdAt);
    const score = computeFinalScore(post, counts, userVector, followedIds, decay);

    return {
      post,
      score,
      counts,
      userInteractions: userInteractionMap[post.id] || new Set(),
      alreadySeen: seenIds.has(post.id),
    };
  });

  // 5. Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 6. Apply cursor (skip posts before cursor timestamp)
  let filtered = scored;
  if (cursor) {
    const cursorTime = new Date(cursor).getTime();
    filtered = scored.filter(s => new Date(s.post.createdAt).getTime() < cursorTime);
  }

  // 7. Diversity filter — no genre spam, no author spam
  //    Slightly downrank already-seen posts (don't fully remove them)
  const result = [];
  const genreCounts = {};
  const authorCounts = {};

  for (const item of filtered) {
    if (result.length >= limit) break;

    const { post } = item;
    const genres = post.book?.genres || ['unknown'];
    const authorId = post.userId;

    // Check genre diversity
    const genreKey = genres[0] || 'unknown';
    if ((genreCounts[genreKey] || 0) >= MAX_SAME_GENRE) continue;

    // Check author diversity
    if ((authorCounts[authorId] || 0) >= MAX_SAME_AUTHOR) continue;

    // Slightly reduce score for already-seen posts (they appear lower)
    const adjustedScore = item.alreadySeen ? item.score * 0.3 : item.score;

    genreCounts[genreKey] = (genreCounts[genreKey] || 0) + 1;
    authorCounts[authorId] = (authorCounts[authorId] || 0) + 1;

    result.push({
      ...formatPost(post, item.counts, item.userInteractions),
      _score: adjustedScore,
    });
  }

  // 8. Compute next cursor from the last post's createdAt
  const nextCursor = result.length === limit
    ? result[result.length - 1].createdAt
    : null;

  return { posts: result, nextCursor };
}

/**
 * Format a raw Prisma post into clean API response shape.
 */
function formatPost(post, counts, userInteractions) {
  const ui = userInteractions instanceof Set ? userInteractions : new Set(userInteractions);
  return {
    id: post.id,
    type: post.type,
    content: post.content,
    tags: post.tags,
    createdAt: post.createdAt,
    user: post.user,
    book: post.book
      ? {
          id: post.book.id,
          title: post.book.title,
          author: post.book.author,
          genres: post.book.genres,
          metadata: post.book.metadata,
        }
      : null,
    // Engagement counts
    likes: counts.likes || 0,
    comments: counts.comments || 0,
    saves: counts.saves || 0,
    views: counts.views || 0,
    // Current user's interaction state
    isLiked: ui.has('like'),
    isSaved: ui.has('save'),
  };
}

module.exports = { generateFeed, formatPost, computeEngagementScore, cosineSimilarity };
