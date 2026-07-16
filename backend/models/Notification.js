const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['support_reply', 'order_update', 'return_update', 'coupon', 'review_approved', 'review_request', 'general'],
    required: true,
  },
  title: { type: String, required: true },
  message: String,
  link: String,
  read: { type: Boolean, default: false },
  forAdmin: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ forAdmin: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
