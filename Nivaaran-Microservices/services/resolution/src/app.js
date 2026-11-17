/**
 * app.js - Nivaaran Resolution REST Service
 *
 * Implements:
 * - POST /assignments       — create assignment (admin or staff role)
 * - GET  /assignments       — list assignments, filterable by ?complaintId=&staffId=&status=
 * - GET  /assignments/:id   — get one assignment with ETag + 304 support
 * - PATCH /assignments/:id  — update assignment status (guarded by If-Match)
 * - OPTIONS /assignments    — 204 Allow header
 * - OPTIONS /assignments/:id— 204 Allow header
 * - GET  /roster            — list duty roster entries
 * - POST /roster            — create duty roster entry (admin only)
 * - OPTIONS /roster         — 204 Allow header
 *
 * Headers: ETag, Cache-Control, Location, CORS, Security
 * Errors: RFC 7807 Problem Details throughout
 */

'use strict';

const express = require('express');

const store = require('./store');
const { problem } = require('./errors');
const {
  validateCreateAssignment,
  validatePatchAssignment,
  validateCreateRosterEntry
} = require('./validate');
const { headersMiddleware } = require('./middleware/headers');
const { rateLimitMiddleware } = require('./middleware/rateLimit');
const { contentNegotiation } = require('./middleware/negotiation');
const { requireAuth, requireStaffOrAdmin, requireAdmin } = require('./middleware/auth');

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
app.options('/assignments', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(204).end();
});

app.options('/assignments/:id', (req, res) => {
  res.set('Allow', 'GET, PATCH, OPTIONS');
  return res.status(204).end();
});

app.options('/roster', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(204).end();
});

// ── POST /assignments — Create an assignment ──────────────────────────────────
app.post('/assignments', requireAuth, requireStaffOrAdmin, (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateCreateAssignment(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Request body validation failed', errors);
    }

    let assignment;
    try {
      assignment = store.createAssignment({
        complaintId:      body.complaintId.trim(),
        assignedStaffId:  body.assignedStaffId.trim(),
        assignedByUserId: body.assignedByUserId.trim(),
        departmentScope:  body.departmentScope.trim()
      });
    } catch (err) {
      if (err.isConflict) {
        return problem(res, 409, 'assignment-conflict', `An assignment for complaint '${body.complaintId}' already exists.`);
      }
      throw err;
    }

    res.set('Location', `/assignments/${assignment.assignmentId}`);
    res.set('ETag', assignment.getETag());
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(assignment, 201);
  } catch (err) {
    next(err);
  }
});

// ── GET /assignments — List assignments ───────────────────────────────────────
app.get('/assignments', requireAuth, (req, res, next) => {
  try {
    const { complaintId, staffId, status } = req.query;
    const assignments = store.listAssignments({ complaintId, staffId, status });
    res.set('Cache-Control', 'max-age=30, private');
    return res.sendNegotiated(assignments, 200);
  } catch (err) {
    next(err);
  }
});

// ── GET /assignments/:id — Fetch one assignment ───────────────────────────────
app.get('/assignments/:id', requireAuth, (req, res, next) => {
  try {
    const assignment = store.findAssignment(req.params.id);
    if (!assignment) {
      return problem(res, 404, 'not-found', `No assignment with id '${req.params.id}'.`);
    }

    const etag = assignment.getETag();
    res.set('ETag', etag);
    res.set('Cache-Control', 'max-age=60, private, must-revalidate');

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
      return res.status(304).end();
    }

    return res.sendNegotiated(assignment, 200);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /assignments/:id — Update assignment status ─────────────────────────
app.patch('/assignments/:id', requireAuth, requireStaffOrAdmin, (req, res, next) => {
  try {
    const assignment = store.findAssignment(req.params.id);
    if (!assignment) {
      return problem(res, 404, 'not-found', `No assignment with id '${req.params.id}'.`);
    }

    const ifMatch = req.headers['if-match'];
    if (ifMatch && ifMatch !== assignment.getETag()) {
      return problem(
        res,
        412,
        'precondition-failed',
        `Resource has been modified concurrently. Current ETag is ${assignment.getETag()}; requested was ${ifMatch}.`
      );
    }

    const body = req.body || {};
    const errors = validatePatchAssignment(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Patch validation failed', errors);
    }

    const resolvedAt = body.assignmentStatus === 'completed' ? new Date().toISOString() : undefined;
    const updated = store.updateAssignment(req.params.id, {
      assignmentStatus: body.assignmentStatus,
      resolvedAt
    });

    res.set('ETag', updated.getETag());
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(updated, 200);
  } catch (err) {
    next(err);
  }
});

// ── GET /roster — List duty roster ────────────────────────────────────────────
app.get('/roster', requireAuth, (req, res, next) => {
  try {
    const { staffId, date } = req.query;
    const roster = store.listRoster({ staffId, date });
    res.set('Cache-Control', 'max-age=30, private');
    return res.sendNegotiated(roster, 200);
  } catch (err) {
    next(err);
  }
});

// ── POST /roster — Add a duty entry (admin only) ──────────────────────────────
app.post('/roster', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateCreateRosterEntry(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Roster entry validation failed', errors);
    }

    const entry = store.createRosterEntry({
      staffUserId:     body.staffUserId.trim(),
      departmentScope: body.departmentScope.trim(),
      shiftDate:       body.shiftDate.trim(),
      shiftStart:      body.shiftStart.trim(),
      shiftEnd:        body.shiftEnd.trim()
    });

    res.set('Location', `/roster/${entry.rosterId}`);
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(entry, 201);
  } catch (err) {
    next(err);
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[RESOLUTION ERROR]:', err);
  return problem(res, 500, 'internal-error', 'An unexpected internal error occurred. The incident has been recorded.');
});

// ── Server launcher ───────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 8083;
  app.listen(PORT, () => console.log(`Nivaaran Resolution service running on port ${PORT}`));
}

module.exports = app;
