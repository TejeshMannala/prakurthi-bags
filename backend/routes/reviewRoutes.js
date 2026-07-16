const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const {
  getReviewsByProduct,
  getReviewEligibility,
  getAllReviews,
  getUserReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleHelpful,
  reportReview,
} = require('../controllers/reviewController');

router.get('/', getAllReviews);
router.get('/user', protect, getUserReviews);
router.get('/product/:productId', getReviewsByProduct);
router.get('/eligibility', optionalAuth, getReviewEligibility);
router.get('/eligibility/:productId', optionalAuth, getReviewEligibility);
router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);
router.post('/:id/helpful', optionalAuth, toggleHelpful);
router.post('/:id/report', protect, reportReview);

module.exports = router;
