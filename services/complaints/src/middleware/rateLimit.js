/**
 * middleware/rateLimit.js - Per-Client Rate Limiting with Signalling
 *
 * Rules:
 * B5 (A5): Return X-RateLimit-Limit and X-RateLimit-Remaining.
 *          When per-client budget is exceeded: 429 Too Many Requests with Retry-After.
 *          The limit is per-client, not global.
 */

const { problem } = require('../errors');

// In-memory per-client budget map: clientKey -> { count, resetTime }
const _buckets = new Map();
const LIMIT = 30; // Max requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window

function rateLimitMiddleware(req, res, next) {
  // Client identifier: Bearer token if available, otherwise IP
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.substring(7).trim() : null;
  const clientKey = token || req.ip || req.socket.remoteAddress || 'unknown-client';

  const now = Date.now();
  let bucket = _buckets.get(clientKey);

  if (!bucket || now > bucket.resetTime) {
    bucket = {
      count: 0,
      resetTime: now + WINDOW_MS
    };
    _buckets.set(clientKey, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, LIMIT - bucket.count);
  const retryAfterSec = Math.ceil((bucket.resetTime - now) / 1000);

  // Set standard rate limit signaling headers
  res.set('X-RateLimit-Limit', String(LIMIT));
  res.set('X-RateLimit-Remaining', String(remaining));

  if (bucket.count > LIMIT) {
    return problem(
      res,
      429,
      'rate-limit-exceeded',
      `Rate limit of ${LIMIT} requests per minute exceeded. Try again in ${retryAfterSec} seconds.`
    );
  }

  next();
}

function _resetBuckets() {
  _buckets.clear();
}

module.exports = { rateLimitMiddleware, _resetBuckets, LIMIT };
