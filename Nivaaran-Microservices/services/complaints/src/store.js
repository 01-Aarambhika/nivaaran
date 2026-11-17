/**
 * store.js - Complaints storage with MySQL persistence & in-memory cache
 */

const { Complaint, Comment } = require('./models');
const db = require('./db');

const _complaints = new Map();
const _byKey = new Map();
const _comments = new Map();

let _nextSeq = 1001;

function create({
  userId,
  categoryId,
  locationId,
  title,
  description,
  priority = 'normal',
  isAnonymous = false,
  key = null
}) {
  const seq = _nextSeq++;
  const id = `cmp_${seq}`;
  const trackingNumber = `CMP-2026-${seq}`;
  
  const slaHours = priority === 'urgent' ? 12 : 48;
  const deadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

  const complaint = new Complaint({
    id,
    trackingNumber,
    reporterId: isAnonymous ? null : userId,
    categoryId,
    locationId,
    title,
    description,
    priority,
    status: 'submitted',
    slaDeadline: deadline,
    isEscalated: false,
    version: 1,
    internalAuditSecret: `audit_sec_${Math.random().toString(36).substring(2, 10)}`,
    rawDbSeq: seq,
    idempotencyKey: key
  });

  _complaints.set(id, complaint);
  if (key) {
    _byKey.set(key, id);
  }

  // Asynchronously persist to MySQL if available
  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `INSERT INTO complaints (
          complaint_id, tracking_number, reporter_user_id, is_anonymous,
          category_id, location_id, title, description, priority, current_status,
          sla_deadline, is_escalated, idempotency_key, etag, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        [
          id, trackingNumber, isAnonymous ? null : userId, isAnonymous ? 1 : 0,
          categoryId, locationId, title, description, priority, 'submitted',
          new Date(deadline), 0, key || null, complaint.getETag()
        ]
      ).catch(err => console.warn('[COMPLAINTS] MySQL insert error:', err.message));
    }
  }).catch(() => {});

  return complaint;
}

function find(id) {
  return _complaints.get(id) || null;
}

function findByKey(key) {
  if (!key) return null;
  const id = _byKey.get(key);
  if (!id) return null;
  return _complaints.get(id) || null;
}

function list({ category, status } = {}) {
  const results = [];
  for (const complaint of _complaints.values()) {
    if (category && complaint.categoryId !== category) continue;
    if (status && complaint.status !== status) continue;
    results.push(complaint);
  }
  return results;
}

function patch(id, changes) {
  const complaint = _complaints.get(id);
  if (!complaint) return null;

  if (changes.title !== undefined) complaint.title = changes.title;
  if (changes.description !== undefined) complaint.description = changes.description;
  if (changes.priority !== undefined) complaint.priority = changes.priority;
  if (changes.status !== undefined) complaint.status = changes.status;

  complaint.version += 1;
  complaint.updatedAt = new Date().toISOString();

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `UPDATE complaints SET
          title = ?, description = ?, priority = ?, current_status = ?,
          version = version + 1, etag = ?, updated_at = NOW()
        WHERE complaint_id = ?`,
        [complaint.title, complaint.description, complaint.priority, complaint.status, complaint.getETag(), id]
      ).catch(err => console.warn('[COMPLAINTS] MySQL update error:', err.message));
    }
  }).catch(() => {});

  return complaint;
}

function escalate(id, { initiatorId, reason }) {
  const complaint = _complaints.get(id);
  if (!complaint) return null;

  complaint.isEscalated = true;
  complaint.escalationTier = 'warden_council';
  complaint.escalationReason = reason;
  complaint.version += 1;
  complaint.updatedAt = new Date().toISOString();

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `UPDATE complaints SET
          is_escalated = 1, escalation_tier = 'warden_council',
          escalation_reason = ?, version = version + 1, etag = ?, updated_at = NOW()
        WHERE complaint_id = ?`,
        [reason, complaint.getETag(), id]
      ).catch(err => console.warn('[COMPLAINTS] MySQL escalate error:', err.message));
    }
  }).catch(() => {});

  return complaint;
}

function remove(id) {
  const complaint = _complaints.get(id);
  if (!complaint) return false;

  if (complaint.status !== 'submitted') {
    const err = new Error(`Cannot delete complaint ${id}: already in '${complaint.status}' status`);
    err.isConflict = true;
    throw err;
  }

  _complaints.delete(id);
  _comments.delete(id);

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query('DELETE FROM complaints WHERE complaint_id = ?', [id])
        .catch(err => console.warn('[COMPLAINTS] MySQL delete error:', err.message));
    }
  }).catch(() => {});

  return true;
}

function addComment(complaintId, { authorId, authorRole, message }) {
  const complaint = _complaints.get(complaintId);
  if (!complaint) return null;

  const commentSeq = Math.floor(Math.random() * 100000);
  const commentId = `comm_${commentSeq}`;
  const comment = new Comment({
    commentId,
    complaintId,
    authorId,
    authorRole,
    message,
    isInternal: false
  });

  if (!_comments.has(complaintId)) {
    _comments.set(complaintId, []);
  }
  _comments.get(complaintId).push(comment);

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        'INSERT INTO complaint_comments (comment_id, complaint_id, author_user_id, author_role, message) VALUES (?, ?, ?, ?, ?)',
        [commentId, complaintId, authorId, authorRole, message]
      ).catch(err => console.warn('[COMPLAINTS] MySQL comment error:', err.message));
    }
  }).catch(() => {});

  return comment;
}

function getComments(complaintId) {
  return _comments.get(complaintId) || [];
}

function _clear() {
  _complaints.clear();
  _byKey.clear();
  _comments.clear();
  _nextSeq = 1001;
}

module.exports = {
  create,
  find,
  findByKey,
  list,
  patch,
  escalate,
  remove,
  addComment,
  getComments,
  _clear
};
