/**
 * JWT authentication middleware.
 * Attaches req.user = { id, username } when token is valid.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'precis-dev-secret-change-in-production';

/**
 * Require a valid JWT. Returns 401 if missing/invalid.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth — attaches req.user if token present, but doesn't block.
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const token = header.slice(7);
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = { id: payload.sub, username: payload.username };
    } catch {
      // Token invalid — proceed without user
    }
  }
  next();
}

/**
 * Sign a new JWT for a user.
 */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

module.exports = { requireAuth, optionalAuth, signToken };
