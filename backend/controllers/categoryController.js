const Category = require('../models/Category');
const escapeRegex = require('../utils/escapeRegex');
const Product = require('../models/Product');

const getCategories = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status !== undefined) filter.status = status === 'true';
    let categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
    const counts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => { countMap[c._id] = c.count; });
    categories = categories.map((cat) => ({
      ...cat,
      productCount: countMap[cat.name] || 0,
    }));
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).lean();
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCategoryProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 12, sort, minPrice, maxPrice, search, rating, discount } = req.query;

    const category = await Category.findOne({ slug }).lean();
    if (!category) return res.status(404).json({ message: 'Category not found.' });

    const filter = { category: category.name, isActive: { $ne: false } };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (rating) filter.averageRating = { $gte: Number(rating) };
    if (discount) filter.discount = { $gte: Number(discount) };
    if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'rating') sortObj = { averageRating: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'popular') sortObj = { sold: -1 };
    else if (sort === 'discount') sortObj = { discount: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      category,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCategories, getCategoryBySlug, getCategoryProducts };
