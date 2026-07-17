// Centralized error-handling utilities for consistent API responses.
class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = options.code || null; // machine-readable code: EMAIL_FAILED, OTP_EXPIRED, etc.
    if (options.details) this.details = options.details;
  }
}

// Wraps an async route handler so thrown/rejected errors propagate to the
// centralized error middleware instead of crashing the process.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Maps low-level error types to friendly, actionable messages.
const classifyError = (err) => {
  const msg = (err && err.message) || '';
  const name = err && err.name;
  const code = err && err.code;

  // Network / SMTP / Email related
  if (
    /ECONNREFUSED|ETIMEDOUT|ESOCKET|ECONNRESET|getaddrinfo|network|socket/i.test(msg) ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED'
  ) {
    return { statusCode: 503, message: 'Unable to reach the email server. Please try again shortly.', code: 'NETWORK_ERROR' };
  }
  if (/timeout/i.test(msg) || (err && err.response && /timeout/i.test(String(err.response)))) {
    return { statusCode: 504, message: 'The email server took too long to respond. Please try again.', code: 'TIMEOUT' };
  }
  if (
    /auth|Invalid login|535|incorrect authentication|username and password not accepted|bad sequence/i.test(msg)
  ) {
    return { statusCode: 502, message: 'Email authentication failed. Please contact support.', code: 'AUTH_ERROR' };
  }
  if (/Missing credentials|Missing ENV|not configured/i.test(msg)) {
    return { statusCode: 503, message: 'Email service is not configured. Please try again later or contact support.', code: 'MISSING_ENV' };
  }
  if (name === 'ValidationError') {
    return { statusCode: 400, message: 'Validation failed.', code: 'VALIDATION_ERROR' };
  }
  if (name === 'JsonWebTokenError' || name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Invalid or expired token.', code: 'INVALID_TOKEN' };
  }
  return null;
};

module.exports = { AppError, asyncHandler, classifyError };
