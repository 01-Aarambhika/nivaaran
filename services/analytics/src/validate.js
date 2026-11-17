/**
 * validate.js - Request validation for Analytics Service
 */

'use strict';

function validateCreateAuditEvent(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }
  if (!body.eventType || typeof body.eventType !== 'string' || body.eventType.trim() === '') {
    errors.push({ field: 'eventType', msg: 'required non-empty string' });
  }
  if (!body.entityType || typeof body.entityType !== 'string' || body.entityType.trim() === '') {
    errors.push({ field: 'entityType', msg: 'required non-empty string' });
  }
  if (!body.entityId || typeof body.entityId !== 'string' || body.entityId.trim() === '') {
    errors.push({ field: 'entityId', msg: 'required non-empty string' });
  }
  if (!body.originService || typeof body.originService !== 'string' || body.originService.trim() === '') {
    errors.push({ field: 'originService', msg: 'required non-empty string' });
  }
  return errors;
}

function validateCreateSlaSnapshot(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }
  if (!body.categoryId || typeof body.categoryId !== 'string' || body.categoryId.trim() === '') {
    errors.push({ field: 'categoryId', msg: 'required non-empty string' });
  }
  if (!body.snapshotDate || typeof body.snapshotDate !== 'string' || body.snapshotDate.trim() === '') {
    errors.push({ field: 'snapshotDate', msg: 'required non-empty string (YYYY-MM-DD)' });
  }
  if (body.totalFiled === undefined || typeof body.totalFiled !== 'number') {
    errors.push({ field: 'totalFiled', msg: 'required number' });
  }
  if (body.totalResolved === undefined || typeof body.totalResolved !== 'number') {
    errors.push({ field: 'totalResolved', msg: 'required number' });
  }
  return errors;
}

function validateCreateEscalationReport(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }
  if (!body.complaintId || typeof body.complaintId !== 'string' || body.complaintId.trim() === '') {
    errors.push({ field: 'complaintId', msg: 'required non-empty string' });
  }
  if (!body.categoryId || typeof body.categoryId !== 'string' || body.categoryId.trim() === '') {
    errors.push({ field: 'categoryId', msg: 'required non-empty string' });
  }
  if (!body.initiatorUserId || typeof body.initiatorUserId !== 'string' || body.initiatorUserId.trim() === '') {
    errors.push({ field: 'initiatorUserId', msg: 'required non-empty string' });
  }
  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim() === '') {
    errors.push({ field: 'reason', msg: 'required non-empty string' });
  }
  return errors;
}

module.exports = {
  validateCreateAuditEvent,
  validateCreateSlaSnapshot,
  validateCreateEscalationReport
};
