import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiPackage, FiClock, FiCheck, FiX, FiInbox, FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import api from '../utils/axios';

const statusColors = { pending: { bg: '#fef3c7', color: '#92400e' }, approved: { bg: '#dbeafe', color: '#1e40af' }, rejected: { bg: '#fef2f2', color: '#991b1b' }, picked_up: { bg: '#f3e8ff', color: '#6b21a8' }, received: { bg: '#ecfdf5', color: '#065f46' }, refunded: { bg: '#d1fae5', color: '#065f46' } };

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ orderId: '', reason: '', item: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/returns/my').then((res) => setReturns(Array.isArray(res.data) ? res.data : [])),
      api.get('/api/orders/myorders?status=Delivered').then((res) => {
        const orders = res.data?.orders || res.data || [];
        setDeliveredOrders(Array.isArray(orders) ? orders : []);
      }),
    ])
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/returns', form);
      setReturns((prev) => [data, ...prev]);
      setShowForm(false);
      setForm({ orderId: '', reason: '', item: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create return request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (<div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}><div className="spinner" /></div>);
  }

  return (
    <div className="container" style={{ padding: '60px 24px', maxWidth: 900, margin: '0 auto' }}>
      <BackButton />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#2E5A44', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <FiRefreshCw /> Returns & Exchanges
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15 }}>Manage your return and exchange requests.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : <><FiPlus /> New Request</>}</button>
      </div>

      {error && <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 14, marginBottom: 20 }}>{error}</div>}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#fff', borderRadius: 16, padding: 32, marginBottom: 32, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>New Return/Exchange Request</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label>Order *</label>
              {deliveredOrders.length > 0 ? (
                <select required value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}>
                  <option value="">Select a delivered order</option>
                  {deliveredOrders.map((o) => (
                    <option key={o._id} value={o._id}>
                      #{o.orderId || o._id.slice(-8).toUpperCase()} — ₹{o.totalPrice?.toLocaleString()} ({new Date(o.createdAt).toLocaleDateString('en-IN')})
                    </option>
                  ))}
                </select>
              ) : (
                <input required placeholder="Enter your order ID (e.g. ORD-20240101-ABCDEF)" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} />
              )}
            </div>
            <div className="form-group"><label>Item (optional)</label><input placeholder="Which item from the order?" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} /></div>
            <div className="form-group"><label>Reason *</label><textarea required rows={3} placeholder="Why are you returning this item?" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
          </form>
        </motion.div>
      )}

      {returns.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center" style={{ padding: '60px 20px', background: '#f9fafb', borderRadius: 16 }}>
          <FiInbox size={64} style={{ color: '#A3C9A8', marginBottom: 16 }} />
          <h3 style={{ color: '#2E5A44', marginBottom: 8 }}>No Return Requests</h3>
          <p style={{ color: '#9ca3af', fontSize: 15 }}>You haven't submitted any return or exchange requests yet.</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {returns.map((r, i) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <strong style={{ fontSize: 15 }}>Order #{r.orderId?.slice(-8)?.toUpperCase() || r.order?.slice(-8) || 'N/A'}</strong>
                  <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{r.reason}</p>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, textTransform: 'capitalize', background: statusColors[r.status]?.bg, color: statusColors[r.status]?.color }}>{r.status}</span>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Created: {new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 40, padding: 24, background: '#f0f7f1', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ color: '#2E5A44', fontSize: 14 }}>View our <Link to="/return-policy" style={{ fontWeight: 600, textDecoration: 'underline' }}>Return Policy</Link> and <Link to="/exchange-policy" style={{ fontWeight: 600, textDecoration: 'underline' }}>Exchange Policy</Link> for more details.</p>
      </div>
    </div>
  );
};

export default Returns;
