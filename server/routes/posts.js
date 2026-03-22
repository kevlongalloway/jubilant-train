/**
 * Posts routes
 * GET  /api/posts           — list posts (with optional filters)
 * POST /api/posts           — create a post
 * GET  /api/posts/:id       — single post
 * DELETE /api/posts/:id     — delete own post
 * GET  /api/posts/trending  — trending posts
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getPostInteractionCounts, getUserInteractionMap } = require('../services/interactionService');
const { getTrending } = require('../services/recommendationService');
const { formatPost } = require('../services/feedService');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/posts/trending
router.get('/trending', async (req, res, next) => {
  try {
    const trending = await getTrending(parseInt(req.query.limit || '10', 10));
    res.json(trending);
  } catch (err) {
    next(err);
  }
});

// GET /api/posts?userId=&type=&bookId=&q=&limit=&cursor=
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { userId, type, bookId, q, limit = '20', cursor } = req.query;
    const take = Math.min(parseInt(limit, 10), 50);

    const where = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (bookId) where.bookId = bookId;
    if (cursor) where.createdAt = { lt: new Date(cursor) };
    if (q) {
      where.OR = [
        { content: { contains: q, mode: 'insensitive' } },
        { book: { title: { contains: q, mode: 'insensitive' } } },
        { book: { author: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const posts = await prisma.post.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, handle: true, lens: true, ink: true } },
        book: true,
      },
    });

    const postIds = posts.map(p => p.id);
    const [counts, userInteractions] = await Promise.all([
      getPostInteractionCounts(postIds),
      req.user ? getUserInteractionMap(req.user.id, postIds) : Promise.resolve({}),
    ]);

    const formatted = posts.map(p =>
      formatPost(p, counts[p.id] || {}, userInteractions[p.id] || new Set())
    );

    const nextCursor = posts.length === take ? posts[posts.length - 1].createdAt : null;
    res.json({ posts: formatted, nextCursor });
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:id
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, username: true, handle: true, lens: true, ink: true } },
        book: true,
      },
    });

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const [counts, userInteractions] = await Promise.all([
      getPostInteractionCounts([post.id]),
      req.user ? getUserInteractionMap(req.user.id, [post.id]) : Promise.resolve({}),
    ]);

    res.json(formatPost(post, counts[post.id] || {}, userInteractions[post.id] || new Set()));
  } catch (err) {
    next(err);
  }
});

// POST /api/posts
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { content, type = 'original', bookId, bookTitle, bookAuthor, tags = [] } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'content is required' });
    }

    // Resolve bookId — accept either an explicit id or title+author (find-or-create)
    let resolvedBookId = bookId || null;
    if (!resolvedBookId && bookTitle) {
      let book = await prisma.book.findFirst({
        where: { title: { equals: bookTitle, mode: 'insensitive' } },
      });
      if (!book) {
        book = await prisma.book.create({
          data: { title: bookTitle, author: bookAuthor || 'Unknown', genres: [], metadata: {} },
        });
      }
      resolvedBookId = book.id;
    }

    // Validate bookId if provided directly
    if (bookId && !resolvedBookId) {
      const book = await prisma.book.findUnique({ where: { id: bookId } });
      if (!book) return res.status(404).json({ error: 'Book not found' });
    }

    const post = await prisma.post.create({
      data: {
        userId: req.user.id,
        content: content.trim(),
        type,
        bookId: resolvedBookId,
        tags: Array.isArray(tags) ? tags : [],
      },
      include: {
        user: { select: { id: true, username: true, handle: true, lens: true, ink: true } },
        book: true,
      },
    });

    // Increment ink for posting
    await prisma.user.update({
      where: { id: req.user.id },
      data: { ink: { increment: 5 } },
    });

    res.status(201).json(formatPost(post, {}, new Set()));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await prisma.post.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
