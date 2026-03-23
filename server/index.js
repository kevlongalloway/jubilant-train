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
const usersRoutes = require('./routes/users');
const commentsRoutes = require('./routes/comments');
const { runPreferenceBuilder } = require('./jobs/preferenceBuilder');
const { topUpRecentContent } = require('./prisma/seed');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static Frontend (production) ────────────────────────────
// Must be registered BEFORE cors() middleware.
// Vite's build adds `crossorigin` to <script> tags, which forces CORS mode —
// the browser sends an Origin header even for same-origin asset requests.
// If cors() runs first and the production host isn't in allowedOrigins, Express
// returns a 500, so Safari receives JSON instead of JS and shows "Script error."
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// ─── CORS (API routes only) ───────────────────────────────────
// origin: true reflects the request's Origin header back, which works for
// both localhost dev and the production Render domain without hard-coding URLs.
app.use(cors({ origin: true, credentials: true }));

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/interact', interactRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', commentsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Background Jobs ──────────────────────────────────────────
cron.schedule('0 * * * *', async () => {
  console.log('[cron] Running preference builder...');
  try {
    await runPreferenceBuilder();
    console.log('[cron] Preference builder complete.');
  } catch (err) {
    console.error('[cron] Preference builder error:', err.message);
  }
});

// Daily content top-up: ensures fresh posts exist so new users see an active feed.
cron.schedule('0 6 * * *', async () => {
  try { await topUpRecentContent(); } catch (err) {
    console.error('[cron] Content top-up error:', err.message);
  }
});

// ─── Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[precis] Server running on port ${PORT}`);
  console.log(`[precis] ENV: ${process.env.NODE_ENV || 'development'}`);
  // Ensure the feed has recent posts on every cold start
  try { await topUpRecentContent(); } catch (err) {
    console.error('[startup] Content top-up error:', err.message);
  }
});
