const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getPageBySlug, listPages, updatePage } = require('../controllers/pageController');

router.get('/', protect, adminOnly, listPages);
router.get('/:page', getPageBySlug);
router.put('/:page', protect, adminOnly, updatePage);

module.exports = router;
