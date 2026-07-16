const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  image: {
    type: String,
    default: '',
  },
  link: {
    type: String,
    default: '/shop',
  },
  btnText: {
    type: String,
    default: 'Shop Now',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  bgColor: {
    type: String,
    default: '#1F3A2E',
  },
  textColor: {
    type: String,
    default: '#FAF7F2',
  },
}, {
  timestamps: true,
});

bannerSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
