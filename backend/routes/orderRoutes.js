const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  trackOrderPublic,
  trackMyOrder,
} = require('../controllers/orderController');

router.post('/', protect, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.post('/:id/cancel', protect, cancelOrder);
router.post('/track', trackOrderPublic);
router.get('/track/:id', protect, trackMyOrder);

module.exports = router;
