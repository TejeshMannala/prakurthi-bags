const { Router } = require('express');
const { getDailySales, getOverview } = require('../controllers/analyticsController');
const { protect, adminOnly } = require('../middleware/auth');

const router = Router();

router.get('/daily-sales', protect, adminOnly, getDailySales);
router.get('/overview', protect, adminOnly, getOverview);

module.exports = router;
