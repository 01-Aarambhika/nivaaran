/**
 * notifications.test.js - Integration tests for the Notifications service
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

describe('Notifications Service Integration Tests', () => {

  test('1. POST /notifications creates notification with 201 + Location', async () => {
    const res = await fetch(`${baseUrl}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientUserId: '20251651078',
        recipientContact: '9876543210',
        channel: 'sms',
        eventType: 'complaint_filed',
        relatedComplaintId: 'cmp_1002',
        title: 'Grievance Registered',
        body: 'Complaint CMP-2026-1002 has been filed successfully.'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.notificationId);
    assert.equal(data.deliveryStatus, 'sent');
    assert.ok(data.externalProviderId);
    assert.ok(res.headers.get('location'));
    assert.ok(res.headers.get('etag'));
  });

  test('2. POST /notifications with email sets deliveryStatus queued', async () => {
    const res = await fetch(`${baseUrl}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientUserId: 'W101',
        recipientContact: 'warden@iiitv.ac.in',
        channel: 'email',
        eventType: 'assigned',
        title: 'Task Assigned',
        body: 'Please check your portal for assignments.'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.deliveryStatus, 'queued');
  });

  test('3. POST /notifications missing required fields returns 422', async () => {
    const res = await fetch(`${baseUrl}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'sms'
      })
    });
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.type, '/errors/validation-failed');
    assert.ok(Array.isArray(data.errors));
    assert.ok(data.errors.length >= 2);
  });

  test('4. POST /notifications with invalid channel returns 422', async () => {
    const res = await fetch(`${baseUrl}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientUserId: '20251651078',
        recipientContact: '9876543210',
        channel: 'fax',
        eventType: 'test',
        title: 'Test',
        body: 'Test body'
      })
    });
    assert.equal(res.status, 422);
  });

  test('5. GET /notifications without admin token returns 401/403', async () => {
    const res = await fetch(`${baseUrl}/notifications`);
    assert.equal(res.status, 401);

    const resForbidden = await fetch(`${baseUrl}/notifications`, {
      headers: { 'Authorization': `Bearer ${STUDENT_TOKEN}` }
    });
    assert.equal(resForbidden.status, 403);
  });

  test('6. GET /notifications with admin token returns 200 array', async () => {
    const res = await fetch(`${baseUrl}/notifications`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 2);
  });

  test('7. GET /notifications?recipientUserId=20251651078 filters correctly', async () => {
    const res = await fetch(`${baseUrl}/notifications?recipientUserId=20251651078`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.every(n => n.recipientUserId === '20251651078'));
  });

  test('8. GET /notifications/:id returns 200 with ETag', async () => {
    const res = await fetch(`${baseUrl}/notifications/notif_1`, {
      headers: { 'Authorization': `Bearer ${STUDENT_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.notificationId, 'notif_1');
    assert.ok(res.headers.get('etag'));
  });

  test('9. GET /notifications/:id returns 304 on matching If-None-Match', async () => {
    const first = await fetch(`${baseUrl}/notifications/notif_1`, {
      headers: { 'Authorization': `Bearer ${STUDENT_TOKEN}` }
    });
    const etag = first.headers.get('etag');

    const second = await fetch(`${baseUrl}/notifications/notif_1`, {
      headers: {
        'Authorization': `Bearer ${STUDENT_TOKEN}`,
        'If-None-Match': etag
      }
    });
    assert.equal(second.status, 304);
  });

  test('10. GET /notifications/INVALID returns 404', async () => {
    const res = await fetch(`${baseUrl}/notifications/notif_9999`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 404);
  });

  test('11. PATCH /notifications/:id updates delivery status with 200', async () => {
    const first = await fetch(`${baseUrl}/notifications/notif_2`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const etag = first.headers.get('etag');

    const patchRes = await fetch(`${baseUrl}/notifications/notif_2`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'If-Match': etag
      },
      body: JSON.stringify({ deliveryStatus: 'delivered' })
    });
    assert.equal(patchRes.status, 200);
    const data = await patchRes.json();
    assert.equal(data.deliveryStatus, 'delivered');
  });

  test('12. PATCH /notifications/:id with stale If-Match returns 412', async () => {
    const patchRes = await fetch(`${baseUrl}/notifications/notif_2`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'If-Match': '"stale-etag"'
      },
      body: JSON.stringify({ deliveryStatus: 'delivered' })
    });
    assert.equal(patchRes.status, 412);
  });

});
