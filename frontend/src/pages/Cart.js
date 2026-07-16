import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiArrowRight, FiShoppingBag, FiTag, FiMinus, FiPlus, FiCheckCircle } from 'react-icons/fi';
import api from '../utils/axios';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import BackButton from '../components/BackButton';
import CouponMilestonePanel from '../components/CouponMilestonePanel';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, user } = useCart();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponMessageType, setCouponMessageType] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [couponSuccess, setCouponSuccess] = useState(false);
  const [outOfStockItems, setOutOfStockItems] = useState([]);

  const computedSubtotal = cart.reduce((sum, item) => {
    const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0;
    return sum + price * (item.quantity || 1);
  }, 0);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const { data } = await api.get('/api/coupons');
        setActiveCoupons(Array.isArray(data) ? data : []);
      } catch {}
    };
    fetchCoupons();
  }, []);

  useEffect(() => {
    if (cart.length === 0) return;
    const checkStock = async () => {
      const oos = [];
      for (const item of cart) {
        if (item.stock !== undefined && item.stock <= 0) {
          oos.push(item._id);
        }
      }
      setOutOfStockItems(oos);
    };
    checkStock();
  }, [cart]);

  const handleApplyCoupon = async (codeOverride) => {
    const code = (codeOverride || couponCode).trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponMessage('');
    setCouponSuccess(false);
    try {
      const { data } = await api.post('/api/coupons/validate', { code, subtotal: computedSubtotal, cartItems: cart, userId: user?._id });
      if (!data.valid) {
        setCouponMessage(data.message || 'Invalid coupon');
        setCouponMessageType('error');
        return;
      }
      setAppliedCoupon(data.coupon);
      setCouponCode(code);
      setCouponMessageType('success');
      setCouponMessage(`Coupon applied! You save ₹${(data.discount || 0).toLocaleString()}`);
      setCouponSuccess(true);
      setTimeout(() => setCouponSuccess(false), 2200);
    } catch (err) {
      setCouponMessage(err.response?.data?.message || 'Failed to validate coupon.');
      setCouponMessageType('error');
    } finally {
      setCouponLoading(false);
    }
  };

  const savings = appliedCoupon?.discount || 0;
  const discountedTotal = Math.max(0, computedSubtotal - savings);
  const nextCoupon = activeCoupons
    .filter((c) => !appliedCoupon && (c.minimumOrderAmount || c.minOrder || 0) > computedSubtotal)
    .sort((a, b) => (a.minimumOrderAmount || a.minOrder || 0) - (b.minimumOrderAmount || b.minOrder || 0))[0] || null;
  const nextThreshold = nextCoupon ? (nextCoupon.minimumOrderAmount || nextCoupon.minOrder || 0) : null;
  const progressValue = nextThreshold ? Math.min(100, Math.round((computedSubtotal / nextThreshold) * 100)) : 0;

  return (
    <div className="cart-page">
      <div className="container" style={{ paddingTop: 40 }}>
        <BackButton />
        <h1 className="page-title"><FiShoppingBag style={{ color: '#2E5A44' }} /> Shopping Bag</h1>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>{cart.length} item{cart.length !== 1 ? 's' : ''} in your bag</p>

        {cart.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="empty-cart">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
              <FiShoppingBag size={80} style={{ color: '#A3C9A8', marginBottom: 20 }} />
            </motion.div>
            <h3>Your bag is empty</h3>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Start adding eco-friendly bags to your collection!</p>
            <Link to="/products" className="btn btn-primary">Shop Now</Link>
          </motion.div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items-section">
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div key={item._id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, padding: 0 }} className="cart-item">
                    <div className="cart-item-image">
                      {item.images && item.images.length > 0 && item.images[0]?.url ? (
                        <img src={item.images[0].url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : item.image ? (
                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (<FiShoppingBag size={28} />)}
                    </div>
                    <div className="cart-item-details">
                      <h4>{item.name}</h4>
                      <p className="item-category">{item.category}</p>
                      <p className="item-price">₹{item.price}</p>
                      {outOfStockItems.includes(item._id) && (
                        <p style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 4 }}>Out of Stock</p>
                      )}
                      {item.stock > 0 && item.stock < 10 && item.quantity >= item.stock && (
                        <p style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600, marginTop: 4 }}>Max quantity reached ({item.stock} available)</p>
                      )}
                    </div>
                    <div className="qty-controls">
                      <button onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))} disabled={item.quantity <= 1}><FiMinus size={14} /></button>
                      <span className="qty-value">{item.quantity}</span>
                      <button onClick={() => {
                        const max = item.stock || 99;
                        if (item.quantity >= max) {
                          showNotification('error', `Maximum ${max} item${max !== 1 ? 's' : ''} allowed`);
                          return;
                        }
                        updateQuantity(item._id, item.quantity + 1);
                      }} disabled={item.stock > 0 && item.quantity >= item.stock}>
                        <FiPlus size={14} />
                      </button>
                    </div>
                    <div className="cart-item-total">₹{(item.price * item.quantity).toLocaleString()}</div>
                    <button onClick={() => { removeFromCart(item._id); showNotification('remove'); }} className="cart-remove-btn" aria-label="Remove"><FiTrash2 /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="cart-summary">
              <h3>Order Summary</h3>
              {computedSubtotal >= 1000 ? (
                <div className="coupon-section">
                  <div className="coupon-input-group">
                    <FiTag />
                    <input type="text" placeholder="Coupon code" value={couponCode} onChange={(e) => { setCouponCode(e.target.value); if (couponMessage) { setCouponMessage(''); setCouponMessageType(''); } }} disabled={!!appliedCoupon} />
                    <button className="btn btn-secondary apply-coupon-btn" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => handleApplyCoupon()} disabled={!!appliedCoupon || !couponCode.trim() || couponLoading}>{couponLoading ? '...' : appliedCoupon ? 'Applied' : 'Apply'}</button>
                  </div>
                  {couponMessage && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 13, marginTop: 8, color: couponMessageType === 'error' ? '#dc2626' : '#2E5A44' }}>
                      {couponMessage}
                    </motion.div>
                  )}
                  {couponSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ marginTop: 12, borderRadius: 12, padding: 12, background: 'linear-gradient(90deg, #f0fdf4, #ecfdf3)', border: '1px solid #86efac', color: '#166534' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}><FiCheckCircle /> Coupon Applied Successfully</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>You saved ₹{savings.toLocaleString()} and your total is updated instantly.</div>
                    </motion.div>
                  )}
                  {activeCoupons.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#2E5A44', marginBottom: 6 }}>Available Coupons</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {activeCoupons.slice(0, 3).map((coupon) => (
                          <button key={coupon._id} onClick={() => handleApplyCoupon(coupon.code)} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', background: '#fff', textAlign: 'left', cursor: 'pointer' }}>
                            <div style={{ fontWeight: 700, color: '#2E5A44' }}>{coupon.code}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{coupon.title || coupon.description || 'Discount available'}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, padding: '12px 0' }}>
                  Add items worth ₹{(1000 - computedSubtotal).toLocaleString()} more to unlock coupon offers.
                </div>
              )}
              <CouponMilestonePanel subtotal={computedSubtotal} onApply={handleApplyCoupon} />
              <div className="summary-row"><span>Subtotal</span><span>₹{computedSubtotal.toLocaleString()}</span></div>
              {appliedCoupon && <div className="summary-row discount"><span>Coupon Discount</span><span>-₹{savings.toLocaleString()}</span></div>}
              {nextCoupon && !appliedCoupon && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 10, padding: 10, borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#2E5A44', fontWeight: 700 }}>
                    <span>Unlock {nextCoupon.code}</span>
                    <span>₹{Math.max(0, (nextCoupon.minimumOrderAmount || nextCoupon.minOrder || 0) - computedSubtotal).toLocaleString()} more</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 100, background: '#e5e7eb', marginTop: 8, overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${progressValue}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', borderRadius: 100, background: 'linear-gradient(90deg, #2E5A44, #D4A853)' }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Spend ₹{Math.max(0, (nextCoupon.minimumOrderAmount || nextCoupon.minOrder || 0) - computedSubtotal).toLocaleString()} more to unlock this offer.</div>
                </motion.div>
              )}
              <div className="summary-row"><span>Shipping</span><span style={{ color: '#2E5A44', fontWeight: 600 }}>Free</span></div>
              <div className="summary-divider" />
              <div className="summary-row total"><span>Total</span><span>₹{discountedTotal.toLocaleString()}</span></div>
              <button className="btn btn-primary checkout-btn" onClick={() => { if (!user) { showNotification('checkoutLogin'); navigate('/login', { state: { from: { pathname: '/checkout' } } }); } else { navigate('/checkout'); } }}>Proceed to Checkout <FiArrowRight /></button>
              <Link to="/products" className="continue-shopping">Continue Shopping</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
