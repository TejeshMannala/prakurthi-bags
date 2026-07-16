const Coupon = require('../models/Coupon');

const validateCoupon = async (req, res) => {
  const { code, orderAmount } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'Coupon code is required.' });
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Invalid coupon code.' });
  }

  if (!coupon.isValid(req.user._id)) {
    return res.status(400).json({ success: false, message: 'Coupon has expired, reached usage limit, or is inactive for your account.' });
  }

  if (orderAmount !== undefined && orderAmount < coupon.minOrderAmount) {
    return res.status(400).json({ 
      success: false, 
      message: `Minimum order amount of ₹${coupon.minOrderAmount} is required to use this coupon.` 
    });
  }

  res.json({
    success: true,
    data: {
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      discountType: coupon.discountType,
      discountAmount: coupon.discountAmount,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscountAmount: coupon.maxDiscountAmount,
    },
  });
};

const getAll = async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, data: coupons });
};

const getAvailableCoupons = async (req, res) => {
  const { orderAmount } = req.query;
  const filter = { isActive: true, expiresAt: { $gt: new Date() } };
  
  if (orderAmount) {
    filter.minOrderAmount = { $lte: Number(orderAmount) };
  }

  const coupons = await Coupon.find(filter).sort({ minOrderAmount: -1 });
  // Filter out those that have exceeded usage limit or customer limit
  const availableCoupons = coupons.filter(c => c.isValid(req.user._id));

  res.json({ success: true, data: availableCoupons });
};

const create = async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, data: coupon });
};

const update = async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Coupon not found.' });
  }
  res.json({ success: true, data: coupon });
};

const remove = async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Coupon not found.' });
  }
  res.json({ success: true, message: 'Coupon deleted.' });
};

module.exports = { validateCoupon, getAll, getAvailableCoupons, create, update, remove };
