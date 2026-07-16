const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const FAQ = require('../models/FAQ');
const TeamMember = require('../models/TeamMember');
const Banner = require('../models/Banner');
const ReturnRequest = require('../models/ReturnRequest');
const PageContent = require('../models/PageContent');
const Notification = require('../models/Notification');
const ContactMessage = require('../models/ContactMessage');
const Support = require('../models/Support');
const Category = require('../models/Category');
const ReturnPolicy = require('../models/ReturnPolicy');
const ExchangePolicy = require('../models/ExchangePolicy');
const ContactInfo = require('../models/ContactInfo');
const { cache } = require('../utils/redis');
const { getIO, emitToUser, emitToAdmin } = require('../socket/socketHandler');
const { pushNotification } = require('../utils/notify');
const escapeRegex = require('../utils/escapeRegex');

// Fire-and-forget broadcast so any open storefront session refreshes the
// matching content type instantly (mirrors how `product:updated` works).
const emitContent = (event, data) => {
  try {
    const io = getIO();
    if (io) io.emit(event, data || {});
  } catch {
    // socket optional — ignore
  }
};

// Keep product image fields consistent so both the admin panel (which edits the
// `image` URL) and the customer storefront (which renders from the `images`
// array / `thumbnail`) stay in sync after every create/update.
const normalizeProductImages = (body) => {
  if (!body || typeof body !== 'object') return;

  // The admin form can submit `images` either as a comma-separated string
  // ("url1, url2") or as an array of strings / { url, publicId } objects.
  // Normalise everything into an array of { url, publicId } first.
  let urls = [];
  if (typeof body.images === 'string' && body.images.trim()) {
    urls = body.images
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((u) => ({ url: u, publicId: '' }));
  } else if (Array.isArray(body.images)) {
    urls = body.images
      .map((i) => (typeof i === 'string' ? { url: i, publicId: '' } : { url: i?.url || '', publicId: i?.publicId || '' }))
      .filter((i) => i.url);
  }

  const mainImage = typeof body.image === 'string' && body.image.trim() ? body.image.trim() : '';

  // The single "Image URL" field is the product's PRIMARY image. Force it to
  // be the first gallery entry so the storefront (which renders images[0]) and
  // the admin panel (which renders `image`) stay in sync regardless of which
  // field the admin actually edited. Without this, editing only the "Image
  // URL" field left images[0] stale and the storefront kept showing the old
  // picture.
  if (mainImage) {
    urls = [{ url: mainImage, publicId: '' }, ...urls.filter((u) => u.url !== mainImage)];
  }

  if (urls.length === 0) return;

  body.images = urls;
  body.image = urls[0].url;
  // Always keep `thumbnail` in lock-step with the primary image. The storefront
  // still prefers `images[0]`, but keeping all three fields identical guarantees
  // there is a single source of truth and no stale thumbnail can linger.
  body.thumbnail = urls[0].url;
};

// ============================================================
// DASHBOARD METRICS
// ============================================================
const getDashboardMetrics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments({ isActive: { $ne: false } });
    const totalReviews = await Review.countDocuments();
    const totalCoupons = await Coupon.countDocuments();
    const totalSupportTickets = await Support.countDocuments();
    const totalReturns = await ReturnRequest.countDocuments();

    const revenueAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRevenueAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const todayRevenue = todayRevenueAgg[0]?.total || 0;

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenueAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const monthlyRevenue = monthlyRevenueAgg[0]?.total || 0;

    const pendingOrders = await Order.countDocuments({ orderStatus: { $in: ['Pending', 'Processing'] } });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'Delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'Cancelled' });
    const completedOrders = await Order.countDocuments({ orderStatus: 'Completed' });

    const lowStockProducts = await Product.find({ stock: { $lte: 5 }, isActive: { $ne: false } })
      .select('name stock price thumbnail')
      .limit(10)
      .lean();

    const topSelling = await Product.find({ isActive: { $ne: false } })
      .sort({ sold: -1 })
      .limit(5)
      .select('name sold price thumbnail')
      .lean();

    const paymentMethods = await Order.aggregate([
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalPrice' } } },
      { $project: { method: '$_id', count: 1, total: 1, _id: 0 } },
    ]);

    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlySales = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: '$totalPrice' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          month: {
            $concat: [
              { $arrayElemAt: [['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], '$_id.month'] },
              ' ',
              { $toString: '$_id.year' },
            ],
          },
          total: 1,
          count: 1,
          _id: 0,
        },
      },
    ]);

    const latestOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const latestReviews = await Review.find()
      .populate('user', 'name email')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue,
      totalReviews,
      totalCoupons,
      totalSupportTickets,
      totalReturns,
      todayRevenue,
      monthlyRevenue,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      completedOrders,
      lowStockProducts,
      topSelling,
      paymentMethods,
      monthlySales,
      latestOrders,
      latestReviews,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// ADMIN LOGIN
