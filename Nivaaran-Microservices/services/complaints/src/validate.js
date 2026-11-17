/**
 * validate.js - Comprehensive Request Body Validation
 *
 * Rules:
 * C1 & C2 (A6): Validate, then act. Collect ALL errors, don't stop at the first.
 * B3 (A6): For validation failures return 422 with errors[] list naming each bad field and why.
 */

const VALID_CATEGORIES = new Set(['hostel', 'mess', 'campus', 'it_support', 'academic', 'transport']);
const VALID_PRIORITIES = new Set(['normal', 'urgent']);
const VALID_STATUSES = new Set(['submitted', 'assigned', 'in_progress', 'resolved', 'closed']);

function validateCreateComplaint(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }

  // userId
  if (!body.userId || typeof body.userId !== 'string' || body.userId.trim() === '') {
    errors.push({ field: 'userId', msg: 'required non-empty string' });
  }

  // categoryId
  if (!body.categoryId || typeof body.categoryId !== 'string' || !VALID_CATEGORIES.has(body.categoryId)) {
    errors.push({ field: 'categoryId', msg: `required string; must be one of: ${Array.from(VALID_CATEGORIES).join(', ')}` });
  }

  // locationId
  if (!body.locationId || typeof body.locationId !== 'string' || body.locationId.trim() === '') {
    errors.push({ field: 'locationId', msg: 'required non-empty location identifier' });
  }

  // title
  if (!body.title || typeof body.title !== 'string') {
    errors.push({ field: 'title', msg: 'required string' });
  } else if (body.title.trim().length < 5 || body.title.trim().length > 120) {
    errors.push({ field: 'title', msg: 'length must be between 5 and 120 characters' });
  }

  // description
  if (!body.description || typeof body.description !== 'string') {
    errors.push({ field: 'description', msg: 'required string' });
  } else if (body.description.trim().length < 10 || body.description.trim().length > 2000) {
    errors.push({ field: 'description', msg: 'length must be between 10 and 2000 characters' });
  }

  // priority (optional)
  if (body.priority !== undefined && !VALID_PRIORITIES.has(body.priority)) {
    errors.push({ field: 'priority', msg: 'must be one of: normal, urgent' });
  }

  // isAnonymous (optional)
  if (body.isAnonymous !== undefined && typeof body.isAnonymous !== 'boolean') {
    errors.push({ field: 'isAnonymous', msg: 'must be a boolean' });
  }

  return errors;
}

function validatePatchComplaint(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    errors.push({ field: 'body', msg: 'must provide at least one field to update' });
    return errors;
  }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length < 5) {
      errors.push({ field: 'title', msg: 'must be a string with at least 5 characters' });
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim().length < 10) {
      errors.push({ field: 'description', msg: 'must be a string with at least 10 characters' });
    }
  }

  if (body.priority !== undefined && !VALID_PRIORITIES.has(body.priority)) {
    errors.push({ field: 'priority', msg: 'must be one of: normal, urgent' });
  }

  if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
    errors.push({ field: 'status', msg: 'must be one of: submitted, assigned, in_progress, resolved, closed' });
  }

  return errors;
}

function validateEscalate(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }
  if (!body.initiatorId || typeof body.initiatorId !== 'string') {
    errors.push({ field: 'initiatorId', msg: 'required string identifier' });
  }
  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 5) {
    errors.push({ field: 'reason', msg: 'required string with at least 5 characters' });
  }
  return errors;
}

function validateComment(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }
  if (!body.authorId || typeof body.authorId !== 'string') {
    errors.push({ field: 'authorId', msg: 'required author identifier' });
  }
  if (!body.message || typeof body.message !== 'string' || body.message.trim().length < 2) {
    errors.push({ field: 'message', msg: 'required string with at least 2 characters' });
  }
  return errors;
}

module.exports = {
  validateCreateComplaint,
  validatePatchComplaint,
  validateEscalate,
  validateComment
};
