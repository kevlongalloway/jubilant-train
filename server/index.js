/**
 * Précis API — Express entry point
 * Serves both the REST API (/api/*) and the built React frontend (static files).
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const feedRoutes = require('./routes/feed');
const interactRoutes = require('./routes/interact');
const booksRoutes = require('./routes/books');
const postsRoutes = require('./routes/posts');
const { runPreferenceBuilder } = require('./jobs/preferenceBuilder');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS — allow same origin (frontend served from here) and local dev
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3001',
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/interact', interactRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/posts', postsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Static Frontend (production) ────────────────────────────
// The React app is built into ../dist by `npm run build` in root
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Background Jobs ──────────────────────────────────────────
// Run preference builder every hour to keep user vectors fresh
cron.schedule('0 * * * *', async () => {
  console.log('[cron] Running preference builder...');
  try {
    await runPreferenceBuilder();
    console.log('[cron] Preference builder complete.');
  } catch (err) {
    console.error('[cron] Preference builder error:', err.message);
  }
});

// ─── Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[precis] Server running on port ${PORT}`);
  console.log(`[precis] ENV: ${process.env.NODE_ENV || 'development'}`);
});
