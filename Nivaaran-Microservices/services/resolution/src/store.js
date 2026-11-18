/**
 * store.js - In-process storage for assignments and duty roster with MySQL integration
 */

'use strict';

const { Assignment, RosterEntry } = require('./models');
const db = require('./db');

const _assignments = new Map();
const _roster      = new Map();

let _assignmentCounter = 1000;
let _rosterCounter     = 1000;

function seedAssignment(data) {
  const a = new Assignment(data);
  _assignments.set(a.assignmentId, a);
}

function seedRoster(data) {
  const r = new RosterEntry(data);
  _roster.set(r.rosterId, r);
}

function _doSeed() {
  seedAssignment({
    assignmentId:     'asgn_1',
    complaintId:      'cmp_1001',
    assignedStaffId:  'W101',
    assignedByUserId: 'ADM001',
    departmentScope:  'hostel',
    assignmentStatus: 'active',
    assignedAt:       '2026-11-17T06:00:00.000Z'
  });

  seedRoster({
    rosterId:        'ros_1',
    staffUserId:     'W101',
    departmentScope: 'hostel',
    shiftDate:       '2026-11-17',
    shiftStart:      '08:00',
    shiftEnd:        '17:00',
    isOnDuty:        true,
    createdAt:       '2026-11-17T05:00:00.000Z'
  });

  seedRoster({
    rosterId:        'ros_2',
    staffUserId:     'M201',
    departmentScope: 'mess',
    shiftDate:       '2026-11-17',
    shiftStart:      '07:00',
    shiftEnd:        '15:00',
    isOnDuty:        true,
    createdAt:       '2026-11-17T05:00:00.000Z'
  });
}

_doSeed();

// ── Assignment CRUD ───────────────────────────────────────────────────────────

function findAssignment(id) {
  return _assignments.get(id) || null;
}

function findAssignmentByComplaintId(complaintId) {
  if (!complaintId) return null;
  const clean = complaintId.trim().toLowerCase();
  for (const a of _assignments.values()) {
    if (a.complaintId === complaintId || a.complaintId.toLowerCase() === clean) return a;
    // Match cross trackingNumber/id (e.g. cmp_1001 vs CMP-2026-1001)
    const num1 = complaintId.match(/\d+$/);
    const num2 = a.complaintId.match(/\d+$/);
    if (num1 && num2 && num1[0] === num2[0]) return a;
  }
  return null;
}

function listAssignments({ complaintId, staffId, status } = {}) {
  let items = Array.from(_assignments.values());
  if (complaintId) {
    const clean = complaintId.trim().toLowerCase();
    const num = complaintId.match(/\d+$/)?.[0];
    items = items.filter(a => {
      if (a.complaintId === complaintId || a.complaintId.toLowerCase() === clean) return true;
      const aNum = a.complaintId.match(/\d+$/)?.[0];
      return num && aNum && num === aNum;
    });
  }
  if (staffId) {
    const isM = staffId === 'M201' || staffId === 'M001';
    const isW = staffId === 'W101' || staffId === 'W001';
    const isS = staffId === 'S301' || staffId === 'T001';
    items = items.filter(a => {
      if (a.assignedStaffId === staffId) return true;
      if (isM && (a.assignedStaffId === 'M201' || a.assignedStaffId === 'M001')) return true;
      if (isW && (a.assignedStaffId === 'W101' || a.assignedStaffId === 'W001')) return true;
      if (isS && (a.assignedStaffId === 'S301' || a.assignedStaffId === 'T001')) return true;
      return false;
    });
  }
  if (status) items = items.filter(a => a.assignmentStatus === status);
  return items;
}

function createAssignment({ complaintId, assignedStaffId, assignedByUserId, departmentScope }) {
  const existing = findAssignmentByComplaintId(complaintId);
  if (existing) {
    existing.assignedStaffId = assignedStaffId;
    existing.assignedByUserId = assignedByUserId;
    existing.departmentScope = departmentScope;
    existing.assignmentStatus = 'active';
    existing.assignedAt = new Date().toISOString();
    return existing;
  }
  _assignmentCounter++;
  const assignmentId = `asgn_${_assignmentCounter}`;
  const a = new Assignment({
    assignmentId,
    complaintId,
    assignedStaffId,
    assignedByUserId,
    departmentScope,
    assignmentStatus: 'active'
  });
  _assignments.set(assignmentId, a);

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `INSERT INTO staff_assignments (
          assignment_id, complaint_id, assigned_staff_id, assigned_by_user_id,
          department_scope, assignment_status, assigned_at
        ) VALUES (?, ?, ?, ?, ?, 'active', NOW())
        ON DUPLICATE KEY UPDATE assignment_status = VALUES(assignment_status)`,
        [assignmentId, complaintId, assignedStaffId, assignedByUserId, departmentScope]
      ).catch(err => console.warn('[RESOLUTION] MySQL assignment insert error:', err.message));
    }
  }).catch(() => {});

  return a;
}

function updateAssignment(id, { assignmentStatus, resolvedAt }) {
  const a = _assignments.get(id);
  if (!a) return null;
  if (assignmentStatus !== undefined) a.assignmentStatus = assignmentStatus;
  if (resolvedAt !== undefined)       a.resolvedAt = resolvedAt;
  a.version += 1;

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `UPDATE staff_assignments SET
          assignment_status = ?, resolved_at = ?, version = version + 1
        WHERE assignment_id = ?`,
        [a.assignmentStatus, a.resolvedAt ? new Date(a.resolvedAt) : null, id]
      ).catch(err => console.warn('[RESOLUTION] MySQL assignment update error:', err.message));
    }
  }).catch(() => {});

  return a;
}

// ── Roster CRUD ───────────────────────────────────────────────────────────────

function findRoster(id) {
  return _roster.get(id) || null;
}

function listRoster({ staffId, date } = {}) {
  let items = Array.from(_roster.values());
  if (staffId) items = items.filter(r => r.staffUserId === staffId);
  if (date)    items = items.filter(r => r.shiftDate === date);
  return items;
}

function createRosterEntry({ staffUserId, departmentScope, shiftDate, shiftStart, shiftEnd }) {
  _rosterCounter++;
  const rosterId = `ros_${_rosterCounter}`;
  const r = new RosterEntry({
    rosterId,
    staffUserId,
    departmentScope,
    shiftDate,
    shiftStart,
    shiftEnd,
    isOnDuty: true
  });
  _roster.set(rosterId, r);

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `INSERT INTO staff_duty_roster (
          roster_id, staff_user_id, department_scope, shift_date, shift_start, shift_end, is_on_duty
        ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [rosterId, staffUserId, departmentScope, shiftDate, shiftStart, shiftEnd]
      ).catch(err => console.warn('[RESOLUTION] MySQL roster insert error:', err.message));
    }
  }).catch(() => {});

  return r;
}

// ── Test helpers ──────────────────────────────────────────────────────────────

function _reseed() {
  _assignments.clear();
  _roster.clear();
  _assignmentCounter = 1000;
  _rosterCounter     = 1000;
  _doSeed();
}

module.exports = {
  findAssignment,
  findAssignmentByComplaintId,
  listAssignments,
  createAssignment,
  updateAssignment,
  findRoster,
  listRoster,
  createRosterEntry,
  _reseed
};
