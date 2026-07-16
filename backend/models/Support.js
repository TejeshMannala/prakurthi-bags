const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: String, enum: ['user', 'admin'], required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const supportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true },
  messages: [supportMessageSchema],
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  category: {
    type: String,
    enum: ['order', 'product', 'payment', 'shipping', 'other'],
    default: 'other',
  },
  orderRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
}, { timestamps: true });

supportSchema.index({ user: 1, updatedAt: -1 });
supportSchema.index({ status: 1 });

module.exports = mongoose.model('Support', supportSchema);
