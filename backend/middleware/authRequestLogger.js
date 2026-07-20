const logger = require('../utils/logger');

// Logs every authentication request (method, path, origin, IP, status) without
// ever logging passwords or tokens. Attaches a response listener so we capture
// the final status code for debugging.
const authRequestLogger = (req, res, next) => {
  const start = Date.now();
  const ip =
    (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
    req.socket?.remoteAddress ||
    'unknown';
  const origin = req.headers.origin || '-';

  // Sanitize body: drop sensitive fields, keep shape for debugging.
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return {};
    const out = {};
    for (const key of Object.keys(obj)) {
      if (['password', 'newpassword', 'newPassword', 'token', 'idtoken', 'credential', 'otp'].includes(key.toLowerCase())) {
        out[key] = '[redacted]';
      } else {
        out[key] = obj[key];
      }
    }
    return out;
  };

  const origSend = res.json.bind(res);
  res.json = (body) => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'debug';
    logger[level](
      `AUTH ${req.method} ${req.originalUrl} -> ${status} (${ms}ms) origin=${origin} ip=${ip}` +
        (status >= 400 ? ` body=${JSON.stringify(body)}` : '')
    );
    return origSend(body);
  };

  if (logger.level === 'debug' || process.env.NODE_ENV !== 'production') {
    logger.debug(`AUTH REQ ${req.method} ${req.originalUrl} origin=${origin} ip=${ip} payload=${JSON.stringify(sanitize(req.body))}`);
  }
  next();
};

module.exports = authRequestLogger;
