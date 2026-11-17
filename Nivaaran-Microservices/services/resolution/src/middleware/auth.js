/**
 * middleware/auth.js - Bearer Token Authentication Guard
 */

'use strict';

const crypto = require('node:crypto');
const { problem } = require('../errors');

const JWT_SECRET = process.env.JWT_SECRET || 'nivaaran-dev-secret';

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    return problem(res, 401, 'unauthorized', 'Protected endpoint requires Authorization: Bearer <token> header.');
  }
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return problem(res, 401, 'unauthorized', 'Malformed Authorization header. Format must be: Bearer <token>');
  }
  const payload = verifyToken(parts[1]);
  if (!payload) {
    return problem(res, 401, 'unauthorized', 'Token is invalid or has expired. Please log in again.');
  }
  req.user = payload;
  next();
}

function requireStaffOrAdmin(req, res, next) {
  if (!req.user || !['admin', 'warden', 'mess_incharge', 'maintenance_staff'].includes(req.user.role)) {
    return problem(res, 403, 'forbidden', 'This action requires staff or admin privileges.');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return problem(res, 403, 'forbidden', 'This action requires admin privileges.');
  }
  next();
}

module.exports = { requireAuth, requireStaffOrAdmin, requireAdmin, verifyToken };
