const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const otpStore = new Map();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER || process.env.SMTP_USER,
    pass: process.env.MAIL_PASS || process.env.SMTP_PASS,
  },
});

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || name.length < 2) {
    return res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered.' });
  }

  const user = await User.create({ name, email, password });
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    data: { user, accessToken, refreshToken },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    data: { user, accessToken, refreshToken },
  });
};

const googleAuth = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'Google ID token is required.' });
  }

  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, googleId });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save({ validateBeforeSave: false });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Google authentication failed.' });
  }
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token is required.' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
};

const logout = async (req, res) => {
  req.user.refreshToken = null;
  await req.user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Logged out successfully.' });
};

const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

const updateProfile = async (req, res) => {
  const { name, phone } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  res.json({ success: true, data: user, message: 'Profile updated.' });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  user.refreshToken = null;
  await user.save();

  res.json({ success: true, message: 'Password changed. Please login again.' });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: 'No account with this email.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  try {
    await transporter.sendMail({
      from: `"Prakruthi Bags" <${process.env.MAIL_USER || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset OTP - Prakruthi Bags',
      html: `
        <div style="font-family: 'Playfair Display', Georgia, serif; max-width: 480px; margin: 0 auto; background: #FAF7F2; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1F3A2E; font-size: 24px; letter-spacing: 2px;">PRAKRUTHI</h1>
            <p style="color: #C9A227; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Handmade Luxury</p>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #E5DDD1;">
            <h2 style="color: #1F3A2E; font-size: 18px; margin: 0 0 10px;">Password Reset</h2>
            <p style="color: #6B6358; font-size: 14px; line-height: 1.6;">You requested a password reset. Use the OTP below to reset your password. This code expires in 10 minutes.</p>
            <div style="text-align: center; margin: 25px 0;">
              <span style="display: inline-block; background: #1F3A2E; color: #FAF7F2; font-size: 28px; letter-spacing: 8px; padding: 12px 24px; font-family: monospace;">${otp}</span>
            </div>
            <p style="color: #B5AA9A; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
          <p style="color: #B5AA9A; font-size: 11px; text-align: center; margin-top: 20px;">&copy; ${new Date().getFullYear()} Prakruthi Bags. All rights reserved.</p>
        </div>
      `,
    });
    console.log(`[OTP] Email sent to ${email}: ${otp}`);
  } catch (err) {
    console.error(`[OTP] Failed to send email to ${email}:`, err.message);
  }

  res.json({ success: true, message: 'If an account exists with this email, an OTP has been sent.', devOtp: otp });
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
  }

  const stored = otpStore.get(email);
  if (!stored || stored.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'OTP has expired.' });
  }

  otpStore.set(email, { ...stored, verified: true });
  res.json({ success: true, message: 'OTP verified.' });
};

const resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ success: false, message: 'Email, OTP, and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const stored = otpStore.get(email);
  if (!stored || !stored.verified) {
    return res.status(400).json({ success: false, message: 'Please verify OTP first.' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  user.password = password;
  user.refreshToken = null;
  await user.save();

  otpStore.delete(email);

  res.json({ success: true, message: 'Password reset successfully.' });
};

const getAllUsers = async (req, res) => {
  const users = await User.find({ role: 'user' }).select('name email createdAt').sort({ createdAt: -1 });
  res.json({ success: true, data: users });
};

module.exports = { register, login, googleAuth, refresh, logout, getMe, updateProfile, changePassword, forgotPassword, verifyOtp, resetPassword, getAllUsers };
