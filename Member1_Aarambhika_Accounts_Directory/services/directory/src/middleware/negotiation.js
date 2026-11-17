/**
 * middleware/negotiation.js - Content Negotiation Middleware
 *
 * B1 & C3: Honour Accept header. Return JSON by default, XML if asked;
 *          return 406 Not Acceptable if an unsupported type is demanded.
 * C4: Set Content-Type (+ charset=utf-8) on every response.
 */

const { problem } = require('../errors');
const { escapeXml } = require('../models');

const SUPPORTED_ACCEPT = ['application/json', 'application/xml', '*/*', 'text/html'];

function contentNegotiation(req, res, next) {
  const accept = req.headers['accept'] || '*/*';

  if (accept !== '*/*' && !accept.includes('*/*')) {
    const isSupported = SUPPORTED_ACCEPT.some(mime => accept.includes(mime));
    if (!isSupported) {
      return problem(
        res,
        406,
        'not-acceptable',
        `Client requested Accept '${accept}'. Supported representations: application/json, application/xml.`
      );
    }
  }

  res.sendNegotiated = function (data, statusCode = 200) {
    if (accept.includes('application/xml')) {
      res.set('Content-Type', 'application/xml; charset=utf-8');
      if (typeof data.asXML === 'function') {
        return res.status(statusCode).send(data.asXML());
      }
      if (Array.isArray(data)) {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<items>\n`;
        for (const item of data) {
          const itemXml = typeof item.asXML === 'function'
            ? item.asXML()
            : `<item>${escapeXml(JSON.stringify(item))}</item>`;
          xml += `  ${itemXml.replace(/<\?xml.*?\?>\n?/, '')}\n`;
        }
        xml += `</items>`;
        return res.status(statusCode).send(xml);
      }
      return res.status(statusCode).send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<response>${escapeXml(JSON.stringify(data))}</response>`
      );
    }

    // Default: application/json
    res.set('Content-Type', 'application/json; charset=utf-8');
    const jsonOutput = typeof data.asJSON === 'function'
      ? data.asJSON()
      : Array.isArray(data)
        ? data.map(d => typeof d.asJSON === 'function' ? d.asJSON() : d)
        : data;
    return res.status(statusCode).json(jsonOutput);
  };

  next();
}

module.exports = { contentNegotiation };
