/**
 * tests/complaints.test.js - Comprehensive Test Suite
 *
 * Covers:
 * - A4: Create, Idempotent Repeat, 404, 409
 * - A5: ETag, Conditional GET (304), Conditional Write (412), OPTIONS, Bearer Auth (401),
 *       Rate limit signaling (X-RateLimit headers)
 * - A6: Honest Status Codes (201, 200, 204, 304, 400, 401, 404, 406, 409, 412, 422),
 *       Field-level 422 reporting multiple errors, Content Negotiation (XML / 406),
 *       RFC 7807 Problem Details
 */

const { test, describe, beforeEach, after, before } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const store = require('../src/store');
const { _resetBuckets } = require('../src/middleware/rateLimit');

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
  store._clear();
  _resetBuckets();
});

const AUTH_HEADER = { 'Authorization': 'Bearer test-jwt-token-ritik' };

const VALID_PAYLOAD = {
  userId: '20251651078',
  categoryId: 'hostel',
  locationId: 'hostel_block_a',
  title: 'Water tap leaking in room 302',
  description: 'Tap has been dripping continuously since yesterday morning.',
  priority: 'normal'
};

describe('Nivaaran Complaints Service Test Suite (A4, A5, A6)', () => {

  // 1. Create with 201 + Location + ETag
  test('1. POST /complaints creates complaint with 201, Location, and ETag', async () => {
    const res = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AUTH_HEADER
      },
      body: JSON.stringify(VALID_PAYLOAD)
    });

    assert.equal(res.status, 201);
    assert.match(res.headers.get('location'), /^\/complaints\/cmp_\d+$/);
    assert.ok(res.headers.get('etag'));
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.ok(res.headers.get('x-ratelimit-limit'));

    const data = await res.json();
    assert.equal(data.title, VALID_PAYLOAD.title);
    assert.equal(data.status, 'submitted');
    assert.equal(data.isEscalated, false);
    // Ensure internal record secrets never leak into representation
    assert.equal(data.internalAuditSecret, undefined);
    assert.equal(data.idempotencyKey, undefined);
  });

  // 2. Idempotent repeat returns original 200
  test('2. Idempotent repeat with same Idempotency-Key returns original 200 without duplicate', async () => {
    const key = 'idem-test-key-001';

    const res1 = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        ...AUTH_HEADER
      },
      body: JSON.stringify(VALID_PAYLOAD)
    });
    assert.equal(res1.status, 201);
    const d1 = await res1.json();

    const res2 = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        ...AUTH_HEADER
      },
      body: JSON.stringify(VALID_PAYLOAD)
    });
    assert.equal(res2.status, 200);
    const d2 = await res2.json();

    assert.equal(d1.id, d2.id);
    assert.equal(d1.trackingNumber, d2.trackingNumber);
    assert.equal(store.list().length, 1);
  });

  // 3. Authorization guard (401)
  test('3. Missing Authorization header returns 401 Unauthorized with WWW-Authenticate', async () => {
    const res = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_PAYLOAD)
    });

    assert.equal(res.status, 401);
    assert.ok(res.headers.get('www-authenticate'));
    const prob = await res.json();
    assert.equal(prob.type, '/errors/unauthorized');
    assert.equal(prob.status, 401);
  });

  // 4. Field-level 422 reporting multiple bad fields
  test('4. Field-level 422 reports two bad fields at once', async () => {
    const badBody = {
      title: 'Bad', // too short (< 5 chars)
      categoryId: 'invalid_category' // invalid enum
      // missing userId, locationId, description
    };

    const res = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AUTH_HEADER
      },
      body: JSON.stringify(badBody)
    });

    assert.equal(res.status, 422);
    assert.equal(res.headers.get('content-type'), 'application/problem+json; charset=utf-8');

    const prob = await res.json();
    assert.equal(prob.type, '/errors/validation-failed');
    assert.equal(prob.status, 422);
    assert.ok(Array.isArray(prob.errors));
    assert.ok(prob.errors.length >= 2);

    const fields = prob.errors.map(e => e.field);
    assert.ok(fields.includes('title'));
    assert.ok(fields.includes('categoryId'));
  });

  // 5. Conditional GET with ETag (304 Not Modified)
  test('5. Conditional GET with matching If-None-Match returns 304 Not Modified with no body', async () => {
    // Create complaint
    const createRes = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify(VALID_PAYLOAD)
    });
    const created = await createRes.json();
    const etag = createRes.headers.get('etag');

    // GET with If-None-Match
    const getRes = await fetch(`${baseUrl}/complaints/${created.id}`, {
      headers: { 'If-None-Match': etag }
    });

    assert.equal(getRes.status, 304);
    const text = await getRes.text();
    assert.equal(text, ''); // RFC compliant: no body on 304
  });

  // 6. Conditional Write with If-Match (412 Precondition Failed)
  test('6. Conditional PATCH with mismatched If-Match returns 412 Precondition Failed', async () => {
    const createRes = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify(VALID_PAYLOAD)
    });
    const created = await createRes.json();

    // Send stale If-Match
    const patchRes = await fetch(`${baseUrl}/complaints/${created.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'If-Match': '"stale-etag-v999"',
        ...AUTH_HEADER
      },
      body: JSON.stringify({ title: 'New updated title for tap' })
    });

    assert.equal(patchRes.status, 412);
    const prob = await patchRes.json();
    assert.equal(prob.type, '/errors/precondition-failed');
    assert.equal(prob.status, 412);
  });

  // 7. Successful PATCH with matching If-Match
  test('7. Conditional PATCH with matching If-Match succeeds with 200 and updates ETag', async () => {
    const createRes = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify(VALID_PAYLOAD)
    });
    const created = await createRes.json();
    const etag = createRes.headers.get('etag');

    const patchRes = await fetch(`${baseUrl}/complaints/${created.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'If-Match': etag,
        ...AUTH_HEADER
      },
      body: JSON.stringify({ title: 'Fixed title description tap' })
    });

    assert.equal(patchRes.status, 200);
    const updated = await patchRes.json();
    assert.equal(updated.title, 'Fixed title description tap');
    const newEtag = patchRes.headers.get('etag');
    assert.notEqual(etag, newEtag); // ETag must change when resource changes
  });

  // 8. DELETE returns 204 No Content
  test('8. DELETE /complaints/:id returns 204 No Content', async () => {
    const createRes = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify(VALID_PAYLOAD)
    });
    const created = await createRes.json();

    const delRes = await fetch(`${baseUrl}/complaints/${created.id}`, {
      method: 'DELETE',
      headers: { ...AUTH_HEADER }
    });

    assert.equal(delRes.status, 204);
    assert.equal(await delRes.text(), '');

    // Second GET returns 404
    const getRes = await fetch(`${baseUrl}/complaints/${created.id}`);
    assert.equal(getRes.status, 404);
  });

  // 9. OPTIONS returns Allow header
  test('9. OPTIONS /complaints returns 204 with Allow header and CORS', async () => {
    const res = await fetch(`${baseUrl}/complaints`, { method: 'OPTIONS' });
    assert.equal(res.status, 204);
    assert.ok(res.headers.get('allow'));
    assert.ok(res.headers.get('access-control-allow-origin'));
  });

  // 10. Content Negotiation: XML vs 406
  test('10. Content Negotiation: XML succeeds when asked; unsupported returns 406', async () => {
    const createRes = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify(VALID_PAYLOAD)
    });
    const created = await createRes.json();

    // Accept: application/xml
    const xmlRes = await fetch(`${baseUrl}/complaints/${created.id}`, {
      headers: { 'Accept': 'application/xml' }
    });
    assert.equal(xmlRes.status, 200);
    assert.match(xmlRes.headers.get('content-type'), /application\/xml/);
    const xmlText = await xmlRes.text();
    assert.match(xmlText, /<complaint id="cmp_\d+">/);

    // Accept: text/csv -> 406 Not Acceptable
    const csvRes = await fetch(`${baseUrl}/complaints/${created.id}`, {
      headers: { 'Accept': 'text/csv' }
    });
    assert.equal(csvRes.status, 406);
    const prob = await csvRes.json();
    assert.equal(prob.type, '/errors/not-acceptable');
    assert.equal(prob.status, 406);
  });

  // 11. State Conflict on Escalate (409)
  test('11. Escalate already escalated complaint returns 409 Conflict', async () => {
    const createRes = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify(VALID_PAYLOAD)
    });
    const created = await createRes.json();

    // First escalate -> 200
    const esc1 = await fetch(`${baseUrl}/complaints/${created.id}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify({ initiatorId: '20251651078', reason: 'Turnaround overdue' })
    });
    assert.equal(esc1.status, 200);

    // Second escalate -> 409
    const esc2 = await fetch(`${baseUrl}/complaints/${created.id}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
      body: JSON.stringify({ initiatorId: '20251651078', reason: 'Repeated escalate' })
    });
    assert.equal(esc2.status, 409);
    const prob = await esc2.json();
    assert.equal(prob.type, '/errors/state-conflict');
    assert.equal(prob.status, 409);
  });

});
