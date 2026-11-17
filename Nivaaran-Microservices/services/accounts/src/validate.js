/**
 * validate.js - Request body validation for the Accounts service
 *
 * C1 & C2: Validate, then act. Collect ALL errors, don't stop at first.
 * B3: For 422 responses return errors[] list naming each bad field and why.
 */

const VALID_ROLES = new Set(['student', 'warden', 'mess_incharge', 'maintenance_staff', 'admin']);

// Student userId: purely numeric (roll number format)
function isStudentId(userId) {
  return /^\d+$/.test(userId);
}

function validateLogin(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }
  if (!body.userId || typeof body.userId !== 'string' || body.userId.trim() === '') {
    errors.push({ field: 'userId', msg: 'required non-empty string' });
  }
  if (!body.password || typeof body.password !== 'string' || body.password.trim() === '') {
    errors.push({ field: 'password', msg: 'required non-empty string' });
  }
  return errors;
}

function validateCreateUser(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }

  // userId
  if (!body.userId || typeof body.userId !== 'string' || body.userId.trim() === '') {
    errors.push({ field: 'userId', msg: 'required non-empty string' });
  }

  // password
  if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
    errors.push({ field: 'password', msg: 'required string with at least 6 characters' });
  }

  // role (optional for self-registration — defaults to student; required if provided)
  if (body.role !== undefined && !VALID_ROLES.has(body.role)) {
    errors.push({ field: 'role', msg: `must be one of: ${Array.from(VALID_ROLES).join(', ')}` });
  }

  // fullName (optional but must be string if provided)
  if (body.fullName !== undefined && (typeof body.fullName !== 'string' || body.fullName.trim() === '')) {
    errors.push({ field: 'fullName', msg: 'must be a non-empty string when provided' });
  }

  return errors;
}

module.exports = { validateLogin, validateCreateUser, isStudentId, VALID_ROLES };
