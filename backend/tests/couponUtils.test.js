const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCouponDiscount, isCouponEligible } = require('../utils/couponUtils');

test('calculates percentage discounts capped by maximum discount', () => {
  const coupon = {
    discountType: 'percentage',
    discountValue: 20,
    maximumDiscount: 150,
  };

  assert.equal(calculateCouponDiscount(coupon, 1200), 150);
});

test('rejects coupons below the minimum order and restricted products', () => {
  const coupon = {
    active: true,
    discountType: 'fixed',
    discountValue: 250,
    minimumOrderAmount: 1000,
    restrictedProducts: ['product-1'],
  };

  assert.equal(
    isCouponEligible(coupon, { subtotal: 800, cartItems: [{ product: 'product-2' }] }),
    false
  );
});
