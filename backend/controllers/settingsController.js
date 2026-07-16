const Settings = require('../models/Settings');
const { cache } = require('../utils/redis');
const { getIO } = require('../socket/socketHandler');

const emitContent = (event, data) => {
  try {
    const io = getIO();
    if (io) io.emit(event, data || {});
  } catch {
    // socket optional
  }
};

const DEFAULTS = {
  enabledPaymentMethods: ['COD', 'UPI', 'Credit Card', 'Debit Card', 'Google Pay', 'PhonePe'],
  storeLocation: {
    type: 'Point',
    coordinates: [78.4867, 17.385],
    address: 'Prakruthi Bags Fulfilment Centre, Hyderabad',
  },
  deliveryPartners: ['BlueDart', 'Delhivery', 'Ekart', 'India Post'],
};

const getOrCreate = async () => {
  let doc = await Settings.findOne({ key: 'global' });
  if (!doc) {
    doc = await Settings.create({ key: 'global', ...DEFAULTS });
  }
  return doc;
};

// Public: full branding + config the storefront chrome needs
// (name, logo, currency, announcement, theme, social, contact, footer).
const getPublicSettings = async (req, res) => {
  try {
    const doc = await getOrCreate();
    res.json({
      companyName: doc.companyName,
      logo: doc.logo,
      favicon: doc.favicon,
      currency: doc.currency || '₹',
      gstRate: doc.gstRate || 0,
      shippingCharges: doc.shippingCharges ?? 0,
      freeShippingLimit: doc.freeShippingLimit ?? 0,
      announcement: doc.announcement || '',
      theme: doc.theme || {},
      socialLinks: doc.socialLinks || {},
      contact: doc.contact || {},
      footerText: doc.footerText || '',
      enabledPaymentMethods: doc.enabledPaymentMethods,
      storeLocation: doc.storeLocation,
      deliveryPartners: doc.deliveryPartners,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: full document.
const getSettings = async (req, res) => {
  try {
    const doc = await getOrCreate();
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const {
      enabledPaymentMethods, storeLocation, deliveryPartners,
      companyName, logo, favicon, currency, gstRate,
      shippingCharges, freeShippingLimit, announcement,
      theme, socialLinks, contact, footerText,
    } = req.body;
    const update = {};
    if (Array.isArray(enabledPaymentMethods)) update.enabledPaymentMethods = enabledPaymentMethods;
    if (deliveryPartners) update.deliveryPartners = deliveryPartners;
    if (storeLocation && Array.isArray(storeLocation.coordinates)) {
      update.storeLocation = {
        type: 'Point',
        coordinates: storeLocation.coordinates,
        address: storeLocation.address || DEFAULTS.storeLocation.address,
      };
    }
    if (typeof companyName === 'string') update.companyName = companyName;
    if (typeof logo === 'string') update.logo = logo;
    if (typeof favicon === 'string') update.favicon = favicon;
    if (typeof currency === 'string' && currency.trim()) update.currency = currency.trim();
    if (gstRate !== undefined) update.gstRate = Number(gstRate) || 0;
    if (shippingCharges !== undefined) update.shippingCharges = Number(shippingCharges) || 0;
    if (freeShippingLimit !== undefined) update.freeShippingLimit = Number(freeShippingLimit) || 0;
    if (typeof announcement === 'string') update.announcement = announcement;
    if (theme && typeof theme === 'object') update.theme = theme;
    if (socialLinks && typeof socialLinks === 'object') update.socialLinks = socialLinks;
    if (contact && typeof contact === 'object') update.contact = contact;
    if (typeof footerText === 'string') update.footerText = footerText;
    const doc = await Settings.findOneAndUpdate({ key: 'global' }, update, { new: true, upsert: true });
    await cache.invalidateContentCache();
    emitContent('settings:updated', {});
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPublicSettings, getSettings, updateSettings };
