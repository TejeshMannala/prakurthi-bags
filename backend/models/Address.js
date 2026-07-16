const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  fullName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  alternateMobile: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  houseNo: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
  area: { type: String, trim: true, default: '' },
  landmark: { type: String, trim: true, default: '' },
  city: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true, default: 'India' },
  pincode: { type: String, required: true, trim: true },
  addressType: { type: String, enum: ['Home', 'Office', 'Other', 'Parents', 'Hostel'], default: 'Home' },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

addressSchema.index({ user: 1, isDefault: -1 });

module.exports = mongoose.model('Address', addressSchema);
