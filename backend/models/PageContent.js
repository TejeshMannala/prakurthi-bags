const mongoose = require('mongoose');

const pageContentSchema = new mongoose.Schema({
  page: { type: String, required: true, unique: true, trim: true },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  sections: [{ heading: String, body: String, order: Number }],
  meta: mongoose.Schema.Types.Mixed,
  published: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('PageContent', pageContentSchema);
