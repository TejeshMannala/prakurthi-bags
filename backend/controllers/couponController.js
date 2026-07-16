const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const { calculateCouponDiscount, isCouponEligible } = require('../utils/couponUtils');

const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal: reqSubtotal, orderAmount, cartItems = [] } = req.body;
    const subtotal = reqSubtotal || orderAmount;
    const userId = req.user?._id;

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required.' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code.' });
    if (!coupon.active) return res.status(400).json({ message: 'This coupon is no longer active.' });
    if (coupon.startDate && new Date(coupon.startDate) > new Date()) return res.status(400).json({ message: 'This coupon is not active yet.' });
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) return res.status(400).json({ message: 'This coupon has expired.' });
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ message: 'This coupon has reached its usage limit.' });

    const orderSubtotal = Number(subtotal || 0);
    const eligibleContext = { subtotal: orderSubtotal, cartItems, userId };
    if (!isCouponEligible(coupon, eligibleContext)) {
      const minOrder = coupon.minimumOrderAmount || 0;
      return res.status(400).json({
        message: minOrder > 0 ? `This coupon requires a minimum purchase of ₹${minOrder}.` : 'This coupon is not eligible for your cart.',
      });
    }

    if (coupon.perUserLimit > 0 && userId && coupon.usedBy?.some(id => id.toString() === userId.toString())) {
      return res.status(400).json({ message: 'You have already used this coupon.' });
    }

    if (coupon.isWelcomeCoupon && userId) {
      const completedOrders = await Order.countDocuments({
        user: userId, orderStatus: { $in: ['Delivered', 'Completed'] },
      });
      if (completedOrders > 0) return res.status(400).json({ message: 'This welcome coupon is only available for your first order.' });
      if (coupon.usedBy.some(id => id.toString() === userId.toString())) return res.status(400).json({ message: 'You have already used this welcome coupon.' });
    }

    const discount = calculateCouponDiscount(coupon, orderSubtotal);

    res.json({
      valid: true,
      discount,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discount,
        discountType: coupon.discountType,
        discountPercent: coupon.discountType === 'percentage' ? coupon.discountValue : 0,
        maximumDiscount: coupon.maximumDiscount,
        minimumOrderAmount: coupon.minimumOrderAmount,
        featured: coupon.featured,
        isWelcomeCoupon: coupon.isWelcomeCoupon,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getActiveCoupons = async (req, res) => {
  try {
    const userId = req.user?._id;
    const now = new Date();
    const coupons = await Coupon.find({
      active: true,
      $and: [
        { $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gte: now } }] },
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
      ],
    }).sort({ featured: -1, minimumOrderAmount: 1 }).lean();

    if (userId) {
      const completedOrders = await Order.countDocuments({
        user: userId, orderStatus: { $in: ['Delivered', 'Completed'] },
      });
      const result = coupons.filter((c) => {
        if (c.isWelcomeCoupon && completedOrders > 0) return false;
        if (c.perUserLimit > 0 && c.usedBy?.some(id => id.toString() === userId.toString())) return false;
        return true;
      });
      return res.json(result);
    }

    res.json(coupons.filter((c) => !c.isWelcomeCoupon));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWelcomeCoupon = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.json({ coupon: null });

    const completedOrders = await Order.countDocuments({
      user: userId, orderStatus: { $in: ['Delivered', 'Completed'] },
    });
    if (completedOrders > 0) return res.json({ coupon: null });

    const coupon = await Coupon.findOne({
      isWelcomeCoupon: true, active: true,
      $and: [
        { $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gte: new Date() } }] },
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: new Date() } }] },
      ],
    }).lean();

    if (!coupon) return res.json({ coupon: null });
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return res.json({ coupon: null });
    if (coupon.usedBy?.some(id => id.toString() === userId.toString())) return res.json({ coupon: null });

    res.json({ coupon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMilestoneCoupons = async (req, res) => {
  try {
    const subtotal = Number(req.query.subtotal || 0);
    const userId = req.user?._id;
    const now = new Date();

    const milestoneCoupons = await Coupon.find({
      isMilestone: true, active: true,
      $and: [
        { $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gte: now } }] },
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
      ],
    }).sort({ minimumOrderAmount: 1 }).lean();

    const result = milestoneCoupons.map(c => {
      const unlocked = subtotal >= (c.minimumOrderAmount || 0);
      const remaining = Math.max(0, (c.minimumOrderAmount || 0) - subtotal);
      let alreadyUsedByUser = false;
      if (userId && c.usedBy?.some(id => id.toString() === userId.toString())) {
        alreadyUsedByUser = true;
      }
      const discount = calculateCouponDiscount(c, subtotal);
      return {
        ...c,
        unlocked,
        remaining,
        alreadyUsedByUser,
        discount,
        progress: Math.min(100, subtotal > 0 ? (subtotal / (c.minimumOrderAmount || 1)) * 100 : 0),
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  validateCoupon,
  getActiveCoupons,
  getWelcomeCoupon,
  getMilestoneCoupons,
};
