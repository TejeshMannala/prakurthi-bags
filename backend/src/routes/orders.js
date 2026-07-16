const { Router } = require('express');
const {
  createOrder, getMyOrders, getAllOrders,
  getOrderById, updateOrderStatus,
  cancelOrder, returnOrder,
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');

const router = Router();

router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/', protect, adminOnly, getAllOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/return', protect, returnOrder);

module.exports = router;
