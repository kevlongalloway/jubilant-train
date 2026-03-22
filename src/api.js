/**
 * Précis API Client
 * Thin wrapper around fetch for all backend API calls.
 * Handles auth tokens, cursor pagination, and error normalization.
 */

// In production, API is served from the same origin.
// In dev, Vite proxies /api -> localhost:3001 (see vite.config.js).
const BASE = '/api';

// ─── Token Management ─────────────────────────────────────────

export function getToken() {
  return localStorage.getItem('precis_token');
}

export function setToken(token) {
  localStorage.setItem('precis_token', token);
}

export function clearToken() {
  localStorage.removeItem('precis_token');
  localStorage.removeItem('precis_user');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('precis_user') || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem('precis_user', JSON.stringify(user));
}

// ─── Core Fetch ───────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || `API error ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

// ─── Auth ─────────────────────────────────────────────────────

export async function register({ username, handle, email, password, lens }) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, handle, email, password, lens }),
  });
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function login({ email, password }) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function getMe() {
  return apiFetch('/auth/me');
}

export async function getUser(userId) {
  return apiFetch(`/users/${userId}`);
}

// ─── Feed ─────────────────────────────────────────────────────

/**
 * Fetch the personalized feed for the current user.
 * @param {string|null} cursor - ISO timestamp for pagination
 * @param {number} limit
 */
export async function getFeed(cursor = null, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return apiFetch(`/feed?${params}`);
}

// ─── Posts ────────────────────────────────────────────────────

export async function getPosts({ userId, type, bookId, cursor, limit = 20 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (userId) params.set('userId', userId);
  if (type) params.set('type', type);
  if (bookId) params.set('bookId', bookId);
  if (cursor) params.set('cursor', cursor);
  return apiFetch(`/posts?${params}`);
}

export async function createPost({ content, type, bookId, tags }) {
  return apiFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({ content, type, bookId, tags }),
  });
}

export async function deletePost(postId) {
  return apiFetch(`/posts/${postId}`, { method: 'DELETE' });
}

export async function getTrendingPosts(limit = 10) {
  return apiFetch(`/posts/trending?limit=${limit}`);
}

// ─── Interactions ─────────────────────────────────────────────

/**
 * Record an interaction (click, view, comment).
 * @param {string} postId
 * @param {string} type - like | save | click | view | comment
 * @param {number} [dwellMs] - time spent viewing in ms
 */
export async function recordInteraction(postId, type, dwellMs = null) {
  return apiFetch('/interact', {
    method: 'POST',
    body: JSON.stringify({ postId, type, ...(dwellMs != null ? { dwellMs } : {}) }),
  });
}

/**
 * Toggle like or save (returns { active: boolean }).
 */
export async function toggleInteraction(postId, type) {
  return apiFetch('/interact/toggle', {
    method: 'POST',
    body: JSON.stringify({ postId, type }),
  });
}

// ─── Books ────────────────────────────────────────────────────

export async function getBooks({ q, genre, cursor, limit = 20 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (q) params.set('q', q);
  if (genre) params.set('genre', genre);
  if (cursor) params.set('cursor', cursor);
  return apiFetch(`/books?${params}`);
}

export async function getBook(bookId) {
  return apiFetch(`/books/${bookId}`);
}

export async function getSimilarBooks(bookId) {
  return apiFetch(`/books/${bookId}/similar`);
}

// ─── Dwell Time Tracker ───────────────────────────────────────

/**
 * Creates an IntersectionObserver that tracks how long a post
 * stays in the viewport and fires a view interaction when it leaves.
 *
 * Usage:
 *   const observer = createDwellTracker(postId);
 *   observer.observe(domElement);
 *   // When done: observer.disconnect();
 */
export function createDwellTracker(postId) {
  let enterTime = null;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          enterTime = Date.now();
        } else if (enterTime !== null) {
          const dwellMs = Date.now() - enterTime;
          enterTime = null;

          // Only record if user spent at least 500ms on the post
          if (dwellMs >= 500) {
            recordInteraction(postId, 'view', dwellMs).catch(() => {});
          }
        }
      }
    },
    { threshold: 0.5 } // 50% of post must be visible
  );

  return observer;
}
