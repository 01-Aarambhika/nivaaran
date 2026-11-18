/**
 * store.js - Complaints storage with MySQL persistence & in-memory cache
 */

const { Complaint, Comment } = require('./models');
const db = require('./db');

const _complaints = new Map();
const _byKey = new Map();
const _comments = new Map();

let _nextSeq = 1001;

async function syncFromDb() {
  try {
    if (await db.checkConnection()) {
      const [rows] = await db.getPool().query('SELECT * FROM complaints ORDER BY created_at DESC');
      for (const r of rows) {
        if (!_complaints.has(r.complaint_id)) {
          const complaint = new Complaint({
            id: r.complaint_id,
            trackingNumber: r.tracking_number,
            reporterId: r.is_anonymous ? null : r.reporter_user_id,
            categoryId: r.category_id,
            locationId: r.location_id,
            title: r.title,
            description: r.description,
            priority: r.priority,
            status: r.current_status,
            slaDeadline: r.sla_deadline ? new Date(r.sla_deadline).toISOString() : new Date().toISOString(),
            isEscalated: Boolean(r.is_escalated),
            escalationTier: r.escalation_tier,
            escalationReason: r.escalation_reason,
            version: r.version || 1,
            idempotencyKey: r.idempotency_key,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
          });
          _complaints.set(r.complaint_id, complaint);
          const seqMatch = r.complaint_id.match(/\d+$/);
          if (seqMatch) {
            const num = parseInt(seqMatch[0], 10);
            if (num >= _nextSeq) _nextSeq = num + 1;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[COMPLAINTS] MySQL sync error:', err.message);
  }
}

// Initial sync
syncFromDb();

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

async function find(id) {
  let c = _complaints.get(id);
  if (!c) {
    for (const comp of _complaints.values()) {
      if (comp.trackingNumber === id || comp.id === id) {
        c = comp;
        break;
      }
    }
  }
  if (!c) {
    await syncFromDb();
    c = _complaints.get(id);
    if (!c) {
      for (const comp of _complaints.values()) {
        if (comp.trackingNumber === id || comp.id === id) {
          c = comp;
          break;
        }
      }
    }
  }
  return c || null;
}

function findByKey(key) {
  if (!key) return null;
  const id = _byKey.get(key);
  if (!id) return null;
  return _complaints.get(id) || null;
}

async function list({ category, status, reporterUserId, priority } = {}) {
  await syncFromDb();
  const results = [];
  for (const complaint of _complaints.values()) {
    if (category && complaint.categoryId !== category) continue;
    if (status && complaint.status !== status) continue;
    if (priority && complaint.priority !== priority) continue;
    if (reporterUserId && complaint.reporterId !== reporterUserId) continue;
    results.push(complaint);
  }
  return results;
}

function patch(id, changes) {
  let complaint = _complaints.get(id);
  if (!complaint) {
    for (const c of _complaints.values()) {
      if (c.trackingNumber === id || c.id === id) {
        complaint = c;
        break;
      }
    }
  }
  if (!complaint) return null;

  if (changes.title !== undefined) complaint.title = changes.title;
  if (changes.description !== undefined) complaint.description = changes.description;
  if (changes.priority !== undefined) complaint.priority = changes.priority;
  if (changes.status !== undefined) complaint.status = changes.status;
  if (changes.assignedTo !== undefined) complaint.assignedTo = changes.assignedTo;
  if (changes.assignedStaffId !== undefined) complaint.assignedTo = changes.assignedStaffId;
  if (changes.assignedToName !== undefined) complaint.assignedToName = changes.assignedToName;

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

async function addFeedback(complaintId, { rating, comment, reopen, studentUserId }) {
  const complaint = await find(complaintId);
  if (!complaint) return null;

  complaint.feedback = {
    rating: Number(rating) || 5,
    comment: comment || '',
    isReopened: Boolean(reopen),
    studentUserId: studentUserId || complaint.reporterId,
    createdAt: new Date().toISOString()
  };

  if (reopen) {
    complaint.status = 'in_progress';
  } else {
    complaint.status = 'closed';
  }
  complaint.version += 1;
  complaint.updatedAt = new Date().toISOString();

  const feedbackId = `fb_${Date.now()}`;
  db.checkConnection().then(connected => {
    if (connected) {
      const pool = db.getPool();
      pool.query(
        `INSERT INTO complaint_feedback (feedback_id, complaint_id, student_user_id, rating, comments, is_reopened, reopen_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating=VALUES(rating), comments=VALUES(comments), is_reopened=VALUES(is_reopened)`,
        [feedbackId, complaint.id, studentUserId || complaint.reporterId || 'student', Number(rating) || 5, comment || '', reopen ? 1 : 0, reopen ? comment : null]
      ).catch(e => console.warn('[COMPLAINTS] feedback insert err:', e.message));

      pool.query(
        `UPDATE complaints SET current_status = ?, version = version + 1, etag = ?, updated_at = NOW() WHERE complaint_id = ?`,
        [complaint.status, complaint.getETag(), complaint.id]
      ).catch(e => console.warn('[COMPLAINTS] complaint status update err:', e.message));
    }
  }).catch(() => {});

  return complaint;
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
  addFeedback,
  _clear
};
