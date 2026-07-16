const { Router } = require('express');
const { getCart, addItem, updateQuantity, removeItem, clearCart } = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

const router = Router();

router.get('/', protect, getCart);
router.post('/', protect, addItem);
router.put('/', protect, updateQuantity);
router.delete('/', protect, removeItem);
router.delete('/clear', protect, clearCart);

module.exports = router;
