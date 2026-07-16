const mongoose = require('mongoose');
const Product = require('../models/Product');
const { cache } = require('../utils/redis');
const escapeRegex = require('../utils/escapeRegex');

const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sort = 'newest',
      category,
      subCategory,
      brand,
      color,
      size,
      material,
      gender,
      weightCapacity,
      minPrice,
      maxPrice,
      rating,
      minRating,
      discount,
      minDiscount,
      search,
      featured,
      bestSeller,
      tags,
      inStock,
    } = req.query;

    const Category = mongoose.model('Category');
    const filter = { isActive: true };

    const toList = (val) =>
      Array.isArray(val)
        ? val.map((v) => String(v).trim()).filter(Boolean)
        : String(val)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);

    if (category) {
      const catDoc = await Category.findOne({ slug: category }).lean();
      filter.category = catDoc ? catDoc.name : category;
    }
    if (subCategory) filter.subCategory = subCategory;

    if (brand) filter.brand = { $in: toList(brand) };
    if (material) filter.material = { $in: toList(material) };
    if (gender) filter.gender = { $in: toList(gender) };
    if (weightCapacity) filter.weightCapacity = { $in: toList(weightCapacity) };
    if (color) filter.colors = { $in: toList(color) };
    if (size) filter.sizes = { $in: toList(size) };

    if (featured === 'true') filter.featured = true;
    if (bestSeller === 'true') filter.bestSeller = true;
    if (inStock === 'true') filter.stock = { $gt: 0 };
    if (tags) filter.tags = { $in: toList(tags) };

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const minR = rating || minRating;
    if (minR) filter.averageRating = { $gte: Number(minR) };
    const minD = discount || minDiscount;
    if (minD) filter.discount = { $gte: Number(minD) };
    if (bestSeller === 'true') filter.sold = { $gt: 0 };

    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { category: { $regex: safeSearch, $options: 'i' } },
        { brand: { $regex: safeSearch, $options: 'i' } },
        { tags: { $regex: safeSearch, $options: 'i' } },
        { shortDescription: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = {};
    if (sort === 'price_asc') sortObj.price = 1;
    else if (sort === 'price_desc') sortObj.price = -1;
    else if (sort === 'name_asc') sortObj.name = 1;
    else if (sort === 'name_desc') sortObj.name = -1;
    else if (sort === 'newest') sortObj.createdAt = -1;
    else if (sort === 'oldest') sortObj.createdAt = 1;
    else if (sort === 'rating') sortObj.averageRating = -1;
    else if (sort === 'sold') sortObj.sold = -1;
    else if (sort === 'best_selling') sortObj.sold = -1;
    else if (sort === 'discount') sortObj.discount = -1;
    else sortObj.createdAt = -1;

    const cacheKey = cache.generateKey('products', { ...filter, sort, page, limit });
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    const result = {
      products,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      totalPages: Math.ceil(total / Number(limit)),
    };

    await cache.set(cacheKey, result, 120);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const cacheKey = 'products:filters';
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [brands, colors, sizes, materials, genders, weightCaps, priceAgg] = await Promise.all([
      Product.distinct('brand', { isActive: true }),
      Product.distinct('colors', { isActive: true }),
      Product.distinct('sizes', { isActive: true }),
      Product.distinct('material', { isActive: true }),
      Product.distinct('gender', { isActive: true }),
      Product.distinct('weightCapacity', { isActive: true }),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
      ]),
    ]);

    const clean = (arr) => arr.map((v) => String(v).trim()).filter(Boolean);
    const result = {
      brands: clean(brands),
      colors: clean(colors),
      sizes: clean(sizes),
      materials: clean(materials),
      genders: clean(genders),
      weightCapacities: clean(weightCaps),
      priceBounds: priceAgg[0]
        ? { min: Math.floor(priceAgg[0].min), max: Math.ceil(priceAgg[0].max) }
        : { min: 0, max: 0 },
    };

    await cache.set(cacheKey, result, 300);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const cacheKey = `product:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await cache.set(cacheKey, product, 300);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const cacheKey = `product:slug:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const product = await Product.findOne({ slug, isActive: true }).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await cache.set(cacheKey, product, 300);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrendingProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const cacheKey = `products:trending:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Trending = best-selling (highest `sold`), then highest rated.
    const products = await Product.find({ isActive: true })
      .sort({ sold: -1, averageRating: -1, createdAt: -1 })
      .limit(Number(limit) || 8)
      .lean();

    await cache.set(cacheKey, products, 300);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    const cacheKey = 'products:featured';
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const products = await Product.find({ featured: true, isActive: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    await cache.set(cacheKey, products, 300);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const cacheKey = `search:suggestions:${q}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const products = await Product.find(
      { name: { $regex: escapeRegex(q), $options: 'i' }, isActive: true },
      { name: 1, slug: 1, thumbnail: 1, price: 1, _id: 1 }
    )
      .limit(8)
      .lean();

    await cache.set(cacheKey, products, 60);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const cacheKey = 'categories';
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const categories = await Product.aggregate([
      { $match: { isActive: true, category: { $ne: '', $exists: true } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          image: { $first: '$thumbnail' },
        },
      },
      { $project: { name: '$_id', count: 1, image: 1, _id: 0 } },
      { $sort: { name: 1 } },
    ]);

    await cache.set(cacheKey, categories, 600);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const related = await Product.find({
      _id: { $ne: id },
      isActive: true,
      $or: [
        { category: product.category },
        { brand: product.brand },
        { tags: { $in: product.tags || [] } },
      ],
    })
      .sort({ averageRating: -1, sold: -1 })
      .limit(8)
      .lean();

    res.json({ data: related });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getFilterOptions,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getTrendingProducts,
  searchSuggestions,
  getCategories,
  getRelatedProducts,
};
