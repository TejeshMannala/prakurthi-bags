const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      index: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zip: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    cart: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1, min: 1 },
        size: { type: String, default: '' },
        color: { type: String, default: '' },
      },
    ],
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refreshTokenVersion: {
      type: Number,
      default: 0,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
    },
    otpRequestedAt: {
      type: Date,
    },
    otpResendCount: {
      type: Number,
      default: 0,
    },
    otpMaxReachedAt: {
      type: Date,
    },
    otpAttemptCount: {
      type: Number,
      default: 0,
    },
    otpAttemptsLockedAt: {
      type: Date,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    otpVerifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// NOTE: email already has `unique: true` above, so Mongoose builds the
// {"email":1} index automatically. Do NOT re-declare `index({ email: 1 })`
// here — that causes the "Duplicate schema index" warning.
userSchema.index({ email: 1, otpExpires: -1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
