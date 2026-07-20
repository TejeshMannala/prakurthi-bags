const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Order = require('../models/Order');
const { sendEmailBackground } = require('../utils/mailer');
const logger = require('../utils/logger');

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
let googleClient = null;
if (googleClientId) {
  if (!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(googleClientId)) {
    logger.warn('GOOGLE_CLIENT_ID does not look like a valid Web OAuth client ID — Google login will fail with invalid_client.');
  }
  googleClient = googleClientSecret
    ? new OAuth2Client(googleClientId, googleClientSecret)
    : new OAuth2Client(googleClientId);
} else {
  logger.warn('GOOGLE_CLIENT_ID is not set — Google login is disabled. Set it in backend/.env (and Render dashboard).');
}

const signToken = (id, role = 'user') => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 10) {
    // Fail loudly — a missing/weak secret must never silently produce tokens.
    throw new Error('JWT_SECRET is not configured or too weak');
  }
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const serializeUser = (user, token) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  googleId: user.googleId,
  avatar: user.avatar,
  phone: user.phone,
  address: user.address,
  wishlist: user.wishlist,
  cart: user.cart,
  createdAt: user.createdAt,
  token,
});

const serializeUserLite = (user, token) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  googleId: user.googleId,
  avatar: user.avatar,
  createdAt: user.createdAt,
  token,
});

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.', errorCode: 'MISSING_NAME' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.', errorCode: 'INVALID_EMAIL' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.', errorCode: 'WEAK_PASSWORD' });
    }

    logger.debug(`Register attempt: ${email.toLowerCase().trim()}`);

    const existing = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered.', errorCode: 'DUPLICATE_EMAIL' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      emailVerified: true,
    });
    const token = signToken(user._id, user.role);

    logger.debug(`Registered: ${user.email}`);
    res.status(201).json(serializeUser(user, token));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered.', errorCode: 'DUPLICATE_EMAIL' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. '), errorCode: 'VALIDATION_ERROR' });
    }
    logger.error('Register error:', error.message);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.', errorCode: 'SERVER_ERROR' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.', errorCode: 'MISSING_FIELDS' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    logger.info(`Login attempt: ${normalizedEmail} (origin=${req.headers.origin || 'unknown'})`);

    const user = await User.findOne({ email: normalizedEmail })
      .select('+password name email role googleId avatar phone address wishlist cart createdAt isActive emailVerified');

    // Distinct messages so the client can show meaningful errors. We avoid
    // confirming whether an email exists to unauthenticated callers only when
    // safe; here we surface a generic message for both "not found" and
    // "wrong password" to prevent account enumeration, but return specific
    // errorCodes internally for logging and legitimate client handling.
    if (!user) {
      logger.warn(`Login failed (user not found): ${normalizedEmail}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.', errorCode: 'USER_NOT_FOUND' });
    }

    const passwordMatches = await user.matchPassword(password);
    if (!passwordMatches) {
      logger.warn(`Login failed (incorrect password): ${normalizedEmail}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.', errorCode: 'INCORRECT_PASSWORD' });
    }

    if (user.emailVerified === false) {
      logger.warn(`Login blocked (email not verified): ${normalizedEmail}`);
      return res.status(403).json({ success: false, message: 'Please verify your email address before logging in.', errorCode: 'EMAIL_NOT_VERIFIED' });
    }

    if (user.isActive === false) {
      logger.warn(`Login blocked (account disabled): ${normalizedEmail}`);
      return res.status(403).json({ success: false, message: 'Your account has been disabled. Please contact support.', errorCode: 'ACCOUNT_DISABLED' });
    }

    const token = signToken(user._id, user.role);
    logger.info(`[AUTH] Login successful: ${user.email} (role=${user.role})`);
    logger.info(`[AUTH] JWT generated for user ${user._id}`);
    res.json(serializeUser(user, token));
  } catch (error) {
    logger.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.', errorCode: 'SERVER_ERROR' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const idToken = req.body.idToken || req.body.credential;

    logger.info(`[Google] login request received (origin=${req.headers.origin || 'unknown'})`);

    if (!idToken) {
      logger.warn('Google login: no credential provided');
      return res.status(400).json({ success: false, message: 'Google credential token is required.', errorCode: 'MISSING_CREDENTIAL' });
    }

    if (!googleClientId) {
      logger.error('GOOGLE_CLIENT_ID env var is not set');
      return res.status(500).json({ success: false, message: 'Google Login is not configured on the server.', errorCode: 'GOOGLE_NOT_CONFIGURED' });
    }

    if (!googleClient) {
      logger.error('Google OAuth2Client failed to initialize');
      return res.status(500).json({ success: false, message: 'Google Login is not configured on the server.', errorCode: 'GOOGLE_NOT_CONFIGURED' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      logger.error('Google token verification failed:', verifyError.message);
      const isOriginIssue =
        verifyError.message?.includes('origin') ||
        verifyError.message?.includes('audience') ||
        verifyError.message?.includes('invalid_token');
      if (isOriginIssue) {
        const origin = req.headers.origin || 'unknown';
        return res.status(400).json({
          success: false,
          message: 'Google Login origin mismatch. The frontend origin is not authorized in Google Cloud Console.',
          hint: `Add "${origin}" to "Authorized JavaScript origins" in Google Cloud Console > APIs & Services > Credentials > your OAuth Client ID.`,
          docs: 'https://console.cloud.google.com/apis/credentials',
          errorCode: 'GOOGLE_ORIGIN_MISMATCH',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Google authentication failed. Invalid token.',
        detail: process.env.NODE_ENV === 'development' ? verifyError.message : undefined,
        errorCode: 'GOOGLE_INVALID_TOKEN',
      });
    }

    const { name, email, sub, picture, email_verified: emailVerified } = payload;

    logger.info(`[Google] token verified: email=${email} sub=${sub} emailVerified=${emailVerified}`);

    if (!email || !emailVerified) {
      return res.status(400).json({ success: false, message: 'Google account email could not be verified.', errorCode: 'GOOGLE_EMAIL_UNVERIFIED' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId: sub,
        avatar: picture || '',
        emailVerified: true,
      });
      logger.info(`Google login: created new user ${normalizedEmail}`);
    } else {
      // Existing user with the same email — link the Google account instead of
      // creating a duplicate. If a googleId is already set but differs, keep the
      // existing one (don't overwrite a previously linked account).
      let changed = false;
      if (!user.googleId) {
        user.googleId = sub;
        changed = true;
        logger.info(`Google login: linked Google ID to existing user ${normalizedEmail}`);
      }
      if (picture && !user.avatar) {
        user.avatar = picture;
        changed = true;
      }
      if (!user.emailVerified) {
        user.emailVerified = true;
        changed = true;
      }
      if (changed) {
        try {
          await user.save();
        } catch (saveErr) {
          logger.error(`Google login: failed to update user ${normalizedEmail}:`, saveErr.message);
        }
      }
    }

    const token = signToken(user._id, user.role);
    logger.info(`[Google] login OK: ${normalizedEmail} (role=${user.role}, userId=${user._id})`);
    logger.info(`[AUTH] JWT generated for user ${user._id}`);
    res.json(serializeUserLite(user, token));
  } catch (error) {
    logger.error('Google login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed. Please try again.',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorCode: 'GOOGLE_SERVER_ERROR',
    });
  }
};

// ---------------------------------------------------------------------------
// Production-grade OTP configuration
// ---------------------------------------------------------------------------
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30s between resends
const OTP_MAX_RESENDS = 5; // hard cap per lock window
const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000; // 1h window for the cap
const OTP_MAX_ATTEMPTS = 5; // max wrong OTP attempts before lockout
const OTP_RATE_LIMIT = 10; // max requests per IP per window
const OTP_RATE_WINDOW_MS = 10 * 60 * 1000; // 10 min
const OTP_RESET_WINDOW_MS = 15 * 60 * 1000; // 15 min after verification to complete password reset

// In-memory per-IP rate limiter (cheap, process-local; Render free tier is
// single-instance so this is sufficient; pairs with Redis if scaled).
const otpIpHits = new Map();
const otpCleanup = () => {
  const now = Date.now();
  for (const [ip, rec] of otpIpHits) {
    if (now - rec.windowStart > OTP_RATE_WINDOW_MS) otpIpHits.delete(ip);
  }
};
setInterval(otpCleanup, OTP_RATE_WINDOW_MS).unref();

const getClientIp = (req) =>
  (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
  req.socket?.remoteAddress ||
  'unknown';

// Shared OTP dispatch used by both POST /api/auth/forgot-password and
// POST /api/auth/send-otp. Implements cooldown, resend cap, rate limiting,
// secure OTP (bcrypt-hashed), and automatic cleanup.
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    logger.info(`[OTP] Forgot Password request received for: ${email}`);

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.', errorCode: 'INVALID_EMAIL' });
    }

    if (mongoose.connection.readyState !== 1) {
      logger.error('sendOtp: MongoDB not connected');
      return res.status(503).json({ success: false, message: 'Database is temporarily unavailable. Please try again shortly.', errorCode: 'DB_UNAVAILABLE' });
    }

    // ---- Per-IP rate limiting ----
    const ip = getClientIp(req);
    const now = Date.now();
    const rec = otpIpHits.get(ip) || { windowStart: now, count: 0 };
    if (now - rec.windowStart > OTP_RATE_WINDOW_MS) {
      rec.windowStart = now;
      rec.count = 0;
    }
    rec.count += 1;
    otpIpHits.set(ip, rec);
    if (rec.count > OTP_RATE_LIMIT) {
      logger.warn(`OTP rate limit exceeded for IP ${ip}`);
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait a few minutes before trying again.',
        errorCode: 'RATE_LIMITED',
      });
    }

    // ---- Verify user exists ----
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+otp');
    if (!user) {
      logger.warn(`OTP requested for non-existent email: ${email.toLowerCase().trim()}`);
      return res.status(404).json({
        success: false,
        message: 'Invalid email address. No account found with this email.',
        errorCode: 'EMAIL_NOT_FOUND',
      });
    }
    logger.info(`[OTP] User found: ${user.email}`);

    // ---- Resend cooldown + max resend cap ----
    if (user.otpRequestedAt && now - new Date(user.otpRequestedAt).getTime() < OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - (now - new Date(user.otpRequestedAt).getTime())) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSec}s before requesting another OTP.`,
        errorCode: 'RESEND_COOLDOWN',
        retryAfter: waitSec,
      });
    }
    if (
      user.otpMaxReachedAt &&
      now - new Date(user.otpMaxReachedAt).getTime() < OTP_RESEND_WINDOW_MS
    ) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP requests reached. Please try again after an hour.',
        errorCode: 'MAX_RESENDS',
      });
    }

    // Reset resend count if the lockout window has passed
    if (user.otpMaxReachedAt && now - new Date(user.otpMaxReachedAt).getTime() >= OTP_RESEND_WINDOW_MS) {
      user.otpResendCount = 0;
      user.otpMaxReachedAt = undefined;
    }

    // Generate a new OTP
    logger.info('[OTP] Generating OTP...');
    const otp = crypto.randomInt(100000, 1000000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    user.otp = hashedOtp;
    user.otpExpires = new Date(now + OTP_TTL_MS);
    user.otpRequestedAt = new Date(now);
    user.otpResendCount = (user.otpResendCount || 0) + 1;
    user.otpAttemptCount = 0;
    user.otpAttemptsLockedAt = undefined;
    user.otpVerified = false;
    user.otpVerifiedAt = undefined;
    if (user.otpResendCount >= OTP_MAX_RESENDS) {
      user.otpMaxReachedAt = new Date(now);
    }
    await user.save();

    logger.info(`[OTP] OTP saved for ${user.email}, TTL=${OTP_TTL_MS / 1000}s`);

    // Respond to the client IMMEDIATELY. The OTP is now safely persisted in the
    // DB, so the user can verify / resend. The email is sent in the BACKGROUND
    // (bounded, fire-and-forget) so a slow/unreachable SMTP server can
    // NEVER block this request — that is exactly what caused the 30s frontend
    // timeout + canceled POST in production (Render -> Gmail SMTP connection
    // timeout). Even if the email later fails, the user already has a working
    // OTP and can hit "Resend OTP".
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const smtpConfigured = !!smtpUser && !!smtpPass && !/YOUR_|your_/.test(smtpPass);
    if (!smtpConfigured) {
      logger.error('[OTP] SMTP NOT configured (set SMTP_USER + SMTP_PASS in the Render dashboard). OTP is saved in DB but the email CANNOT be delivered — user must use "Resend OTP" after configuring, or check spam.');
    }
    res.status(200).json({
      success: true,
      message: smtpConfigured
        ? 'OTP has been generated and sent to your email. It expires in 5 minutes.'
        : 'OTP has been generated. If you do not receive the email shortly, check your spam folder or use "Resend OTP" (email service may not be configured).',
      emailSent: smtpConfigured,
    });

    // Fire-and-forget: deliver the email after the response is on its way.
    sendEmailBackground({
      to: user.email,
      subject: 'Password Reset OTP - Prakruthi Bags',
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif"><table role="presentation" style="width:100%;max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)"><tr><td style="background:#2E5A44;padding:28px 32px;text-align:center"><h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">Prakruthi Bags</h1><p style="margin:4px 0 0;color:#A3C9A8;font-size:13px">Eco-friendly &middot; Handcrafted &middot; Premium</p></td></tr><tr><td style="padding:32px 32px 24px"><h2 style="margin:0 0 6px;color:#1a1a1a;font-size:18px">Password Reset Request</h2><p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6">We received a request to reset your password. Use the OTP below to proceed. This is valid for <strong>5 minutes</strong>.</p><div style="background:#f0f7f1;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px"><p style="margin:0 0 8px;color:#2E5A44;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Your OTP</p><div style="font-size:38px;font-weight:700;color:#1a3a2a;letter-spacing:10px;font-family:monospace">${otp}</div></div><p style="margin:0;color:#888;font-size:12px;line-height:1.5">If you did not request this password reset, please ignore this email or contact our support team.</p></td></tr><tr><td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e8e8e8"><p style="margin:0;color:#999;font-size:11px;text-align:center">&copy; ${new Date().getFullYear()} Prakruthi Bags. All rights reserved.</p></td></tr></table></body></html>`,
    });
  } catch (error) {
    logger.error('sendOtp error:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.', errorCode: 'SERVER_ERROR' });
  }
};

