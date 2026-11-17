/**
 * models.js - Notification record and representation
 *
 * Rules:
 * - Separation of record from representation
 * - ETag for conditional GET caching
 * - asXML() for content negotiation
 */

'use strict';

const crypto = require('node:crypto');

class Notification {
  constructor({
    notificationId,
    recipientUserId,
    recipientContact,
    channel,
    eventType,
    relatedComplaintId = null,
    title,
    body,
    deliveryStatus = 'queued',
    externalProviderId = null,
    retryCount = 0,
    sentAt = null,
    createdAt = new Date().toISOString(),
    version = 1
  }) {
    this.notificationId     = notificationId;
    this.recipientUserId    = recipientUserId;
    this.recipientContact   = recipientContact;
    this.channel            = channel;
    this.eventType          = eventType;
    this.relatedComplaintId = relatedComplaintId;
    this.title              = title;
    this.body               = body;
    this.deliveryStatus     = deliveryStatus;
    this.externalProviderId = externalProviderId;
    this.retryCount         = retryCount;
    this.sentAt             = sentAt;
    this.createdAt          = createdAt;
    this.version            = version;
  }

  /**
   * Generates an ETag based on notificationId, deliveryStatus, and version.
   */
  getETag() {
    const raw  = `${this.notificationId}:${this.version}:${this.deliveryStatus}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex').substring(0, 12);
    return `"${this.version}-${hash}"`;
  }

  /**
   * asJSON() — published representation.
   */
  asJSON() {
    return {
      notificationId:     this.notificationId,
      recipientUserId:    this.recipientUserId,
      recipientContact:   this.recipientContact,
      channel:            this.channel,
      eventType:          this.eventType,
      relatedComplaintId: this.relatedComplaintId,
      title:              this.title,
      body:               this.body,
      deliveryStatus:     this.deliveryStatus,
      externalProviderId: this.externalProviderId,
      retryCount:         this.retryCount,
      sentAt:             this.sentAt,
      createdAt:          this.createdAt
    };
  }

  /**
   * asXML() — XML representation for content negotiation.
   */
  asXML() {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<notification id="${escapeXml(this.notificationId)}">\n` +
      `  <recipientUserId>${escapeXml(this.recipientUserId)}</recipientUserId>\n` +
      `  <recipientContact>${escapeXml(this.recipientContact)}</recipientContact>\n` +
      `  <channel>${escapeXml(this.channel)}</channel>\n` +
      `  <eventType>${escapeXml(this.eventType)}</eventType>\n` +
      `  <relatedComplaintId>${escapeXml(this.relatedComplaintId || '')}</relatedComplaintId>\n` +
      `  <title>${escapeXml(this.title)}</title>\n` +
      `  <body>${escapeXml(this.body)}</body>\n` +
      `  <deliveryStatus>${escapeXml(this.deliveryStatus)}</deliveryStatus>\n` +
      `  <externalProviderId>${escapeXml(this.externalProviderId || '')}</externalProviderId>\n` +
      `  <retryCount>${this.retryCount}</retryCount>\n` +
      `  <sentAt>${escapeXml(this.sentAt || '')}</sentAt>\n` +
      `  <createdAt>${this.createdAt}</createdAt>\n` +
      `</notification>`
    );
  }
}

function escapeXml(unsafe) {
  return String(unsafe || '').replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<':  return '&lt;';
      case '>':  return '&gt;';
      case '&':  return '&amp;';
      case "'":  return '&apos;';
      case '"':  return '&quot;';
      default:   return c;
    }
  });
}

module.exports = { Notification, escapeXml };
