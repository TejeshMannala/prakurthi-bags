const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

const getProductReviews = async (req, res) => {
  const { productId } = req.params;
  const { sort = 'latest' } = req.query;

  let sortOption = { createdAt: -1 }; // latest
  if (sort === 'highest') sortOption = { rating: -1 };
  if (sort === 'lowest') sortOption = { rating: 1 };
  if (sort === 'helpful') sortOption = { helpfulVotes: -1 }; // simplified, ideally by array length

  const reviews = await Review.find({ product: productId })
    .populate('user', 'name')
    .sort(sortOption);

  res.json({ success: true, data: reviews });
};

const createReview = async (req, res) => {
  const { productId } = req.params;
  req.body.product = productId;
  req.body.user = req.user._id;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // Check if user has already reviewed
  const existingReview = await Review.findOne({ product: productId, user: req.user._id });
  if (existingReview) {
    return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
  }

  // Verify if user purchased the product
  const hasPurchased = await Order.findOne({
    user: req.user._id,
    'items.product': productId,
    status: { $in: ['Delivered'] } // Assuming delivered means purchased
  });

  req.body.verifiedPurchase = !!hasPurchased;

  const review = await Review.create(req.body);
  res.status(201).json({ success: true, data: review });
};

const updateReview = async (req, res) => {
  const { id } = req.params;
  let review = await Review.findById(id);

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(401).json({ success: false, message: 'Not authorized to update this review' });
  }

  review.rating = req.body.rating || review.rating;
  review.title = req.body.title || review.title;
  review.description = req.body.description || review.description;
  if (req.body.images) review.images = req.body.images;

  await review.save(); // triggers save hook to update avg
  res.json({ success: true, data: review });
};

const deleteReview = async (req, res) => {
  const { id } = req.params;
  const review = await Review.findById(id);

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(401).json({ success: false, message: 'Not authorized to delete this review' });
  }

  await Review.findByIdAndDelete(id); // triggers findOneAndDelete hook
  res.json({ success: true, message: 'Review deleted' });
};

const markHelpful = async (req, res) => {
  const { id } = req.params;
  const review = await Review.findById(id);

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  if (review.helpfulVotes.includes(req.user._id)) {
    // Unmark
    review.helpfulVotes = review.helpfulVotes.filter(v => v.toString() !== req.user._id.toString());
  } else {
    // Mark
    review.helpfulVotes.push(req.user._id);
  }

  await review.save();
  res.json({ success: true, data: review });
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
};
