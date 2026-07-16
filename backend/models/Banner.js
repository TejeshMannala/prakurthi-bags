const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subtitle: String,
  link: String,
  image: String,
  mobileImage: String,
  bgColor: { type: String, default: '#2E5A44' },
  textColor: { type: String, default: '#ffffff' },
  position: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

bannerSchema.index({ active: 1, position: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
