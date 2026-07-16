const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

const getWishlist = async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate('items.product');
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, items: [] });
  }
  res.json({ success: true, data: wishlist });
};

const toggleItem = async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, items: [] });
  }

  const existingIndex = wishlist.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingIndex > -1) {
    wishlist.items.splice(existingIndex, 1);
    await wishlist.save();
    return res.json({ success: true, data: wishlist, message: 'Removed from wishlist' });
  }

  wishlist.items.push({ product: productId });
  await wishlist.save();

  const populated = await Wishlist.findById(wishlist._id).populate('items.product');
  res.json({ success: true, data: populated, message: 'Added to wishlist' });
};

const removeItem = async (req, res) => {
  const { productId } = req.body || req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    return res.status(404).json({ success: false, message: 'Wishlist not found.' });
  }

  wishlist.items = wishlist.items.filter(
    (item) => item.product.toString() !== productId
  );
  await wishlist.save();

  res.json({ success: true, data: wishlist, message: 'Removed from wishlist' });
};

const clearWishlist = async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (wishlist) {
    wishlist.items = [];
    await wishlist.save();
  }
  res.json({ success: true, message: 'Wishlist cleared' });
};

module.exports = { getWishlist, toggleItem, removeItem, clearWishlist };
