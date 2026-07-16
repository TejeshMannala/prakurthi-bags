import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheck, FiPackage, FiTruck, FiMapPin, FiDownload, FiArrowRight, FiClock, FiCreditCard, FiCopy, FiCheckCircle, FiChevronRight, FiDollarSign } from 'react-icons/fi';
import api from '../utils/axios';
import OrderStatusBadge from '../components/OrderStatusBadge';

const ConfettiEffect = () => {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    const colors = ['#D4A853', '#2E5A44', '#A3C9A8', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6'];
    setParticles(Array.from({ length: 60 }, (_, i) => ({
      id: i, x: Math.random() * 100, delay: Math.random() * 2,
      duration: 2 + Math.random() * 3, color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 10, rotation: Math.random() * 360,
    })));
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {particles.map((p) => (
        <motion.div key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', opacity: 0, rotate: p.rotation * 4 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{ position: 'absolute', width: p.size, height: p.size, background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : '2px' }} />
      ))}
    </div>
  );
};

const OrderSuccess = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) { navigate('/profile'); return; }
    api.get(`/api/orders/track/${id}`)
      .then(({ data }) => setOrder(data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load order.'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const copyOrderId = () => {
    if (order?.orderId) {
      navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadInvoice = () => {
    if (!order) return;
    const invoice = `
PRAKRUTHI BAGS - INVOICE
========================
Order ID: ${order.orderId || order._id}
Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}
Payment: ${order.paymentMethod || 'COD'}
Status: ${order.orderStatus}

Items:
${(order.products || order.orderItems || []).map((item) =>
  `  ${item.name} x${item.quantity} - ₹${(item.price * item.quantity).toLocaleString()}`
).join('\n')}

Subtotal: ₹${(order.subtotal || 0).toLocaleString()}
Shipping: ₹${(order.shipping || 0).toLocaleString()}
Tax: ₹${(order.tax || 0).toLocaleString()}
${order.coupon?.discount ? `Discount: -₹${order.coupon.discount.toLocaleString()}` : ''}
Total: ₹${(order.totalPrice || 0).toLocaleString()}

Shipping Address:
${order.shippingAddress?.street || ''}
${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}
${order.shippingAddress?.zip || ''}

Thank you for your purchase!
    `.trim();
    const blob = new Blob([invoice], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${order.orderId || order._id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 p-8">{error}</div>;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <>
      <ConfettiEffect />
      <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1] py-10 px-6">
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-24 h-24 rounded-full mx-auto mb-6 bg-gradient-to-br from-[#2E5A44] to-[#A3C9A8] flex items-center justify-center shadow-xl shadow-[rgba(46,90,68,0.3)]">
            <FiCheck size={48} color="#fff" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="text-3xl lg:text-4xl font-bold text-[#2E5A44] mb-2">Order Confirmed!</motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="flex justify-center">
            <OrderStatusBadge status={order?.orderStatus || 'Processing'} size="lg" pulse />
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-gray-500">Thank you for your purchase. You're making the planet greener.</motion.p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="max-w-xl mx-auto bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Order ID</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800 font-mono">{order?.orderId || `#${order?._id?.slice(-8).toUpperCase()}`}</span>
                <button onClick={copyOrderId}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all">
                  {copied ? <FiCheckCircle size={16} className="text-green-500" /> : <FiCopy size={16} />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Order Date</p>
              <p className="text-sm font-semibold text-gray-700">{formatDate(order?.createdAt)}</p>
            </div>
          </div>

          <div className="h-px bg-gray-100 mb-6" />

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-[rgba(46,90,68,0.06)] rounded-xl">
              <div className="w-10 h-10 rounded-full bg-[rgba(46,90,68,0.1)] flex items-center justify-center flex-shrink-0">
                <FiClock size={18} className="text-[#2E5A44]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Estimated Delivery</p>
                <p className="font-semibold text-[#2E5A44]">{order?.estimatedDelivery ? formatDate(order.estimatedDelivery) : '7-10 business days'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center flex-shrink-0">
                <FiDollarSign size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount Paid</p>
                <p className="font-semibold text-gray-800">{order?.totalPrice ? `₹${Number(order.totalPrice).toLocaleString('en-IN')}` : '—'}</p>
              </div>
            </div>

            {order?.payment && (
              <div className="p-4 bg-[rgba(46,90,68,0.06)] rounded-xl space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <FiCheckCircle size={16} className="text-[#2E5A44]" />
                  <p className="text-sm font-bold text-[#2E5A44]">Payment Successful</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-[11px] text-gray-500">Payment ID</p>
                    <p className="font-medium text-gray-800 break-all">{order.payment.paymentId}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Transaction ID</p>
                    <p className="font-medium text-gray-800 break-all">{order.payment.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Date</p>
                    <p className="font-medium text-gray-800">{order.payment.paidAt ? new Date(order.payment.paidAt).toLocaleDateString('en-IN') : formatDate(order?.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Time</p>
                    <p className="font-medium text-gray-800">{order.payment.paidAt ? new Date(order.payment.paidAt).toLocaleTimeString('en-IN') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Amount</p>
                    <p className="font-medium text-gray-800">₹{Number(order.payment.amount || order.totalPrice || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">UPI ID</p>
                    <p className="font-medium text-gray-800 break-all">{order.payment.upiId || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <FiCreditCard size={18} className="text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="font-semibold text-gray-800">{order?.paymentMethod || 'COD'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <FiMapPin size={18} className="text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Shipping Address</p>
                <p className="text-sm text-gray-700">{order?.shippingAddress?.street}, {order?.shippingAddress?.city}, {order?.shippingAddress?.state} - {order?.shippingAddress?.zip || order?.shippingAddress?.pincode}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <Link to={`/order-tracking/${order?._id}`}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#2E5A44] to-[#1f3d2e] text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all">
              <FiTruck size={18} /> Track Order <FiChevronRight size={16} />
            </Link>
            <Link to="/profile"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:border-[#2E5A44] hover:text-[#2E5A44] transition-all">
              <FiPackage size={16} /> View Orders
            </Link>
            <button onClick={downloadInvoice}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:border-[#2E5A44] hover:text-[#2E5A44] transition-all">
              <FiDownload size={16} /> Download Invoice
            </button>
            <Link to="/products"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-500 hover:text-[#2E5A44] rounded-xl font-medium text-sm transition-all">
              Continue Shopping <FiArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default OrderSuccess;
