/**
 * Interaction routes
 * POST /api/interact       — record any interaction
 * POST /api/interact/toggle — toggle like/save
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { recordInteraction, toggleInteraction } = require('../services/interactionService');

const router = express.Router();

// POST /api/interact
// Body: { postId, type, dwellMs? }
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { postId, type, dwellMs } = req.body;

    if (!postId || !type) {
      return res.status(400).json({ error: 'postId and type are required' });
    }

    const interaction = await recordInteraction(req.user.id, postId, type, dwellMs);
    res.status(201).json(interaction);
  } catch (err) {
    if (err.message.startsWith('Unknown interaction type')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/interact/toggle
// Body: { postId, type } — toggles like or save on/off
router.post('/toggle', requireAuth, async (req, res, next) => {
  try {
    const { postId, type } = req.body;

    if (!postId || !type) {
      return res.status(400).json({ error: 'postId and type are required' });
    }

    const allowed = ['like', 'save'];
    if (!allowed.includes(type)) {
      return res.status(400).json({ error: `Toggle only supports: ${allowed.join(', ')}` });
    }

    const result = await toggleInteraction(req.user.id, postId, type);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
