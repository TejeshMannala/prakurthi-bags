import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiPhone, FiMail, FiHome, FiMapPin, FiNavigation, FiCreditCard,
  FiDollarSign, FiSmartphone, FiBriefcase, FiCheck, FiPlus, FiTrash2,
  FiTruck, FiZap, FiTag, FiArrowRight, FiShield, FiStar, FiLock, FiEdit3,
} from 'react-icons/fi';
import { FaGooglePay, FaAmazonPay, FaStripe } from 'react-icons/fa';
import { SiPhonepe, SiPaytm, SiRazorpay } from 'react-icons/si';
import api from '../utils/axios';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import BackButton from '../components/BackButton';

/* ------------------------------------------------------------------ */
/* Payment method catalogue. `key` is the admin-toggle id; `method` is */
/* the value persisted on the order (must match backend enum).         */
/* ------------------------------------------------------------------ */
const PAYMENT_CATALOG = [
  { key: 'COD', label: 'Cash on Delivery', desc: 'Pay cash when it arrives', icon: <FiDollarSign size={22} />, method: 'COD', fields: 'none' },
  { key: 'UPI', label: 'UPI', desc: 'GPay · PhonePe · Paytm', icon: <FiSmartphone size={22} />, method: 'UPI', fields: 'upi' },
  { key: 'Razorpay', label: 'Razorpay', desc: 'All UPI, cards & wallets', icon: <SiRazorpay size={22} />, method: 'UPI', fields: 'upi', gateway: 'Razorpay' },
  { key: 'Stripe', label: 'Stripe', desc: 'International cards', icon: <FaStripe size={22} />, method: 'Credit Card', fields: 'card', gateway: 'Stripe' },
  { key: 'Credit Card', label: 'Credit Card', desc: 'Visa · Mastercard · Rupay', icon: <FiCreditCard size={22} />, method: 'Credit Card', fields: 'card' },
  { key: 'Debit Card', label: 'Debit Card', desc: 'All debit cards', icon: <FiCreditCard size={22} />, method: 'Debit Card', fields: 'card' },
  { key: 'Google Pay', label: 'Google Pay', desc: 'Pay with GPay', icon: <FaGooglePay size={22} />, method: 'Google Pay', fields: 'upi' },
  { key: 'PhonePe', label: 'PhonePe', desc: 'Pay with PhonePe', icon: <SiPhonepe size={22} />, method: 'PhonePe', fields: 'upi' },
  { key: 'Paytm', label: 'Paytm', desc: 'Pay with Paytm', icon: <SiPaytm size={22} />, method: 'Paytm', fields: 'upi' },
  { key: 'Amazon Pay', label: 'Amazon Pay', desc: 'Pay with Amazon', icon: <FaAmazonPay size={22} />, method: 'Amazon Pay', fields: 'upi' },
  { key: 'NetBanking', label: 'Net Banking', desc: 'All major banks', icon: <FiBriefcase size={22} />, method: 'NetBanking', fields: 'bank' },
  { key: 'Wallet', label: 'Wallet', desc: 'Store wallet balance', icon: <FiStar size={22} />, method: 'COD', fields: 'none' },
];

const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis', 'PNB', 'Bank of Baroda', 'Kotak', 'Yes Bank'];

const luhn = (num) => {
  const d = String(num).replace(/\D/g, '');
  if (d.length !== 16) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
};
const brandOf = (num) => (/^3[47]/.test(String(num).replace(/\D/g, '')) ? 'Amex' : 'Other');

// Accept: name@okaxis, user@ybl, abc123@ibl, phone@paytm, name@oksbi, username@upi
const UPI_RE = /^[a-zA-Z0-9.\-_]+@[a-zA-Z]{2,}$/;
const isValidUpi = (v) => !!v && UPI_RE.test(String(v).trim().toLowerCase());

const validateAddressForm = (a) => {
  const e = {};
  if (!a.fullName || a.fullName.trim().length < 3) e.fullName = 'Full name must be at least 3 characters.';
  if (!a.mobile || !/^[6-9]\d{9}$/.test(a.mobile.trim())) e.mobile = 'Enter a valid 10-digit mobile number.';
  if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())) e.email = 'Enter a valid email address.';
  if (!a.houseNo || !a.houseNo.trim()) e.houseNo = 'House / flat number is required.';
  if (!a.street || !a.street.trim()) e.street = 'Street address is required.';
  if (!a.city || !a.city.trim()) e.city = 'City is required.';
  if (!a.state || !a.state.trim()) e.state = 'State is required.';
  if (!a.country || !a.country.trim()) e.country = 'Country is required.';
  if (!a.pincode || !/^[1-9]\d{5}$/.test(a.pincode.trim())) e.pincode = 'PIN code must be exactly 6 digits.';
  return e;
};

