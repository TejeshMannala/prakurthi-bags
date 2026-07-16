const { Router } = require('express');
const { validateCoupon, getAll, getAvailableCoupons, create, update, remove } = require('../controllers/couponController');
const { protect, adminOnly } = require('../middleware/auth');

const router = Router();

router.post('/validate', protect, validateCoupon);
router.get('/available', protect, getAvailableCoupons); // For users to fetch available dynamic coupons
router.get('/', protect, adminOnly, getAll);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);

module.exports = router;
