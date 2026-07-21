const mongoose = require('mongoose');
const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const { cache } = require('../utils/redis');
const { getIO, emitToAdmin } = require('../socket/socketHandler');
const logger = require('../utils/logger');

// Recompute and persist the product's aggregate rating fields from all
// approved, visible reviews. Keeps averageRating / rating / totalReviews /
// numReviews / ratingDistribution in sync with the review collection.
const recalcProductRating = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) return;
  const reviews = await Review.find({ product: productId, status: 'approved', visible: true }).lean();
  const total = reviews.length;
  const avg = total ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total : 0;
  const dist = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    const star = Math.round(r.rating);
    if (star >= 1 && star <= 5) dist[star - 1] += 1;
  });
  await Product.findByIdAndUpdate(productId, {
    averageRating: Number(avg.toFixed(1)),
    rating: Number(avg.toFixed(1)),
    totalReviews: total,
    numReviews: total,
    ratingDistribution: dist,
  });
};

// Determine whether the logged-in user may review a product, derived purely
// from the Order + Review collections (never from client input).
const buildEligibility = async (userId, productId) => {
  const [purchasedAny, deliveredOrder, existing] = await Promise.all([
    Order.exists({ user: userId, 'products.product': productId }),
    Order.findOne({ user: userId, 'products.product': productId, orderStatus: 'Delivered' }).lean(),
    Review.findOne({ user: userId, product: productId }).lean(),
  ]);

  const purchased = !!purchasedAny;
  const delivered = !!deliveredOrder;
  const alreadyReviewed = !!existing;
  const canReview = delivered && !alreadyReviewed;

  let reason = '';
  if (alreadyReviewed) reason = 'already';
  else if (!purchased) reason = 'purchase';
  else if (!delivered) reason = 'delivery';

  return {
    productId,
    purchased,
    delivered,
    alreadyReviewed,
    canReview,
    orderId: deliveredOrder ? deliveredOrder._id : null,
    reason,
    review: existing || null,
  };
};

