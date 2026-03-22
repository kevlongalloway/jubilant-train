/**
 * Users routes: public profile lookup + follow/unfollow
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users/:id — public profile with counts + isFollowing
router.get('/:id', optionalAuth, async (req, res, next) => {
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

    // Books read = distinct books the user has referenced across all posts
    const distinctBooks = await prisma.post.groupBy({
      by: ['bookId'],
      where: { userId: user.id, bookId: { not: null } },
    });

    // Whether the requesting user is already following this profile
    const isFollowing = req.user
      ? !!(await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: req.user.id,
              followingId: user.id,
            },
          },
        }))
      : false;

    res.json({ ...user, booksRead: distinctBooks.length, isFollowing });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:id/follow — toggle follow / unfollow
router.post('/:id/follow', requireAuth, async (req, res, next) => {
  try {
    const targetId = req.params.id;

    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const key = { followerId: req.user.id, followingId: targetId };
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: key },
    });

    if (existing) {
      await prisma.follow.delete({ where: { followerId_followingId: key } });
      res.json({ following: false });
    } else {
      await prisma.follow.create({ data: key });
      res.json({ following: true });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
