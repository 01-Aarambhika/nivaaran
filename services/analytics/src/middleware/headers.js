/**
 * middleware/headers.js - Security, CORS, and Method Override
 */

'use strict';

function headersMiddleware(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, If-None-Match');
  res.set('Access-Control-Expose-Headers', 'ETag, Location, X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After');

  const override = req.headers['x-http-method-override'];
  if (req.method === 'POST' && override) {
    const targetMethod = override.toUpperCase().trim();
    if (['GET', 'DELETE', 'PUT', 'PATCH'].includes(targetMethod)) {
      req.method = targetMethod;
    }
  }

  next();
}

module.exports = { headersMiddleware };