// Legacy alias kept for backwards compatibility with the forgot-password page.
const forgotPassword = sendOtp;

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.', errorCode: 'INVALID_EMAIL' });
    }
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'A valid 6-digit OTP is required.', errorCode: 'INVALID_OTP_FORMAT' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+otp');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Invalid email address. No account found with this email.', errorCode: 'EMAIL_NOT_FOUND' });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ success: false, message: 'No OTP was requested for this email. Please request a new one.', errorCode: 'NO_OTP' });
    }

    if (Date.now() > new Date(user.otpExpires).getTime()) {
      user.otp = undefined;
      user.otpExpires = undefined;
      user.otpRequestedAt = undefined;
      user.otpAttemptCount = 0;
      user.otpAttemptsLockedAt = undefined;
      user.otpVerified = false;
      user.otpVerifiedAt = undefined;
      await user.save();
      logger.debug(`OTP expired for ${email}`);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.', errorCode: 'OTP_EXPIRED' });
    }

    const now = Date.now();
    if (user.otpAttemptsLockedAt && now - new Date(user.otpAttemptsLockedAt).getTime() < OTP_RESEND_WINDOW_MS) {
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.', errorCode: 'OTP_LOCKED' });
    }
    if (user.otpAttemptsLockedAt && now - new Date(user.otpAttemptsLockedAt).getTime() >= OTP_RESEND_WINDOW_MS) {
      user.otpAttemptCount = 0;
      user.otpAttemptsLockedAt = undefined;
    }

    if (user.otpAttemptCount >= OTP_MAX_ATTEMPTS) {
      user.otpAttemptsLockedAt = new Date();
      user.otpAttemptCount = (user.otpAttemptCount || 0) + 1;
      await user.save();
      logger.warn(`OTP locked for ${email} after ${OTP_MAX_ATTEMPTS} failed attempts`);
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.', errorCode: 'OTP_LOCKED' });
    }

    const isValid = await bcrypt.compare(otp, user.otp);
    if (!isValid) {
      user.otpAttemptCount = (user.otpAttemptCount || 0) + 1;
      await user.save();
      logger.debug(`OTP verify failed attempt ${user.otpAttemptCount}/${OTP_MAX_ATTEMPTS} for ${email}`);
      return res.status(400).json({ success: false, message: 'Invalid OTP.', errorCode: 'INVALID_OTP' });
    }

    if (user.otpVerified) {
      return res.status(200).json({ success: true, message: 'OTP already verified. Please proceed to reset your password.' });
    }

    logger.debug(`OTP verified for ${email}`);
    user.otpVerified = true;
    user.otpVerifiedAt = new Date();
    await user.save();

    res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    logger.error('verifyOtp error:', error?.message || error);
    res.status(500).json({ success: false, message: 'OTP verification failed. Please try again.', errorCode: 'SERVER_ERROR' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.', errorCode: 'INVALID_EMAIL' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.', errorCode: 'WEAK_PASSWORD' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Invalid email address. No account found with this email.', errorCode: 'EMAIL_NOT_FOUND' });
    }

    if (!user.otpVerified) {
      return res.status(400).json({ success: false, message: 'OTP not verified. Please verify your OTP first.', errorCode: 'OTP_NOT_VERIFIED' });
    }

    if (user.otpVerifiedAt && Date.now() - new Date(user.otpVerifiedAt).getTime() > OTP_RESET_WINDOW_MS) {
      user.otp = undefined;
      user.otpExpires = undefined;
      user.otpRequestedAt = undefined;
      user.otpResendCount = 0;
      user.otpMaxReachedAt = undefined;
      user.otpAttemptCount = 0;
      user.otpAttemptsLockedAt = undefined;
      user.otpVerified = false;
      user.otpVerifiedAt = undefined;
      await user.save();
      logger.debug(`Reset window expired for ${email}`);
      return res.status(400).json({ success: false, message: 'OTP verification expired. Please request a new OTP.', errorCode: 'OTP_EXPIRED' });
    }

    logger.debug(`Password reset OK: ${email}`);
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpRequestedAt = undefined;
    user.otpResendCount = 0;
    user.otpMaxReachedAt = undefined;
    user.otpAttemptCount = 0;
    user.otpAttemptsLockedAt = undefined;
    user.otpVerified = false;
    user.otpVerifiedAt = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful.' });
  } catch (error) {
    logger.error('resetPassword error:', error?.message || error);
    res.status(500).json({ success: false, message: 'Password reset failed. Please try again.', errorCode: 'SERVER_ERROR' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.', errorCode: 'USER_NOT_FOUND' });
    }
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
    logger.info(`[AUTH] Profile fetched for ${user.email} (orders: ${orders.length})`);
    logger.info(`[AUTH] Orders fetched for user ${req.user._id}: ${orders.length}`);
    res.json({ ...serializeUser(user), orders });
  } catch (error) {
    logger.error('Get profile error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch profile.', errorCode: 'SERVER_ERROR' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, avatar } = req.body;
    const update = {};
    if (name) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (avatar !== undefined) update.avatar = avatar;
    if (address) {
      update['address.street'] = address.street || '';
      update['address.city'] = address.city || '';
      update['address.state'] = address.state || '';
      update['address.zip'] = address.zip || '';
      update['address.country'] = address.country || 'India';
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.', errorCode: 'USER_NOT_FOUND' });
    res.json(serializeUser(user));
  } catch (error) {
    logger.error('Update profile error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile.', errorCode: 'SERVER_ERROR' });
  }
};

const getGoogleConfig = async (req, res) => {
  try {
    const clientId = googleClientId || null;
    const enabled =
      !!clientId &&
      process.env.GOOGLE_LOGIN_ENABLED !== 'false' &&
      process.env.GOOGLE_LOGIN_ENABLED !== '0';
    const config = { enabled, clientId };
    if (process.env.NODE_ENV === 'development') {
      config.allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:5173',
      ].filter(Boolean);
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, errorCode: 'SERVER_ERROR' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const token = signToken(req.user._id, req.user.role);
    res.json(serializeUser(req.user, token));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, errorCode: 'SERVER_ERROR' });
  }
};

const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $inc: { refreshTokenVersion: 1 } });
    logger.info(`[AUTH] Logout successful: ${req.user.email}`);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, errorCode: 'SERVER_ERROR' });
  }
};

module.exports = {
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
};
