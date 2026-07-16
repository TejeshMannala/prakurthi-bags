const mongoose = require('mongoose');

const contactInfoSchema = new mongoose.Schema({
  email: { type: String, default: '' },
  supportEmail: { type: String, default: '' },
  phone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  address: { type: String, default: '' },
  googleMap: { type: String, default: '' },
  facebook: { type: String, default: '' },
  instagram: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  twitter: { type: String, default: '' },
  youtube: { type: String, default: '' },
  website: { type: String, default: '' },
  workingHours: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ContactInfo', contactInfoSchema);
