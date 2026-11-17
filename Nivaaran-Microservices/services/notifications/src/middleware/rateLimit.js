/**
 * middleware/rateLimit.js - Per-Client Rate Limiting
 */

'use strict';

const { problem } = require('../errors');

const _buckets = new Map();
const LIMIT = 30;
const WINDOW_MS = 60000;

function rateLimitMiddleware(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.substring(7).trim() : null;
  const clientKey = token || req.ip || req.socket?.remoteAddress || 'unknown-client';

  const now = Date.now();
  let bucket = _buckets.get(clientKey);

  if (!bucket || now > bucket.resetTime) {
    bucket = { count: 0, resetTime: now + WINDOW_MS };
    _buckets.set(clientKey, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, LIMIT - bucket.count);
  const retryAfterSec = Math.ceil((bucket.resetTime - now) / 1000);

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
