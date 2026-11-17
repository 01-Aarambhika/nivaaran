/**
 * validate.js - Request body validation for the Directory service
 *
 * C1 & C2: Validate, then act. Collect ALL errors, don't stop at first.
 * B3: For 422 responses return errors[] list naming each bad field and why.
 */

function validateCreateCategory(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }

  if (!body.categoryId || typeof body.categoryId !== 'string' || body.categoryId.trim() === '') {
    errors.push({ field: 'categoryId', msg: 'required non-empty string' });
  }

  if (!body.displayName || typeof body.displayName !== 'string' || body.displayName.trim() === '') {
    errors.push({ field: 'displayName', msg: 'required non-empty string' });
  }

  if (body.defaultSlaHours === undefined || typeof body.defaultSlaHours !== 'number' || body.defaultSlaHours <= 0) {
    errors.push({ field: 'defaultSlaHours', msg: 'required positive number' });
  }

  if (body.urgentSlaHours === undefined || typeof body.urgentSlaHours !== 'number' || body.urgentSlaHours <= 0) {
    errors.push({ field: 'urgentSlaHours', msg: 'required positive number' });
  }

  if (!body.escalationTier || typeof body.escalationTier !== 'string' || body.escalationTier.trim() === '') {
    errors.push({ field: 'escalationTier', msg: 'required non-empty string' });
  }

  return errors;
}

function validateCreateLocation(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }

  if (!body.locationId || typeof body.locationId !== 'string' || body.locationId.trim() === '') {
    errors.push({ field: 'locationId', msg: 'required non-empty string' });
  }

  if (!body.categoryId || typeof body.categoryId !== 'string' || body.categoryId.trim() === '') {
    errors.push({ field: 'categoryId', msg: 'required non-empty string' });
  }

  if (!body.zoneName || typeof body.zoneName !== 'string' || body.zoneName.trim() === '') {
    errors.push({ field: 'zoneName', msg: 'required non-empty string' });
  }

  return errors;
}

module.exports = { validateCreateCategory, validateCreateLocation };
