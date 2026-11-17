/**
 * models.js - Domain models for Analytics & Audit Service
 *
 * AuditEvent  — immutable event log entry with ETag + XML support
 * SlaSnapshot — SLA performance snapshot
 * EscalationReport — escalation incident record
 */

'use strict';

const crypto = require('node:crypto');

function escapeXml(unsafe) {
  return String(unsafe == null ? '' : unsafe).replace(/[<>&'"]/g, c => {
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

// ── AuditEvent ────────────────────────────────────────────────────────────────
class AuditEvent {
  constructor({
    eventId,
    eventType,
    entityType,
    entityId,
    actorUserId,
    actorRole,
    originService,
    previousState   = null,
    newState        = null,
    payloadSnapshot = '{}',
    clientIp        = '',
    eventTimestamp  = new Date().toISOString()
  }) {
    this.eventId        = eventId;
    this.eventType      = eventType;
    this.entityType     = entityType;
    this.entityId       = entityId;
    this.actorUserId    = actorUserId;
    this.actorRole      = actorRole;
    this.originService  = originService;
    this.previousState  = previousState;
    this.newState       = newState;
    this.payloadSnapshot = payloadSnapshot;
    this.clientIp       = clientIp;
    this.eventTimestamp = eventTimestamp;
  }

  getETag() {
    const raw  = `${this.eventId}:${this.eventType}:${this.eventTimestamp}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex').substring(0, 12);
    return `"1-${hash}"`;
  }

  asJSON() {
    return {
      eventId:        this.eventId,
      eventType:      this.eventType,
      entityType:     this.entityType,
      entityId:       this.entityId,
      actorUserId:    this.actorUserId,
      actorRole:      this.actorRole,
      originService:  this.originService,
      previousState:  this.previousState,
      newState:       this.newState,
      payloadSnapshot: this.payloadSnapshot,
      clientIp:       this.clientIp,
      eventTimestamp: this.eventTimestamp
    };
  }

  asXML() {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<auditEvent id="${escapeXml(this.eventId)}">\n` +
      `  <eventType>${escapeXml(this.eventType)}</eventType>\n` +
      `  <entityType>${escapeXml(this.entityType)}</entityType>\n` +
      `  <entityId>${escapeXml(this.entityId)}</entityId>\n` +
      `  <actorUserId>${escapeXml(this.actorUserId)}</actorUserId>\n` +
      `  <actorRole>${escapeXml(this.actorRole)}</actorRole>\n` +
      `  <originService>${escapeXml(this.originService)}</originService>\n` +
      `  <previousState>${escapeXml(this.previousState)}</previousState>\n` +
      `  <newState>${escapeXml(this.newState)}</newState>\n` +
      `  <payloadSnapshot>${escapeXml(this.payloadSnapshot)}</payloadSnapshot>\n` +
      `  <clientIp>${escapeXml(this.clientIp)}</clientIp>\n` +
      `  <eventTimestamp>${this.eventTimestamp}</eventTimestamp>\n` +
      `</auditEvent>`
    );
  }
}

// ── SlaSnapshot ───────────────────────────────────────────────────────────────
class SlaSnapshot {
  constructor({
    snapshotId,
    categoryId,
    snapshotDate,
    totalFiled,
    totalResolved,
    resolvedWithinSla,
    breachedSlaCount,
    averageResolutionHours,
    complianceRatePct,
    calculatedAt = new Date().toISOString()
  }) {
    this.snapshotId             = snapshotId;
    this.categoryId             = categoryId;
    this.snapshotDate           = snapshotDate;
    this.totalFiled             = totalFiled;
    this.totalResolved          = totalResolved;
    this.resolvedWithinSla      = resolvedWithinSla;
    this.breachedSlaCount       = breachedSlaCount;
    this.averageResolutionHours = averageResolutionHours;
    this.complianceRatePct      = complianceRatePct;
    this.calculatedAt           = calculatedAt;
  }

  asJSON() {
    return {
      snapshotId:             this.snapshotId,
      categoryId:             this.categoryId,
      snapshotDate:           this.snapshotDate,
      totalFiled:             this.totalFiled,
      totalResolved:          this.totalResolved,
      resolvedWithinSla:      this.resolvedWithinSla,
      breachedSlaCount:       this.breachedSlaCount,
      averageResolutionHours: this.averageResolutionHours,
      complianceRatePct:      this.complianceRatePct,
      calculatedAt:           this.calculatedAt
    };
  }
}

// ── EscalationReport ──────────────────────────────────────────────────────────
class EscalationReport {
  constructor({
    reportId,
    complaintId,
    categoryId,
    initiatorUserId,
    breachHoursExceeded,
    escalationTier,
    reason,
    isResolved  = false,
    reportedAt  = new Date().toISOString()
  }) {
    this.reportId            = reportId;
    this.complaintId         = complaintId;
    this.categoryId          = categoryId;
    this.initiatorUserId     = initiatorUserId;
    this.breachHoursExceeded = breachHoursExceeded;
    this.escalationTier      = escalationTier;
    this.reason              = reason;
    this.isResolved          = isResolved;
    this.reportedAt          = reportedAt;
  }

  asJSON() {
    return {
      reportId:            this.reportId,
      complaintId:         this.complaintId,
      categoryId:          this.categoryId,
      initiatorUserId:     this.initiatorUserId,
      breachHoursExceeded: this.breachHoursExceeded,
      escalationTier:      this.escalationTier,
      reason:              this.reason,
      isResolved:          this.isResolved,
      reportedAt:          this.reportedAt
    };
  }
}

module.exports = { AuditEvent, SlaSnapshot, EscalationReport, escapeXml };
