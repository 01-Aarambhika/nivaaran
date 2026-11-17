/**
 * store.js - Private storage for categories and locations with MySQL connection & fallback
 */

const { Category, Location } = require('./models');
const db = require('./db');

const _categories = new Map();
const _locations  = new Map();

function seedCategories() {
  const cats = [
    { categoryId: 'hostel', displayName: 'Hostel',  defaultSlaHours: 48, urgentSlaHours: 24, description: 'Hostel block issues',      escalationTier: 'warden'       },
    { categoryId: 'mess',   displayName: 'Mess',    defaultSlaHours: 24, urgentSlaHours: 12, description: 'Mess and dining issues',    escalationTier: 'mess_incharge'},
    { categoryId: 'campus', displayName: 'Campus',  defaultSlaHours: 72, urgentSlaHours: 24, description: 'General campus issues',     escalationTier: 'admin'        }
  ];
  for (const c of cats) _categories.set(c.categoryId, new Category(c));
}

function seedLocations() {
  const locs = [
    { locationId: 'hostel_block_a', categoryId: 'hostel', zoneName: 'Block A',          landmark: 'Near main gate'       },
    { locationId: 'hostel_block_b', categoryId: 'hostel', zoneName: 'Block B',          landmark: 'Behind library'       },
    { locationId: 'mess_hall_1',    categoryId: 'mess',   zoneName: 'Main Mess Hall',   landmark: 'Ground floor'         },
    { locationId: 'mess_hall_2',    categoryId: 'mess',   zoneName: 'Mini Mess',        landmark: 'Block C basement'     },
    { locationId: 'library',        categoryId: 'campus', zoneName: 'Central Library',  landmark: 'Main building'        },
    { locationId: 'sports_ground',  categoryId: 'campus', zoneName: 'Sports Ground',    landmark: 'East wing'            },
    { locationId: 'it_lab',         categoryId: 'campus', zoneName: 'IT Lab',           landmark: 'Block D first floor'  }
  ];
  for (const l of locs) _locations.set(l.locationId, new Location(l));
}

function _reseed() {
  _categories.clear();
  _locations.clear();
  seedCategories();
  seedLocations();
}

_reseed();

// ── Categories ────────────────────────────────────────────────────────────────

async function findCategory(categoryId) {
  if (await db.checkConnection()) {
    try {
      const [rows] = await db.getPool().query(
        'SELECT * FROM categories WHERE category_id = ? AND is_active = 1',
        [categoryId]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return new Category({
        categoryId:      r.category_id,
        displayName:     r.display_name,
        description:     r.description,
        defaultSlaHours: r.default_sla_hours,
        urgentSlaHours:  r.urgent_sla_hours,
        escalationTier:  r.escalation_tier,
        isActive:        Boolean(r.is_active),
        createdAt:       r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      });
    } catch (err) {
      console.warn('[DIRECTORY] MySQL query error, using fallback:', err.message);
    }
  }
  return _categories.get(categoryId) || null;
}

async function listCategories() {
  if (await db.checkConnection()) {
    try {
      const [rows] = await db.getPool().query(
        'SELECT * FROM categories WHERE is_active = 1'
      );
      return rows.map(r => new Category({
        categoryId:      r.category_id,
        displayName:     r.display_name,
        description:     r.description,
        defaultSlaHours: r.default_sla_hours,
        urgentSlaHours:  r.urgent_sla_hours,
        escalationTier:  r.escalation_tier,
        isActive:        Boolean(r.is_active),
        createdAt:       r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    } catch (err) {
      console.warn('[DIRECTORY] MySQL query error, using fallback:', err.message);
    }
  }
  return Array.from(_categories.values());
}

async function createCategory(data) {
  if (_categories.has(data.categoryId)) {
    const err = new Error(`Category ${data.categoryId} already exists`);
    err.isConflict = true;
    throw err;
  }

  if (await db.checkConnection()) {
    try {
      await db.getPool().query(
        'INSERT INTO categories (category_id, display_name, description, default_sla_hours, urgent_sla_hours, escalation_tier, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [data.categoryId, data.displayName, data.description || '', data.defaultSlaHours, data.urgentSlaHours, data.escalationTier]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const conflictErr = new Error(`Category ${data.categoryId} already exists`);
        conflictErr.isConflict = true;
        throw conflictErr;
      }
      throw err;
    }
  }

  const cat = new Category(data);
  _categories.set(cat.categoryId, cat);
  return cat;
}

// ── Locations ─────────────────────────────────────────────────────────────────

async function findLocation(locationId) {
  if (await db.checkConnection()) {
    try {
      const [rows] = await db.getPool().query(
        'SELECT * FROM locations WHERE location_id = ? AND is_active = 1',
        [locationId]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return new Location({
        locationId: r.location_id,
        categoryId: r.category_id,
        zoneName:   r.zone_name,
        landmark:   r.landmark,
        isActive:   Boolean(r.is_active),
        createdAt:  r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      });
    } catch (err) {
      console.warn('[DIRECTORY] MySQL query error, using fallback:', err.message);
    }
  }
  return _locations.get(locationId) || null;
}

async function listLocations(filterCategoryId) {
  if (await db.checkConnection()) {
    try {
      let query = 'SELECT * FROM locations WHERE is_active = 1';
      const params = [];
      if (filterCategoryId) {
        query += ' AND category_id = ?';
        params.push(filterCategoryId);
      }
      const [rows] = await db.getPool().query(query, params);
      return rows.map(r => new Location({
        locationId: r.location_id,
        categoryId: r.category_id,
        zoneName:   r.zone_name,
        landmark:   r.landmark,
        isActive:   Boolean(r.is_active),
        createdAt:  r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    } catch (err) {
      console.warn('[DIRECTORY] MySQL query error, using fallback:', err.message);
    }
  }
  const all = Array.from(_locations.values());
  if (filterCategoryId) return all.filter(l => l.categoryId === filterCategoryId);
  return all;
}

async function createLocation(data) {
  if (_locations.has(data.locationId)) {
    const err = new Error(`Location ${data.locationId} already exists`);
    err.isConflict = true;
    throw err;
  }

  if (await db.checkConnection()) {
    try {
      await db.getPool().query(
        'INSERT INTO locations (location_id, category_id, zone_name, landmark, is_active) VALUES (?, ?, ?, ?, 1)',
        [data.locationId, data.categoryId, data.zoneName, data.landmark || '']
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const conflictErr = new Error(`Location ${data.locationId} already exists`);
        conflictErr.isConflict = true;
        throw conflictErr;
      }
      throw err;
    }
  }

  const loc = new Location(data);
  _locations.set(loc.locationId, loc);
  return loc;
}

module.exports = {
  findCategory, listCategories, createCategory,
  findLocation, listLocations, createLocation,
  _reseed
};
