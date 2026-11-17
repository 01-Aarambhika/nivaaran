/**
 * models.js - User record and representation
 *
 * Rules:
 * - Separation of record from representation (asJSON never returns passwordHash)
 * - ETag for conditional GET caching
 * - asXML() for content negotiation
 */

const crypto = require('node:crypto');

class User {
  constructor({
    userId,
    fullName = '',
    role,
    passwordHash,
    version = 1,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.userId = userId;
    this.fullName = fullName;
    this.role = role;
    // Private: NEVER published
    this.passwordHash = passwordHash;
    this.version = version;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Generates a strong ETag based on userId, version, and role.
   */
  getETag() {
    const raw = `${this.userId}:${this.version}:${this.role}:${this.fullName}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex').substring(0, 12);
    return `"${this.version}-${hash}"`;
  }

  /**
   * asJSON() — published representation; NEVER includes passwordHash.
   */
  asJSON() {
    return {
      userId: this.userId,
      fullName: this.fullName,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * asXML() — XML representation for content negotiation.
   */
  asXML() {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<user id="${escapeXml(this.userId)}">\n` +
      `  <fullName>${escapeXml(this.fullName)}</fullName>\n` +
      `  <role>${escapeXml(this.role)}</role>\n` +
      `  <createdAt>${this.createdAt}</createdAt>\n` +
      `  <updatedAt>${this.updatedAt}</updatedAt>\n` +
      `</user>`
    );
  }
}

function escapeXml(unsafe) {
  return String(unsafe || '').replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

module.exports = { User, escapeXml };
