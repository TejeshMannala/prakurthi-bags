const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: String,
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  size: String,
  color: String,
  image: String,
  reviewed: {
    type: Boolean,
    default: false,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [orderItemSchema],
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingMethod: {
      type: String,
      enum: ['Standard', 'Express'],
      default: 'Standard',
    },
    coupon: {
      code: String,
      discount: { type: Number, default: 0 },
    },
    total: {
      type: Number,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: [
        'COD', 'UPI', 'Credit Card', 'Debit Card', 'NetBanking', 'Google Pay',
        'PhonePe', 'Paytm', 'Amazon Pay', 'Wallet', 'Razorpay', 'Stripe',
      ],
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Confirmed', 'Packed', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled', 'Completed'],
      default: 'Processing',
    },
    estimatedDelivery: {
      type: Date,
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
      fullName: String,
      mobile: String,
      area: String,
      landmark: String,
      district: String,
      pincode: String,
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

orderSchema.pre('validate', function (next) {
  if (!this.orderId) {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(100000 + Math.random() * 900000);
    this.orderId = `ORD-${dateStr}-${rand}`;
  }
  const items = this.products || [];
  if (!this.subtotal) {
    this.subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
  if (this.total == null) {
    this.total = this.subtotal + this.tax + this.shipping - (this.coupon?.discount || 0);
  }
  if (!this.totalPrice) {
    this.totalPrice = this.total;
  }
  if (!this.estimatedDelivery) {
    const est = new Date();
    est.setDate(est.getDate() + 7);
    this.estimatedDelivery = est;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
