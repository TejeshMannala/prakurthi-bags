const Cart = require('../models/Cart');
const Product = require('../models/Product');

const getCart = async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }
  res.json({ success: true, data: cart });
};

const addItem = async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  if (product.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} items available.`,
    });
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const existingIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingIndex > -1) {
    const newQty = cart.items[existingIndex].quantity + quantity;
    if (newQty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more. Only ${product.stock} available.`,
      });
    }
    cart.items[existingIndex].quantity = newQty;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();
  const populated = await Cart.findById(cart._id).populate('items.product');
  res.json({ success: true, data: populated, message: 'Added to cart' });
};

const updateQuantity = async (req, res) => {
  const { productId, quantity } = req.body;

  if (quantity < 1) {
    return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
  }

  const product = await Product.findById(productId);
  if (product && quantity > product.stock) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} items available.`,
    });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return res.status(404).json({ success: false, message: 'Cart not found.' });
  }

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not in cart.' });
  }

  item.quantity = quantity;
  await cart.save();

  const populated = await Cart.findById(cart._id).populate('items.product');
  res.json({ success: true, data: populated });
};

const removeItem = async (req, res) => {
  const { productId } = req.body || req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return res.status(404).json({ success: false, message: 'Cart not found.' });
  }

  cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  await cart.save();

  const populated = await Cart.findById(cart._id).populate('items.product');
  res.json({ success: true, data: populated, message: 'Removed from cart' });
};

const clearCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  res.json({ success: true, message: 'Cart cleared' });
};

module.exports = { getCart, addItem, updateQuantity, removeItem, clearCart };
