const mongoose = require('mongoose');

// Singleton store configuration. A single document (key = 'global') drives
// store-wide settings that the store admin can toggle from the dashboard:
//  - enabledPaymentMethods: which checkout payment options are live
//  - storeLocation: warehouse coordinates used by the delivery map
//  - deliveryPartners: courier names shown on the order tracking screen
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    enabledPaymentMethods: {
      type: [String],
      default: ['COD', 'UPI', 'Credit Card', 'Debit Card', 'Google Pay', 'PhonePe'],
    },
    storeLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [78.4867, 17.385] }, // [lng, lat] - Hyderabad warehouse
      address: { type: String, default: 'Prakruthi Bags Fulfilment Centre, Hyderabad' },
    },
    deliveryPartners: {
      type: [String],
      default: ['BlueDart', 'Delhivery', 'Ekart', 'India Post'],
    },
    // Branding + storefront chrome (admin-editable, exposed publicly).
    companyName: { type: String, default: 'Prakruthi Bags' },
    logo: { type: String, default: '' },
    favicon: { type: String, default: '' },
    currency: { type: String, default: '₹', trim: true },
    gstRate: { type: Number, default: 0, min: 0, max: 100 },
    shippingCharges: { type: Number, default: 0, min: 0 },
    freeShippingLimit: { type: Number, default: 0, min: 0 },
    announcement: { type: String, default: '' },
    theme: {
      primary: { type: String, default: '#2E5A44' },
      secondary: { type: String, default: '#A3C9A8' },
      accent: { type: String, default: '#D4A853' },
    },
    socialLinks: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
    contact: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    footerText: { type: String, default: 'Crafted with care for the planet.' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
