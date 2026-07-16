const { Router } = require('express');
const {
  register, login, googleAuth, refresh, logout, getMe,
  updateProfile, changePassword, forgotPassword, verifyOtp, resetPassword, getAllUsers,
} = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.get('/users', protect, adminOnly, getAllUsers);

module.exports = router;
