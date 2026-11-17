/**
 * analytics.test.js - Integration tests for the Analytics & Audit service
 */

'use strict';

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');

const store = require('../src/store');
const app = require('../src/app');

const JWT_SECRET = 'nivaaran-dev-secret';

function makeToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + 3600 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

const ADMIN_TOKEN   = makeToken({ sub: 'ADM001', userId: 'ADM001', role: 'admin' });
const STUDENT_TOKEN = makeToken({ sub: '20251651078', userId: '20251651078', role: 'student' });

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  store._reseed();
});

describe('Analytics & Audit Service Integration Tests', () => {

  test('1. POST /audit/events creates immutable event with 201 + Location + ETag', async () => {
    const res = await fetch(`${baseUrl}/audit/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'complaint_created',
        entityType: 'complaint',
        entityId: 'cmp_1002',
        actorUserId: '20251651078',
        actorRole: 'student',
        originService: 'complaints',
        newState: 'submitted',
        payloadSnapshot: { title: 'Broken window in mess' }
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.eventId);
    assert.equal(data.entityId, 'cmp_1002');
    assert.ok(res.headers.get('location'));
    assert.ok(res.headers.get('etag'));
  });

  test('2. POST /audit/events missing required fields returns 422', async () => {
    const res = await fetch(`${baseUrl}/audit/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'status_changed'
        // missing entityType, entityId, originService
      })
    });
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.type, '/errors/validation-failed');
    assert.ok(Array.isArray(data.errors));
    assert.ok(data.errors.length >= 2);
  });

  test('3. GET /audit/events with admin token returns 200 array', async () => {
    const res = await fetch(`${baseUrl}/audit/events`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 2);
  });

  test('4. GET /audit/events?entityType=complaint filters correctly', async () => {
    const res = await fetch(`${baseUrl}/audit/events?entityType=complaint`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.every(e => e.entityType === 'complaint'));
  });

  test('5. GET /audit/events/:id returns 200 with ETag', async () => {
    const res = await fetch(`${baseUrl}/audit/events/evt_1`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.eventId, 'evt_1');
    assert.ok(res.headers.get('etag'));
  });

  test('6. GET /audit/events/:id returns 304 on matching If-None-Match', async () => {
    const first = await fetch(`${baseUrl}/audit/events/evt_1`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const etag = first.headers.get('etag');

    const second = await fetch(`${baseUrl}/audit/events/evt_1`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'If-None-Match': etag
      }
    });
    assert.equal(second.status, 304);
  });

  test('7. GET /audit/events/BADID returns 404', async () => {
    const res = await fetch(`${baseUrl}/audit/events/evt_99999`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 404);
  });

  test('8. GET /audit/events without admin token returns 401/403', async () => {
    const resNoAuth = await fetch(`${baseUrl}/audit/events`);
    assert.equal(resNoAuth.status, 401);

    const resForbidden = await fetch(`${baseUrl}/audit/events`, {
      headers: { 'Authorization': `Bearer ${STUDENT_TOKEN}` }
    });
    assert.equal(resForbidden.status, 403);
  });

  test('9. GET /sla/snapshots returns 200 array for admin', async () => {
    const res = await fetch(`${baseUrl}/sla/snapshots`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 2);
  });

  test('10. POST /sla/snapshots creates SLA snapshot with 201', async () => {
    const res = await fetch(`${baseUrl}/sla/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        categoryId: 'campus',
        snapshotDate: '2026-11-17',
        totalFiled: 8,
        totalResolved: 7,
        resolvedWithinSla: 6,
        breachedSlaCount: 1,
        averageResolutionHours: 28.4,
        complianceRatePct: 85.71
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.categoryId, 'campus');
    assert.ok(res.headers.get('location'));
  });

  test('11. GET /escalations/reports returns 200 array for admin', async () => {
    const res = await fetch(`${baseUrl}/escalations/reports`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 1);
  });

  test('12. POST /escalations/reports creates report with 201', async () => {
    const res = await fetch(`${baseUrl}/escalations/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaintId: 'cmp_1002',
        categoryId: 'mess',
        initiatorUserId: '20251651078',
        breachHoursExceeded: 8.0,
        escalationTier: 'mess_incharge',
        reason: 'SLA turnaround expired for urgent food quality issue'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.complaintId, 'cmp_1002');
    assert.ok(res.headers.get('location'));
  });

});
