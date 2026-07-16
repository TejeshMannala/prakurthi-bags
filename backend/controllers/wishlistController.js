const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { emitToUser } = require('../socket/socketHandler');

const getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('products', 'name price images thumbnail slug stock averageRating totalReviews')
      .lean();

    if (!wishlist) {
      wishlist = { user: req.user._id, products: [] };
    }

    wishlist.products = wishlist.products.filter((p) => p != null);

    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateWishlist = async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ message: 'Products array is required.' });
    }

    for (const pid of products) {
      if (!mongoose.Types.ObjectId.isValid(pid)) {
        return res.status(400).json({ message: `Invalid product ID: ${pid}` });
      }
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        products,
      });

      const populated = await Wishlist.findById(wishlist._id)
        .populate('products', 'name price images thumbnail slug stock averageRating totalReviews')
        .lean();

      emitToUser(req.user._id, 'wishlist:updated', populated);
      return res.status(201).json(populated);
    }

    wishlist.products = products;

    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id)
      .populate('products', 'name price images thumbnail slug stock averageRating totalReviews')
      .lean();

    emitToUser(req.user._id, 'wishlist:updated', populated);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getWishlist,
  updateWishlist,
};
