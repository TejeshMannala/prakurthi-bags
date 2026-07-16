const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderItem: { type: mongoose.Schema.Types.ObjectId },
  reason: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'picked_up', 'received', 'refunded'],
    default: 'pending',
  },
  images: [String],
  adminNote: String,
  refundAmount: Number,
  refundMethod: { type: String, default: 'original' },
  pickUpAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
  },
  resolvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
