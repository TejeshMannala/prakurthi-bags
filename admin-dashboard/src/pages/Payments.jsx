import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiCreditCard, FiAlertTriangle, FiTrendingUp, FiCheckCircle, FiXCircle, FiSmartphone } from 'react-icons/fi';
import api from '../utils/axios';

const toCssClass = (s) => s?.toLowerCase().replace(/\s+/g, '-') || '';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <motion.div className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="stat-icon" style={{ background: color }}>
        <Icon />
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </motion.div>
  );
}

function Payments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/payments');
      setData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const payments = data?.payments || [];
  const filtered = payments.filter((p) => {
    const matchSearch =
      (p.paymentId || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.transactionId || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.upiId || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.user?.name || p.email || '').toLowerCase().includes(search.toLowerCase());
    const matchMethod = methodFilter === 'all' || (p.paymentMethodType || '') === methodFilter;
    return matchSearch && matchMethod;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" /><p>Loading payments...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="error-container">
        <FiAlertTriangle size={48} /><h3>Error</h3><p>{error}</p>
        <button className="btn btn-primary" onClick={fetchPayments}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Payments</h1><p>Revenue &amp; payment analytics</p></div>
      </div>

      <div className="stats-grid">
        <StatCard icon={FiTrendingUp} label="Total Revenue" value={`₹${(data.revenue || 0).toLocaleString('en-IN')}`} color="#2E5A44" />
        <StatCard icon={FiCheckCircle} label="Successful Payments" value={data.successfulPayments || 0} color="#16a34a" />
        <StatCard icon={FiXCircle} label="Failed / Pending" value={data.failedPayments || 0} color="#dc2626" />
        <StatCard icon={FiSmartphone} label="UPI Payments" value={data.upiPayments || 0} color="#7c3aed" />
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: 12 }}>
        <StatCard icon={FiTrendingUp} label="Daily Revenue" value={`₹${(data.dailyRevenue || 0).toLocaleString('en-IN')}`} color="#0891b2" />
        <StatCard icon={FiTrendingUp} label="Monthly Revenue" value={`₹${(data.monthlyRevenue || 0).toLocaleString('en-IN')}`} color="#d97706" />
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      <div className="filters-row">
        <div className="search-bar">
          <FiSearch />
          <input placeholder="Search Payment ID, UPI, customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="filter-select">
          <option value="all">All Methods</option>
          <option value="UPI">UPI</option>
          <option value="Card">Card</option>
          <option value="NetBanking">Net Banking</option>
          <option value="Wallet">Wallet</option>
          <option value="COD">COD</option>
        </select>
      </div>

      {filtered.length > 0 ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Payment ID</th><th>Transaction</th><th>Customer</th><th>Method</th><th>Amount</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <motion.tr key={p._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td className="mono">{p.paymentId || '-'}</td>
                  <td className="mono">{p.transactionId || '-'}</td>
                  <td>{p.user?.name || p.email || p.name || 'N/A'}</td>
                  <td>{p.paymentMethod || p.paymentMethodType || 'N/A'}{p.upiId ? <div style={{ fontSize: 11, color: '#888' }}>{p.upiId}</div> : null}</td>
                  <td>₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                  <td><span className={`status-badge ${toCssClass(p.paymentStatus)}`}>{p.paymentStatus}</span></td>
                  <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <FiCreditCard size={48} />
          <h3>{search || methodFilter !== 'all' ? 'No matching payments' : 'No payments yet'}</h3>
          <p>{search || methodFilter !== 'all' ? 'Try adjusting your filters' : 'Online payments will appear here once customers check out'}</p>
        </div>
      )}
    </motion.div>
  );
}

export default Payments;
