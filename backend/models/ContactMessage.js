const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, trim: true, default: '' },
  message: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
  replied: { type: Boolean, default: false },
  reply: { type: String, default: '' },
  repliedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
