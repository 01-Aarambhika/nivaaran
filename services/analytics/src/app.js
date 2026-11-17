/**
 * app.js - Nivaaran Analytics & Audit REST Service
 *
 * Implements:
 * - POST /audit/events       — record an immutable audit event
 * - GET  /audit/events       — list audit events (admin only)
 * - GET  /audit/events/:id   — get single event with ETag + 304 (admin only)
 * - OPTIONS /audit/events    — 204 Allow
 * - GET  /sla/snapshots      — list SLA snapshots (admin only)
 * - POST /sla/snapshots      — create SLA snapshot (admin only)
 * - OPTIONS /sla/snapshots   — 204 Allow
 * - GET  /escalations/reports— list escalation incident reports (admin only)
 * - POST /escalations/reports— file an escalation report (Location header)
 * - OPTIONS /escalations/reports — 204 Allow
 *
 * Headers: ETag, Cache-Control, Location, CORS, Security
 * Errors: RFC 7807 Problem Details throughout
 */

'use strict';

const express = require('express');

const store = require('./store');
const { problem } = require('./errors');
const {
  validateCreateAuditEvent,
  validateCreateSlaSnapshot,
  validateCreateEscalationReport
} = require('./validate');
const { headersMiddleware } = require('./middleware/headers');
const { rateLimitMiddleware } = require('./middleware/rateLimit');
const { contentNegotiation } = require('./middleware/negotiation');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();

app.use(headersMiddleware);
app.use(rateLimitMiddleware);
app.use(contentNegotiation);
app.use(express.json());

// Malformed JSON handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return problem(res, 400, 'invalid-request', 'Malformed JSON in request body');
  }
  next(err);
});

// ── OPTIONS ───────────────────────────────────────────────────────────────────
app.options('/audit/events', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(204).end();
});

app.options('/audit/events/:id', (req, res) => {
  res.set('Allow', 'GET, OPTIONS');
  return res.status(204).end();
});

app.options('/sla/snapshots', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(204).end();
});

app.options('/escalations/reports', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(204).end();
});

// ── POST /audit/events — Append an immutable audit event ──────────────────────
app.post('/audit/events', (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateCreateAuditEvent(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Audit event validation failed', errors);
    }

    const clientIp = req.ip || req.socket?.remoteAddress || '';
    const event = store.createAuditEvent({
      eventType:       body.eventType.trim(),
      entityType:      body.entityType.trim(),
      entityId:        body.entityId.trim(),
      actorUserId:     body.actorUserId ? body.actorUserId.trim() : null,
      actorRole:       body.actorRole ? body.actorRole.trim() : null,
      originService:   body.originService.trim(),
      previousState:   body.previousState || null,
      newState:        body.newState || null,
      payloadSnapshot: typeof body.payloadSnapshot === 'string'
        ? body.payloadSnapshot
        : JSON.stringify(body.payloadSnapshot || {}),
      clientIp
    });

    res.set('Location', `/audit/events/${event.eventId}`);
    res.set('ETag', event.getETag());
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(event, 201);
  } catch (err) {
    next(err);
  }
});

// ── GET /audit/events — List audit events (admin only) ─────────────────────────
app.get('/audit/events', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const { entityType, entityId, eventType, limit } = req.query;
    const items = store.listAuditEvents({ entityType, entityId, eventType, limit });
    res.set('Cache-Control', 'max-age=30, private');
    return res.sendNegotiated(items, 200);
  } catch (err) {
    next(err);
  }
});

// ── GET /audit/events/:id — Get one event with ETag + 304 (admin only) ─────────
app.get('/audit/events/:id', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const event = store.findAuditEvent(req.params.id);
    if (!event) {
      return problem(res, 404, 'not-found', `No audit event with id '${req.params.id}'.`);
    }

    const etag = event.getETag();
    res.set('ETag', etag);
    res.set('Cache-Control', 'max-age=60, private, must-revalidate');

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
      return res.status(304).end();
    }

    return res.sendNegotiated(event, 200);
  } catch (err) {
    next(err);
  }
});

// ── GET /sla/snapshots — List SLA snapshots (admin only) ──────────────────────
app.get('/sla/snapshots', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const { categoryId, date } = req.query;
    const items = store.listSlaSnapshots({ categoryId, date });
    res.set('Cache-Control', 'max-age=60, private');
    return res.sendNegotiated(items, 200);
  } catch (err) {
    next(err);
  }
});

// ── POST /sla/snapshots — Create SLA snapshot (admin only) ────────────────────
app.post('/sla/snapshots', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateCreateSlaSnapshot(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'SLA snapshot validation failed', errors);
    }

    const snap = store.createSlaSnapshot({
      categoryId:             body.categoryId.trim(),
      snapshotDate:           body.snapshotDate.trim(),
      totalFiled:             body.totalFiled,
      totalResolved:          body.totalResolved,
      resolvedWithinSla:      body.resolvedWithinSla || 0,
      breachedSlaCount:       body.breachedSlaCount || 0,
      averageResolutionHours: body.averageResolutionHours || 0.0,
      complianceRatePct:      body.complianceRatePct || 100.0
    });

    res.set('Location', `/sla/snapshots/${snap.snapshotId}`);
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(snap, 201);
  } catch (err) {
    next(err);
  }
});

// ── GET /escalations/reports — List escalation reports (admin only) ───────────
app.get('/escalations/reports', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const { categoryId, isResolved } = req.query;
    const items = store.listEscalationReports({ categoryId, isResolved });
    res.set('Cache-Control', 'max-age=30, private');
    return res.sendNegotiated(items, 200);
  } catch (err) {
    next(err);
  }
});

// ── POST /escalations/reports — File escalation incident report ───────────────
app.post('/escalations/reports', (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateCreateEscalationReport(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Escalation report validation failed', errors);
    }

    const rep = store.createEscalationReport({
      complaintId:         body.complaintId.trim(),
      categoryId:          body.categoryId.trim(),
      initiatorUserId:     body.initiatorUserId.trim(),
      breachHoursExceeded: body.breachHoursExceeded || 0,
      escalationTier:      body.escalationTier ? body.escalationTier.trim() : 'admin',
      reason:              body.reason.trim(),
      isResolved:          false
    });

    res.set('Location', `/escalations/reports/${rep.reportId}`);
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(rep, 201);
  } catch (err) {
    next(err);
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ANALYTICS ERROR]:', err);
  return problem(res, 500, 'internal-error', 'An unexpected internal error occurred. The incident has been recorded.');
});

// ── Server launcher ───────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 8085;
  app.listen(PORT, () => console.log(`Nivaaran Analytics service running on port ${PORT}`));
}

module.exports = app;
