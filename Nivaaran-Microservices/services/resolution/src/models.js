/**
 * models.js - Assignment and RosterEntry records
 *
 * Assignment: { assignmentId, complaintId, assignedStaffId, assignedByUserId,
 *               departmentScope, assignmentStatus, assignedAt, resolvedAt }
 * RosterEntry: { rosterId, staffUserId, departmentScope, shiftDate, shiftStart,
 *                shiftEnd, isOnDuty, activeComplaintsCount, createdAt }
 */

'use strict';

const crypto = require('node:crypto');

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

class Assignment {
  constructor({
    assignmentId,
    complaintId,
    assignedStaffId,
    assignedByUserId,
    departmentScope,
    assignmentStatus = 'active',
    assignedAt = new Date().toISOString(),
    resolvedAt = null,
    version = 1
  }) {
    this.assignmentId     = assignmentId;
    this.complaintId      = complaintId;
    this.assignedStaffId  = assignedStaffId;
    this.assignedByUserId = assignedByUserId;
    this.departmentScope  = departmentScope;
    this.assignmentStatus = assignmentStatus;
    this.assignedAt       = assignedAt;
    this.resolvedAt       = resolvedAt;
    this.version          = version;
  }

  getETag() {
    const raw  = `${this.assignmentId}:${this.version}:${this.assignmentStatus}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex').substring(0, 12);
    return `"${this.version}-${hash}"`;
  }

  asJSON() {
    return {
      assignmentId:     this.assignmentId,
      complaintId:      this.complaintId,
      assignedStaffId:  this.assignedStaffId,
      assignedByUserId: this.assignedByUserId,
      departmentScope:  this.departmentScope,
      assignmentStatus: this.assignmentStatus,
      assignedAt:       this.assignedAt,
      resolvedAt:       this.resolvedAt
    };
  }

  asXML() {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<assignment id="${escapeXml(this.assignmentId)}">\n` +
      `  <complaintId>${escapeXml(this.complaintId)}</complaintId>\n` +
      `  <assignedStaffId>${escapeXml(this.assignedStaffId)}</assignedStaffId>\n` +
      `  <assignedByUserId>${escapeXml(this.assignedByUserId)}</assignedByUserId>\n` +
      `  <departmentScope>${escapeXml(this.departmentScope)}</departmentScope>\n` +
      `  <assignmentStatus>${escapeXml(this.assignmentStatus)}</assignmentStatus>\n` +
      `  <assignedAt>${this.assignedAt}</assignedAt>\n` +
      `  <resolvedAt>${this.resolvedAt || ''}</resolvedAt>\n` +
      `</assignment>`
    );
  }
}

class RosterEntry {
  constructor({
    rosterId,
    staffUserId,
    departmentScope,
    shiftDate,
    shiftStart,
    shiftEnd,
    isOnDuty = false,
    activeComplaintsCount = 0,
    createdAt = new Date().toISOString()
  }) {
    this.rosterId             = rosterId;
    this.staffUserId          = staffUserId;
    this.departmentScope      = departmentScope;
    this.shiftDate            = shiftDate;
    this.shiftStart           = shiftStart;
    this.shiftEnd             = shiftEnd;
    this.isOnDuty             = isOnDuty;
    this.activeComplaintsCount = activeComplaintsCount;
    this.createdAt            = createdAt;
  }

  asJSON() {
    return {
      rosterId:             this.rosterId,
      staffUserId:          this.staffUserId,
      departmentScope:      this.departmentScope,
      shiftDate:            this.shiftDate,
      shiftStart:           this.shiftStart,
      shiftEnd:             this.shiftEnd,
      isOnDuty:             this.isOnDuty,
      activeComplaintsCount: this.activeComplaintsCount,
      createdAt:            this.createdAt
    };
  }
}

module.exports = { Assignment, RosterEntry, escapeXml };
