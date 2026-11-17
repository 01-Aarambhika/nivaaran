/**
 * directory.test.js - Integration tests for the Directory service
 *
 * Uses node:test, node:assert/strict, and native fetch on an ephemeral port.
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

const ADMIN_TOKEN = makeToken({ sub: 'ADM001', userId: 'ADM001', role: 'admin' });
const STUDENT_TOKEN = makeToken({ sub: '20251651078', userId: '20251651078', role: 'student' });

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
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

describe('Directory Service Integration Tests', () => {

  test('1. GET /categories returns 200 with array of seeded categories', async () => {
    const res = await fetch(`${baseUrl}/categories`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 3);
    assert.ok(data.some(c => c.categoryId === 'hostel'));
  });

  test('2. GET /categories/:id returns 200 with ETag', async () => {
    const res = await fetch(`${baseUrl}/categories/hostel`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.categoryId, 'hostel');
    assert.ok(res.headers.get('etag'));
  });

  test('3. GET /categories/:id returns 304 on matching If-None-Match', async () => {
    const first = await fetch(`${baseUrl}/categories/hostel`);
    const etag = first.headers.get('etag');
    assert.ok(etag);

    const second = await fetch(`${baseUrl}/categories/hostel`, {
      headers: { 'If-None-Match': etag }
    });
    assert.equal(second.status, 304);
  });

  test('4. GET /categories/INVALID returns 404', async () => {
    const res = await fetch(`${baseUrl}/categories/invalid_category`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.type, '/errors/category-not-found');
  });

  test('5. POST /categories without token returns 401', async () => {
    const res = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: 'transport',
        displayName: 'Transport',
        defaultSlaHours: 48,
        urgentSlaHours: 24,
        escalationTier: 'admin'
      })
    });
    assert.equal(res.status, 401);
  });

  test('6. POST /categories with student token returns 403', async () => {
    const res = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STUDENT_TOKEN}`
      },
      body: JSON.stringify({
        categoryId: 'transport',
        displayName: 'Transport',
        defaultSlaHours: 48,
        urgentSlaHours: 24,
        escalationTier: 'admin'
      })
    });
    assert.equal(res.status, 403);
  });

  test('7. POST /categories with admin token returns 201 with Location', async () => {
    const res = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        categoryId: 'transport',
        displayName: 'Transport',
        defaultSlaHours: 48,
        urgentSlaHours: 24,
        escalationTier: 'admin'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.categoryId, 'transport');
    assert.equal(res.headers.get('location'), '/categories/transport');
  });

  test('8. POST /categories duplicate returns 409', async () => {
    const res = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        categoryId: 'hostel',
        displayName: 'Hostel Duplicate',
        defaultSlaHours: 48,
        urgentSlaHours: 24,
        escalationTier: 'warden'
      })
    });
    assert.equal(res.status, 409);
  });

  test('9. GET /locations returns 200 array', async () => {
    const res = await fetch(`${baseUrl}/locations`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 7);
  });

  test('10. GET /locations?categoryId=hostel filters properly', async () => {
    const res = await fetch(`${baseUrl}/locations?categoryId=hostel`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.every(l => l.categoryId === 'hostel'));
  });

  test('11. GET /locations/:id returns 200 with ETag and 304 on cache hit', async () => {
    const first = await fetch(`${baseUrl}/locations/hostel_block_a`);
    assert.equal(first.status, 200);
    const etag = first.headers.get('etag');
    assert.ok(etag);

    const second = await fetch(`${baseUrl}/locations/hostel_block_a`, {
      headers: { 'If-None-Match': etag }
    });
    assert.equal(second.status, 304);
  });

  test('12. POST /locations with admin token returns 201 with Location', async () => {
    const res = await fetch(`${baseUrl}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        locationId: 'hostel_block_c',
        categoryId: 'hostel',
        zoneName: 'Block C',
        landmark: 'Opposite Mess'
      })
    });
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('location'), '/locations/hostel_block_c');
  });

});
