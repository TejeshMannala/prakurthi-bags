const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userName: {
    type: String,
    trim: true,
    default: '',
  },
  userAvatar: {
    type: String,
    default: '',
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    index: true,
  },
  title: {
    type: String,
    trim: true,
    default: '',
  },
  review: {
    type: String,
    trim: true,
    default: '',
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  reported: {
    type: Boolean,
    default: false,
  },
  reportCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  reportReasons: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, default: '' },
    reportedAt: { type: Date, default: Date.now },
  }],
  images: [{
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  }],
  helpfulCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  adminReply: {
    text: { type: String, default: '' },
    repliedAt: { type: Date },
  },
  helpfulVotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  verifiedPurchase: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  },
  visible: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

reviewSchema.index({ user: 1, product: 1 }, { unique: true });

reviewSchema.statics.recalculateProductRating = async function (productId) {
  const Product = mongoose.model('Product');
  const stats = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved', visible: true } },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        fiveStar: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        fourStar: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        threeStar: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        twoStar: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      },
    },
  ]);

  const avgRating = stats[0]?.averageRating ? Number(Number(stats[0].averageRating).toFixed(1)) : 0;
  const totalReviews = stats[0]?.totalReviews || 0;
  const ratingDistribution = stats[0]
    ? [stats[0].oneStar, stats[0].twoStar, stats[0].threeStar, stats[0].fourStar, stats[0].fiveStar]
    : [0, 0, 0, 0, 0];

  await Product.findByIdAndUpdate(productId, {
    averageRating: avgRating,
    totalReviews,
    rating: avgRating,
    numReviews: totalReviews,
    ratingDistribution,
  });
};

// NOTE: Rating recalculation is handled explicitly by the controller
// (reviewController.js) after every create/update/delete to avoid double
// aggregation that would occur if model hooks + controller both called it.

module.exports = mongoose.model('Review', reviewSchema);
