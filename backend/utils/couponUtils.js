const calculateCouponDiscount = (coupon, subtotal) => {
  if (!coupon || coupon.active === false) return 0;
  if (!subtotal || subtotal <= 0) return 0;

  if (coupon.discountType === 'percentage') {
    const computed = Math.round((subtotal * (coupon.discountValue || 0)) / 100);
    const maxDiscount = Number(coupon.maximumDiscount || 0);
    return maxDiscount > 0 ? Math.min(computed, maxDiscount) : computed;
  }

  return Math.min(Number(coupon.discountValue || 0), Number(coupon.maximumDiscount || Number.MAX_SAFE_INTEGER));
};

const isCouponEligible = (coupon, context = {}) => {
  if (!coupon || coupon.active === false) return false;

  const subtotal = Number(context.subtotal || 0);
  const minimumOrderAmount = Number(coupon.minimumOrderAmount || coupon.minOrder || 0);
  if (subtotal < minimumOrderAmount) return false;

  const restrictedProducts = Array.isArray(coupon.restrictedProducts) ? coupon.restrictedProducts : [];
  if (restrictedProducts.length > 0) {
    const cartItems = Array.isArray(context.cartItems) ? context.cartItems : [];
    const productIds = cartItems.map((item) => item.product?.toString?.() || item.productId || item.product || '').filter(Boolean);
    const hasRestricted = productIds.some((productId) => restrictedProducts.includes(productId));
    if (!hasRestricted) return false;
  }

  const restrictedBrands = Array.isArray(coupon.restrictedBrands) ? coupon.restrictedBrands : [];
  if (restrictedBrands.length > 0) {
    const cartItems = Array.isArray(context.cartItems) ? context.cartItems : [];
    const hasRestrictedBrand = cartItems.some((item) => {
      const brand = item.brand || item.product?.brand || '';
      return restrictedBrands.some((name) => brand.toString().toLowerCase() === name.toString().toLowerCase());
    });
    if (!hasRestrictedBrand) return false;
  }

  if (context.userId && coupon.restrictedUsers?.length) {
    const userId = context.userId.toString();
    if (!coupon.restrictedUsers.includes(userId)) return false;
  }

  return true;
};

module.exports = {
  calculateCouponDiscount,
  isCouponEligible,
};
