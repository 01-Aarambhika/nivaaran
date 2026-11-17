/**
 * errors.js - Standardized RFC 7807 Problem Details
 *
 * Rules:
 * B1 (A6): Route every failure through problem() so all errors share one shape.
 * B2 (A6): Stable type catalogue strings.
 * B3 (A6): Field-level errors for 422 validation failures.
 * B4 (A6): Don't leak internals. Wrap risky work in try/catch, log detail server-side,
 *          return mapped clean error.
 */

const { escapeXml } = require('./models');

const TITLES = {
  'invalid-request': 'Invalid Request',
  'unauthorized': 'Unauthorized',
  'complaint-not-found': 'Complaint Not Found',
  'not-acceptable': 'Not Acceptable',
  'state-conflict': 'State Conflict',
  'precondition-failed': 'Precondition Failed',
  'validation-failed': 'Validation Failed',
  'rate-limit-exceeded': 'Too Many Requests',
  'service-unavailable': 'Service Unavailable',
  'internal-error': 'Internal Server Error'
};

function problem(res, status, code, detail = '', errors = null) {
  const typeUri = `/errors/${code}`;
  const title = TITLES[code] || 'Error';

  // Specific header requirements
  if (status === 429) {
    res.set('Retry-After', '60');
  }
  if (status === 401) {
    res.set('WWW-Authenticate', 'Bearer realm="nivaaran-complaints"');
  }

  const accept = res.req?.headers['accept'] || '';

  // Content Negotiation: XML Error if requested
  if (accept.includes('application/xml')) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<problem xmlns="urn:ietf:rfc:7807">\n`;
    xml += `  <type>${typeUri}</type>\n`;
    xml += `  <title>${escapeXml(title)}</title>\n`;
    xml += `  <status>${status}</status>\n`;
    xml += `  <detail>${escapeXml(detail)}</detail>\n`;
    if (errors && Array.isArray(errors) && errors.length > 0) {
      xml += `  <errors>\n`;
      for (const err of errors) {
        if (typeof err === 'object' && err.field) {
          xml += `    <error field="${escapeXml(err.field)}">${escapeXml(err.msg)}</error>\n`;
        } else if (Array.isArray(err)) {
          xml += `    <error field="${escapeXml(err[0])}">${escapeXml(err[1])}</error>\n`;
        }
      }
      xml += `  </errors>\n`;
    }
    xml += `</problem>`;

    return res.status(status).set('Content-Type', 'application/problem+xml; charset=utf-8').send(xml);
  }

  // Standard JSON Problem Details
  const body = {
    type: typeUri,
    title,
    status,
    detail
  };

  if (errors && Array.isArray(errors) && errors.length > 0) {
    body.errors = errors;
  }

  return res.status(status).set('Content-Type', 'application/problem+json; charset=utf-8').json(body);
}

module.exports = { problem, TITLES };
