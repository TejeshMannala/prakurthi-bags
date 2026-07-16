const mongoose = require('mongoose');

const returnPolicySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  sections: [{
    heading: { type: String, default: '' },
    body: { type: String, default: '' },
    order: { type: Number, default: 0 },
  }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ReturnPolicy', returnPolicySchema);
