import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiPackage, FiMapPin, FiShoppingBag, FiCreditCard, FiCopy, FiCheckCircle, FiAlertTriangle,
  FiStar, FiCheck, FiXCircle,
} from 'react-icons/fi';
import api from '../utils/axios';
import BackButton from '../components/BackButton';
import OrderStatusBadge from '../components/OrderStatusBadge';
import ReviewModal from '../components/ReviewModal';
import { onRealtime } from '../utils/realtime';

const CANCELABLE = ['Pending', 'Processing', 'Confirmed'];

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadOrder = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/api/orders/${id}`)
      .then(({ data }) => setOrder(data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load order details.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Real-time: refresh the order the moment its status changes (admin update,
  // cancellation, delivery, etc.) without a manual refresh.
  useEffect(() => {
    const off = onRealtime('order:updated', (data) => {
      if (data && (data._id === id || data.orderId === order?.orderId)) {
        loadOrder();
      }
    });
    return off;
  }, [id, order?.orderId, loadOrder]);

  const cancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      await api.post(`/api/orders/${id}/cancel`);
      loadOrder();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  const copyOrderId = () => {
    if (order?.orderId) {
      navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

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

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1] py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <BackButton to="/profile" label="Back to Orders" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap items-end justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-1">Order Details</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="font-mono font-semibold text-gray-700">
                {order?.orderId || `#${order?._id?.slice(-8).toUpperCase()}`}
              </span>
              <button
                onClick={copyOrderId}
                aria-label="Copy order ID"
                className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all"
              >
                {copied ? <FiCheckCircle size={14} className="text-green-500" /> : <FiCopy size={14} />}
              </button>
              <span className="text-gray-300">|</span>
              <span>{formatDate(order?.createdAt)}</span>
            </div>
          </div>
          <OrderStatusBadge status={order?.orderStatus || 'Processing'} size="lg" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          {[
            { label: 'Payment', value: order?.paymentMethod || 'COD' },
            {
              label: 'Payment Status',
              value: order?.paymentStatus || 'Pending',
              color: order?.paymentStatus === 'Paid' ? '#10B981' : '#F59E0B',
            },
            { label: 'Total', value: `₹${(order?.totalPrice || 0).toLocaleString()}`, color: '#1a1a1a', bold: true },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className="font-semibold" style={{ color: item.color || '#374151', fontWeight: item.bold ? 700 : 600 }}>
                {item.value}
              </p>
            </div>
          ))}
        </motion.div>

        {order?.shippingAddress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6"
          >
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiMapPin size={18} className="text-[#2E5A44]" /> Shipping Address
            </h3>
            <p className="text-sm text-gray-600">
              {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.zip || order.shippingAddress.pincode}
            </p>
          </motion.div>
        )}

        {order?.products?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6"
          >
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiPackage size={18} className="text-[#2E5A44]" /> Products ({order.products.length})
            </h3>
            <div className="space-y-3">
              {order.products.map((item, i) => {
                const pid = item.product?._id || item.product;
                const reviewed = !!item.reviewed;
                const delivered = order.orderStatus === 'Delivered';
                const canReview = delivered && !reviewed;
                return (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          className="w-14 h-14 rounded-lg object-cover bg-white"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">Qty: {item.quantity} × ₹{item.price?.toLocaleString()}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-800">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>

                    <div className="mt-3 pl-[72px]">
                      {canReview ? (
                        <button
                          onClick={() => setReviewModal({ _id: pid, name: item.name, image: item.image })}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#2E5A44] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#244a38]"
                        >
                          <FiStar size={13} /> Write Review
                        </button>
                      ) : reviewed ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-4 py-2 text-xs font-semibold text-green-700">
                          <FiCheck size={13} strokeWidth={3} /> Already Reviewed
                        </span>
                      ) : (
                        <p className="text-xs text-gray-400">You can review this product after delivery.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>₹{(order.subtotal || 0).toLocaleString()}</span>
              </div>
              {order.coupon?.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon ({order.coupon.code})</span>
                  <span>-₹{order.coupon.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span>{order.shipping === 0 ? 'Free' : `₹${order.shipping}`}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>₹{(order.totalPrice || 0).toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex gap-3 flex-wrap">
          <Link
            to="/products"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2E5A44] to-[#1f3d2e] text-white rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all min-w-[180px]"
          >
            <FiShoppingBag size={16} /> Continue Shopping
          </Link>
          <Link
            to="/profile"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:border-[#2E5A44] hover:text-[#2E5A44] transition-all min-w-[180px]"
          >
            View All Orders
          </Link>
          {order && CANCELABLE.includes(order.orderStatus) && (
            <button
              onClick={cancelOrder}
              disabled={cancelling}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl font-medium text-sm hover:border-red-400 hover:bg-red-50 transition-all min-w-[180px] disabled:opacity-50"
            >
              <FiXCircle size={16} /> {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      <ReviewModal
        open={!!reviewModal}
        onClose={() => setReviewModal(null)}
        product={reviewModal}
        canWrite={!!reviewModal}
        onSuccess={() => { setReviewModal(null); loadOrder(); }}
      />
    </div>
  );
};

export default OrderDetails;
