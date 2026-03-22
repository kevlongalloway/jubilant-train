/**
 * Auth routes: register, login, me
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, handle, email, password, lens } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    // Ensure handle is set
    const userHandle = handle || `@${username.toLowerCase().replace(/\s+/g, '_')}`;

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        handle: userHandle,
        email: email.toLowerCase(),
        password: hashed,
        lens: lens || 'explorer',
      },
      select: { id: true, username: true, handle: true, email: true, lens: true, ink: true, createdAt: true },
    });

    // Bootstrap empty preference vector
    await prisma.userPreference.create({
      data: { userId: user.id, preferenceVector: {} },
    });

    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Username, handle, or email already taken' });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { password: _, ...safeUser } = user;
    const token = signToken(safeUser);
    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — return current user
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, username: true, handle: true, email: true,
        lens: true, ink: true, bio: true, createdAt: true,
        _count: { select: { posts: true, followers: true, following: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/me — update own profile (username / bio)
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { username, bio } = req.body;
    const data = {};
    if (typeof username === 'string' && username.trim()) data.username = username.trim().slice(0, 40);
    if (typeof bio === 'string') data.bio = bio.trim().slice(0, 200);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, username: true, handle: true, email: true, lens: true, ink: true, bio: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
