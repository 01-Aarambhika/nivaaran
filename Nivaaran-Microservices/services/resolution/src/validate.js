/**
 * validate.js - Request body validation for the Resolution service
 */

'use strict';

const VALID_STATUSES = new Set(['active', 'reassigned', 'completed', 'transferred']);

function validateCreateAssignment(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }
  if (!body.complaintId || typeof body.complaintId !== 'string' || body.complaintId.trim() === '') {
    errors.push({ field: 'complaintId', msg: 'required non-empty string' });
  }
  if (!body.assignedStaffId || typeof body.assignedStaffId !== 'string' || body.assignedStaffId.trim() === '') {
    errors.push({ field: 'assignedStaffId', msg: 'required non-empty string' });
  }
  if (!body.assignedByUserId || typeof body.assignedByUserId !== 'string' || body.assignedByUserId.trim() === '') {
    errors.push({ field: 'assignedByUserId', msg: 'required non-empty string' });
  }
  if (!body.departmentScope || typeof body.departmentScope !== 'string' || body.departmentScope.trim() === '') {
    errors.push({ field: 'departmentScope', msg: 'required non-empty string' });
  }
  return errors;
}

function validatePatchAssignment(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }
  if (!body.assignmentStatus || !VALID_STATUSES.has(body.assignmentStatus)) {
    errors.push({ field: 'assignmentStatus', msg: `must be one of: ${Array.from(VALID_STATUSES).join(', ')}` });
  }
  return errors;
}

function validateCreateRosterEntry(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', msg: 'must be a valid JSON object' });
    return errors;
  }
  if (!body.staffUserId || typeof body.staffUserId !== 'string' || body.staffUserId.trim() === '') {
    errors.push({ field: 'staffUserId', msg: 'required non-empty string' });
  }
  if (!body.departmentScope || typeof body.departmentScope !== 'string' || body.departmentScope.trim() === '') {
    errors.push({ field: 'departmentScope', msg: 'required non-empty string' });
  }
  if (!body.shiftDate || typeof body.shiftDate !== 'string' || body.shiftDate.trim() === '') {
    errors.push({ field: 'shiftDate', msg: 'required non-empty string (YYYY-MM-DD)' });
  }
  if (!body.shiftStart || typeof body.shiftStart !== 'string' || body.shiftStart.trim() === '') {
    errors.push({ field: 'shiftStart', msg: 'required non-empty string (HH:MM)' });
  }
  if (!body.shiftEnd || typeof body.shiftEnd !== 'string' || body.shiftEnd.trim() === '') {
    errors.push({ field: 'shiftEnd', msg: 'required non-empty string (HH:MM)' });
  }
  return errors;
}

module.exports = { validateCreateAssignment, validatePatchAssignment, validateCreateRosterEntry, VALID_STATUSES };
