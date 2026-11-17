/**
 * validate.js - Request body validation for the Notifications service
 */

'use strict';

const VALID_CHANNELS = new Set(['sms', 'email', 'in_app']);
const VALID_DELIVERY_STATUSES = new Set(['queued', 'sent', 'delivered', 'failed']);

function validateCreateNotification(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }

  if (!body.recipientUserId || typeof body.recipientUserId !== 'string' || body.recipientUserId.trim() === '') {
    errors.push({ field: 'recipientUserId', msg: 'required non-empty string' });
  }

  if (!body.recipientContact || typeof body.recipientContact !== 'string' || body.recipientContact.trim() === '') {
    errors.push({ field: 'recipientContact', msg: 'required non-empty contact string (phone or email)' });
  }

  if (!body.channel || !VALID_CHANNELS.has(body.channel)) {
    errors.push({ field: 'channel', msg: `must be one of: ${Array.from(VALID_CHANNELS).join(', ')}` });
  }

  if (!body.eventType || typeof body.eventType !== 'string' || body.eventType.trim() === '') {
    errors.push({ field: 'eventType', msg: 'required non-empty eventType string' });
  }

  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    errors.push({ field: 'title', msg: 'required non-empty title string' });
  }

  if (!body.body || typeof body.body !== 'string' || body.body.trim() === '') {
    errors.push({ field: 'body', msg: 'required non-empty notification body' });
  }

  return errors;
}

function validatePatchNotification(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }

  if (!body.deliveryStatus || !VALID_DELIVERY_STATUSES.has(body.deliveryStatus)) {
    errors.push({ field: 'deliveryStatus', msg: `must be one of: ${Array.from(VALID_DELIVERY_STATUSES).join(', ')}` });
  }

  return errors;
}

module.exports = { validateCreateNotification, validatePatchNotification, VALID_CHANNELS, VALID_DELIVERY_STATUSES };
