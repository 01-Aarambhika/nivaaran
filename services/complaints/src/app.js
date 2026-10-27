/**
 * app.js - Nivaaran Complaints REST Service (Assignments 4, 5, 6)
 *
 * Fully implements:
 * - HTTP Methods: GET, POST, PATCH, DELETE, OPTIONS
 * - Content Negotiation: JSON default, XML support, 406 on unsupported
 * - Headers: Content-Type, Accept, Authorization, Location, Cache-Control, ETag,
 *            If-None-Match, If-Match, Idempotency-Key, X-RateLimit, CORS, Security
 * - Safe Retries & Optimistic Concurrency:
 *   - 304 Not Modified on conditional GET
 *   - 412 Precondition Failed on stale conditional PATCH
 *   - 200 on Idempotent repeat
 * - Honest Status Codes: 201, 200, 204, 304, 400, 401, 404, 406, 409, 412, 422, 429, 500
 * - Single RFC 7807 Problem Details error shape everywhere
 * - Never leaks internal errors to client
 */

const express = require('express');
const store = require('./store');
const { problem } = require('./errors');
const {
  validateCreateComplaint,
  validatePatchComplaint,
  validateEscalate,
  validateComment
} = require('./validate');
const { validateUser, UserVerificationError, AccountsUnavailableError } = require('./accountsClient');
const { headersMiddleware } = require('./middleware/headers');
const { rateLimitMiddleware } = require('./middleware/rateLimit');
const { requireAuth } = require('./middleware/auth');
const { contentNegotiation } = require('./middleware/negotiation');

const app = express();

// 1. Method override and security/CORS headers
app.use(headersMiddleware);

// 2. Per-client Rate Limiting
app.use(rateLimitMiddleware);

// 3. Content Negotiation (JSON/XML and 406 handling)
app.use(contentNegotiation);

// 4. JSON body parser with malformed syntax handler
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return problem(res, 400, 'invalid-request', 'Malformed JSON in request body');
  }
  next(err);
});

// -----------------------------------------------------------------------------
// OPTIONS /complaints & /complaints/:id
// -----------------------------------------------------------------------------
app.options('/complaints', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(204).end();
});

app.options('/complaints/:id', (req, res) => {
  res.set('Allow', 'GET, PATCH, DELETE, OPTIONS');
  return res.status(204).end();
});

// -----------------------------------------------------------------------------
// POST /complaints - File a grievance (Protected, Idempotent, Validated)
// -----------------------------------------------------------------------------
app.post('/complaints', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};

    // 1. Validate request body (validate-then-act)
    const errors = validateCreateComplaint(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Request body validation failed', errors);
    }

    // 2. Idempotency-Key check
    const key = req.headers['idempotency-key'];
    if (key) {
      const prior = store.findByKey(key);
      if (prior) {
        res.set('ETag', prior.getETag());
        res.set('Location', `/complaints/${prior.id}`);
        return res.sendNegotiated(prior, 200);
      }
    }

    // 3. Cross-service verification: Accounts service
    try {
      await validateUser(body.userId, { allowFallback: true });
    } catch (err) {
      if (err instanceof UserVerificationError) {
        return problem(res, 422, 'validation-failed', err.message, [{ field: 'userId', msg: err.message }]);
      }
      if (err instanceof AccountsUnavailableError) {
        return problem(res, 503, 'service-unavailable', 'Accounts service is temporarily unreachable');
      }
      throw err;
    }

    // 4. Persist
    const complaint = store.create({
      userId: body.userId,
      categoryId: body.categoryId,
      locationId: body.locationId,
      title: body.title,
      description: body.description,
      priority: body.priority || 'normal',
      isAnonymous: body.isAnonymous || false,
      key: key || null
    });

    // 5. Response headers
    res.set('Location', `/complaints/${complaint.id}`);
    res.set('ETag', complaint.getETag());
    res.set('Cache-Control', 'no-store');

    return res.sendNegotiated(complaint, 201);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /complaints/:id - Read one (Safe, Cacheable, Conditional GET)
// -----------------------------------------------------------------------------
app.get('/complaints/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = store.find(id);

    if (!complaint) {
      return problem(res, 404, 'complaint-not-found', `No complaint with id ${id}`);
    }

    const etag = complaint.getETag();
    res.set('ETag', etag);
    res.set('Cache-Control', 'max-age=60, private, must-revalidate');

    // Conditional GET: check If-None-Match
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
      return res.status(304).end(); // No body sent
    }

    return res.sendNegotiated(complaint, 200);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /complaints - Filtered list (Safe, Pure Read, Query Params)
