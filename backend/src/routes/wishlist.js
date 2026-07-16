const { Router } = require('express');
const { getWishlist, toggleItem, removeItem, clearWishlist } = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

const router = Router();

router.get('/', protect, getWishlist);
router.post('/', protect, toggleItem);
router.delete('/', protect, removeItem);
router.delete('/all', protect, clearWishlist);
router.delete('/clear', protect, clearWishlist);

module.exports = router;
