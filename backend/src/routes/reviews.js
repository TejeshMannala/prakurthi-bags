const express = require('express');
const { getProductReviews, createReview, updateReview, deleteReview, markHelpful } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Get reviews for a product
router.get('/product/:productId', getProductReviews);

// Add a review
router.post('/product/:productId', protect, createReview);

// Update, Delete, Mark Helpful for a specific review
router.route('/:id')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

router.post('/:id/helpful', protect, markHelpful);

module.exports = router;
