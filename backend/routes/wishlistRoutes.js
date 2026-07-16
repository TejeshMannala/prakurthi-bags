const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getWishlist, updateWishlist } = require('../controllers/wishlistController');

router.get('/', protect, getWishlist);
router.put('/', protect, updateWishlist);

module.exports = router;
