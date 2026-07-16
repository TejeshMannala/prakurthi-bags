const mongoose = require('mongoose');

const exchangePolicySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  sections: [{
    heading: { type: String, default: '' },
    body: { type: String, default: '' },
    order: { type: Number, default: 0 },
  }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ExchangePolicy', exchangePolicySchema);
