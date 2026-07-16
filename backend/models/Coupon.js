const mongoose = require('mongoose');

const usageRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  usedAt: { type: Date, default: Date.now },
  discountAmount: { type: Number, default: 0 },
}, { _id: false });

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discountValue: { type: Number, required: true, min: 0 },
  minimumOrderAmount: { type: Number, default: 0, min: 0 },
  maximumDiscount: { type: Number, default: 0, min: 0 },
  startDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  usageLimit: { type: Number, default: 0, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  perUserLimit: { type: Number, default: 1, min: 0 },
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  usageHistory: [usageRecordSchema],
  isWelcomeCoupon: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  autoApply: { type: Boolean, default: false },
  isMilestone: { type: Boolean, default: false },
  restrictedProducts: [{ type: String, trim: true }],
  restrictedBrands: [{ type: String, trim: true }],
  restrictedUsers: [{ type: String, trim: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

couponSchema.index({ active: 1, expiryDate: 1, minimumOrderAmount: 1 });
couponSchema.index({ featured: 1, active: 1 });
couponSchema.index({ isWelcomeCoupon: 1, active: 1 });

couponSchema.set('toJSON', { virtuals: true });

couponSchema.methods.isValid = function () {
  if (!this.active) return false;
  if (this.startDate && this.startDate > new Date()) return false;
  if (this.expiryDate && this.expiryDate < new Date()) return false;
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) return false;
  return true;
};

couponSchema.methods.isWelcomeEligible = function (userId, completedOrderCount) {
  if (!this.isWelcomeCoupon) return false;
  if (!this.isValid()) return false;
  if (!userId) return false;
  if (completedOrderCount > 0) return false;
  if (this.usedBy.some(id => id.toString() === userId.toString())) return false;
  return true;
};

module.exports = mongoose.model('Coupon', couponSchema);
