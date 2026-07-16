const Product = require('../models/Product');
const Category = require('../models/Category');

const getAll = async (req, res) => {
  const { category, search, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;

  const filter = {};

  if (category) {
    const cat = await Category.findOne({ slug: category });
    if (cat) filter.category = cat._id;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  let sortOption = { createdAt: -1 };
  if (sort === 'price-asc') sortOption = { price: 1 };
  else if (sort === 'price-desc') sortOption = { price: -1 };
  else if (sort === 'rating') sortOption = { ratings: -1 };
  else if (sort === 'bestseller') sortOption = { soldQuantity: -1 };

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

const getById = async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }
  res.json({ success: true, data: product });
};

const getBySlug = async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug }).populate('category', 'name slug');
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }
  res.json({ success: true, data: product });
};

const getTrending = async (req, res) => {
  const products = await Product.find({ isTrending: true })
    .populate('category', 'name slug')
    .sort({ soldQuantity: -1 })
    .limit(8);
  res.json({ success: true, data: products });
};

const getBestSellers = async (req, res) => {
  const products = await Product.find({ isBestSeller: true })
    .populate('category', 'name slug')
    .sort({ soldQuantity: -1 })
    .limit(8);
  res.json({ success: true, data: products });
};

const getNewArrivals = async (req, res) => {
  const products = await Product.find({ isNewArrival: true })
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(8);
  res.json({ success: true, data: products });
};

const searchProducts = async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json({ success: true, data: [] });
  }
  const products = await Product.find({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ],
  })
    .populate('category', 'name slug')
    .limit(20);
  res.json({ success: true, data: products });
};

const getRelatedProducts = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id }
  })
    .populate('category', 'name slug')
    .limit(8);

  res.json({ success: true, data: relatedProducts });
};

const create = async (req, res) => {
  const product = await Product.create(req.body);
  const populated = await Product.findById(product._id).populate('category', 'name slug');
  res.status(201).json({ success: true, data: populated });
};

const update = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('category', 'name slug');

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }
  res.json({ success: true, data: product });
};

const remove = async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }
  res.json({ success: true, message: 'Product deleted.' });
};

const uploadImages = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded.' });
  }

  const urls = req.files.map((file) => file.path);
  res.json({ success: true, data: urls });
};

module.exports = { getAll, getById, getBySlug, getTrending, getBestSellers, getNewArrivals, searchProducts, getRelatedProducts, create, update, remove, uploadImages };
