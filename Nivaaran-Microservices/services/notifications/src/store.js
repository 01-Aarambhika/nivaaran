/**
 * store.js - Private notification storage with MySQL integration & in-process fallback
 */

'use strict';

const { Notification } = require('./models');
const db = require('./db');

const _notifications = new Map();
let _counter = 3;

function seedNotification(data) {
  const notif = new Notification({
    ...data,
    version: 1,
    createdAt: new Date().toISOString()
  });
  _notifications.set(notif.notificationId, notif);
}

function _doSeed() {
  seedNotification({
    notificationId:     'notif_1',
    recipientUserId:    '20251651078',
    recipientContact:   '9876543210',
    channel:            'sms',
    eventType:          'complaint_filed',
    relatedComplaintId: 'cmp_1001',
    title:              'Complaint Received',
    body:               'Your complaint CMP-2026-1001 has been filed.',
    deliveryStatus:     'sent',
    retryCount:         0
  });

  seedNotification({
    notificationId:     'notif_2',
    recipientUserId:    'W101',
    recipientContact:   'w101@iiitv.ac.in',
    channel:            'email',
    eventType:          'assigned',
    relatedComplaintId: 'cmp_1001',
    title:              'New Assignment',
    body:               'Complaint CMP-2026-1001 assigned to you.',
    deliveryStatus:     'queued',
    retryCount:         0
  });
}

_doSeed();

function generateId() {
  const id = `notif_${_counter}`;
  _counter++;
  return id;
}

function find(notificationId) {
  return _notifications.get(notificationId) || null;
}

function create({ recipientUserId, recipientContact, channel, eventType, relatedComplaintId, title, body, deliveryStatus, externalProviderId, sentAt }) {
  const notificationId = generateId();
  const notif = new Notification({
    notificationId,
    recipientUserId,
    recipientContact,
    channel,
    eventType,
    relatedComplaintId: relatedComplaintId || null,
    title,
    body,
    deliveryStatus,
    externalProviderId: externalProviderId || null,
    retryCount:         0,
    sentAt:             sentAt || null,
    version:            1
  });
  _notifications.set(notificationId, notif);

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `INSERT INTO notifications_log (
          notification_id, recipient_user_id, recipient_contact, channel,
          event_type, related_complaint_id, title, body, delivery_status,
          external_provider_id, retry_count, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        ON DUPLICATE KEY UPDATE delivery_status = VALUES(delivery_status)`,
        [
          notificationId, recipientUserId, recipientContact, channel,
          eventType, relatedComplaintId || null, title, body, deliveryStatus,
          externalProviderId || null, sentAt ? new Date(sentAt) : null
        ]
      ).catch(err => console.warn('[NOTIFICATIONS] MySQL insert error:', err.message));
    }
  }).catch(() => {});

  return notif;
}

function update(notificationId, { deliveryStatus, externalProviderId, sentAt, retryCount }) {
  const notif = _notifications.get(notificationId);
  if (!notif) return null;
  if (deliveryStatus     !== undefined) notif.deliveryStatus     = deliveryStatus;
  if (externalProviderId !== undefined) notif.externalProviderId = externalProviderId;
  if (sentAt             !== undefined) notif.sentAt             = sentAt;
  if (retryCount         !== undefined) notif.retryCount         = retryCount;
  notif.version += 1;

  db.checkConnection().then(connected => {
    if (connected) {
      db.getPool().query(
        `UPDATE notifications_log SET
          delivery_status = ?, version = version + 1,
          sent_at = COALESCE(?, sent_at)
        WHERE notification_id = ?`,
        [notif.deliveryStatus, notif.sentAt ? new Date(notif.sentAt) : null, notificationId]
      ).catch(err => console.warn('[NOTIFICATIONS] MySQL update error:', err.message));
    }
  }).catch(() => {});

  return notif;
}

function list({ recipientUserId, status, channel } = {}) {
  let items = Array.from(_notifications.values());
  if (recipientUserId) {
    const isM = recipientUserId === 'M201' || recipientUserId === 'M001';
    const isW = recipientUserId === 'W101' || recipientUserId === 'W001';
    const isS = recipientUserId === 'S301' || recipientUserId === 'T001';
    items = items.filter(n => {
      if (n.recipientUserId === recipientUserId || n.recipientUserId === 'ALL') return true;
      if (isM && (n.recipientUserId === 'M201' || n.recipientUserId === 'M001')) return true;
      if (isW && (n.recipientUserId === 'W101' || n.recipientUserId === 'W001')) return true;
      if (isS && (n.recipientUserId === 'S301' || n.recipientUserId === 'T001')) return true;
      return false;
    });
  }
  if (status)          items = items.filter(n => n.deliveryStatus  === status);
  if (channel)         items = items.filter(n => n.channel         === channel);
  return items;
}

function _clear() {
  _notifications.clear();
}

function _reseed() {
  _notifications.clear();
  _counter = 3;
  _doSeed();
}

module.exports = { find, create, update, list, _clear, _reseed };
