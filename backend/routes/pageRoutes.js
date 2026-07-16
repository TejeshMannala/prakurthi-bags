const express = require('express');
const router = express.Router();
const PageContent = require('../models/PageContent');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/:page', async (req, res) => {
  try {
    const page = await PageContent.findOne({ page: req.params.page, published: true }).lean();
    if (!page) return res.status(404).json({ message: 'Page not found.' });
    res.json(page);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:page', protect, adminOnly, async (req, res) => {
  try {
    const { title, content, sections, meta, published } = req.body;
    const page = await PageContent.findOneAndUpdate(
      { page: req.params.page },
      { title, content, sections, meta, published },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(page);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const pages = await PageContent.find().sort({ page: 1 }).lean();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
