/**
 * app.js - Nivaaran Directory REST Service
 *
 * Implements:
 * - GET  /categories        — list all categories (public, cacheable 300s)
 * - GET  /categories/:id    — one category with ETag + 304 support
 * - POST /categories        — create category (admin only)
 * - OPTIONS /categories     — 204 with Allow
 * - GET  /locations         — list all locations, optional ?categoryId= filter
 * - GET  /locations/:id     — one location with ETag + 304 support
 * - POST /locations         — create location (admin only)
 * - OPTIONS /locations      — 204 with Allow
 *
 * Headers: ETag, Cache-Control, Location, CORS, Security
 * Errors:  RFC 7807 Problem Details throughout
 */

const express = require('express');

const store = require('./store');
const { problem } = require('./errors');
const { validateCreateCategory, validateCreateLocation } = require('./validate');
const { headersMiddleware } = require('./middleware/headers');
const { rateLimitMiddleware } = require('./middleware/rateLimit');
const { contentNegotiation } = require('./middleware/negotiation');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();

// ── Middleware stack ──────────────────────────────────────────────────────────
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
app.options('/categories', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(204).end();
});

app.options('/categories/:id', (req, res) => {
  res.set('Allow', 'GET, OPTIONS');
  return res.status(204).end();
});

app.options('/locations', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(204).end();
});

app.options('/locations/:id', (req, res) => {
  res.set('Allow', 'GET, OPTIONS');
  return res.status(204).end();
});

// ── GET /categories — List all ────────────────────────────────────────────────
app.get('/categories', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    const categories = await store.listCategories();
    return res.sendNegotiated(categories, 200);
  } catch (err) {
    next(err);
  }
});

// ── GET /categories/:id — Fetch one ──────────────────────────────────────────
app.get('/categories/:id', async (req, res, next) => {
  try {
    const cat = await store.findCategory(req.params.id);
    if (!cat) {
      return problem(res, 404, 'category-not-found', `No category with categoryId '${req.params.id}'.`);
    }

    const etag = cat.getETag();
    res.set('ETag', etag);
    res.set('Cache-Control', 'public, max-age=300, must-revalidate');

    // Conditional GET
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
      return res.status(304).end();
    }

    return res.sendNegotiated(cat, 200);
  } catch (err) {
    next(err);
  }
});

// ── POST /categories — Create (admin only) ────────────────────────────────────
app.post('/categories', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};

    const errors = validateCreateCategory(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Request body validation failed', errors);
    }

    let cat;
    try {
      cat = await store.createCategory({
        categoryId:      body.categoryId.trim(),
        displayName:     body.displayName.trim(),
        description:     body.description || '',
        defaultSlaHours: body.defaultSlaHours,
        urgentSlaHours:  body.urgentSlaHours,
        escalationTier:  body.escalationTier.trim()
      });
    } catch (err) {
      if (err.isConflict) {
        return problem(res, 409, 'category-conflict', `A category with categoryId '${body.categoryId}' already exists.`);
      }
      throw err;
    }

    res.set('Location', `/categories/${cat.categoryId}`);
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(cat, 201);
  } catch (err) {
    next(err);
  }
});

// ── GET /locations — List all (with optional ?categoryId= filter) ─────────────
app.get('/locations', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    const filterCategoryId = req.query.categoryId || null;
    const locations = await store.listLocations(filterCategoryId);
    return res.sendNegotiated(locations, 200);
  } catch (err) {
    next(err);
  }
});

// ── GET /locations/:id — Fetch one ───────────────────────────────────────────
app.get('/locations/:id', async (req, res, next) => {
  try {
    const loc = await store.findLocation(req.params.id);
    if (!loc) {
      return problem(res, 404, 'location-not-found', `No location with locationId '${req.params.id}'.`);
    }

    const etag = loc.getETag();
    res.set('ETag', etag);
    res.set('Cache-Control', 'public, max-age=300, must-revalidate');

    // Conditional GET
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
      return res.status(304).end();
    }

    return res.sendNegotiated(loc, 200);
  } catch (err) {
    next(err);
  }
});

// ── POST /locations — Create (admin only) ─────────────────────────────────────
app.post('/locations', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};

    const errors = validateCreateLocation(body);
    if (errors.length > 0) {
      return problem(res, 422, 'validation-failed', 'Request body validation failed', errors);
    }

    let loc;
    try {
      loc = await store.createLocation({
        locationId: body.locationId.trim(),
        categoryId: body.categoryId.trim(),
        zoneName:   body.zoneName.trim(),
        landmark:   body.landmark || ''
      });
    } catch (err) {
      if (err.isConflict) {
        return problem(res, 409, 'location-conflict', `A location with locationId '${body.locationId}' already exists.`);
      }
      throw err;
    }

    res.set('Location', `/locations/${loc.locationId}`);
    res.set('Cache-Control', 'no-store');
    return res.sendNegotiated(loc, 201);
  } catch (err) {
    next(err);
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[DIRECTORY ERROR]:', err);
  return problem(res, 500, 'internal-error', 'An unexpected internal error occurred. The incident has been recorded.');
});

// ── Server launcher ───────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 8081;
  app.listen(PORT, () => console.log(`Nivaaran Directory service running on port ${PORT}`));
}

module.exports = app;
