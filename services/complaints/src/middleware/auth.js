/**
 * middleware/auth.js - Bearer Token Authentication Guard
 *
 * Rules:
 * B3 (A5): Protected endpoints require Authorization: Bearer <token>.
 *          Missing or empty token -> 401 Unauthorized.
 *          Header handling only; no complex token system needed.
 */

const { problem } = require('../errors');

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || typeof authHeader !== 'string') {
    return problem(
      res,
      401,
      'unauthorized',
      'Protected endpoint requires Authorization: Bearer <token> header.'
    );
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || parts[1].trim() === '') {
    return problem(
      res,
      401,
      'unauthorized',
      'Malformed Authorization header. Format must be: Bearer <token>'
    );
  }

  // Attach token payload to request
  req.userToken = parts[1];
  next();
}

module.exports = { requireAuth };
