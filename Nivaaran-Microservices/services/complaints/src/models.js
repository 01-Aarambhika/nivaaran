/**
 * models.js - Separation of Record from Representation
 *
 * Rules:
 * C2 (A4): Separate record from representation.
 * B4 & C1-C2 (A5): ETag and versioning for conditional requests.
 */

const crypto = require('crypto');

class Complaint {
  constructor({
    id,
    trackingNumber,
    reporterId,
    categoryId,
    locationId,
    title,
    description,
    priority = 'normal',
    status = 'submitted',
    slaDeadline,
    isEscalated = false,
    escalationTier = null,
    escalationReason = null,
    version = 1,
    // Private record fields (NEVER published)
    internalAuditSecret,
    rawDbSeq,
    idempotencyKey = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.trackingNumber = trackingNumber;
    this.reporterId = reporterId;
    this.categoryId = categoryId;
    this.locationId = locationId;
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.status = status;
    this.slaDeadline = slaDeadline;
    this.isEscalated = isEscalated;
    this.escalationTier = escalationTier;
    this.escalationReason = escalationReason;
    this.version = version;

    // Private fields held in storage:
    this.internalAuditSecret = internalAuditSecret;
    this.rawDbSeq = rawDbSeq;
    this.idempotencyKey = idempotencyKey;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Generates strong/weak ETag based on representation hash and version.
   */
  getETag() {
    const raw = `${this.id}:${this.version}:${this.status}:${this.isEscalated}:${this.title}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex').substring(0, 12);
    return `"${this.version}-${hash}"`;
  }

  /**
   * asJSON() returns published representation, stripping internal tokens.
   */
  asJSON() {
    return {
      id: this.id,
      trackingNumber: this.trackingNumber,
      reporterId: this.reporterId,
      categoryId: this.categoryId,
      locationId: this.locationId,
      title: this.title,
      description: this.description,
      priority: this.priority,
      status: this.status,
      isEscalated: this.isEscalated,
      slaDeadline: this.slaDeadline,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * asXML() serializes representation into XML for Content Negotiation.
   */
  asXML() {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<complaint id="${this.id}">\n` +
      `  <trackingNumber>${this.trackingNumber}</trackingNumber>\n` +
      `  <reporterId>${this.reporterId || ''}</reporterId>\n` +
      `  <category>${this.categoryId}</category>\n` +
      `  <location>${this.locationId}</location>\n` +
      `  <title>${escapeXml(this.title)}</title>\n` +
      `  <description>${escapeXml(this.description)}</description>\n` +
      `  <priority>${this.priority}</priority>\n` +
      `  <status>${this.status}</status>\n` +
      `  <isEscalated>${this.isEscalated}</isEscalated>\n` +
      `  <slaDeadline>${this.slaDeadline}</slaDeadline>\n` +
      `  <createdAt>${this.createdAt}</createdAt>\n` +
      `</complaint>`
    );
  }
}

class Comment {
  constructor({
    commentId,
    complaintId,
    authorId,
    authorRole = 'student',
    message,
    isInternal = false,
    createdAt = new Date().toISOString()
  }) {
    this.commentId = commentId;
    this.complaintId = complaintId;
    this.authorId = authorId;
    this.authorRole = authorRole;
    this.message = message;
    this.isInternal = isInternal;
    this.createdAt = createdAt;
  }

  asJSON() {
    return {
      commentId: this.commentId,
      complaintId: this.complaintId,
      authorId: this.authorId,
      authorRole: this.authorRole,
      message: this.message,
      createdAt: this.createdAt
    };
  }
}

function escapeXml(unsafe) {
  return String(unsafe || '').replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

module.exports = { Complaint, Comment, escapeXml };