const validatePaymentForm = (fields, p) => {
  const e = {};
  if (fields === 'card') {
    if (!p.cardNumber || !luhn(p.cardNumber)) e.cardNumber = 'Enter a valid 16-digit card number.';
    if (!p.cardHolder || p.cardHolder.trim().length < 3 || !/^[A-Za-z\s.]+$/.test(p.cardHolder.trim())) e.cardHolder = 'Enter card holder name (letters only).';
    const m = /^(\d{2})\/(\d{2})$/.exec(p.expiry || '');
    if (!m) e.expiry = 'Use MM/YY format.';
    else {
      const month = +m[1], year = 2000 + +m[2];
      if (month < 1 || month > 12) e.expiry = 'Invalid month.';
      else if (new Date(year, month, 0, 23, 59, 59) < new Date()) e.expiry = 'Card has expired.';
    }
    const cvvLen = brandOf(p.cardNumber) === 'Amex' ? 4 : 3;
    if (!p.cvv || !new RegExp(`^\\d{${cvvLen}}$`).test(p.cvv)) e.cvv = `CVV must be ${cvvLen} digits.`;
  } else if (fields === 'upi') {
    if (!p.upiId || !/^[a-zA-Z0-9.\-_]+@[a-zA-Z]{2,}$/.test(p.upiId.trim().toLowerCase())) e.upiId = 'Enter a valid UPI ID (e.g. name@ybl).';
  } else if (fields === 'bank') {
    if (!p.bank) e.bank = 'Select your bank.';
  }
  return e;
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/* ----------------------------- UI atoms ----------------------------- */
function SectionCard({ icon: Icon, title, subtitle, children, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_10px_40px_-12px_rgba(46,90,68,0.18)] p-5 sm:p-7"
    >
      <div className="flex items-center gap-3 mb-5">
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2E5A44] to-[#1f3d2e] flex items-center justify-center text-white shadow-md">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function FloatingField({ label, name, value, onChange, error, icon: Icon, type = 'text', autoComplete, inputRef, required, inputMode, maxLength }) {
  return (
    <div className="relative">
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} aria-hidden="true" />}
        <input
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder=" "
          autoComplete={autoComplete}
          ref={inputRef}
          aria-invalid={!!error}
          aria-label={label}
          className={`peer w-full rounded-xl border bg-white/80 px-3.5 ${Icon ? 'pl-10' : 'pl-3.5'} pt-5 pb-1.5 text-sm text-gray-800 outline-none transition-all focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A44]/10 ${error ? 'border-rose-400 bg-rose-50/40' : 'border-gray-200'}`}
        />
        <label htmlFor={name} className={`pointer-events-none absolute top-1.5 ${Icon ? 'left-10' : 'left-3.5'} text-[11px] font-medium text-[#2E5A44] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-gray-400 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-[#2E5A44]`}>
          {label}{required && <span className="text-rose-400"> *</span>}
        </label>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 ml-1 text-xs text-rose-500">{error}</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function FloatingSelect({ label, name, value, onChange, error, icon: Icon, options, required }) {
  return (
    <div className="relative">
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} aria-hidden="true" />}
        <select
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          aria-invalid={!!error}
          aria-label={label}
          className={`peer w-full appearance-none rounded-xl border bg-white/80 px-3.5 ${Icon ? 'pl-10' : 'pl-3.5'} pt-5 pb-1.5 text-sm text-gray-800 outline-none transition-all focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A44]/10 ${error ? 'border-rose-400 bg-rose-50/40' : 'border-gray-200'}`}
        >
          <option value="" disabled hidden></option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <label htmlFor={name} className={`pointer-events-none absolute top-1.5 ${Icon ? 'left-10' : 'left-3.5'} text-[11px] font-medium text-[#2E5A44] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-gray-400 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-[#2E5A44]`}>
          {label}{required && <span className="text-rose-400"> *</span>}
        </label>
        <FiNavigation className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" size={15} />
      </div>
      {error && <p className="mt-1 ml-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-[#2E5A44]' : 'bg-gray-300'}`}
    >
      <motion.span layout className={`inline-block h-4 w-4 rounded-full bg-white shadow ${checked ? 'ml-4' : 'ml-0.5'}`} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </button>
  );
}

