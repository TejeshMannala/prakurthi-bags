const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getCart, updateCart, clearCart } = require('../controllers/cartController');

router.get('/', protect, getCart);
router.put('/', protect, updateCart);
router.delete('/', protect, clearCart);

module.exports = router;
