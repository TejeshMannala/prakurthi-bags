import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiPackage, FiCheck, FiTruck, FiMapPin, FiBox, FiClock, FiShoppingBag,
  FiAlertTriangle, FiCreditCard, FiCopy, FiCheckCircle, FiArrowRight,
} from 'react-icons/fi';
import api from '../utils/axios';
import BackButton from '../components/BackButton';
import OrderStatusBadge from '../components/OrderStatusBadge';
import DeliveryMap from '../components/DeliveryMap';
import { onRealtime } from '../utils/realtime';

const STATUS_FLOW = [
  { key: 'Processing', label: 'Order Placed', icon: <FiPackage size={18} />, desc: 'Your order has been placed successfully' },
  { key: 'Confirmed', label: 'Confirmed', icon: <FiCheck size={18} />, desc: 'Your order has been confirmed' },
  { key: 'Packed', label: 'Packed', icon: <FiBox size={18} />, desc: 'Your items are being packed' },
  { key: 'Shipped', label: 'Shipped', icon: <FiTruck size={18} />, desc: 'Your package is on its way' },
  { key: 'Out For Delivery', label: 'Out For Delivery', icon: <FiMapPin size={18} />, desc: 'Delivery partner is heading to you' },
  { key: 'Delivered', label: 'Delivered', icon: <FiCheck size={18} />, desc: 'Your package has been delivered' },
  { key: 'Cancelled', label: 'Cancelled', icon: <FiAlertTriangle size={18} />, desc: 'This order has been cancelled' },
];

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [store, setStore] = useState(null);

  useEffect(() => {
    if (!id) { navigate('/profile'); return; }
    api.get(`/api/orders/track/${id}`)
      .then(({ data }) => setOrder(data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load tracking.'))
      .finally(() => setLoading(false));
    api.get('/api/settings/payment-methods').then(({ data }) => setStore(data)).catch(() => {});
  }, [id, navigate]);

  // Real-time: refresh tracking the moment the admin updates the status.
  useEffect(() => {
    const off = onRealtime('order:updated', (data) => {
      if (data && (data._id === id || data.orderId === order?.orderId)) {
        setLoading(true);
        api.get(`/api/orders/track/${id}`)
          .then(({ data }) => setOrder(data))
          .catch(() => {})
          .finally(() => setLoading(false));
      }
    });
    return off;
  }, [id, order?.orderId]);

  const copyOrderId = () => {
    if (order?.orderId) {
      navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <FiAlertTriangle size={28} className="text-red-400" />
          </div>
          <p className="text-red-500 font-medium mb-6">{error}</p>
          <BackButton to="/profile" label="Back to Orders" />
        </div>
      </div>
    );
  }

  const currentStatus = order?.orderStatus || 'Processing';
  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === currentStatus);
  const isCancelled = currentStatus === 'Cancelled';
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

  const progressPercent = isCancelled ? 0 : Math.round(((currentIdx + 1) / 6) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1] py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <BackButton to="/profile" label="Back to Orders" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-1">Track Order</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="font-mono font-semibold text-gray-700">{order?.orderId || `#${order?._id?.slice(-8).toUpperCase()}`}</span>
              <button onClick={copyOrderId} aria-label="Copy order ID"
                className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all">
                {copied ? <FiCheckCircle size={14} className="text-green-500" /> : <FiCopy size={14} />}
              </button>
              <span className="text-gray-300">|</span>
              <span>{formatDate(order?.createdAt)}</span>
            </div>
          </div>
          <OrderStatusBadge status={currentStatus} size="lg" pulse={!isCancelled && currentStatus !== 'Delivered'} />
        </motion.div>

        {order?.estimatedDelivery && !isCancelled && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex items-center gap-4 p-5 bg-gradient-to-r from-[#f0fdf4] to-[#ecfdf5] rounded-2xl border border-[rgba(46,90,68,0.1)] mb-6">
            <div className="w-12 h-12 rounded-full bg-[rgba(46,90,68,0.1)] flex items-center justify-center flex-shrink-0">
              <FiClock size={22} className="text-[#2E5A44]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Estimated Delivery</p>
              <p className="text-lg font-bold text-[#2E5A44]">
                {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </motion.div>
        )}

        {/* Delivery map */}
        {!isCancelled && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiMapPin size={18} className="text-[#2E5A44]" /> Live Delivery Route</h3>
              <Link to={`/orders/${order._id}`} className="text-xs font-semibold text-[#2E5A44] hover:underline">Order details</Link>
            </div>
            <DeliveryMap storeAddress={store?.storeLocation?.address} estimatedDelivery={order?.estimatedDelivery} status={currentStatus} />
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Payment', value: order?.paymentMethod || 'COD' },
            { label: 'Payment Status', value: order?.paymentStatus || 'Pending', color: order?.paymentStatus === 'Paid' ? '#10B981' : '#F59E0B' },
            { label: 'Total', value: `₹${(order?.totalPrice || 0).toLocaleString()}`, color: '#1a1a1a', bold: true },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className="font-semibold" style={{ color: item.color || '#374151', fontWeight: item.bold ? 700 : 600 }}>{item.value}</p>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FiTruck size={20} className="text-[#2E5A44]" /> Order Progress
          </h2>

          {!isCancelled && (
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-[#2E5A44] to-[#A3C9A8] rounded-full" />
              </div>
            </div>
          )}

          <div className="relative pl-10">
            <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-gray-200" />
            {STATUS_FLOW.map((step, idx) => {
              const isDone = idx <= currentIdx;
              const isActive = idx === currentIdx;
              return (
                <motion.div key={step.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className={`relative pb-8 ${idx === STATUS_FLOW.length - 1 ? 'pb-0' : ''}`}>
                  <motion.div animate={isActive && !isCancelled ? { scale: [1, 1.3, 1], boxShadow: ['0 0 0 0 rgba(46,90,68,0.4)', '0 0 0 15px rgba(46,90,68,0)'] } : {}}
                    transition={{ duration: 2, repeat: isActive && !isCancelled ? Infinity : 0 }}
                    className={`absolute -left-[25px] top-0 w-[34px] h-[34px] rounded-full flex items-center justify-center z-10 text-sm ${isDone ? 'bg-[#2E5A44] text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {isDone || isActive ? step.icon : idx + 1}
                  </motion.div>
                  <div className="pl-6">
                    <p className={`font-semibold text-sm ${isDone ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
                    <p className={`text-xs mt-0.5 ${isDone ? 'text-gray-500' : 'text-gray-300'}`}>
                      {isActive ? 'In progress…' : step.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {order?.shippingAddress && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiMapPin size={18} className="text-[#2E5A44]" /> Shipping Address
            </h3>
            <p className="text-sm text-gray-600">{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.zip || order.shippingAddress.pincode}</p>
          </motion.div>
        )}

        {order?.products?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <h3 className="font-bold text-gray-800 mb-4">Products ({order.products.length})</h3>
            <div className="space-y-3">
              {order.products.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  {item.image && <img src={item.image} alt={item.name} loading="lazy" className="w-14 h-14 rounded-lg object-cover bg-white" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity} × ₹{item.price?.toLocaleString()}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800">₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{(order.subtotal || 0).toLocaleString()}</span></div>
              {order.coupon?.discount > 0 && (
                <div className="flex justify-between text-green-600"><span>Coupon ({order.coupon.code})</span><span>-₹{order.coupon.discount.toLocaleString()}</span></div>
              )}
              <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{order.shipping === 0 ? 'Free' : `₹${order.shipping}`}</span></div>
              <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-gray-100"><span>Total</span><span>₹{(order.totalPrice || 0).toLocaleString()}</span></div>
            </div>
          </motion.div>
        )}

        <div className="flex gap-3 flex-wrap">
          <Link to="/products" className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2E5A44] to-[#1f3d2e] text-white rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all min-w-[180px]">
            <FiShoppingBag size={16} /> Continue Shopping
          </Link>
          {order.orderStatus === 'Delivered' && (
            <Link to={`/orders/${order._id}`} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-[#2E5A44] text-[#2E5A44] rounded-xl font-medium text-sm hover:bg-[#2E5A44] hover:text-white transition-all min-w-[180px]">
              View Order <FiArrowRight size={16} />
            </Link>
          )}
          <Link to="/profile" className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:border-[#2E5A44] hover:text-[#2E5A44] transition-all min-w-[180px]">
            View All Orders <FiArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
