const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { calculateCouponDiscount, isCouponEligible } = require('../utils/couponUtils');
const { validatePayment } = require('../utils/paymentValidator');
const { sendOrderReceipt } = require('../utils/mailer');
const Settings = require('../models/Settings');
const { emitToUser, emitToAdmin, getIO } = require('../socket/socketHandler');
const { pushNotification } = require('../utils/notify');

// Read store-wide tax/shipping config (admin-editable). Falls back to sensible
// defaults when no Settings document exists yet.
const getStoreSettings = async () => {
  const settings = await Settings.findOne({ key: 'global' }).lean().catch(() => null);
  return {
    gstRate: settings?.gstRate ?? 5,
    shippingCharges: settings?.shippingCharges ?? 49,
    freeShippingLimit: settings?.freeShippingLimit ?? 499,
  };
};

// Methods that are collected + "paid" online (everything except Cash on Delivery).
const ONLINE_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Google Pay', 'PhonePe', 'Paytm', 'Amazon Pay', 'NetBanking', 'Wallet', 'Razorpay', 'Stripe'];
const isOnlineMethod = (m) => ONLINE_METHODS.includes(m);

// Broad category used for reporting.
const paymentTypeOf = (m) => {
  if (['UPI', 'Google Pay', 'PhonePe', 'Paytm', 'Amazon Pay', 'Razorpay'].includes(m)) return 'UPI';
  if (['Credit Card', 'Debit Card', 'Stripe'].includes(m)) return 'Card';
  if (m === 'NetBanking') return 'NetBanking';
  if (m === 'Wallet') return 'Wallet';
  return 'COD';
};

