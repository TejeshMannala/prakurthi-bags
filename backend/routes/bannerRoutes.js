const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ active: true }).sort({ position: 1 }).lean();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ position: 1 }).lean();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, subtitle, link, image, mobileImage, bgColor, textColor, position, active } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });
    const banner = await Banner.create({ title, subtitle, link, image, mobileImage, bgColor, textColor, position, active });
    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { title, subtitle, link, image, mobileImage, bgColor, textColor, position, active } = req.body;
    const banner = await Banner.findByIdAndUpdate(
      req.params.id, { title, subtitle, link, image, mobileImage, bgColor, textColor, position, active },
      { new: true, runValidators: true }
    );
    if (!banner) return res.status(404).json({ message: 'Banner not found.' });
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found.' });
    res.json({ message: 'Banner deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
