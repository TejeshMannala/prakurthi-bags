const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  position: { type: String, required: true, trim: true },
  bio: { type: String, default: '' },
  photo: { type: String, default: '' },
  socialLinks: {
    linkedin: String,
    twitter: String,
    instagram: String,
  },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
