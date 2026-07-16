const mongoose = require('mongoose');
const PageContent = require('../models/PageContent');
const { cache } = require('../utils/redis');

const getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug || !slug.trim()) {
      return res.status(400).json({ message: 'Page slug is required.' });
    }

    const cacheKey = `page:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const page = await PageContent.findOne({ page: slug.toLowerCase().trim(), published: true }).lean();
    if (!page) {
      return res.status(404).json({ message: 'Page not found.' });
    }

    await cache.set(cacheKey, page, 600);
    res.json(page);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const listPages = async (req, res) => {
  try {
    const pages = await PageContent.find()
      .select('page title published updatedAt createdAt')
      .sort({ page: 1 })
      .lean();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePage = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, content, sections, meta, published } = req.body;

    if (!slug || !slug.trim()) {
      return res.status(400).json({ message: 'Page slug is required.' });
    }

    const page = await PageContent.findOneAndUpdate(
      { page: slug.toLowerCase().trim() },
      {
        title: title || '',
        content: content || '',
        sections: sections || [],
        meta: meta || {},
        published: published !== undefined ? published : true,
      },
      { upsert: true, new: true, runValidators: true }
    );

    await cache.del(`page:${slug.toLowerCase().trim()}`);

    res.json(page);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPageBySlug,
  listPages,
  updatePage,
};
