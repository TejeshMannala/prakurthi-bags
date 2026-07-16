const Testimonial = require('../models/Testimonial');
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

// Public: only active testimonials, ordered for the homepage.
const getTestimonials = async (req, res) => {
  try {
    const cacheKey = 'testimonials:active';
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);
    const items = await Testimonial.find({ active: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    await cache.set(cacheKey, items, 300);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminTestimonials = async (req, res) => {
  try {
    const items = await Testimonial.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTestimonial = async (req, res) => {
  try {
    const { name, role, avatar, rating, quote, product, active, sortOrder } = req.body;
    if (!name || !quote) {
      return res.status(400).json({ message: 'Name and quote are required.' });
    }
    const item = await Testimonial.create({
      name, role, avatar, rating, quote, product, active, sortOrder,
    });
    await cache.invalidateContentCache();
    emitContent('testimonial:updated', {});
    res.status(201).json(item);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateTestimonial = async (req, res) => {
  try {
    const { name, role, avatar, rating, quote, product, active, sortOrder } = req.body;
    const item = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { name, role, avatar, rating, quote, product, active, sortOrder },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Testimonial not found.' });
    await cache.invalidateContentCache();
    emitContent('testimonial:updated', {});
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTestimonial = async (req, res) => {
  try {
    const item = await Testimonial.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Testimonial not found.' });
    await cache.invalidateContentCache();
    emitContent('testimonial:updated', {});
    res.json({ message: 'Testimonial deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTestimonials,
  getAdminTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
