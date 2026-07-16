const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  },
  // Human-friendly ids generated server-side (never trusted from the client).
  paymentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  orderId: {
    type: String,
    index: true,
  },
  paymentMethod: {
    type: String,
    // Canonical set aligned with Order.paymentMethod so online orders never
    // fail validation. Legacy values ('Net Banking', 'Cash on Delivery',
    // 'Gift Card') are kept for backwards compatibility with old records.
    enum: [
      'Credit Card', 'Debit Card', 'UPI', 'NetBanking', 'Net Banking', 'Wallet',
      'COD', 'Cash on Delivery', 'Gift Card', 'Google Pay', 'PhonePe', 'Paytm',
      'Amazon Pay', 'Razorpay', 'Stripe',
    ],
    required: true,
  },
  // `status` mirrors paymentStatus for external consumers/reporting.
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Success', 'Failed', 'Refunded'],
    default: 'Pending',
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Success', 'Failed', 'Refunded'],
    default: 'Pending',
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  // Checkout contact details captured at payment time.
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
  },
  maskedCardNumber: {
    type: String,
  },
  cardType: {
    type: String,
  },
  upiId: {
    type: String,
    index: true,
  },
  bankName: {
    type: String,
  },
  paymentMethodType: {
    type: String,
    enum: ['UPI', 'Card', 'NetBanking', 'Wallet', 'COD'],
    default: 'UPI',
  },
  paidAt: {
    type: Date,
  },
  refundedAt: {
    type: Date,
  },
  failureReason: {
    type: String,
  },
}, { timestamps: true });

paymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
