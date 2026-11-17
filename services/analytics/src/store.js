/**
 * store.js - In-process storage for Analytics & Audit Service with MySQL integration
 */

'use strict';

const { AuditEvent, SlaSnapshot, EscalationReport } = require('./models');
const db = require('./db');

const _auditEvents = new Map();
const _slaSnapshots = new Map();
const _escalations = new Map();

let _eventCounter = 1000;
let _snapshotCounter = 1000;
let _escalationCounter = 1000;

function _doSeed() {
  const e1 = new AuditEvent({
    eventId:        'evt_1',
    eventType:      'complaint_created',
    entityType:     'complaint',
    entityId:       'cmp_1001',
    actorUserId:    '20251651078',
    actorRole:      'student',
    originService:  'complaints',
    previousState:  null,
    newState:       'submitted',
    payloadSnapshot:'{"title":"Broken tap in 302"}',
    clientIp:       '127.0.0.1',
    eventTimestamp: '2026-11-16T10:00:00.000Z'
  });
  _auditEvents.set(e1.eventId, e1);

  const e2 = new AuditEvent({
    eventId:        'evt_2',
    eventType:      'status_changed',
    entityType:     'complaint',
    entityId:       'cmp_1001',
    actorUserId:    'W101',
    actorRole:      'warden',
    originService:  'complaints',
    previousState:  'submitted',
    newState:       'assigned',
    payloadSnapshot:'{"assignedTo":"W101"}',
    clientIp:       '127.0.0.1',
    eventTimestamp: '2026-11-16T11:00:00.000Z'
  });
  _auditEvents.set(e2.eventId, e2);

  const s1 = new SlaSnapshot({
    snapshotId:             'snap_1',
    categoryId:             'hostel',
    snapshotDate:           '2026-11-16',
    totalFiled:             12,
    totalResolved:          9,
    resolvedWithinSla:      7,
    breachedSlaCount:       2,
    averageResolutionHours: 36.5,
    complianceRatePct:      77.78,
    calculatedAt:           '2026-11-16T23:59:00.000Z'
  });
  _slaSnapshots.set(s1.snapshotId, s1);

  const s2 = new SlaSnapshot({
    snapshotId:             'snap_2',
    categoryId:             'mess',
    snapshotDate:           '2026-11-16',
    totalFiled:             5,
    totalResolved:          5,
    resolvedWithinSla:      5,
    breachedSlaCount:       0,
    averageResolutionHours: 18.2,
    complianceRatePct:      100.00,
    calculatedAt:           '2026-11-16T23:59:00.000Z'
  });
  _slaSnapshots.set(s2.snapshotId, s2);

  const r1 = new EscalationReport({
    reportId:            'rep_1',
    complaintId:         'cmp_999',
    categoryId:          'hostel',
    initiatorUserId:     '20251651001',
    breachHoursExceeded: 12.5,
    escalationTier:      'admin',
    reason:              'SLA breach — no staff assigned for 60 hours',
    isResolved:          false,
    reportedAt:          '2026-11-16T15:00:00.000Z'
  });
  _escalations.set(r1.reportId, r1);
}

_doSeed();

// ── Audit Events ──────────────────────────────────────────────────────────────
function createAuditEvent(data) {
  _eventCounter++;
  const eventId = `evt_${_eventCounter}`;
  const ev = new AuditEvent({ ...data, eventId });
  _auditEvents.set(eventId, ev);

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `INSERT INTO audit_events_log (
          event_id, event_type, entity_type, entity_id, actor_user_id,
          actor_role, origin_service, previous_state, new_state,
          payload_snapshot, client_ip
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId, ev.eventType, ev.entityType, ev.entityId, ev.actorUserId || null,
          ev.actorRole || null, ev.originService, ev.previousState || null,
          ev.newState || null, ev.payloadSnapshot || '{}', ev.clientIp || ''
        ]
      ).catch(err => console.warn('[ANALYTICS] MySQL audit insert error:', err.message));
    }
  }).catch(() => {});

  return ev;
}

function findAuditEvent(id) {
  return _auditEvents.get(id) || null;
}

function listAuditEvents({ entityType, entityId, eventType, limit } = {}) {
  let items = Array.from(_auditEvents.values());
  if (entityType) items = items.filter(e => e.entityType === entityType);
  if (entityId)   items = items.filter(e => e.entityId === entityId);
  if (eventType)  items = items.filter(e => e.eventType === eventType);
  if (limit && Number(limit) > 0) items = items.slice(0, Number(limit));
  return items;
}

// ── SLA Snapshots ─────────────────────────────────────────────────────────────
function createSlaSnapshot(data) {
  _snapshotCounter++;
  const snapshotId = `snap_${_snapshotCounter}`;
  const snap = new SlaSnapshot({ ...data, snapshotId });
  _slaSnapshots.set(snapshotId, snap);

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `INSERT INTO sla_performance_snapshots (
          snapshot_id, category_id, snapshot_date, total_filed, total_resolved,
          resolved_within_sla, breached_sla_count, average_resolution_hours,
          compliance_rate_pct
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          snapshotId, snap.categoryId, snap.snapshotDate, snap.totalFiled,
          snap.totalResolved, snap.resolvedWithinSla || 0, snap.breachedSlaCount || 0,
          snap.averageResolutionHours || 0.0, snap.complianceRatePct || 100.0
        ]
      ).catch(err => console.warn('[ANALYTICS] MySQL SLA snapshot insert error:', err.message));
    }
  }).catch(() => {});

  return snap;
}

function listSlaSnapshots({ categoryId, date } = {}) {
  let items = Array.from(_slaSnapshots.values());
  if (categoryId) items = items.filter(s => s.categoryId === categoryId);
  if (date)       items = items.filter(s => s.snapshotDate === date);
  return items;
}

// ── Escalation Reports ────────────────────────────────────────────────────────
function createEscalationReport(data) {
  _escalationCounter++;
  const reportId = `rep_${_escalationCounter}`;
  const rep = new EscalationReport({ ...data, reportId });
  _escalations.set(reportId, rep);

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `INSERT INTO escalation_incident_reports (
          report_id, complaint_id, category_id, initiator_user_id,
          breach_hours_exceeded, escalation_tier, reason, is_resolved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          reportId, rep.complaintId, rep.categoryId, rep.initiatorUserId,
          rep.breachHoursExceeded || 0, rep.escalationTier || 'admin', rep.reason
        ]
      ).catch(err => console.warn('[ANALYTICS] MySQL escalation report insert error:', err.message));
    }
  }).catch(() => {});

  return rep;
}

function listEscalationReports({ categoryId, isResolved } = {}) {
  let items = Array.from(_escalations.values());
  if (categoryId) items = items.filter(r => r.categoryId === categoryId);
  if (isResolved !== undefined) {
    const bool = String(isResolved).toLowerCase() === 'true';
    items = items.filter(r => r.isResolved === bool);
  }
  return items;
}

// ── Test Reseed ───────────────────────────────────────────────────────────────
function _reseed() {
  _auditEvents.clear();
  _slaSnapshots.clear();
  _escalations.clear();
  _eventCounter = 1000;
  _snapshotCounter = 1000;
  _escalationCounter = 1000;
  _doSeed();
}

module.exports = {
  createAuditEvent,
  findAuditEvent,
  listAuditEvents,
  createSlaSnapshot,
  listSlaSnapshots,
  createEscalationReport,
  listEscalationReports,
  _reseed
};