const getReviewEligibility = async (req, res) => {
  try {
    // Guests (no valid JWT) get a clean 200 with `loggedIn: false` instead of
    // a 401, so the frontend can render a login prompt without a failing request.
    if (!req.user) {
      return res.json({
        loggedIn: false,
        canReview: false,
        reason: 'login',
        purchased: false,
        delivered: false,
        alreadyReviewed: false,
        orderId: null,
        review: null,
      });
    }
    const { productId } = req.params;
    const { productIds } = req.query || {};

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'Invalid product ID.' });
      }
      return res.json(await buildEligibility(req.user._id, productId));
    }

    if (productIds) {
      const ids = String(productIds)
        .split(',')
        .map((s) => s.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      const results = await Promise.all(ids.map((id) => buildEligibility(req.user._id, id)));
      const map = {};
      results.forEach((r) => { map[r.productId] = r; });
      return res.json({ map });
    }

    return res.status(400).json({ message: 'Product ID required.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID.' });
    }

    const filter = { product: productId, status: 'approved', visible: true };

    const sortObj = { pinned: -1 };
    if (sort === 'oldest') sortObj.createdAt = 1;
    else if (sort === 'rating_high') sortObj.rating = -1;
    else if (sort === 'rating_low') sortObj.rating = 1;
    else if (sort === 'helpful') sortObj.helpfulCount = -1;
    else sortObj.createdAt = -1;

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total, stats] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name avatar')
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved', visible: true } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    const ratingDistribution = [0, 0, 0, 0, 0];
    const allApproved = await Review.find({ product: productId, status: 'approved', visible: true }).lean();
    allApproved.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        ratingDistribution[r.rating - 1]++;
      }
    });

    const totalApproved = allApproved.length;

    res.json({
      reviews,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      averageRating: stats[0]?.averageRating
        ? Number(Number(stats[0].averageRating).toFixed(1))
        : 0,
      totalReviews: totalApproved,
      ratingDistribution,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createReview = async (req, res) => {
  try {
    const { product, rating, title, review, images } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'You must be logged in to write a review.' });
    }
    if (!product) {
      return res.status(400).json({ message: 'Product ID is required.' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }
    if (!mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json({ message: 'Invalid product ID.' });
    }

    const productDoc = await Product.findById(product).lean();
    if (!productDoc) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // SECURITY: only users who bought AND received the product may review.
    // We never trust the client — re-derive eligibility from the Order collection.
    const purchasedAny = await Order.exists({
      user: req.user._id,
      'products.product': product,
    });
    if (!purchasedAny) {
      return res.status(403).json({
        message: 'You can review this product after you have purchased it.',
        code: 'NOT_PURCHASED',
      });
    }

    const deliveredOrder = await Order.findOne({
      user: req.user._id,
      'products.product': product,
      orderStatus: 'Delivered',
    }).lean();

    if (!deliveredOrder) {
      return res.status(403).json({
        message: 'You can review this product after it has been delivered.',
        code: 'NOT_DELIVERED',
      });
    }

    const existingReview = await Review.findOne({ user: req.user._id, product });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product.' });
    }

    const reviewData = {
      user: req.user._id,
      userName: req.user.name || '',
      userAvatar: req.user.avatar || '',
      product,
      order: deliveredOrder._id,
      rating,
      title: title || '',
      review: review || '',
      images: images || [],
      verifiedPurchase: true,
      status: process.env.REVIEW_AUTO_APPROVE !== 'false' ? 'approved' : 'pending',
    };

    const newReview = await Review.create(reviewData);

    // Mark the matching item in the delivered order as reviewed so the
    // "Write Review" CTA flips to "Already Reviewed" without extra lookups.
    await Order.updateOne(
      { _id: deliveredOrder._id, 'products.product': product },
      { $set: { 'products.$.reviewed': true } }
    );

    await cache.invalidateProductCache();

    await User.findByIdAndUpdate(req.user._id, { $inc: { reviewCount: 1 } });
    await recalcProductRating(product);

    const io = getIO();
    if (io) {
      io.emit('product:updated', { productId: product, updatedAt: new Date() });
      emitToAdmin('admin:review:new', { productId: product, rating });
    }

    const populated = await Review.findById(newReview._id)
      .populate('user', 'name avatar')
      .lean();

    res.status(201).json(populated);
  } catch (error) {
    logger.error('[Review] createReview failed:', error?.stack || error?.message || error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this product.' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message || 'Failed to submit review.' });
  }
};

const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, review, images } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID.' });
    }

    const existing = await Review.findOne({ _id: id, user: req.user._id });
    if (!existing) {
      return res.status(404).json({ message: 'Review not found or not authorized.' });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
      }
      existing.rating = rating;
    }
    if (title !== undefined) existing.title = title;
    if (review !== undefined) existing.review = review;
    if (images !== undefined) existing.images = images;
    existing.isEdited = true;

    await existing.save();

    await cache.invalidateProductCache();
    await recalcProductRating(existing.product);

    const updated = await Review.findById(existing._id)
      .populate('user', 'name avatar')
      .lean();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID.' });
    }

    const review = await Review.findOneAndDelete({ _id: id, user: req.user._id });
    if (!review) {
      return res.status(404).json({ message: 'Review not found or not authorized.' });
    }

    // The user can review this product again, so clear the reviewed flag on
    // the matching order item.
    if (review.order && review.product) {
      await Order.updateOne(
        { _id: review.order, 'products.product': review.product },
        { $set: { 'products.$.reviewed': false } }
      );
    }

    await cache.invalidateProductCache();
    await User.findByIdAndUpdate(req.user._id, { $inc: { reviewCount: -1 } });
    await recalcProductRating(review.product);

    res.json({ message: 'Review deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID.' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    if (!req.user) {
      return res.json({ message: 'Helpful count.', helpfulVotes: review.helpfulVotes?.length || 0 });
    }

    const userId = req.user._id;
    const alreadyVoted = review.helpfulVotes.some(
      (vid) => vid.toString() === userId.toString()
    );

    if (alreadyVoted) {
      review.helpfulVotes.pull(userId);
    } else {
      review.helpfulVotes.push(userId);
    }

    review.helpfulCount = review.helpfulVotes.length;
    await review.save();

    res.json({
      message: alreadyVoted ? 'Removed helpful vote.' : 'Marked as helpful.',
      helpfulVotes: review.helpfulCount,
      helpfulCount: review.helpfulCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const { limit = 10, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const reviews = await Review.find(filter)
      .populate('user', 'name avatar')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = { user: req.user._id };
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('product', 'name image thumbnail price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments(filter),
    ]);
    res.json({ reviews, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID.' });
    }
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    // Prevent duplicate reports from the same user
    if (req.user && review.reportReasons.some((r) => r.user && r.user.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'You have already reported this review.' });
    }

    review.reportCount = (review.reportCount || 0) + 1;
    review.reported = true;
    review.reportReasons.push({
      user: req.user ? req.user._id : undefined,
      reason: reason || 'Reported by user',
      reportedAt: new Date(),
    });
    await review.save();
    res.json({ message: 'Review reported. Our team will review it shortly.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getReviewsByProduct,
  getReviewEligibility,
  getAllReviews,
  getUserReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleHelpful,
  reportReview,
};
