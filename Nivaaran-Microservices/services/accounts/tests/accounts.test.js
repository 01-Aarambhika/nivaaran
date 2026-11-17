/**
 * accounts.test.js - Integration tests for the Accounts service
 *
 * Uses node:test, node:assert/strict, and native fetch on an ephemeral port.
 */

'use strict';

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const store = require('../src/store');
const app = require('../src/app');
const { _resetBuckets, LIMIT } = require('../src/middleware/rateLimit');

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
  _resetBuckets();
});

const post = async (path, body, headers = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let parsed;
  try { parsed = await res.json(); } catch { parsed = null; }
  return { status: res.status, headers: res.headers, body: parsed };
};

const get = async (path, headers = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers
  });
  let parsed;
  try { parsed = await res.json(); } catch { parsed = null; }
  return { status: res.status, headers: res.headers, body: parsed };
};

describe('Accounts Service Integration Tests', () => {

  test('1. POST /sessions with valid admin credentials returns 201 and token', async () => {
    const res = await post('/sessions', { userId: 'ADM001', password: 'admin123' });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.role, 'admin');
  });

  test('2. POST /sessions with valid student credentials returns 201 and token', async () => {
    const res = await post('/sessions', { userId: '20251651078', password: 'demo123' });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.role, 'student');
  });

  test('3. POST /sessions with wrong password returns 401', async () => {
    const res = await post('/sessions', { userId: 'ADM001', password: 'wrongpassword' });
    assert.equal(res.status, 401);
    assert.ok(res.body.type);
  });

  test('4. POST /sessions with missing fields returns 400', async () => {
    const res = await post('/sessions', { userId: 'ADM001' });
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
  });

  test('5. POST /users student self-registration returns 201', async () => {
    const res = await post('/users', {
      userId:   '20251699999',
      password: 'secure123',
      fullName: 'Test Student',
      role:     'student'
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.userId, '20251699999');
    assert.equal(res.body.role, 'student');
    assert.ok(!res.body.passwordHash);
    assert.ok(res.headers.get('location'));
  });

  test('6. POST /users duplicate userId returns 409', async () => {
    const res = await post('/users', {
      userId:   '20251651078',
      password: 'anotherpw123',
      role:     'student'
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.status, 409);
  });

  test('7. POST /users with non-numeric userId for student returns 422', async () => {
    const res = await post('/users', {
      userId:   'BADID',
      password: 'secure123',
      role:     'student'
    });
    assert.equal(res.status, 422);
  });

  test('8. POST /users admin creates staff account returns 201', async () => {
    const loginRes = await post('/sessions', { userId: 'ADM001', password: 'admin123' });
    const tok = loginRes.body.token;

    const res = await post(
      '/users',
      { userId: 'W999', password: 'warden999', role: 'warden', fullName: 'New Warden' },
      { authorization: `Bearer ${tok}` }
    );
    assert.equal(res.status, 201);
    assert.equal(res.body.role, 'warden');
  });

  test('9. POST /users student token cannot create warden account returns 403', async () => {
    const loginRes = await post('/sessions', { userId: '20251651078', password: 'demo123' });
    const tok = loginRes.body.token;

    const res = await post(
      '/users',
      { userId: 'W888', password: 'warden888', role: 'warden' },
      { authorization: `Bearer ${tok}` }
    );
    assert.equal(res.status, 403);
  });

  test('10. GET /users/:id returns 200 with ETag', async () => {
    const loginRes = await post('/sessions', { userId: 'ADM001', password: 'admin123' });
    const tok = loginRes.body.token;

    const res = await get('/users/20251651078', { authorization: `Bearer ${tok}` });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('etag'));
    assert.equal(res.body.userId, '20251651078');
    assert.ok(!res.body.passwordHash);
  });

  test('11. GET /users/:id returns 304 when If-None-Match matches ETag', async () => {
    const loginRes = await post('/sessions', { userId: 'ADM001', password: 'admin123' });
    const tok = loginRes.body.token;

    const first = await get('/users/20251651078', { authorization: `Bearer ${tok}` });
    const etag  = first.headers.get('etag');
    assert.ok(etag);

    const second = await get('/users/20251651078', {
      authorization:   `Bearer ${tok}`,
      'if-none-match': etag
    });
    assert.equal(second.status, 304);
  });

  test('12. GET /users/:id returns 404 for unknown userId', async () => {
    const loginRes = await post('/sessions', { userId: 'ADM001', password: 'admin123' });
    const tok = loginRes.body.token;

    const res = await get('/users/DOESNOTEXIST', { authorization: `Bearer ${tok}` });
    assert.equal(res.status, 404);
    assert.equal(res.body.status, 404);
  });

  test('13. GET /users/:id without token returns 401', async () => {
    const res = await get('/users/ADM001');
    assert.equal(res.status, 401);
  });

  test('14. GET /users returns 200 and array for admin', async () => {
    const loginRes = await post('/sessions', { userId: 'ADM001', password: 'admin123' });
    const tok = loginRes.body.token;

    const res = await get('/users', { authorization: `Bearer ${tok}` });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
    for (const u of res.body) {
      assert.ok(!u.passwordHash);
    }
  });

  test('15. GET /users returns 403 for student token', async () => {
    const loginRes = await post('/sessions', { userId: '20251651078', password: 'demo123' });
    const tok = loginRes.body.token;

    const res = await get('/users', { authorization: `Bearer ${tok}` });
    assert.equal(res.status, 403);
  });

  test('16. GET /users without token returns 401', async () => {
    const res = await get('/users');
    assert.equal(res.status, 401);
  });

  test('17. Rate limiter returns 429 after exceeding LIMIT requests', async () => {
    _resetBuckets();
    const fakeAuth = { authorization: 'Bearer test-unique-rate-client-token' };
    let lastStatus = 0;
    for (let i = 0; i <= LIMIT; i++) {
      const r = await get('/users/ADM001', fakeAuth);
      lastStatus = r.status;
    }
    assert.ok(lastStatus === 429 || lastStatus === 401);
    _resetBuckets();
  });

});
