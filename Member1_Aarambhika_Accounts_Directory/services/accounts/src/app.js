/**
 * app.js - Nivaaran Accounts REST Service
 *
 * Implements:
 * - POST /sessions  — login, returns JWT (201)
 * - POST /users     — register user (201); admin can set non-student roles
 * - GET  /users/:id — look up one user, never returns password (200)
 * - GET  /users     — list all users, admin only (200)
 *
 * Headers: ETag, Cache-Control, Location, WWW-Authenticate, CORS, Security
 * Errors:  RFC 7807 Problem Details throughout
 */

const crypto = require('node:crypto');
const express = require('express');

const store = require('./store');
const { problem } = require('./errors');
const { validateLogin, validateCreateUser, isStudentId } = require('./validate');
const { headersMiddleware } = require('./middleware/headers');
const { rateLimitMiddleware } = require('./middleware/rateLimit');
const { contentNegotiation } = require('./middleware/negotiation');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();

// ── Middleware stack ──────────────────────────────────────────────────────────
app.use(headersMiddleware);
app.use(rateLimitMiddleware);
app.use(contentNegotiation);
app.use(express.json());
// Malformed JSON handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return problem(res, 400, 'invalid-request', 'Malformed JSON in request body');
  }
  next(err);
});

// ── JWT helpers ───────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'nivaaran-dev-secret';
const TOKEN_TTL  = 8 * 3600; // 8 hours in seconds

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig    = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────
app.options('/sessions', (req, res) => {
  res.set('Allow', 'POST, OPTIONS');
  return res.status(204).end();
});

app.options('/users', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(204).end();
});

app.options('/users/:id', (req, res) => {
  res.set('Allow', 'GET, OPTIONS');
  return res.status(204).end();
});

// ── POST /sessions — Log in ───────────────────────────────────────────────────
app.post('/sessions', async (req, res, next) => {
  try {
    const body = req.body || {};

    // 1. Validate fields present
    const errors = validateLogin(body);
    if (errors.length > 0) {
      return problem(res, 400, 'invalid-request', 'Missing required login fields', errors);
    }

    // 2. Verify credentials
    const user = await store.findByCredentials(body.userId.trim(), body.password);
    if (!user) {
      return problem(res, 401, 'unauthorized', 'Invalid userId or password.');
    }

    // 3. Issue JWT
    const now = Math.floor(Date.now() / 1000);
    const token = signToken({
      sub:    user.userId,
      userId: user.userId,
      role:   user.role,
      iat:    now,
      exp:    now + TOKEN_TTL
    });

    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated({ token, userId: user.userId, role: user.role }, 201);
  } catch (err) {
    next(err);
  }
});

// ── POST /users — Register a user ─────────────────────────────────────────────
app.post('/users', async (req, res, next) => {
  try {
    const body = req.body || {};

    // 1. Validate body fields
    const errors = validateCreateUser(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Request body validation failed', errors);
    }

    const requestedRole = body.role || 'student';
    const isNonStudent  = requestedRole !== 'student';

    // 2. Non-student roles require an admin token
    if (isNonStudent) {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return problem(res, 403, 'forbidden', 'Creating non-student accounts requires an admin Authorization token.');
      }
      const parts = authHeader.trim().split(/\s+/);
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return problem(res, 403, 'forbidden', 'Malformed Authorization header.');
      }
      const { verifyToken } = require('./middleware/auth');
      const payload = verifyToken(parts[1]);
      if (!payload) {
        return problem(res, 401, 'unauthorized', 'Token is invalid or has expired.');
      }
      if (payload.role !== 'admin') {
        return problem(res, 403, 'forbidden', 'Only admins may create non-student accounts.');
      }
    }

    // 3. For student self-registration, userId must be a numeric roll number
    if (requestedRole === 'student' && !isStudentId(body.userId.trim())) {
      return problem(res, 422, 'validation-failed', 'Student userId must be a numeric roll number.', [
        { field: 'userId', msg: 'must be a numeric roll number (e.g. 20251651078)' }
      ]);
    }

    // 4. Create — throws conflict if duplicate
    let user;
    try {
      user = await store.create({
        userId:   body.userId.trim(),
        fullName: body.fullName || '',
        role:     requestedRole,
        password: body.password
      });
    } catch (err) {
      if (err.isConflict) {
        return problem(res, 409, 'user-conflict', `A user with userId '${body.userId}' already exists.`);
      }
      throw err;
    }

    res.set('Location', `/users/${user.userId}`);
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(user, 201);
  } catch (err) {
    next(err);
  }
});

// ── GET /users/:id — Fetch one user ──────────────────────────────────────────
app.get('/users/:id', requireAuth, async (req, res, next) => {
  try {
    const user = await store.find(req.params.id);
    if (!user) {
      return problem(res, 404, 'user-not-found', `No user with userId '${req.params.id}'.`);
    }

    const etag = user.getETag();
    res.set('ETag', etag);
    res.set('Cache-Control', 'max-age=60, private, must-revalidate');

    // Conditional GET
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
      return res.status(304).end();
    }

    return res.sendNegotiated(user, 200);
  } catch (err) {
    next(err);
  }
});

// ── GET /users — List all users (admin only) ──────────────────────────────────
app.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'max-age=30, private');
    const users = await store.list();
    return res.sendNegotiated(users, 200);
  } catch (err) {
    next(err);
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ACCOUNTS ERROR]:', err);
  return problem(res, 500, 'internal-error', 'An unexpected internal error occurred. The incident has been recorded.');
});

// ── Server launcher ───────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`Nivaaran Accounts service running on port ${PORT}`));
}

module.exports = app;
