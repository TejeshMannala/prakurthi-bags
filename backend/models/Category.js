const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  color: { type: String, default: '' },
  banner: { type: String, default: '' },
  status: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
}, { timestamps: true });

categorySchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

categorySchema.index({ status: 1, sortOrder: 1 });

module.exports = mongoose.model('Category', categorySchema);
