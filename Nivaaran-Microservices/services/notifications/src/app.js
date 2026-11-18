/**
 * app.js - Nivaaran Notifications REST Service
 *
 * Implements:
 * - POST  /notifications       — create / dispatch notification
 * - GET   /notifications       — list notifications (admin only, filterable)
 * - GET   /notifications/:id   — get one notification with ETag + 304 support
 * - PATCH /notifications/:id   — update delivery status (admin only, If-Match guard)
 * - OPTIONS /notifications     — 204 Allow header
 * - OPTIONS /notifications/:id — 204 Allow header
 *
 * Headers: ETag, Cache-Control, Location, CORS, Security
 * Errors: RFC 7807 Problem Details throughout
 */

'use strict';

const crypto = require('node:crypto');
const express = require('express');

const store = require('./store');
const { problem } = require('./errors');
const { validateCreateNotification, validatePatchNotification } = require('./validate');
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
app.options('/notifications', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(204).end();
});

app.options('/notifications/:id', (req, res) => {
  res.set('Allow', 'GET, PATCH, OPTIONS');
  return res.status(204).end();
});

// ── Helper: simulate SMS send ─────────────────────────────────────────────────
function simulateSend(channel) {
  if (channel === 'sms') {
    return {
      status: 'sent',
      providerId: `sms_gw_${crypto.randomBytes(6).toString('hex')}`,
      sentAt: new Date().toISOString()
    };
  }
  return {
    status: 'queued',
    providerId: null,
    sentAt: null
  };
}

// ── POST /notifications — Dispatch or queue a notification ────────────────────
app.post('/notifications', (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateCreateNotification(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Request body validation failed', errors);
    }

    const { status, providerId, sentAt } = simulateSend(body.channel);

    const notif = store.create({
      recipientUserId:    body.recipientUserId.trim(),
      recipientContact:   body.recipientContact.trim(),
      channel:            body.channel.trim(),
      eventType:          body.eventType.trim(),
      relatedComplaintId: body.relatedComplaintId ? body.relatedComplaintId.trim() : null,
      title:              body.title.trim(),
      body:               body.body.trim(),
      deliveryStatus:     status,
      externalProviderId: providerId,
      sentAt:             sentAt
    });

    res.set('Location', `/notifications/${notif.notificationId}`);
    res.set('ETag', notif.getETag());
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(notif, 201);
  } catch (err) {
    next(err);
  }
});

// ── GET /notifications — List notifications (self or admin) ───────────────────
app.get('/notifications', requireAuth, (req, res, next) => {
  try {
    const { recipientUserId, status, channel } = req.query;
    // Allow users to read their own notifications, or admin to read all/any
    let targetUser = recipientUserId;
    if (req.user.role !== 'admin') {
      targetUser = req.user.userId;
    }
    const items = store.list({ recipientUserId: targetUser, status, channel });
    res.set('Cache-Control', 'max-age=30, private');
    return res.sendNegotiated(items, 200);
  } catch (err) {
    next(err);
  }
});

// ── GET /notifications/:id — Fetch one notification ───────────────────────────
app.get('/notifications/:id', requireAuth, (req, res, next) => {
  try {
    const notif = store.find(req.params.id);
    if (!notif) {
      return problem(res, 404, 'not-found', `No notification with id '${req.params.id}'.`);
    }

    const etag = notif.getETag();
    res.set('ETag', etag);
    res.set('Cache-Control', 'max-age=60, private, must-revalidate');

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
      return res.status(304).end();
    }

    return res.sendNegotiated(notif, 200);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /notifications/:id — Update delivery status (admin only) ────────────
app.patch('/notifications/:id', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const notif = store.find(req.params.id);
    if (!notif) {
      return problem(res, 404, 'not-found', `No notification with id '${req.params.id}'.`);
    }

    const ifMatch = req.headers['if-match'];
    if (ifMatch && ifMatch !== notif.getETag()) {
      return problem(
        res,
        412,
        'precondition-failed',
        `Resource has been modified concurrently. Current ETag is ${notif.getETag()}; requested was ${ifMatch}.`
      );
    }

    const body = req.body || {};
    const errors = validatePatchNotification(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Patch validation failed', errors);
    }

    const updated = store.update(req.params.id, {
      deliveryStatus: body.deliveryStatus,
      sentAt: body.deliveryStatus === 'delivered' || body.deliveryStatus === 'sent' ? new Date().toISOString() : undefined
    });

    res.set('ETag', updated.getETag());
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(updated, 200);
  } catch (err) {
    next(err);
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[NOTIFICATIONS ERROR]:', err);
  return problem(res, 500, 'internal-error', 'An unexpected internal error occurred. The incident has been recorded.');
});

// ── Server launcher ───────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 8084;
  app.listen(PORT, () => console.log(`Nivaaran Notifications service running on port ${PORT}`));
}

module.exports = app;
