const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Order = require('../models/Order');
const { sendEmail } = require('../utils/mailer');

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
let googleClient = null;
if (googleClientId) {
  googleClient = googleClientSecret
    ? new OAuth2Client(googleClientId, googleClientSecret)
    : new OAuth2Client(googleClientId);
}

const signToken = (id, role = 'user') =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });

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

    console.log(`[Auth] Register attempt for ${email.toLowerCase().trim()}`);

    const existing = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered.', errorCode: 'DUPLICATE_EMAIL' });
    }

    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password });
    const token = signToken(user._id, user.role);

    console.log(`[Auth] User registered successfully: ${user.email} (ID: ${user._id})`);
    res.status(201).json(serializeUser(user, token));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered.', errorCode: 'DUPLICATE_EMAIL' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. '), errorCode: 'VALIDATION_ERROR' });
    }
    console.error('[Auth] Register error:', error.message);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.', errorCode: 'SERVER_ERROR' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.', errorCode: 'MISSING_FIELDS' });
    }

    console.log(`[Auth] Login attempt for ${email.toLowerCase().trim()}`);

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password name email role googleId avatar phone address wishlist cart createdAt');

    if (!user || !(await user.matchPassword(password))) {
      console.warn(`[Auth] Failed login attempt for ${email.toLowerCase().trim()}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.', errorCode: 'INVALID_CREDENTIALS' });
    }

    const token = signToken(user._id, user.role);
    console.log(`[Auth] Login successful: ${user.email} (ID: ${user._id})`);
    res.json(serializeUser(user, token));
  } catch (error) {
    console.error('[Auth] Login error:', error.message);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.', errorCode: 'SERVER_ERROR' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const idToken = req.body.idToken || req.body.credential;

    if (!idToken) {
      console.warn('[Google Login] No credential provided. Body keys:', Object.keys(req.body));
      return res.status(400).json({ success: false, message: 'Google credential token is required.', errorCode: 'MISSING_CREDENTIAL' });
    }

    if (!googleClientId) {
      console.error('[Google Login] GOOGLE_CLIENT_ID env var is not set.');
      return res.status(500).json({ success: false, message: 'Google Login is not configured on the server.', errorCode: 'GOOGLE_NOT_CONFIGURED' });
    }

    if (!googleClient) {
      console.error('[Google Login] Google OAuth2Client failed to initialize.');
      return res.status(500).json({ success: false, message: 'Google Login is not configured on the server.', errorCode: 'GOOGLE_NOT_CONFIGURED' });
    }

    console.log('[Google Login] Verifying credential...');

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('[Google Login] Token verification failed:', verifyError.message);
      const isOriginIssue =
        verifyError.message?.includes('origin') ||
        verifyError.message?.includes('audience') ||
        verifyError.message?.includes('invalid_token');
      if (isOriginIssue) {
        return res.status(400).json({
          success: false,
          message: 'Google Login configuration error.',
          hint: 'Add "' + req.headers.origin + '" to Authorized JavaScript origins in Google Cloud Console.',
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

    if (!email || !emailVerified) {
      return res.status(400).json({ success: false, message: 'Google account email could not be verified.', errorCode: 'GOOGLE_EMAIL_UNVERIFIED' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Google Login] Verified: ${normalizedEmail}`);

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId: sub,
        avatar: picture || '',
      });
      console.log(`[Google Login] New user created: ${normalizedEmail} (ID: ${user._id})`);
    } else if (!user.googleId) {
      user.googleId = sub;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
      console.log(`[Google Login] Linked Google ID to existing user: ${normalizedEmail}`);
    }

    const token = signToken(user._id, user.role);
    console.log(`[Google Login] Success: ${normalizedEmail} (ID: ${user._id})`);
    res.json(serializeUserLite(user, token));
  } catch (error) {
    console.error('[Google Login] Unexpected error:', error.message);
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
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60s between resends
const OTP_MAX_RESENDS = 5; // hard cap per lock window
const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000; // 1h window for the cap
const OTP_MAX_ATTEMPTS = 5; // max wrong OTP attempts before lockout
const OTP_RATE_LIMIT = 10; // max requests per IP per window (relaxed from 5)
const OTP_RATE_WINDOW_MS = 10 * 60 * 1000; // 10 min

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
// secure OTP (bcrypt-hashed), and automatic cleanup. Returns a consistent
// JSON envelope — never a raw 500.
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.', errorCode: 'INVALID_EMAIL' });
    }

    // ---- Per-IP rate limiting (brute-force / abuse protection) ----
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
      console.warn(`[sendOtp] Rate limit exceeded for IP ${ip}`);
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait a few minutes before trying again.',
        errorCode: 'RATE_LIMITED',
      });
    }

    // ---- Verify user exists BEFORE generating OTP ----
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+otp');
    if (!user) {
      console.warn(`[sendOtp] Email not found: ${email.toLowerCase().trim()}`);
      // User explicitly wants 404 when email doesn't exist
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.',
        errorCode: 'EMAIL_NOT_FOUND',
      });
    }

    console.log(`[sendOtp] User found: ${user.email} (ID: ${user._id})`);

    // ---- Resend cooldown + max resend cap (per 1h window) ----
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

    // Generate a new OTP (never reuse — old plaintext is unreliable across restarts)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    console.log(`[sendOtp] OTP generated for ${user.email}`);

    user.otp = hashedOtp;
    user.otpExpires = new Date(now + OTP_TTL_MS);
    user.otpRequestedAt = new Date(now);
    user.otpResendCount = (user.otpResendCount || 0) + 1;
    user.otpAttemptCount = 0; // reset attempts for new OTP
    user.otpAttemptsLockedAt = undefined;
    if (user.otpResendCount >= OTP_MAX_RESENDS) {
      user.otpMaxReachedAt = new Date(now);
    }
    await user.save();

    console.log(`[sendOtp] OTP stored in database for ${user.email}, expires at ${new Date(now + OTP_TTL_MS).toISOString()}`);

    const { ok, reason } = await sendEmail({
      to: user.email,
      subject: 'Password Reset OTP - Prakruthi Bags',
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif"><table role="presentation" style="width:100%;max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)"><tr><td style="background:#2E5A44;padding:28px 32px;text-align:center"><h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">Prakruthi Bags</h1><p style="margin:4px 0 0;color:#A3C9A8;font-size:13px">Eco-friendly &middot; Handcrafted &middot; Premium</p></td></tr><tr><td style="padding:32px 32px 24px"><h2 style="margin:0 0 6px;color:#1a1a1a;font-size:18px">Password Reset Request</h2><p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6">We received a request to reset your password. Use the OTP below to proceed. This is valid for <strong>10 minutes</strong>.</p><div style="background:#f0f7f1;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px"><p style="margin:0 0 8px;color:#2E5A44;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Your OTP</p><div style="font-size:38px;font-weight:700;color:#1a3a2a;letter-spacing:10px;font-family:monospace">${otp}</div></div><p style="margin:0;color:#888;font-size:12px;line-height:1.5">If you did not request this password reset, please ignore this email or contact our support team.</p></td></tr><tr><td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e8e8e8"><p style="margin:0;color:#999;font-size:11px;text-align:center">&copy; ${new Date().getFullYear()} Prakruthi Bags. All rights reserved.</p></td></tr></table></body></html>`,
    });

    if (!ok) {
      console.error(`[sendOtp] Email delivery FAILED for ${user.email}: ${reason}`);
      // Tell the user explicitly that the email failed so they can report it.
      // The OTP IS stored and valid for 10 minutes — they can also use the
      // resend flow once SMTP is fixed.
      return res.status(503).json({
        success: false,
        message: 'Unable to send OTP email. Please try again shortly or contact support.',
        errorCode: 'EMAIL_FAILED',
        detail: process.env.NODE_ENV === 'development' ? reason : undefined,
      });
    }

    console.log(`[sendOtp] Email sent successfully to ${user.email}`);
    return res.status(200).json({
      success: true,
      message: 'OTP has been sent to your email. It expires in 10 minutes.',
    });
  } catch (error) {
    console.error('[sendOtp] Unexpected error:', error?.message || error);
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
      return res.status(404).json({ success: false, message: 'Email not found.', errorCode: 'EMAIL_NOT_FOUND' });
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
      await user.save();
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.', errorCode: 'OTP_EXPIRED' });
    }

    // Check if too many wrong attempts
    const now = Date.now();
    if (user.otpAttemptsLockedAt && now - new Date(user.otpAttemptsLockedAt).getTime() < OTP_RESEND_WINDOW_MS) {
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.', errorCode: 'OTP_LOCKED' });
    }

    if (user.otpAttemptCount >= OTP_MAX_ATTEMPTS) {
      user.otpAttemptsLockedAt = new Date();
      user.otpAttemptCount = (user.otpAttemptCount || 0) + 1;
      await user.save();
      console.warn(`[verifyOtp] OTP locked for ${email} after ${OTP_MAX_ATTEMPTS} failed attempts`);
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.', errorCode: 'OTP_LOCKED' });
    }

    const isValid = await bcrypt.compare(otp, user.otp);
    if (!isValid) {
      user.otpAttemptCount = (user.otpAttemptCount || 0) + 1;
      await user.save();
      console.warn(`[verifyOtp] Failed attempt ${user.otpAttemptCount}/${OTP_MAX_ATTEMPTS} for ${email}`);
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.', errorCode: 'INVALID_OTP' });
    }

    // OTP verified — clear it so it can't be reused (no replay / brute force).
    console.log(`[verifyOtp] OTP verified successfully for ${email}`);
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpRequestedAt = undefined;
    user.otpResendCount = 0;
    user.otpMaxReachedAt = undefined;
    user.otpAttemptCount = 0;
    user.otpAttemptsLockedAt = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('[verifyOtp] error:', error?.message || error);
    res.status(500).json({ success: false, message: 'OTP verification failed. Please try again.', errorCode: 'SERVER_ERROR' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.', errorCode: 'INVALID_EMAIL' });
    }
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'A valid 6-digit OTP is required.', errorCode: 'INVALID_OTP_FORMAT' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.', errorCode: 'WEAK_PASSWORD' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +otp');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email not found.', errorCode: 'EMAIL_NOT_FOUND' });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ success: false, message: 'No OTP was requested for this email. Please request a new one.', errorCode: 'NO_OTP' });
    }

    if (Date.now() > new Date(user.otpExpires).getTime()) {
      user.otp = undefined;
      user.otpExpires = undefined;
      user.otpRequestedAt = undefined;
      await user.save();
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.', errorCode: 'OTP_EXPIRED' });
    }

    const isValid = await bcrypt.compare(otp, user.otp);
    if (!isValid) {
      console.warn(`[resetPassword] Invalid OTP attempt for ${email}`);
      return res.status(400).json({ success: false, message: 'Invalid OTP.', errorCode: 'INVALID_OTP' });
    }

    console.log(`[resetPassword] Password reset successful for ${email}`);
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpRequestedAt = undefined;
    user.otpResendCount = 0;
    user.otpMaxReachedAt = undefined;
    user.otpAttemptCount = 0;
    user.otpAttemptsLockedAt = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful.' });
  } catch (error) {
    console.error('[resetPassword] error:', error?.message || error);
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
    res.json({ ...serializeUser(user), orders });
  } catch (error) {
    console.error('[Profile] Get profile error:', error.message);
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
    console.error('[Profile] Update profile error:', error.message);
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
    res.json({ enabled, clientId });
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
    console.log(`[Auth] User logged out: ${req.user.email}`);
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