// ============================================================
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const dbUser = await User.findOne({ email: email.toLowerCase(), role: 'admin' }).select('+password');
    if (dbUser) {
      const isMatch = await dbUser.matchPassword(password);
      if (isMatch) {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          { id: dbUser._id, role: 'admin', email: dbUser.email, name: dbUser.name },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE || '30d' }
        );
        return res.json({
          success: true,
          token,
          admin: { name: dbUser.name, email: dbUser.email, role: 'admin', _id: dbUser._id },
        });
      }
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Administrator';

    if (!adminEmail || !adminPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: 'admin', role: 'admin', email: adminEmail, name: adminName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({
      success: true,
      token,
      admin: { name: adminName, email: adminEmail, role: 'admin' },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// PRODUCTS - Full CRUD
// ============================================================
const getAdminProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAdminProduct = async (req, res) => {
  try {
    normalizeProductImages(req.body);
    const product = await Product.create(req.body);
    await cache.invalidateProductCache();
    emitContent('product:updated', { productId: product._id });
    emitToAdmin('admin:stats', { reason: 'product_created' });
    res.status(201).json(product);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateAdminProduct = async (req, res) => {
  try {
    normalizeProductImages(req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    await cache.invalidateProductCache();
    try {
      const io = getIO();
      if (io) {
        const payload = { productId: product._id, updatedAt: product.updatedAt };
        io.emit('product:updated', payload);
        io.emit('product:changed', payload);
      }
    } catch (socketErr) {
      // socket optional — ignore
    }
    res.json(product);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    await cache.invalidateProductCache();
    emitContent('product:updated', { productId: product._id });
    emitToAdmin('admin:stats', { reason: 'product_deleted' });
    res.json({ message: 'Product removed.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCategoryDistribution = async (req, res) => {
  try {
    const distribution = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
    ]);
    res.json(distribution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// ORDERS - Full CRUD
// ============================================================
const getAdminOrders = async (req, res) => {
  try {
    const { status, paymentStatus, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminOrder = async (req, res) => {
  try {
    const { orderStatus, paymentStatus, status } = req.body;
    const finalStatus = orderStatus || status;

    if (finalStatus === 'Cancelled') {
      return res.status(403).json({
        message: 'Administrative override: Orders cannot be set to Cancelled.',
      });
    }

    const update = {};
    if (finalStatus) update.orderStatus = finalStatus;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    const existingOrder = await Order.findById(req.params.id).lean();
    if (!existingOrder) return res.status(404).json({ message: 'Order not found.' });

    const order = await Order.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (finalStatus) {
      const orderNo = order.orderId || order._id;
      await pushNotification({
        type: 'order_update',
        title: 'Order Status Updated',
        message: `Order #${orderNo} is now ${finalStatus}.`,
        user: order.user,
        link: `/orders/${order._id}`,
      });
      await pushNotification({
        type: 'order_update',
        title: 'Order Status Updated',
        message: `Order #${orderNo} is now ${finalStatus}.`,
        link: `/admin/orders/${order._id}`,
        forAdmin: true,
      });
      // Real-time push to the customer and every admin session.
      emitToUser(order.user, 'order:updated', order);
      emitToAdmin('admin:order:updated', { orderId: order._id, orderStatus: finalStatus, order });
      emitToAdmin('admin:stats', { reason: 'order_status' });
    }

    // When an order transitions into "Delivered", invite the buyer to review
    // their purchase. Fired once per order (skip if it was already delivered).
    if (finalStatus === 'Delivered' && existingOrder.orderStatus !== 'Delivered') {
      const orderNo = order.orderId || order._id;
      await pushNotification({
        type: 'review_request',
        title: 'Your order has been delivered',
        message: `Order #${orderNo} has been delivered. Please rate your purchase.`,
        user: order.user,
        link: `/orders/${order._id}`,
      });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (order.paymentStatus !== 'Pending') {
      return res.status(403).json({
        message: 'Administrative override: Cannot delete finalized billing profiles.',
      });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// PAYMENTS (revenue + analytics)
// ============================================================
const getAdminPayments = async (req, res) => {
  try {
    const { status, method, search, page = 1, limit = 20 } = req.query;
    const Payment = require('../models/Payment');
    const filter = {};
    if (status) filter.paymentStatus = status;
    if (method) filter.paymentMethodType = method;

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('user', 'name email')
        .populate('order', 'orderId totalPrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payment.countDocuments(filter),
    ]);

    const [revenueAgg, successAgg, failedAgg, upiAgg] = await Promise.all([
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.countDocuments({ paymentStatus: 'Success' }),
      Payment.countDocuments({ paymentStatus: { $in: ['Failed', 'Pending'] } }),
      Payment.countDocuments({ paymentMethodType: 'UPI' }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const [todayRev, monthRev] = await Promise.all([
      Payment.aggregate([{ $match: { createdAt: { $gte: today }, paymentStatus: 'Success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { createdAt: { $gte: monthStart }, paymentStatus: 'Success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    res.json({
      payments,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      revenue: revenueAgg[0]?.total || 0,
      successfulPayments: successAgg,
      failedPayments: failedAgg,
      upiPayments: upiAgg,
      dailyRevenue: todayRev[0]?.total || 0,
      monthlyRevenue: monthRev[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// USERS - Full CRUD
// ============================================================
const getAdminUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const orders = await Order.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ ...user, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminUser = async (req, res) => {
  try {
    const { name, email, role, phone, address, avatar } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (role !== undefined) update.role = role;
    if (phone !== undefined) update.phone = phone;
    if (avatar !== undefined) update.avatar = avatar;
    if (address) {
      if (address.street !== undefined) update['address.street'] = address.street;
      if (address.city !== undefined) update['address.city'] = address.city;
      if (address.state !== undefined) update['address.state'] = address.state;
      if (address.zip !== undefined) update['address.zip'] = address.zip;
      if (address.country !== undefined) update['address.country'] = address.country;
    }

    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already in use.' });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// COUPONS - Full CRUD
// ============================================================
const getAdminCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .populate('usageHistory.user', 'name email')
      .lean();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAdminCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    await cache.invalidateCouponCache();
    emitContent('coupon:updated', {});
    emitToAdmin('admin:coupon:updated', {});
    res.status(201).json(coupon);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Coupon code already exists.' });
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateAdminCoupon = async (req, res) => {
  try {
    // Schema setters (uppercase/trim) do NOT run on raw findByIdAndUpdate,
    // so normalize the code here to keep it consistent with create() and with
    // the case-insensitive lookup used during validation.
    if (req.body.code !== undefined) {
      req.body.code = String(req.body.code).toUpperCase().trim();
    }
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    await cache.invalidateCouponCache();
    emitContent('coupon:updated', {});
    emitToAdmin('admin:coupon:updated', {});
    res.json(coupon);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Coupon code already exists.' });
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    await cache.invalidateCouponCache();
    emitContent('coupon:updated', {});
    emitToAdmin('admin:coupon:updated', {});
    res.json({ message: 'Coupon deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// REVIEWS - Full CRUD
// ============================================================
const getAdminReviews = async (req, res) => {
  try {
    const { search, rating, productId, userId, startDate, endDate, status, reported, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (reported === 'true') filter.reported = true;
    if (rating && !isNaN(rating)) filter.rating = Number(rating);
    if (productId) filter.product = productId;
    if (userId) filter.user = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { review: { $regex: safeSearch, $options: 'i' } },
        { title: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name email')
        .populate('product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments(filter),
    ]);

    res.json({ reviews, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminReview = async (req, res) => {
  try {
    const { visible, status, rating, title, review, pinned, featured, adminReply } = req.body;
    const update = {};
    if (visible !== undefined) update.visible = visible;
    if (status !== undefined) update.status = status;
    if (rating !== undefined) update.rating = rating;
    if (title !== undefined) update.title = title;
    if (review !== undefined) update.review = review;
    if (pinned !== undefined) update.pinned = pinned;
    if (featured !== undefined) update.featured = featured;
    if (adminReply !== undefined) update.adminReply = { text: adminReply, repliedAt: new Date() };

    const updated = await Review.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email')
      .populate('product', 'name');

    if (!updated) return res.status(404).json({ message: 'Review not found.' });
    await cache.invalidateProductCache();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id });
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    await cache.invalidateProductCache();
    res.json({ message: 'Review deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// SUPPORT TICKETS - Full CRUD
// ============================================================
const getAdminSupportTickets = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { subject: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      Support.find(filter)
        .populate('user', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Support.countDocuments(filter),
    ]);

    res.json({ tickets, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminSupportTicketById = async (req, res) => {
  try {
    const ticket = await Support.findById(req.params.id).populate('user', 'name email').lean();
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminSupportTicket = async (req, res) => {
  try {
    const { status, priority, message } = req.body;
    const update = {};
    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (message) {
      update.$push = { messages: { text: message, sender: 'admin' } };
    }

    const ticket = await Support.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    if (message) {
      await pushNotification({
        type: 'support_reply',
        title: 'New Reply on Support Ticket',
        message: `Admin replied to "${ticket.subject}".`,
        user: ticket.user._id,
        link: `/support/${ticket._id}`,
      });
      emitToUser(ticket.user._id, 'new_message', {
        ticketId: ticket._id,
        message: { text: message, sender: 'admin' },
      });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminSupportTicket = async (req, res) => {
  try {
    const ticket = await Support.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
    res.json({ message: 'Support ticket deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const replyAdminSupportTicket = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Reply message is required.' });

    const ticket = await Support.findByIdAndUpdate(
      req.params.id,
      { $push: { messages: { text: message, sender: 'admin' } }, status: 'in-progress' },
      { new: true }
    ).populate('user', 'name email');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    await pushNotification({
      type: 'support_reply',
      title: 'New Reply on Support Ticket',
      message: `Admin replied to "${ticket.subject}".`,
      user: ticket.user._id,
      link: `/support/${ticket._id}`,
    });
    emitToUser(ticket.user._id, 'new_message', {
      ticketId: ticket._id,
      message: { text: message, sender: 'admin' },
    });

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// RETURNS - Full CRUD
// ============================================================
const getAdminReturns = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [returns, total] = await Promise.all([
      ReturnRequest.find(filter)
        .populate('user', 'name email')
        .populate('order', 'orderStatus totalPrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReturnRequest.countDocuments(filter),
    ]);

    res.json({ returns, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminReturn = async (req, res) => {
  try {
    const { status, adminNote, refundAmount, refundMethod } = req.body;
    const update = { status };
    if (adminNote !== undefined) update.adminNote = adminNote;
    if (refundAmount !== undefined) update.refundAmount = refundAmount;
    if (refundMethod) update.refundMethod = refundMethod;
    if (['refunded', 'rejected'].includes(status)) update.resolvedAt = new Date();

    const returnReq = await ReturnRequest.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!returnReq) return res.status(404).json({ message: 'Return request not found.' });

    // On refund, roll inventory back and mark the payment as refunded.
    if (status === 'refunded' && returnReq.order) {
      const order = await Order.findById(returnReq.order);
      if (order) {
        for (const item of order.products) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }
        if (order.paymentStatus === 'Paid') {
          order.paymentStatus = 'Refunded';
          await order.save();
        }
        const Payment = require('../models/Payment');
        await Payment.updateOne(
          { order: order._id },
          { $set: { status: 'Refunded', paymentStatus: 'Refunded', refundedAt: new Date() } }
        ).catch(() => {});
        emitToUser(order.user, 'order:updated', order);
        emitToAdmin('admin:order:updated', { orderId: order._id, orderStatus: order.orderStatus });
        emitToAdmin('admin:stats', { reason: 'return_refunded' });
      }
    }

    await pushNotification({
      type: 'return_update',
      title: 'Return Request Updated',
      message: `Your return request #${returnReq._id} is now ${status}.`,
      user: returnReq.user,
      link: `/returns/${returnReq._id}`,
    });

    res.json(returnReq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminReturn = async (req, res) => {
  try {
    const returnReq = await ReturnRequest.findByIdAndDelete(req.params.id);
    if (!returnReq) return res.status(404).json({ message: 'Return request not found.' });
    res.json({ message: 'Return request deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// FAQ - Full CRUD
// ============================================================
const getAdminFaqs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAdminFaq = async (req, res) => {
  try {
    const { question, answer, category, order } = req.body;
    if (!question || !answer) return res.status(400).json({ message: 'Question and answer are required.' });
    const faq = await FAQ.create({ question, answer, category, order });
    res.status(201).json(faq);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateAdminFaq = async (req, res) => {
  try {
    const { question, answer, category, order, published } = req.body;
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { question, answer, category, order, published },
      { new: true, runValidators: true }
    );
    if (!faq) return res.status(404).json({ message: 'FAQ not found.' });
    res.json(faq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminFaq = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ message: 'FAQ not found.' });
    res.json({ message: 'FAQ deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// PAGES - Full CRUD
// ============================================================
const getAdminPages = async (req, res) => {
  try {
    const pages = await PageContent.find().sort({ page: 1 }).lean();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const upsertAdminPage = async (req, res) => {
  try {
    const { title, content, sections, meta, published } = req.body;
    const page = await PageContent.findOneAndUpdate(
      { page: req.params.page },
      { title, content, sections, meta, published },
      { upsert: true, new: true, runValidators: true }
    );
    await cache.del(`page:${req.params.page}`);
    await cache.invalidateContentCache();
    emitContent('page:updated', { page: req.params.page });
    emitContent('settings:updated', {});
    res.json(page);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminPage = async (req, res) => {
  try {
    const page = await PageContent.findOneAndDelete({ page: req.params.page });
    if (!page) return res.status(404).json({ message: 'Page not found.' });
    await cache.del(`page:${req.params.page}`);
    await cache.invalidateContentCache();
    emitContent('page:updated', { page: req.params.page });
    emitContent('settings:updated', {});
    res.json({ message: 'Page deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// TEAM - Full CRUD
// ============================================================
const getAdminTeamMembers = async (req, res) => {
  try {
    const members = await TeamMember.find().sort({ order: 1 }).lean();
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAdminTeamMember = async (req, res) => {
  try {
    const { name, position, bio, photo, socialLinks, order } = req.body;
    if (!name || !position) return res.status(400).json({ message: 'Name and position are required.' });
    const member = await TeamMember.create({ name, position, bio, photo, socialLinks, order });
    res.status(201).json(member);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateAdminTeamMember = async (req, res) => {
  try {
    const { name, position, bio, photo, socialLinks, order, active } = req.body;
    const member = await TeamMember.findByIdAndUpdate(
      req.params.id,
      { name, position, bio, photo, socialLinks, order, active },
      { new: true, runValidators: true }
    );
    if (!member) return res.status(404).json({ message: 'Team member not found.' });
    res.json(member);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminTeamMember = async (req, res) => {
  try {
    const member = await TeamMember.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ message: 'Team member not found.' });
    res.json({ message: 'Team member deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// BANNERS - Full CRUD
// ============================================================
const getAdminBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ position: 1 }).lean();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAdminBanner = async (req, res) => {
  try {
    const { title, subtitle, link, image, mobileImage, bgColor, textColor, position, active } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });
    const banner = await Banner.create({ title, subtitle, link, image, mobileImage, bgColor, textColor, position, active });
    emitContent('banner:updated', {});
    res.status(201).json(banner);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateAdminBanner = async (req, res) => {
  try {
    const { title, subtitle, link, image, mobileImage, bgColor, textColor, position, active } = req.body;
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { title, subtitle, link, image, mobileImage, bgColor, textColor, position, active },
      { new: true, runValidators: true }
    );
    if (!banner) return res.status(404).json({ message: 'Banner not found.' });
    emitContent('banner:updated', {});
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found.' });
    emitContent('banner:updated', {});
    res.json({ message: 'Banner deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// CONTACT MESSAGES - Full CRUD
// ============================================================
const getAdminContactMessages = async (req, res) => {
  try {
    const { search, read, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { subject: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    if (read === 'true') filter.read = true;
    else if (read === 'false') filter.read = false;

    const skip = (Number(page) - 1) * Number(limit);
    const [messages, total] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      ContactMessage.countDocuments(filter),
    ]);

    res.json({ messages, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminContactMessageById = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id).lean();
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminContactMessage = async (req, res) => {
  try {
    const { reply, read } = req.body;
    const update = {};
    if (reply !== undefined) {
      update.reply = reply;
      update.replied = true;
      update.repliedAt = new Date();
    }
    if (read !== undefined) update.read = read;

    const message = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminContactMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json({ message: 'Message deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// NOTIFICATIONS - Full CRUD
// ============================================================
const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ forAdmin: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAdminNotificationRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllAdminNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ forAdmin: true, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// CATEGORIES - Full CRUD
// ============================================================
const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAdminCategory = async (req, res) => {
  try {
    const { name, description, icon, color, banner, status, sortOrder, parent } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required.' });
    const category = await Category.create({ name, description, icon, color, banner, status, sortOrder, parent });
    await cache.invalidateCategories();
    emitContent('category:updated', {});
    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Category slug already exists.' });
    res.status(500).json({ message: error.message });
  }
};

const updateAdminCategory = async (req, res) => {
  try {
    const { name, description, icon, color, banner, status, sortOrder, parent } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, icon, color, banner, status, sortOrder, parent },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    await cache.invalidateCategories();
    emitContent('category:updated', {});
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    await cache.invalidateCategories();
    emitContent('category:updated', {});
    res.json({ message: 'Category deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// RETURN POLICIES - Full CRUD
// ============================================================
const getAdminReturnPolicies = async (req, res) => {
  try {
    const policies = await ReturnPolicy.find().sort({ createdAt: -1 }).lean();
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAdminReturnPolicy = async (req, res) => {
  try {
    const { title, content, sections, active } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });
    const policy = await ReturnPolicy.create({ title, content, sections, active });
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminReturnPolicy = async (req, res) => {
  try {
    const { title, content, sections, active } = req.body;
    const policy = await ReturnPolicy.findByIdAndUpdate(
      req.params.id,
      { title, content, sections, active },
      { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ message: 'Return policy not found.' });
    res.json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminReturnPolicy = async (req, res) => {
  try {
    const policy = await ReturnPolicy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ message: 'Return policy not found.' });
    res.json({ message: 'Return policy deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// EXCHANGE POLICIES - Full CRUD
// ============================================================
const getAdminExchangePolicies = async (req, res) => {
  try {
    const policies = await ExchangePolicy.find().sort({ createdAt: -1 }).lean();
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAdminExchangePolicy = async (req, res) => {
  try {
    const { title, content, sections, active } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });
    const policy = await ExchangePolicy.create({ title, content, sections, active });
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminExchangePolicy = async (req, res) => {
  try {
    const { title, content, sections, active } = req.body;
    const policy = await ExchangePolicy.findByIdAndUpdate(
      req.params.id,
      { title, content, sections, active },
      { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ message: 'Exchange policy not found.' });
    res.json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminExchangePolicy = async (req, res) => {
  try {
    const policy = await ExchangePolicy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ message: 'Exchange policy not found.' });
    res.json({ message: 'Exchange policy deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// CONTACT INFO - Read/Update
// ============================================================
const getAdminContactInfo = async (req, res) => {
  try {
    let info = await ContactInfo.findOne().sort({ createdAt: -1 }).lean();
    if (!info) {
      info = await ContactInfo.create({});
    }
    res.json(info);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminContactInfo = async (req, res) => {
  try {
    const data = req.body;
    let info = await ContactInfo.findOne().sort({ createdAt: -1 });
    if (!info) {
      info = new ContactInfo();
    }
    Object.keys(data).forEach((key) => {
      if (key in info) info[key] = data[key];
    });
    await info.save();
    await cache.invalidateContentCache();
    emitContent('contact:updated', {});
    res.json(info);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardMetrics,
  adminLogin,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getCategoryDistribution,
  getAdminOrders,
  updateAdminOrder,
  deleteAdminOrder,
  getAdminPayments,
  getAdminUsers,
  getAdminUserById,
  updateAdminUser,
  deleteAdminUser,
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
  getAdminReviews,
  updateAdminReview,
  deleteAdminReview,
  getAdminSupportTickets,
  getAdminSupportTicketById,
  updateAdminSupportTicket,
  deleteAdminSupportTicket,
  replyAdminSupportTicket,
  getAdminReturns,
  updateAdminReturn,
  deleteAdminReturn,
  getAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  deleteAdminFaq,
  getAdminPages,
  upsertAdminPage,
  deleteAdminPage,
  getAdminTeamMembers,
  createAdminTeamMember,
  updateAdminTeamMember,
  deleteAdminTeamMember,
  getAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  getAdminContactMessages,
  getAdminContactMessageById,
  updateAdminContactMessage,
  deleteAdminContactMessage,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminReturnPolicies,
  createAdminReturnPolicy,
  updateAdminReturnPolicy,
  deleteAdminReturnPolicy,
  getAdminExchangePolicies,
  createAdminExchangePolicy,
  updateAdminExchangePolicy,
  deleteAdminExchangePolicy,
    getAdminContactInfo,
    updateAdminContactInfo,
    normalizeProductImages,
};
