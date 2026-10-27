/**
 * store.js - Private in-process storage
 *
 * Implements CRUD and state actions with optimistic concurrency support.
 */

const { Complaint, Comment } = require('./models');

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

  return complaint;
}

function remove(id) {
  const complaint = _complaints.get(id);
  if (!complaint) return false;

  // Rule: Only draft or unassigned complaints can be withdrawn
  if (complaint.status !== 'submitted') {
    const err = new Error(`Cannot delete complaint ${id}: already in '${complaint.status}' status`);
    err.isConflict = true;
    throw err;
  }

  _complaints.delete(id);
  _comments.delete(id);
  return true;
}

function addComment(complaintId, { authorId, authorRole, message }) {
  const complaint = _complaints.get(complaintId);
  if (!complaint) return null;

  const commentSeq = Math.floor(Math.random() * 100000);
  const comment = new Comment({
    commentId: `comm_${commentSeq}`,
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
