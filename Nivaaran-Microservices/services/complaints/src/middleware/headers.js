/**
 * middleware/headers.js - Security, CORS, and Method Override Middleware
 *
 * Rules:
 * A5 (A5): If a constrained client cannot send PUT/DELETE, accept X-HTTP-Method-Override.
 * B6 (A5): Add Access-Control-Allow-Origin and handle preflight CORS.
 * B7 (A5): Add X-Content-Type-Options: nosniff and Strict-Transport-Security.
 */

function headersMiddleware(req, res, next) {
  // 1. Security Headers
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // 2. CORS Headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Idempotency-Key, If-Match, If-None-Match, X-HTTP-Method-Override');
  res.set('Access-Control-Expose-Headers', 'ETag, Location, X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After');

  // 3. X-HTTP-Method-Override fallback for constrained clients
  const override = req.headers['x-http-method-override'];
  if (req.method === 'POST' && override) {
    const targetMethod = override.toUpperCase().trim();
    if (['PATCH', 'DELETE', 'PUT', 'GET'].includes(targetMethod)) {
      req.method = targetMethod;
    }
  }

  next();
}

module.exports = { headersMiddleware };
