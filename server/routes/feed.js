/**
 * Feed routes
 * GET /api/feed — personalized paginated feed (requires auth)
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { generateFeed } = require('../services/feedService');

const router = express.Router();

// GET /api/feed?cursor=<ISO_TIMESTAMP>&limit=<number>&exclude=<id1,id2,...>
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const cursor = req.query.cursor || null;
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    // Post IDs the client has already shown — excluded from candidates on refresh
    const excludeIds = req.query.exclude
      ? req.query.exclude.split(',').filter(id => id.length > 10)
      : [];

    const feed = await generateFeed(req.user.id, cursor, limit, excludeIds);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
