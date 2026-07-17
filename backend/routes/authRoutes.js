const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  register,
  login,
  googleLogin,
  getGoogleConfig,
  forgotPassword,
  sendOtp,
  verifyOtp,
  resetPassword,
  getProfile,
  updateProfile,
  refreshToken,
  logout,
} = require('../controllers/authController');

// `forgotPassword` is defined as an alias of `sendOtp` inside the controller,
// so it may be undefined when destructured here — fall back to sendOtp.
const forgotPasswordHandler = forgotPassword || sendOtp;

// Dedicated rate limiters for sensitive auth endpoints to prevent brute-force
// attacks. These are MUCH stricter than the global limiter and isolated per
// endpoint so one endpoint's traffic can't cause 429s on another.

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.', errorCode: 'RATE_LIMITED' },
  keyGenerator: (req) =>
    (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
    req.socket?.remoteAddress ||
    'unknown',
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.', errorCode: 'RATE_LIMITED' },
  keyGenerator: (req) =>
    (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
    req.socket?.remoteAddress ||
    'unknown',
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Please try again in 15 minutes.', errorCode: 'RATE_LIMITED' },
  keyGenerator: (req) =>
    (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
    req.socket?.remoteAddress ||
    'unknown',
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again later.', errorCode: 'RATE_LIMITED' },
  keyGenerator: (req) =>
    (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
    req.socket?.remoteAddress ||
    'unknown',
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/google', authLimiter, googleLogin);
router.get('/google-config', getGoogleConfig);
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordHandler);
router.post('/send-otp', forgotPasswordLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/refresh', protect, refreshToken);
router.post('/logout', protect, logout);

module.exports = router;
