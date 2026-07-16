const Banner = require('../models/Banner');

const getAll = async (req, res) => {
  const banners = await Banner.find({ isActive: true }).sort({ order: 1 });
  res.json({ success: true, data: banners });
};

const getAllAdmin = async (req, res) => {
  const banners = await Banner.find().sort({ order: 1 });
  res.json({ success: true, data: banners });
};

const create = async (req, res) => {
  const banner = await Banner.create(req.body);
  res.status(201).json({ success: true, data: banner });
};

const update = async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!banner) return res.status(404).json({ success: false, message: 'Banner not found.' });
  res.json({ success: true, data: banner });
};

const remove = async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) return res.status(404).json({ success: false, message: 'Banner not found.' });
  res.json({ success: true, message: 'Banner deleted.' });
};

module.exports = { getAll, getAllAdmin, create, update, remove };
