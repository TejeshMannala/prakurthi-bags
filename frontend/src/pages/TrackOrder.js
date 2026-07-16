import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiPackage, FiCheck, FiTruck, FiMapPin, FiBox, FiClock, FiShoppingBag, FiAlertTriangle, FiAlertCircle, FiCopy, FiCheckCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import api from '../utils/axios';

const STATUS_FLOW = [
  { key: 'Processing', label: 'Order Placed', icon: <FiPackage size={18} />, desc: 'Your order has been placed successfully' },
  { key: 'Confirmed', label: 'Confirmed', icon: <FiCheck size={18} />, desc: 'Your order has been confirmed' },
  { key: 'Packed', label: 'Packed', icon: <FiBox size={18} />, desc: 'Your items are being packed' },
  { key: 'Shipped', label: 'Shipped', icon: <FiTruck size={18} />, desc: 'Your package is on its way' },
  { key: 'Out For Delivery', label: 'Out For Delivery', icon: <FiMapPin size={18} />, desc: 'Delivery partner is heading to you' },
  { key: 'Delivered', label: 'Delivered', icon: <FiCheck size={18} />, desc: 'Your package has been delivered' },
  { key: 'Cancelled', label: 'Cancelled', icon: <FiAlertTriangle size={18} />, desc: 'This order has been cancelled' },
];

const TrackOrder = () => {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const { data } = await api.post('/api/orders/track', { orderId: orderId.trim() });
      setOrder(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Order not found. Please check the ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = order?.orderStatus || 'Processing';
  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === currentStatus);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const copyOrderId = () => {
    if (order?.orderId) {
      navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1] py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[rgba(46,90,68,0.08)] flex items-center justify-center">
            <FiPackage size={28} className="text-[#2E5A44]" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 font-serif mb-2">Track Your Order</h1>
          <p className="text-gray-500 max-w-md mx-auto">Enter your Order ID (e.g., ORD-20260709-123456) to see the latest status.</p>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          onSubmit={handleTrack} className="max-w-lg mx-auto mb-10">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input type="text" placeholder="Enter Order ID (e.g., ORD-20260709-458721)"
                value={orderId} onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-xl focus:border-[#2E5A44] focus:ring-2 focus:ring-[rgba(46,90,68,0.1)] outline-none text-sm font-mono transition-all bg-white" />
            </div>
            <button type="submit" disabled={loading || !orderId.trim()}
              className="px-6 py-3.5 bg-gradient-to-r from-[#2E5A44] to-[#1f3d2e] text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center gap-2">
              {loading ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Tracking...</span> : <><FiSearch size={16} /> Track</>}
            </button>
          </div>
        </motion.form>

        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto mb-8 p-6 bg-white rounded-2xl border border-red-100 shadow-sm text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <FiAlertCircle size={28} className="text-red-400" />
            </div>
            <p className="text-red-500 font-medium mb-1">Order Not Found</p>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-500 mb-1">Tip:</p>
              <p>Order IDs follow the format: <span className="font-mono font-semibold text-gray-600">ORD-YYYYMMDD-XXXXXX</span></p>
              <p className="mt-1">Check your order confirmation email or receipt for the correct ID.</p>
            </div>
          </motion.div>
        )}

        {order && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Order ID</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-800 font-mono">{order?.orderId || `#${order?._id?.slice(-8).toUpperCase()}`}</span>
                    <button onClick={copyOrderId}
                      className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all">
                      {copied ? <FiCheckCircle size={14} className="text-green-500" /> : <FiCopy size={14} />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Order Date</p>
                  <p className="text-sm font-semibold text-gray-700">{formatDate(order.createdAt)}</p>
                </div>
              </div>

              {order.estimatedDelivery && (
                <div className="flex items-center gap-3 p-4 bg-[rgba(46,90,68,0.06)] rounded-xl mb-6">
                  <FiClock size={20} className="text-[#2E5A44]" />
                  <div>
                    <p className="text-xs text-gray-500">Estimated Delivery</p>
                    <p className="font-bold text-[#2E5A44]">{new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-400 mb-0.5">Payment</p><p className="text-sm font-semibold">{order.paymentMethod || 'COD'}</p></div>
                <div className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-400 mb-0.5">Status</p><p className="text-sm font-semibold" style={{ color: order.paymentStatus === 'Paid' ? '#10B981' : '#F59E0B' }}>{order.paymentStatus || 'Pending'}</p></div>
                <div className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-400 mb-0.5">Total</p><p className="text-sm font-bold">₹{(order.totalPrice || 0).toLocaleString()}</p></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><FiTruck size={20} className="text-[#2E5A44]" /> Order Progress</h2>

              <div className="relative pl-10">
                <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-gray-200" />
                {STATUS_FLOW.map((step, idx) => {
                  const isDone = idx <= currentIdx;
                  const isActive = idx === currentIdx;
                  return (
                    <div key={step.key} className={`relative pb-7 ${idx === STATUS_FLOW.length - 1 ? 'pb-0' : ''}`}>
                      <div className={`absolute -left-[25px] top-0 w-[34px] h-[34px] rounded-full flex items-center justify-center z-10 text-sm ${
                        isDone ? 'bg-[#2E5A44] text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isDone || isActive ? step.icon : idx + 1}
                      </div>
                      <div className="pl-6">
                        <p className={`font-semibold text-sm ${isDone ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
                        <p className={`text-xs mt-0.5 ${isDone ? 'text-gray-500' : 'text-gray-300'}`}>{isActive ? 'In progress...' : step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 mt-6 flex-wrap">
              <Link to="/products" className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2E5A44] to-[#1f3d2e] text-white rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all min-w-[180px]">
                <FiShoppingBag size={16} /> Continue Shopping
              </Link>
              {order.user && (
                <Link to={`/order-tracking/${order._id}`} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:border-[#2E5A44] hover:text-[#2E5A44] transition-all min-w-[180px]">
                  Detailed View
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
