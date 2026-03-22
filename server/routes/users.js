/**
 * Users routes: public profile lookup
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users/:id — public profile with counts
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        handle: true,
        bio: true,
        lens: true,
        ink: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Books read = distinct books the user has referenced in any post
    const distinctBooks = await prisma.post.groupBy({
      by: ['bookId'],
      where: { userId: user.id, bookId: { not: null } },
    });

    res.json({ ...user, booksRead: distinctBooks.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
