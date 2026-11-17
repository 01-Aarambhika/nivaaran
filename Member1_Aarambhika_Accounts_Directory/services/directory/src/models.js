/**
 * models.js - Category and Location records
 *
 * - Separation of record from representation
 * - ETag for conditional GET caching
 * - asXML() for content negotiation
 */

const crypto = require('node:crypto');

class Category {
  constructor({
    categoryId,
    displayName,
    description = '',
    defaultSlaHours,
    urgentSlaHours,
    escalationTier,
    isActive = true,
    createdAt = new Date().toISOString()
  }) {
    this.categoryId     = categoryId;
    this.displayName    = displayName;
    this.description    = description;
    this.defaultSlaHours = defaultSlaHours;
    this.urgentSlaHours  = urgentSlaHours;
    this.escalationTier  = escalationTier;
    this.isActive       = isActive;
    this.createdAt      = createdAt;
  }

  getETag() {
    const raw  = `${this.categoryId}:${this.displayName}:${this.defaultSlaHours}:${this.urgentSlaHours}:${this.isActive}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex').substring(0, 12);
    return `"1-${hash}"`;
  }

  asJSON() {
    return {
      categoryId:      this.categoryId,
      displayName:     this.displayName,
      description:     this.description,
      defaultSlaHours: this.defaultSlaHours,
      urgentSlaHours:  this.urgentSlaHours,
      escalationTier:  this.escalationTier,
      isActive:        this.isActive,
      createdAt:       this.createdAt
    };
  }

  asXML() {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<category id="${escapeXml(this.categoryId)}">\n` +
      `  <displayName>${escapeXml(this.displayName)}</displayName>\n` +
      `  <description>${escapeXml(this.description)}</description>\n` +
      `  <defaultSlaHours>${this.defaultSlaHours}</defaultSlaHours>\n` +
      `  <urgentSlaHours>${this.urgentSlaHours}</urgentSlaHours>\n` +
      `  <escalationTier>${escapeXml(this.escalationTier)}</escalationTier>\n` +
      `  <isActive>${this.isActive}</isActive>\n` +
      `  <createdAt>${this.createdAt}</createdAt>\n` +
      `</category>`
    );
  }
}

class Location {
  constructor({
    locationId,
    categoryId,
    zoneName,
    landmark = '',
    isActive = true,
    createdAt = new Date().toISOString()
  }) {
    this.locationId = locationId;
    this.categoryId = categoryId;
    this.zoneName   = zoneName;
    this.landmark   = landmark;
    this.isActive   = isActive;
    this.createdAt  = createdAt;
  }

  getETag() {
    const raw  = `${this.locationId}:${this.categoryId}:${this.zoneName}:${this.isActive}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex').substring(0, 12);
    return `"1-${hash}"`;
  }

  asJSON() {
    return {
      locationId: this.locationId,
      categoryId: this.categoryId,
      zoneName:   this.zoneName,
      landmark:   this.landmark,
      isActive:   this.isActive,
      createdAt:  this.createdAt
    };
  }

  asXML() {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<location id="${escapeXml(this.locationId)}">\n` +
      `  <categoryId>${escapeXml(this.categoryId)}</categoryId>\n` +
      `  <zoneName>${escapeXml(this.zoneName)}</zoneName>\n` +
      `  <landmark>${escapeXml(this.landmark)}</landmark>\n` +
      `  <isActive>${this.isActive}</isActive>\n` +
      `  <createdAt>${this.createdAt}</createdAt>\n` +
      `</location>`
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

module.exports = { Category, Location, escapeXml };
