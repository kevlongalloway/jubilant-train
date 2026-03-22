/**
 * Comments routes
 * GET  /api/posts/:postId/comments        — fetch top-level comments + replies
 * POST /api/posts/:postId/comments        — add a comment (parentId for reply)
 * POST /api/comments/:commentId/like      — toggle like on a comment
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const userSelect = { id: true, username: true, handle: true, lens: true, ink: true };

function formatComment(c, likedIds = new Set()) {
  return {
    id: c.id,
    content: c.content,
    createdAt: c.createdAt,
    likes: c.likes?.length ?? 0,
    isLiked: likedIds.has(c.id),
    user: c.user,
    replies: (c.replies || []).map(r => formatComment(r, likedIds)),
  };
}

// GET /api/posts/:postId/comments
router.get('/posts/:postId/comments', optionalAuth, async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.postId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: userSelect },
        likes: { select: { userId: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: userSelect },
            likes: { select: { userId: true } },
          },
        },
      },
    });

    // Collect all comment IDs the current user has liked
    const likedIds = new Set();
    if (req.user) {
      const commentIds = [
        ...comments.map(c => c.id),
        ...comments.flatMap(c => c.replies.map(r => r.id)),
      ];
      const liked = await prisma.commentLike.findMany({
        where: { userId: req.user.id, commentId: { in: commentIds } },
        select: { commentId: true },
      });
      liked.forEach(l => likedIds.add(l.commentId));
    }

    res.json(comments.map(c => formatComment(c, likedIds)));
  } catch (err) {
    next(err);
  }
});

// POST /api/posts/:postId/comments — create a comment or reply
router.post('/posts/:postId/comments', requireAuth, async (req, res, next) => {
  try {
    const { content, parentId } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

    // Validate post exists
    const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // If reply, validate parent belongs to this post
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.postId !== req.params.postId) {
        return res.status(400).json({ error: 'Invalid parentId' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        postId: req.params.postId,
        userId: req.user.id,
        parentId: parentId || null,
        content: content.trim(),
      },
      include: {
        user: { select: userSelect },
        likes: { select: { userId: true } },
        replies: true,
      },
    });

    // Award ink for engaging
    await prisma.user.update({
      where: { id: req.user.id },
      data: { ink: { increment: 2 } },
    });

    res.status(201).json(formatComment(comment, new Set()));
  } catch (err) {
    next(err);
  }
});

// POST /api/comments/:commentId/like — toggle like
router.post('/comments/:commentId/like', requireAuth, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const existing = await prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existing) {
      await prisma.commentLike.delete({ where: { commentId_userId: { commentId, userId } } });
      const count = await prisma.commentLike.count({ where: { commentId } });
      res.json({ liked: false, likes: count });
    } else {
      await prisma.commentLike.create({ data: { commentId, userId } });
      const count = await prisma.commentLike.count({ where: { commentId } });
      res.json({ liked: true, likes: count });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
