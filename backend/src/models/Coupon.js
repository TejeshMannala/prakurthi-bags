const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Coupon title is required'],
  },
  description: {
    type: String,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'flat'],
    required: true,
    default: 'percentage',
  },
  discountAmount: {
    type: Number,
    required: [true, 'Discount amount/percentage is required'],
    min: [1, 'Discount must be at least 1'],
  },
  minOrderAmount: {
    type: Number,
    default: 0,
  },
  maxDiscountAmount: {
    type: Number, // Only applicable if discountType is 'percentage'
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  autoApply: {
    type: Boolean,
    default: false,
  },
  image: {
    type: String,
  },
  usageLimit: {
    type: Number,
    default: null, // null means unlimited
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  customerLimit: {
    type: Number,
    default: 1, // Number of times a single customer can use this coupon
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiry date is required'],
  },
  usedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

couponSchema.methods.isValid = function (userId) {
  if (!this.isActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) return false;
  
  if (userId) {
    const userUsageCount = this.usedBy.filter(id => id.toString() === userId.toString()).length;
    if (userUsageCount >= this.customerLimit) return false;
  }
  
  return true;
};

module.exports = mongoose.model('Coupon', couponSchema);