/* ------------------------------ Page -------------------------------- */
const Checkout = () => {
  const { cart, cartTotal, clearCart, user } = useCart();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const emptyForm = {
    fullName: user?.name || '', mobile: user?.phone || '', email: user?.email || '',
    houseNo: '', street: '', area: '', landmark: '', city: '', district: '',
    state: '', country: 'India', pincode: '',
  };
  const [address, setAddress] = useState(emptyForm);
  const [addressErrors, setAddressErrors] = useState({});
  const [saveAddress, setSaveAddress] = useState(true);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const firstFieldRef = useRef(null);

  const [enabledMethods, setEnabledMethods] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [payment, setPayment] = useState({ cardNumber: '', cardHolder: '', expiry: '', cvv: '', upiId: '', bank: '' });
  const [paymentErrors, setPaymentErrors] = useState({});

  const [shippingMethod, setShippingMethod] = useState('Standard');

  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponMessageType, setCouponMessageType] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [activeCoupons, setActiveCoupons] = useState([]);

  const loadAddresses = useCallback(async () => {
    try {
      const { data } = await api.get('/api/addresses');
      const list = Array.isArray(data) ? data : [];
      setSavedAddresses(list);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def) setSelectedAddressId(def._id);
      else setShowNewForm(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/settings/payment-methods')
      .then(({ data }) => {
        if (cancelled) return;
        const enabled = Array.isArray(data.enabledPaymentMethods) ? data.enabledPaymentMethods : [];
        setEnabledMethods(enabled);
        const first = PAYMENT_CATALOG.find((c) => enabled.includes(c.key));
        if (first && !paymentMethod) setPaymentMethod(first.key);
      })
      .catch(() => { if (!cancelled) setEnabledMethods([]); });
    return () => { cancelled = true; };
  }, [paymentMethod]);

  useEffect(() => {
    let cancelled = false;
    const loadCoupons = async () => {
      try {
        const { data } = await api.get(`/api/coupons/available?orderAmount=${cartTotal || 0}`);
        if (!cancelled) setActiveCoupons(Array.isArray(data) ? data : []);
      } catch { if (!cancelled) setActiveCoupons([]); }
    };
    loadCoupons();
    return () => { cancelled = true; };
  }, [cartTotal]);

  useEffect(() => {
    if (showNewForm && firstFieldRef.current) firstFieldRef.current.focus();
  }, [showNewForm]);

  const handleChange = (e) => setAddress({ ...address, [e.target.name]: e.target.value });
  const handlePaymentChange = (e) => setPayment({ ...payment, [e.target.name]: e.target.value });

  const addressToShipping = (a) => ({
    fullName: a.fullName,
    mobile: a.mobile,
    email: a.email,
    houseNo: a.houseNo,
    street: `${a.houseNo || ''}, ${a.street || ''}${a.area ? ', ' + a.area : ''}`.replace(/^,\s*/, ''),
    area: a.area,
    landmark: a.landmark,
    city: a.city,
    district: a.district,
    state: a.state,
    country: a.country,
    pincode: a.pincode,
  });

  const handleApplyCoupon = async (codeOverride) => {
    const code = (codeOverride || couponCode).trim();
    if (!code) return;
    setCouponLoading(true); setCouponMessage('');
    try {
      const { data } = await api.post('/api/coupons/validate', { code, subtotal: cartTotal, cartItems: cart, userId: user?._id });
      if (!data.valid) { setCouponMessage(data.message || 'Invalid coupon'); setCouponMessageType('error'); setAppliedCoupon(null); return; }
      setAppliedCoupon({ ...data.coupon, discount: data.discount });
      setCouponCode(code);
      setCouponMessageType('success');
      setCouponMessage(`Coupon applied! You save ${fmt(data.discount)}`);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponMessage(err.response?.data?.message || 'Failed to validate coupon.');
      setCouponMessageType('error');
    } finally { setCouponLoading(false); }
  };

  const saveNewAddress = async () => {
    try {
      const { data } = await api.post('/api/addresses', { ...address, isDefault: setAsDefault });
      setSavedAddresses((prev) => [...prev.map((a) => ({ ...a, isDefault: false })), data]);
      setSelectedAddressId(data._id);
      setShowNewForm(false);
      setSetAsDefault(false);
      return data;
    } catch {
      return null;
    }
  };

  const setDefaultAddress = async (id) => {
    try {
      await api.patch(`/api/addresses/${id}/default`);
      setSavedAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a._id === id })));
      if (!selectedAddressId) setSelectedAddressId(id);
    } catch { /* ignore */ }
  };

  const deleteAddress = async (id, ev) => {
    ev.stopPropagation();
    try {
      await api.delete(`/api/addresses/${id}`);
      setSavedAddresses((p) => p.filter((x) => x._id !== id));
      if (selectedAddressId === id) setSelectedAddressId(null);
    } catch { /* ignore */ }
  };

  const selectedCard = PAYMENT_CATALOG.find((c) => c.key === paymentMethod);
  const backendMethod = selectedCard?.method || 'COD';
  const paymentFields = selectedCard?.fields || 'none';
  const isOnlinePayment = backendMethod !== 'COD';
  const upiValid = paymentFields === 'upi' ? isValidUpi(payment.upiId) : true;
  // Online payments require a valid UPI/account before the button is enabled.
  const payDisabled = isOnlinePayment && paymentFields === 'upi' && !upiValid;

  const subtotal = cartTotal;
  const discount = appliedCoupon?.discount || 0;
  const tax = Math.round(subtotal * 0.05);
  const shipping = shippingMethod === 'Express' ? 49 : (subtotal >= 499 ? 0 : 49);
  const grandTotal = Math.max(0, subtotal + tax + shipping - discount);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true); setError('');

    let shippingAddress = null;
    const selected = savedAddresses.find((a) => a._id === selectedAddressId);
    if (selected) {
      shippingAddress = addressToShipping(selected);
    } else {
      const aErr = validateAddressForm(address);
      setAddressErrors(aErr);
      if (Object.keys(aErr).length > 0) {
        setError('Please fix the highlighted address fields.');
        setLoading(false); return;
      }
      if (saveAddress) {
        const saved = await saveNewAddress();
        if (!saved) { setError('Could not save address. Please try again.'); setLoading(false); return; }
        shippingAddress = addressToShipping(saved);
      } else {
        shippingAddress = addressToShipping(address);
      }
    }

    const pErr = validatePaymentForm(paymentFields, payment);
    setPaymentErrors(pErr);
    if (Object.keys(pErr).length > 0) {
      setError('Please fix the highlighted payment fields.');
      setLoading(false); return;
    }

    try {
      setError('');

      // Simulate the UPI / online payment gateway (2–3s) before finalizing.
      // The backend is the source of truth for payment status — we only show
      // the animation here. If the UPI id is invalid we never reach this point.
      if (isOnlinePayment) {
        setProcessingPayment(true);
        await new Promise((r) => setTimeout(r, 2500));
      }

      const { data } = await api.post('/api/orders', {
        items: cart.map((item) => ({
          product: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.thumbnail || item.image || item.images?.[0]?.url || '',
        })),
        shippingAddress,
        paymentMethod: backendMethod,
        payment,
        shippingMethod,
        coupon: appliedCoupon ? { code: appliedCoupon.code } : undefined,
      });
      clearCart();
      setPlaced(true);
      showNotification('order');
      setTimeout(() => navigate(`/order-success/${data._id}`, { replace: true, state: { payment: data.payment } }), 1600);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || '';
      if (!err.response) {
        setError('Payment Failed. Network error — please check your connection and try again.');
      } else if (status === 409) {
        setError(msg || 'A recent order already exists. Please wait before placing another.');
      } else if (status === 400 && /UPI/i.test(msg)) {
        setError('Invalid UPI ID. Please check and try again.');
      } else {
        setError(msg || 'Payment could not be completed. Please try again.');
      }
    } finally {
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  if (cart.length === 0 && !placed) return null;

  if (placed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1] px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
            className="mx-auto mb-6 w-24 h-24 rounded-full bg-gradient-to-br from-[#2E5A44] to-[#A3C9A8] flex items-center justify-center shadow-xl shadow-[rgba(46,90,68,0.3)]"
          >
            <FiCheck size={48} className="text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-[#2E5A44] mb-2">Order Placed!</h2>
          <p className="text-gray-500">Thank you. Redirecting to confirmation…</p>
        </motion.div>
      </div>
    );
  }

  const catalog = enabledMethods
    ? PAYMENT_CATALOG.filter((c) => enabledMethods.includes(c.key))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1] py-8 px-4 sm:px-6 lg:py-12">
      <div className="max-w-6xl mx-auto">
        <BackButton to="/cart" label="Back to Cart" />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900">Checkout</h1>
          <p className="text-gray-500 text-sm mt-1">Complete your order for a greener tomorrow.</p>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6 lg:gap-8 items-start">
          {/* ---------------- LEFT COLUMN ---------------- */}
          <motion.form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-6">
            {/* Contact + Address */}
            <SectionCard icon={FiMapPin} title="Delivery Address" subtitle="Where should we send your order?" delay={0.05}>
              {savedAddresses.length > 0 && !showNewForm && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {savedAddresses.map((a) => (
                    <div role="button" tabIndex={0} key={a._id} onClick={() => setSelectedAddressId(a._id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedAddressId(a._id); } }}
                      aria-pressed={selectedAddressId === a._id}
                      className={`text-left rounded-2xl border p-4 transition-all relative cursor-pointer ${selectedAddressId === a._id ? 'border-[#2E5A44] ring-2 ring-[#2E5A44]/25 bg-[#2E5A44]/5' : 'border-gray-200 bg-white/60 hover:border-[#2E5A44]/40'}`}>
                      <div className="flex items-start gap-2">
                        <FiHome size={18} className="text-[#2E5A44] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm text-gray-900 truncate">{a.fullName}</strong>
                            {a.isDefault && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#2E5A44]/10 text-[#2E5A44]">Default</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 leading-snug">{a.houseNo}, {a.street}{a.area ? ', ' + a.area : ''}</p>
                          <p className="text-xs text-gray-500">{a.city}, {a.state} - {a.pincode}</p>
                          <p className="text-xs text-gray-400 mt-0.5">📞 {a.mobile}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button type="button" onClick={(ev) => deleteAddress(a._id, ev)} aria-label="Delete address" className="p-2 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <FiTrash2 size={14} />
                          </button>
                          {!a.isDefault && (
                            <div className="flex items-center gap-1.5" onClick={(ev) => ev.stopPropagation()}>
                              <span className="text-[10px] text-gray-400">Default</span>
                              <Toggle checked={false} onChange={() => setDefaultAddress(a._id)} label="Set as default" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button type="button" onClick={() => { setShowNewForm((v) => !v); setSelectedAddressId(null); }}
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2E5A44] hover:underline">
                <FiPlus size={15} /> {showNewForm ? 'Cancel' : 'Add a new address'}
              </button>

              {(showNewForm || savedAddresses.length === 0) && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Contact</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FloatingField label="Full Name" name="fullName" value={address.fullName} onChange={handleChange} error={addressErrors.fullName} icon={FiUser} autoComplete="name" required inputRef={firstFieldRef} />
                      <FloatingField label="Mobile Number" name="mobile" value={address.mobile} onChange={handleChange} error={addressErrors.mobile} icon={FiPhone} autoComplete="tel" required inputMode="numeric" maxLength={10} />
                      <div className="sm:col-span-2">
                        <FloatingField label="Email (optional)" name="email" value={address.email} onChange={handleChange} error={addressErrors.email} icon={FiMail} autoComplete="email" inputMode="email" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Address</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FloatingField label="House / Flat Number" name="houseNo" value={address.houseNo} onChange={handleChange} error={addressErrors.houseNo} icon={FiHome} required />
                      <FloatingField label="Street Address" name="street" value={address.street} onChange={handleChange} error={addressErrors.street} required />
                      <FloatingField label="Area / Locality (optional)" name="area" value={address.area} onChange={handleChange} error={addressErrors.area} />
                      <FloatingField label="Landmark (optional)" name="landmark" value={address.landmark} onChange={handleChange} error={addressErrors.landmark} />
                      <FloatingField label="City" name="city" value={address.city} onChange={handleChange} error={addressErrors.city} required />
                      <FloatingField label="District (optional)" name="district" value={address.district} onChange={handleChange} error={addressErrors.district} />
                      <FloatingField label="State" name="state" value={address.state} onChange={handleChange} error={addressErrors.state} required />
                      <FloatingField label="PIN Code" name="pincode" value={address.pincode} onChange={handleChange} error={addressErrors.pincode} required inputMode="numeric" maxLength={6} />
                      <div className="sm:col-span-2">
                        <FloatingSelect label="Country" name="country" value={address.country} onChange={handleChange} error={addressErrors.country} icon={FiNavigation} options={['India']} required />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-5 pt-1">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="w-4 h-4 accent-[#2E5A44]" />
                      Save this address
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input type="checkbox" checked={setAsDefault} onChange={(e) => setSetAsDefault(e.target.checked)} className="w-4 h-4 accent-[#2E5A44]" />
                      Set as default address
                    </label>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Shipping method */}
            <SectionCard icon={FiTruck} title="Shipping Method" subtitle="Choose your delivery speed" delay={0.1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'Standard', title: 'Standard Delivery', eta: '5 – 7 business days', price: subtotal >= 499 ? 0 : 49, icon: <FiTruck size={20} /> },
                  { id: 'Express', title: 'Express Delivery', eta: '1 – 2 business days', price: 49, icon: <FiZap size={20} /> },
                ].map((opt) => {
                  const active = shippingMethod === opt.id;
                  return (
                    <motion.button type="button" key={opt.id} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                      onClick={() => setShippingMethod(opt.id)} aria-pressed={active}
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${active ? 'border-[#2E5A44] ring-2 ring-[#2E5A44]/25 bg-[#2E5A44]/5' : 'border-gray-200 bg-white/60 hover:border-[#2E5A44]/40'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-[#2E5A44] text-white' : 'bg-gray-100 text-gray-500'}`}>{opt.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{opt.title}</p>
                        <p className="text-xs text-gray-500">{opt.eta}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-800">{opt.price === 0 ? 'Free' : fmt(opt.price)}</span>
                      {active && <FiCheck className="text-[#2E5A44]" size={18} />}
                    </motion.button>
                  );
                })}
              </div>
            </SectionCard>

            {/* Payment method */}
            <SectionCard icon={FiCreditCard} title="Payment Method" subtitle="All transactions are secure and encrypted" delay={0.15}>
              {enabledMethods === null ? (
                <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
              ) : catalog.length === 0 ? (
                <p className="text-sm text-gray-500">No payment methods are available right now. Please contact support.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catalog.map((pm) => {
                    const active = paymentMethod === pm.key;
                    return (
                      <motion.button type="button" key={pm.key} whileHover={{ scale: 1.025, y: -2 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { setPaymentMethod(pm.key); setPaymentErrors({}); }}
                        aria-pressed={active}
                        className={`relative flex items-center gap-3 rounded-2xl border p-4 text-left transition-all overflow-hidden ${active ? 'border-[#2E5A44] ring-2 ring-[#2E5A44]/25 bg-[#2E5A44]/5' : 'border-gray-200 bg-white/60 hover:border-[#2E5A44]/40'}`}>
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-[#2E5A44] text-white' : 'bg-gray-100 text-gray-600'}`}>{pm.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{pm.label}</p>
                          <p className="text-xs text-gray-500 truncate">{pm.desc}</p>
                          {pm.gateway && <span className="mt-1 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Secured by {pm.gateway}</span>}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-[#2E5A44] bg-[#2E5A44]' : 'border-gray-300'}`}>
                          {active && <FiCheck size={12} className="text-white" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Payment details */}
              <AnimatePresence mode="wait">
                {paymentFields === 'card' && (
                  <motion.div key="card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <FloatingField label="Card Number" name="cardNumber" value={payment.cardNumber} onChange={handlePaymentChange} error={paymentErrors.cardNumber} icon={FiCreditCard} inputMode="numeric" maxLength={16} />
                      </div>
                      <div className="sm:col-span-2">
                        <FloatingField label="Card Holder Name" name="cardHolder" value={payment.cardHolder} onChange={handlePaymentChange} error={paymentErrors.cardHolder} icon={FiUser} autoComplete="cc-name" />
                      </div>
                      <FloatingField label="Expiry (MM/YY)" name="expiry" value={payment.expiry} onChange={handlePaymentChange} error={paymentErrors.expiry} icon={FiEdit3} inputMode="numeric" maxLength={5} />
                      <FloatingField label="CVV" name="cvv" value={payment.cvv} onChange={handlePaymentChange} error={paymentErrors.cvv} icon={FiLock} type="password" inputMode="numeric" maxLength={4} />
                    </div>
                  </motion.div>
                )}
                {paymentFields === 'upi' && (
                  <motion.div key="upi" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-4">
                      <FloatingField label="UPI ID" name="upiId" value={payment.upiId} onChange={handlePaymentChange} error={paymentErrors.upiId} icon={FiSmartphone} placeholder="name@ybl" inputMode="text" />
                      {payment.upiId && !upiValid && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-rose-500">❌ Invalid UPI ID</p>
                      )}
                      {upiValid && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600">✅ Valid UPI ID</p>
                      )}
                    </div>
                  </motion.div>
                )}
                {paymentFields === 'bank' && (
                  <motion.div key="bank" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-4">
                      <FloatingSelect label="Select Bank" name="bank" value={payment.bank} onChange={handlePaymentChange} error={paymentErrors.bank} icon={FiBriefcase} options={BANKS} />
                    </div>
                  </motion.div>
                )}
                {paymentFields === 'none' && (
                  <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                    <FiShield size={16} className="text-[#2E5A44]" /> No extra details needed. Pay securely on delivery.
                  </motion.p>
                )}
              </AnimatePresence>
            </SectionCard>
          </motion.form>

          {/* ---------------- RIGHT COLUMN (SUMMARY) ---------------- */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_10px_40px_-12px_rgba(46,90,68,0.18)] p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item._id} className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                      <img src={item.thumbnail || item.image || item.images?.[0]?.url || 'https://via.placeholder.com/80'} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#2E5A44] text-white text-[10px] font-bold flex items-center justify-center">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.size ? `Size: ${item.size} · ` : ''}{fmt(item.price)} each</p>
                    </div>
                    <span className="text-sm font-bold text-gray-800">{fmt(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-gray-200/70 my-4" />

              {/* Coupon */}
              <div className="rounded-xl border border-gray-200 bg-white/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FiTag className="text-[#2E5A44]" size={16} />
                  <span className="text-sm font-semibold text-gray-800">Have a coupon?</span>
                </div>
                <div className="flex gap-2">
                  <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter code" aria-label="Coupon code"
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2E5A44] focus:ring-2 focus:ring-[#2E5A44]/15" />
                  <button type="button" onClick={() => handleApplyCoupon()} disabled={couponLoading}
                    className="rounded-lg bg-[#2E5A44] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244a36] transition disabled:opacity-60">
                    {couponLoading ? '…' : 'Apply'}
                  </button>
                </div>
                {couponMessage && <p className={`mt-2 text-xs ${couponMessageType === 'error' ? 'text-rose-500' : 'text-[#2E5A44]'}`}>{couponMessage}</p>}
                {activeCoupons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeCoupons.slice(0, 4).map((c) => (
                      <button key={c._id} type="button" onClick={() => handleApplyCoupon(c.code)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-dashed border-[#2E5A44]/40 text-[#2E5A44] hover:bg-[#2E5A44]/5 transition">
                        {c.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-gray-200/70 my-4" />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#2E5A44] font-medium"><span>Coupon ({appliedCoupon?.code})</span><span>- {fmt(discount)}</span></div>
                )}
                <div className="flex justify-between text-gray-600"><span>Tax (GST 5%)</span><span>{fmt(tax)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Delivery ({shippingMethod})</span><span>{shipping === 0 ? 'Free' : fmt(shipping)}</span></div>
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-200">
                  <span className="text-base font-bold text-gray-900">Grand Total</span>
                  <motion.span key={grandTotal} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-xl font-extrabold text-[#2E5A44]">{fmt(grandTotal)}</motion.span>
                </div>
              </div>

              <motion.button type="submit" form="checkout-form" disabled={loading || processingPayment || payDisabled}
                whileHover={{ scale: loading || payDisabled ? 1 : 1.01 }} whileTap={{ scale: 0.98 }}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2E5A44] to-[#1f3d2e] px-6 py-3.5 text-white font-semibold text-sm shadow-lg shadow-[#2E5A44]/25 hover:shadow-xl transition-all disabled:opacity-70">
                {processingPayment ? (
                  <span className="flex items-center justify-center gap-2"><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing Payment…</span>
                ) : loading ? (
                  'Placing Order…'
                ) : payDisabled ? (
                  <>Enter a valid UPI ID to pay</>
                ) : isOnlinePayment ? (
                  <>Pay Now · ₹{fmt(grandTotal)} <FiArrowRight size={16} /></>
                ) : (
                  <>Place Order {selectedCard ? `· ${selectedCard.label}` : ''} <FiArrowRight size={16} /></>
                )}
              </motion.button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                <FiLock size={12} /> Secured checkout · 100% buyer protection
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
