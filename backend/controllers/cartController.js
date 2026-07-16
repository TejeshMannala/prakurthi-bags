const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { emitToUser } = require('../socket/socketHandler');

const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price images thumbnail stock slug')
      .lean();

    if (!cart) {
      cart = { user: req.user._id, items: [], totalPrice: 0 };
    }

    const validItems = cart.items.filter((item) => item.product != null);
    cart.totalPrice = validItems.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCart = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Items array is required.' });
    }

    for (const item of items) {
      if (!item.product) {
        return res.status(400).json({ message: 'Each item must have a product ID.' });
      }
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        return res.status(400).json({ message: `Invalid product ID: ${item.product}` });
      }
      if (item.quantity !== undefined && (item.quantity < 1 || !Number.isInteger(item.quantity))) {
        return res.status(400).json({ message: 'Quantity must be a positive integer.' });
      }

      const product = await Product.findById(item.product).lean();
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `Product ${item.product} not found or inactive.` });
      }
      if (item.quantity && product.stock > 0 && item.quantity > product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} of "${product.name}" available.`,
        });
      }
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    for (const incoming of items) {
      const existingIndex = cart.items.findIndex(
        (i) =>
          i.product.toString() === incoming.product &&
          (i.size || '') === (incoming.size || '') &&
          (i.color || '') === (incoming.color || '')
      );

      if (incoming.quantity === 0) {
        if (existingIndex > -1) {
          cart.items.splice(existingIndex, 1);
        }
      } else if (existingIndex > -1) {
        cart.items[existingIndex].quantity = incoming.quantity;
        if (incoming.size !== undefined) cart.items[existingIndex].size = incoming.size;
        if (incoming.color !== undefined) cart.items[existingIndex].color = incoming.color;
      } else {
        cart.items.push({
          product: incoming.product,
          quantity: incoming.quantity || 1,
          size: incoming.size || '',
          color: incoming.color || '',
        });
      }
    }

    const seen = new Set();
    cart.items = cart.items.filter((item) => {
      const key = item.product.toString() + '|' + (item.size || '') + '|' + (item.color || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    await cart.recalculate();

    const populated = await Cart.findById(cart._id)
      .populate('items.product', 'name price images thumbnail stock slug')
      .lean();

    emitToUser(req.user._id, 'cart:updated', populated);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      cart.totalPrice = 0;
      await cart.save();
    }
    emitToUser(req.user._id, 'cart:updated', { items: [], totalPrice: 0 });
    res.json({ message: 'Cart cleared successfully.', items: [], totalPrice: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCart,
  updateCart,
  clearCart,
};
