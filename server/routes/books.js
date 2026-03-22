/**
 * Books routes
 * GET  /api/books           — list/search books
 * GET  /api/books/:id       — single book with posts
 * POST /api/books           — create book (admin or seeding)
 * GET  /api/books/:id/similar — similar books (collaborative)
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getSimilarBooks } = require('../services/recommendationService');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/books?q=&genre=&limit=&cursor=
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { q, genre, limit = '20', cursor } = req.query;
    const take = Math.min(parseInt(limit, 10), 100);

    const where = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { author: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (genre) {
      where.genres = { has: genre };
    }

    const books = await prisma.book.findMany({
      where,
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { title: 'asc' },
      include: { _count: { select: { posts: true } } },
    });

    const nextCursor = books.length === take ? books[books.length - 1].id : null;
    res.json({ books, nextCursor });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      include: {
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: { select: { id: true, username: true, handle: true, lens: true, ink: true } },
            _count: { select: { interactions: true } },
          },
        },
        _count: { select: { posts: true } },
      },
    });

    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id/similar
router.get('/:id/similar', async (req, res, next) => {
  try {
    const similar = await getSimilarBooks(req.params.id, 5);
    res.json(similar);
  } catch (err) {
    next(err);
  }
});

// POST /api/books — create a book
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, author, genres = [], metadata = {} } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'title and author are required' });
    }

    const book = await prisma.book.create({
      data: { title, author, genres, metadata },
    });
    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
