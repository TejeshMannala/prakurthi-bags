const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const {
  validateCoupon,
  getActiveCoupons,
  getWelcomeCoupon,
  getMilestoneCoupons,
} = require('../controllers/couponController');

router.get('/', optionalAuth, getActiveCoupons);
router.get('/available', optionalAuth, getActiveCoupons);
router.get('/welcome', protect, getWelcomeCoupon);
router.get('/milestones', optionalAuth, getMilestoneCoupons);
router.post('/validate', optionalAuth, validateCoupon);

module.exports = router;
