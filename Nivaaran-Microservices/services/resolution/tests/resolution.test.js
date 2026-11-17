/**
 * resolution.test.js - Integration tests for the Resolution service
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
const WARDEN_TOKEN  = makeToken({ sub: 'W101', userId: 'W101', role: 'warden' });
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

describe('Resolution Service Integration Tests', () => {

  test('1. GET /assignments returns 200 with array including seeded assignment', async () => {
    const res = await fetch(`${baseUrl}/assignments`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 1);
    assert.equal(data[0].complaintId, 'cmp_1001');
  });

  test('2. GET /assignments/:id returns 200 with ETag', async () => {
    const res = await fetch(`${baseUrl}/assignments/asgn_1`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.assignmentId, 'asgn_1');
    assert.ok(res.headers.get('etag'));
  });

  test('3. GET /assignments/:id returns 304 on If-None-Match match', async () => {
    const first = await fetch(`${baseUrl}/assignments/asgn_1`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const etag = first.headers.get('etag');
    assert.ok(etag);

    const second = await fetch(`${baseUrl}/assignments/asgn_1`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'If-None-Match': etag
      }
    });
    assert.equal(second.status, 304);
  });

  test('4. GET /assignments/INVALID returns 404', async () => {
    const res = await fetch(`${baseUrl}/assignments/asgn_99999`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(res.status, 404);
  });

  test('5. POST /assignments without token returns 401', async () => {
    const res = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaintId: 'cmp_1002',
        assignedStaffId: 'W101',
        assignedByUserId: 'ADM001',
        departmentScope: 'hostel'
      })
    });
    assert.equal(res.status, 401);
  });

  test('6. POST /assignments with student token returns 403', async () => {
    const res = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STUDENT_TOKEN}`
      },
      body: JSON.stringify({
        complaintId: 'cmp_1002',
        assignedStaffId: 'W101',
        assignedByUserId: 'ADM001',
        departmentScope: 'hostel'
      })
    });
    assert.equal(res.status, 403);
  });

  test('7. POST /assignments with admin token returns 201 with Location', async () => {
    const res = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        complaintId: 'cmp_1002',
        assignedStaffId: 'M201',
        assignedByUserId: 'ADM001',
        departmentScope: 'mess'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.complaintId, 'cmp_1002');
    assert.ok(res.headers.get('location'));
  });

  test('8. POST /assignments duplicate complaintId returns 409', async () => {
    const res = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        complaintId: 'cmp_1001', // already exists
        assignedStaffId: 'W101',
        assignedByUserId: 'ADM001',
        departmentScope: 'hostel'
      })
    });
    assert.equal(res.status, 409);
  });

  test('9. PATCH /assignments/:id updates status with 200 and increments ETag', async () => {
    const first = await fetch(`${baseUrl}/assignments/asgn_1`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const etag = first.headers.get('etag');

    const patchRes = await fetch(`${baseUrl}/assignments/asgn_1`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'If-Match': etag
      },
      body: JSON.stringify({ assignmentStatus: 'completed' })
    });
    assert.equal(patchRes.status, 200);
    const data = await patchRes.json();
    assert.equal(data.assignmentStatus, 'completed');
    assert.ok(data.resolvedAt);
    assert.notEqual(patchRes.headers.get('etag'), etag);
  });

  test('10. PATCH /assignments/:id with wrong If-Match returns 412', async () => {
    const patchRes = await fetch(`${baseUrl}/assignments/asgn_1`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'If-Match': '"stale-etag-value"'
      },
      body: JSON.stringify({ assignmentStatus: 'completed' })
    });
    assert.equal(patchRes.status, 412);
  });

  test('11. GET /roster returns 200 with duty entries', async () => {
    const res = await fetch(`${baseUrl}/roster`, {
      headers: { 'Authorization': `Bearer ${WARDEN_TOKEN}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 2);
  });

  test('12. POST /roster creates duty slot (admin only)', async () => {
    const res = await fetch(`${baseUrl}/roster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        staffUserId: 'S301',
        departmentScope: 'campus',
        shiftDate: '2026-11-18',
        shiftStart: '09:00',
        shiftEnd: '18:00'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.staffUserId, 'S301');
    assert.ok(res.headers.get('location'));
  });

});
