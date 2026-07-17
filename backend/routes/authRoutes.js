const express = require('express');
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

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/google-config', getGoogleConfig);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/refresh', protect, refreshToken);
router.post('/logout', protect, logout);

module.exports = router;
