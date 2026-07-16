const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

const createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod, couponCode } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
  }

  if (!shippingAddress || !paymentMethod) {
    return res.status(400).json({ success: false, message: 'Shipping address and payment method are required.' });
  }

  let totalAmount = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(404).json({ success: false, message: `Product ${item.product} not found.` });
    }

    if (product.stock < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
      });
    }

    const price = product.discountPrice || product.price;
    totalAmount += price * item.quantity;
    orderItems.push({
      product: product._id,
      quantity: item.quantity,
      price,
    });
  }

  let couponApplied = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon || !coupon.isValid()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon.' });
    }
    const discountAmount = (totalAmount * coupon.discountPercentage) / 100;
    totalAmount -= discountAmount;
    couponApplied = {
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
      discountAmount: Math.round(discountAmount * 100) / 100,
    };
  }

  totalAmount = Math.round(totalAmount * 100) / 100;

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    totalAmount,
    couponApplied,
  });

  if (couponCode) {
    await Coupon.findOneAndUpdate(
      { code: couponCode.toUpperCase() },
      {
        $inc: { usedCount: 1 },
        $push: { usedBy: req.user._id }
      }
    );
  }

  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity, soldQuantity: item.quantity },
    });
  }

  const populatedOrder = await Order.findById(order._id)
    .populate('items.product', 'name images price')
    .populate('user', 'name email');

  res.status(201).json({ success: true, data: populatedOrder });
};

const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('items.product', 'name images price')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: orders });
};

const getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = {};
  if (status) filter.orderStatus = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('items.product', 'name images price')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('items.product', 'name images price')
    .populate('user', 'name email');
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }
  res.json({ success: true, data: order });
};

const updateOrderStatus = async (req, res) => {
  const { orderStatus } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { orderStatus },
    { new: true, runValidators: true }
  ).populate('items.product', 'name images price')
   .populate('user', 'name email');

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }

  if (orderStatus === 'Cancelled') {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: item.quantity, soldQuantity: -item.quantity },
      });
    }
  }

  res.json({ success: true, data: order });
};

const cancelOrder = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }
  if (order.orderStatus === 'Delivered') {
    return res.status(400).json({ success: false, message: 'Delivered orders cannot be cancelled.' });
  }
  if (order.orderStatus === 'Cancelled') {
    return res.status(400).json({ success: false, message: 'Order is already cancelled.' });
  }

  order.orderStatus = 'Cancelled';
  await order.save();

  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity, soldQuantity: -item.quantity },
    });
  }

  res.json({ success: true, data: order, message: 'Order cancelled.' });
};

const returnOrder = async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }
  if (order.orderStatus !== 'Delivered') {
    return res.status(400).json({ success: false, message: 'Only delivered orders can be returned.' });
  }
  if (order.returnRequested) {
    return res.status(400).json({ success: false, message: 'Return already requested for this order.' });
  }

  order.returnRequested = true;
  order.returnReason = reason || 'No reason provided';
  order.orderStatus = 'Return Requested';
  await order.save();

  res.json({ success: true, data: order, message: 'Return request submitted.' });
};

module.exports = { createOrder, getMyOrders, getAllOrders, getOrderById, updateOrderStatus, cancelOrder, returnOrder };
