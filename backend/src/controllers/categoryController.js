const Category = require('../models/Category');

const getAll = async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ success: true, data: categories });
};

const getBySlug = async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found.' });
  }
  res.json({ success: true, data: category });
};

const create = async (req, res) => {
  const { name, slug, image } = req.body;
  const category = await Category.create({ name, slug, image });
  res.status(201).json({ success: true, data: category });
};

const update = async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found.' });
  }
  res.json({ success: true, data: category });
};

const remove = async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found.' });
  }
  res.json({ success: true, message: 'Category deleted.' });
};

module.exports = { getAll, getBySlug, create, update, remove };
