/**
 * store.js - User storage with MySQL connection & in-process fallback
 */

const crypto = require('node:crypto');
const { User } = require('./models');
const db = require('./db');

const _users = new Map();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function seed(userId, password, role, fullName = '') {
  const user = new User({
    userId,
    fullName,
    role,
    passwordHash: hashPassword(password),
    version: 1
  });
  _users.set(userId, user);
}

function _reseed() {
  _users.clear();
  seed('ADM001',       'admin123',   'admin',              'Campus Administrator');
  seed('20251651078',  'demo123',    'student',            'Ritik Sharma');
  seed('20251651006',  'demo123',    'student',            'Abhishek Kumar');
  seed('20251651001',  'demo123',    'student',            'Aarambhika Sinha');
  seed('W101',         'warden123',  'warden',             'Hostel Warden');
  seed('M201',         'mess123',    'mess_incharge',      'Mess In-Charge');
  seed('S301',         'maint123',   'maintenance_staff',  'Maintenance Staff');
}

_reseed();

async function find(userId) {
  if (await db.checkConnection()) {
    try {
      const [rows] = await db.getPool().query(
        'SELECT * FROM users WHERE user_id = ? AND is_active = 1',
        [userId]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return new User({
        userId: r.user_id,
        fullName: r.full_name,
        role: r.role,
        passwordHash: r.password_hash,
        version: r.version || 1,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      });
    } catch (err) {
      console.warn('[ACCOUNTS] MySQL query error, using fallback:', err.message);
    }
  }
  return _users.get(userId) || null;
}

async function findByCredentials(userId, password) {
  const hash = hashPassword(password);
  if (await db.checkConnection()) {
    try {
      const [rows] = await db.getPool().query(
        'SELECT * FROM users WHERE user_id = ? AND password_hash = ? AND is_active = 1',
        [userId, hash]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return new User({
        userId: r.user_id,
        fullName: r.full_name,
        role: r.role,
        passwordHash: r.password_hash,
        version: r.version || 1
      });
    } catch (err) {
      console.warn('[ACCOUNTS] MySQL query error, using fallback:', err.message);
    }
  }
  const user = _users.get(userId);
  if (!user) return null;
  if (user.passwordHash !== hash) return null;
  return user;
}

async function create({ userId, fullName, role, password }) {
  if (_users.has(userId)) {
    const err = new Error(`User ${userId} already exists`);
    err.isConflict = true;
    throw err;
  }

  const hash = hashPassword(password);
  if (await db.checkConnection()) {
    try {
      await db.getPool().query(
        'INSERT INTO users (user_id, full_name, role, password_hash, version) VALUES (?, ?, ?, ?, 1)',
        [userId, fullName || '', role, hash]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const conflictErr = new Error(`User ${userId} already exists`);
        conflictErr.isConflict = true;
        throw conflictErr;
      }
      throw err;
    }
  }

  const user = new User({
    userId,
    fullName: fullName || '',
    role,
    passwordHash: hash,
    version: 1
  });
  _users.set(userId, user);
  return user;
}

async function list() {
  if (await db.checkConnection()) {
    try {
      const [rows] = await db.getPool().query(
        'SELECT * FROM users WHERE is_active = 1 ORDER BY user_id ASC'
      );
      return rows.map(r => new User({
        userId: r.user_id,
        fullName: r.full_name,
        role: r.role,
        passwordHash: r.password_hash,
        version: r.version || 1
      }));
    } catch (err) {
      console.warn('[ACCOUNTS] MySQL query error, using fallback:', err.message);
    }
  }
  return Array.from(_users.values());
}

function _clear() {
  _users.clear();
}

module.exports = { find, findByCredentials, create, list, _clear, _reseed, hashPassword };