// -----------------------------------------------------------------------------
app.get('/complaints', (req, res, next) => {
  try {
    const { category, status } = req.query;

    if (category && !['hostel', 'mess', 'campus'].includes(category)) {
      return problem(res, 400, 'invalid-request', `Invalid category filter '${category}'. Allowed: hostel, mess, campus.`);
    }
    if (status && !['submitted', 'assigned', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return problem(res, 400, 'invalid-request', `Invalid status filter '${status}'.`);
    }

    res.set('Cache-Control', 'max-age=30, private');
    const items = store.list({ category, status });
    return res.sendNegotiated(items, 200);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// PATCH /complaints/:id - Modify (Protected, Conditional Write with If-Match)
// -----------------------------------------------------------------------------
app.patch('/complaints/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = store.find(id);

    if (!complaint) {
      return problem(res, 404, 'complaint-not-found', `No complaint with id ${id}`);
    }

    // Conditional Write: check If-Match
    const ifMatch = req.headers['if-match'];
    if (ifMatch && ifMatch !== complaint.getETag()) {
      return problem(
        res,
        412,
        'precondition-failed',
        `Resource has been modified concurrently. Current ETag is ${complaint.getETag()}; requested was ${ifMatch}. Refresh before editing.`
      );
    }

    const body = req.body || {};
    const errors = validatePatchComplaint(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Patch validation failed', errors);
    }

    const updated = store.patch(id, body);
    res.set('ETag', updated.getETag());
    res.set('Cache-Control', 'no-store');

    return res.sendNegotiated(updated, 200);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// DELETE /complaints/:id - Cancel/Withdraw draft (Protected, Idempotent)
// -----------------------------------------------------------------------------
app.delete('/complaints/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = store.find(id);

    if (!complaint) {
      return problem(res, 404, 'complaint-not-found', `No complaint with id ${id}`);
    }

    try {
      store.remove(id);
    } catch (err) {
      if (err.isConflict) {
        return problem(res, 409, 'state-conflict', err.message);
      }
      throw err;
    }

    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// POST /complaints/:id/escalate - State-changing sub-resource (Protected)
// -----------------------------------------------------------------------------
app.post('/complaints/:id/escalate', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = store.find(id);

    if (!complaint) {
      return problem(res, 404, 'complaint-not-found', `No complaint with id ${id}`);
    }

    if (complaint.isEscalated) {
      return problem(res, 409, 'state-conflict', `Complaint ${id} is already in escalated state`);
    }

    const body = req.body || {};
    const errors = validateEscalate(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Escalation request validation failed', errors);
    }

    const updated = store.escalate(id, {
      initiatorId: body.initiatorId,
      reason: body.reason
    });

    res.set('ETag', updated.getETag());
    res.set('Cache-Control', 'no-store');

    return res.sendNegotiated(updated, 200);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// POST /complaints/:id/comments - Discussion thread (Protected)
// -----------------------------------------------------------------------------
app.post('/complaints/:id/comments', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = store.find(id);

    if (!complaint) {
      return problem(res, 404, 'complaint-not-found', `No complaint with id ${id}`);
    }

    const body = req.body || {};
    const errors = validateComment(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Comment validation failed', errors);
    }

    const comment = store.addComment(id, {
      authorId: body.authorId,
      authorRole: body.authorRole || 'student',
      message: body.message
    });

    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(comment, 201);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /complaints/:id/comments - Retrieve discussion thread
// -----------------------------------------------------------------------------
app.get('/complaints/:id/comments', (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = store.find(id);

    if (!complaint) {
      return problem(res, 404, 'complaint-not-found', `No complaint with id ${id}`);
    }

    const comments = store.getComments(id);
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(comments, 200);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Global Error Handler - Mask Internal Failures (Rule B4 in A6)
// -----------------------------------------------------------------------------
app.use((err, req, res, next) => {
  // Log full error stack server-side for diagnostics
  console.error('[SERVER ERROR]:', err);

  // Return clean, mapped problem details without leaking DB strings or stack traces
  return problem(
    res,
    500,
    'internal-error',
    'An unexpected internal error occurred. The incident has been recorded.'
  );
});

// Server launcher
if (require.main === module) {
  const PORT = process.env.PORT || 8082;
  app.listen(PORT, () => {
    console.log(`Nivaaran Complaints service running on port ${PORT}`);
  });
}

module.exports = app;
