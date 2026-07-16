const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getPublicSettings, getSettings, updateSettings } = require('../controllers/settingsController');

// Public storefront branding + config (name, logo, currency, announcement, theme, social, contact, footer).
router.get('/', getPublicSettings);
router.get('/payment-methods', getPublicSettings);
router.get('/admin', protect, adminOnly, getSettings);
router.put('/', protect, adminOnly, updateSettings);

module.exports = router;
