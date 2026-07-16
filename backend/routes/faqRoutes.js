const express = require('express');
const router = express.Router();
const FAQ = require('../models/FAQ');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { published: true };
    if (category) filter.category = category;
    const faqs = await FAQ.find(filter).sort({ order: 1, createdAt: -1 }).lean();
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { question, answer, category, order } = req.body;
    if (!question || !answer) return res.status(400).json({ message: 'Question and answer are required.' });
    const faq = await FAQ.create({ question, answer, category, order });
    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { question, answer, category, order, published } = req.body;
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { question, answer, category, order, published },
      { new: true, runValidators: true }
    );
    if (!faq) return res.status(404).json({ message: 'FAQ not found.' });
    res.json(faq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ message: 'FAQ not found.' });
    res.json({ message: 'FAQ deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