const generatePaymentId = () => `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const generateTransactionId = () => `TXN${Date.now()}${Math.floor(100000 + Math.random() * 900000)}`;

const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, items, coupon, payment, shippingMethod } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required.' });
    }

    // Validate payment details server-side (never persisted).
    const paymentCheck = validatePayment(paymentMethod, payment || {});
    if (!paymentCheck.valid) {
      return res.status(400).json({ message: paymentCheck.error });
    }

    // Duplicate-order protection: reject identical order placed within 20s.
    const recentDuplicate = await Order.findOne({
      user: req.user._id,
      total: { $exists: true },
      createdAt: { $gte: new Date(Date.now() - 20000) },
    }).lean();
    if (recentDuplicate) {
      return res.status(409).json({ message: 'A recent order already exists. Please wait before placing another.' });
    }

    let orderItems = items;

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
      if (!cart || !cart.items.length) {
        return res.status(400).json({ message: 'Cart is empty. Add items before placing an order.' });
      }
      orderItems = cart.items.map((item) => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        size: item.size || '',
        color: item.color || '',
        image: item.product.thumbnail || item.product.image || '',
      }));
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
      return res.status(400).json({ message: 'Complete shipping address with street, city, state, and PIN code is required.' });
    }

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found.` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${item.quantity}.`,
        });
      }
    }

    let subtotal = 0;
    const products = orderItems.map((item) => {
      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      return {
        product: item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size || '',
        color: item.color || '',
        image: item.image || '',
      };
    });

    let discountAmount = 0;
    let appliedCouponCode = null;
    if (coupon && coupon.code) {
      const Coupon = require('../models/Coupon');
      const found = await Coupon.findOne({ code: coupon.code.toUpperCase() });
      if (found && found.isValid()) {
        const eligibleContext = { subtotal, cartItems: products, userId: req.user._id };
        if (isCouponEligible(found, eligibleContext)) {
          discountAmount = calculateCouponDiscount(found, subtotal);
          appliedCouponCode = coupon.code.toUpperCase();
        }
      }
    }

    const { gstRate, shippingCharges, freeShippingLimit } = await getStoreSettings();
    const tax = Math.round(subtotal * (gstRate / 100));
    const isExpress = shippingMethod === 'Express';
    const freeShipping = freeShippingLimit > 0 && subtotal >= freeShippingLimit && !isExpress;
    const shipping = freeShipping ? 0 : shippingCharges;
    const total = subtotal + tax + shipping - discountAmount;

    const online = isOnlineMethod(paymentMethod);

    const order = await Order.create({
      user: req.user._id,
      products,
      subtotal,
      tax,
      shipping,
      shippingMethod: isExpress ? 'Express' : 'Standard',
      total,
      totalPrice: total,
      coupon: appliedCouponCode ? { code: appliedCouponCode, discount: discountAmount } : undefined,
      paymentMethod: paymentMethod || 'COD',
      // Online payments are confirmed immediately; COD stays Pending/Processing.
      paymentStatus: online ? 'Paid' : 'Pending',
      orderStatus: online ? 'Confirmed' : 'Processing',
      shippingAddress,
    });

    let paymentRecord = null;
    if (online) {
      // Server-generated ids — never trust client-supplied values.
      const paymentId = generatePaymentId();
      const transactionId = generateTransactionId();
      const paymentType = paymentTypeOf(paymentMethod);

      paymentRecord = await Payment.create({
        user: req.user._id,
        order: order._id,
        orderId: order.orderId,
        paymentId,
        transactionId,
        paymentMethod,
        paymentMethodType: paymentType,
        status: 'Success',
        paymentStatus: 'Success',
        amount: total,
        currency: 'INR',
        upiId: payment?.upiId ? String(payment.upiId).trim().toLowerCase() : undefined,
        name: shippingAddress?.fullName,
        email: shippingAddress?.email,
        phone: shippingAddress?.mobile,
        bankName: payment?.bank,
        paidAt: new Date(),
        gatewayResponse: { simulated: true, method: paymentMethod },
      });
    }

    if (appliedCouponCode && discountAmount > 0) {
      const Coupon = require('../models/Coupon');
      const found = await Coupon.findOne({ code: appliedCouponCode });
      if (found) {
        found.usedCount += 1;
        if (found.perUserLimit > 0 && !found.usedBy?.some(id => id.equals(req.user._id))) {
          found.usedBy = [...(found.usedBy || []), req.user._id];
        }
        found.usageHistory = found.usageHistory || [];
        found.usageHistory.push({ user: req.user._id, order: order._id, discountAmount });
        await found.save();
      }
    }

    for (const item of products) {
      // Atomic conditional decrement: only reduce stock if enough is available.
      // This prevents overselling even under concurrent orders.
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, sold: item.quantity } },
        { new: true }
      ).lean();
      if (!updated) {
        // Rollback already-decremented items from this order attempt.
        for (const prev of products) {
          if (prev.product.equals(item.product)) break;
          await Product.findByIdAndUpdate(prev.product, {
            $inc: { stock: prev.quantity, sold: -prev.quantity },
          });
        }
        return res.status(400).json({
          message: `Insufficient stock for one or more items. Please refresh and try again.`,
        });
      }
      // Real-time stock update so every open storefront session reflects the
      // new availability instantly.
      emitToUser(req.user._id, 'product:stock', {
        productId: item.product,
        stock: updated.stock,
      });
      const io = getIO();
      if (io) {
        io.emit('product:updated', { productId: item.product, updatedAt: updated?.updatedAt });
      }
    }

    const clearedCart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [], totalPrice: 0 } },
      { new: true }
    ).lean();
    emitToUser(req.user._id, 'cart:updated', clearedCart || { items: [], totalPrice: 0 });

    const orderNo = order.orderId || order._id;
    await pushNotification({
      type: 'order_update',
      title: 'New Order Placed',
      message: `Order #${orderNo} has been placed successfully.`,
      link: `/orders/${order._id}`,
      forAdmin: true,
    });
    await pushNotification({
      type: 'order_update',
      title: 'Order Placed',
      message: `Your order #${orderNo} has been placed. We'll confirm it shortly.`,
      user: req.user._id,
      link: `/orders/${order._id}`,
    });

    // Real-time alert to every admin dashboard session.
    emitToAdmin('admin:order:new', {
      orderId: order._id,
      orderNo,
      total,
      user: { name: req.user.name, email: req.user.email },
    });
    emitToAdmin('admin:stats', { reason: 'new_order' });

    // Best-effort receipt email — must not block the order response.
    if (online && paymentRecord) {
      try {
        const fullOrder = await Order.findById(order._id).populate('user', 'name email').lean();
        await sendOrderReceipt(fullOrder, paymentRecord);
      } catch { /* ignore */ }
    }

    const populated = await Order.findById(order._id)
      .populate('products.product', 'name price images thumbnail')
      .lean();

    res.status(201).json({ ...populated, payment: paymentRecord ? paymentRecord.toObject() : null });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { user: req.user._id };
    if (status) filter.orderStatus = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('products.product', 'name price images thumbnail slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Attach the related Payment (if any) so the success page can show IDs.
const withPayment = async (order) => {
  if (!order) return order;
  try {
    const Payment = require('../models/Payment');
    const payment = await Payment.findOne({ order: order._id }).lean();
    return { ...order, payment: payment || null };
  } catch {
    return { ...order, payment: null };
  }
};

const trackOrderPublic = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId || !orderId.trim()) {
      return res.status(400).json({ message: 'Order ID is required.' });
    }

    // Public tracking is order-only (status / items). We deliberately DO NOT
    // populate the user's name/email here: that PII belongs to the order owner
    // and must not be exposed to anyone who guesses an order ID. Use the
    // authenticated /api/orders/track/:id endpoint to see full details.
    const order = await Order.findOne({ orderId: orderId.trim().toUpperCase() })
      .populate('products.product', 'name price images thumbnail slug')
      .lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found. Please check the Order ID and try again.' });
    }

    // Never leak the owner's identity on the public path.
    if (order.user && typeof order.user === 'object') {
      delete order.user.name;
      delete order.user.email;
    } else if (order.user) {
      order.user = undefined;
    }

    res.json(await withPayment(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const trackMyOrder = async (req, res) => {
  try {
    const { id } = req.params;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findOne({ _id: id, user: req.user._id })
        .populate('products.product', 'name price images thumbnail slug')
        .lean();
    }
    if (!order) {
      order = await Order.findOne({ orderId: id?.toUpperCase(), user: req.user._id })
        .populate('products.product', 'name price images thumbnail slug')
        .lean();
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json(await withPayment(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order ID.' });
    }
    const order = await Order.findOne({ _id: id, user: req.user._id })
      .populate('products.product', 'name price images thumbnail slug')
      .populate('user', 'name email')
      .lean();
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(await withPayment(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const CANCELABLE = ['Pending', 'Processing', 'Confirmed'];

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order ID.' });
    }
    const order = await Order.findOne({ _id: id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (!CANCELABLE.includes(order.orderStatus)) {
      return res.status(400).json({
        message: `Order cannot be cancelled once it is '${order.orderStatus}'.`,
      });
    }

    // Real-time inventory rollback.
    for (const item of order.products) {
      const updated = await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity, sold: -item.quantity },
      }, { new: true }).lean();
      emitToUser(req.user._id, 'product:stock', {
        productId: item.product,
        stock: updated?.stock ?? 0,
      });
      const io = getIO();
      if (io) {
        io.emit('product:updated', { productId: item.product, updatedAt: updated?.updatedAt });
      }
    }

    order.orderStatus = 'Cancelled';
    if (order.paymentStatus === 'Paid') order.paymentStatus = 'Refunded';
    await order.save();

    const orderNo = order.orderId || order._id;
    await pushNotification({
      type: 'order_update',
      title: 'Order Cancelled',
      message: `Your order #${orderNo} has been cancelled.`,
      user: req.user._id,
      link: `/orders/${order._id}`,
    });
    await pushNotification({
      type: 'order_update',
      title: 'Order Cancelled',
      message: `Order #${orderNo} was cancelled by the customer.`,
      link: `/admin/orders/${order._id}`,
      forAdmin: true,
    });

    emitToUser(req.user._id, 'order:updated', order);
    emitToAdmin('admin:order:updated', { orderId: order._id, orderStatus: 'Cancelled' });
    emitToAdmin('admin:stats', { reason: 'order_cancelled' });

    const populated = await Order.findById(order._id)
      .populate('products.product', 'name price images thumbnail slug')
      .lean();
    res.json(await withPayment(populated));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  trackOrderPublic,
  trackMyOrder,
};
