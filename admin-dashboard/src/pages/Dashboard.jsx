import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiUsers, FiShoppingCart, FiDollarSign, FiPackage, FiAlertTriangle, FiStar,
} from 'react-icons/fi';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import api from '../utils/axios';
import { onAdminRealtime } from '../utils/adminRealtime';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const container = {
  animate: { transition: { staggerChildren: 0.08 } },
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Real-time: refresh aggregate stats whenever orders/products/users change.
  useEffect(() => {
    const offStats = onAdminRealtime('admin:stats', () => fetchDashboard());
    const offPresence = onAdminRealtime('admin:presence', (data) => {
      if (data && typeof data.onlineCount === 'number') setOnlineUsers(data.onlineCount);
    });
    return () => {
      offStats();
      offPresence();
    };
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/dashboard');
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <FiAlertTriangle size={48} />
        <h3>Error</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchDashboard}>Retry</button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="empty-container">
        <FiPackage size={48} />
        <h3>No Data Available</h3>
        <p>Dashboard data will appear here once the backend is connected.</p>
      </div>
    );
  }

  const metricCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: FiUsers, color: '#6366f1', bg: '#eef2ff' },
    { label: 'Online Now', value: onlineUsers, icon: FiUsers, color: '#0ea5e9', bg: '#e0f2fe' },
    { label: 'Total Orders', value: stats.totalOrders, icon: FiShoppingCart, color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, icon: FiDollarSign, color: '#10b981', bg: '#ecfdf5' },
    { label: 'Total Products', value: stats.totalProducts, icon: FiPackage, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Total Reviews', value: stats.totalReviews || 0, icon: FiStar, color: '#ec4899', bg: '#fdf2f8' },
  ];

  const paymentData = (stats.paymentMethods || []).map(p => ({ name: p.method || p._id, value: p.total || 0 }));
  const salesData = (stats.monthlySales || []).map(s => ({ month: s.month, sales: s.total || 0, count: s.count || 0 }));
  const latestOrders = stats.latestOrders || [];
  const lowStock = stats.lowStockProducts || [];

  return (
    <motion.div className="dashboard" variants={container} initial="initial" animate="animate">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your store performance</p>
      </div>

      <motion.div className="metric-cards" variants={container}>
        {metricCards.map((card, i) => (
          <motion.div key={i} className="metric-card" variants={fadeUp}>
            <div className="metric-icon" style={{ background: card.bg, color: card.color }}>
              <card.icon size={24} />
            </div>
            <div className="metric-info">
              <span className="metric-label">{card.label}</span>
              <span className="metric-value">{card.value}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="chart-grid" variants={fadeUp}>
        <div className="card chart-card">
          <h3>Revenue by Payment Method</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {paymentData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          {paymentData.length === 0 && <div className="chart-empty">No payment data</div>}
        </div>
        <div className="card chart-card">
          <h3>Monthly Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {salesData.length === 0 && <div className="chart-empty">No sales data</div>}
        </div>
      </motion.div>

      <motion.div className="chart-grid" variants={fadeUp}>
        <div className="card">
          <h3>Latest Orders</h3>
          {latestOrders.length > 0 ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {latestOrders.map((o) => (
                    <tr key={o._id || o.id}>
                      <td>#{o._id?.slice(-6) || o.id?.slice(-6)}</td>
                      <td>{o.user?.name || o.customer || 'N/A'}</td>
                      <td>₹{(o.totalPrice || o.total || 0).toLocaleString()}</td>
                      <td><span className={`status-badge ${(o.orderStatus || o.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{o.orderStatus || o.status}</span></td>
                      <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">No recent orders</div>
          )}
        </div>
        <div className="card">
          <h3>Low Stock Alert</h3>
          {lowStock.length > 0 ? (
            <div className="low-stock-list">
              {lowStock.map((p) => (
                <div key={p._id || p.id} className="low-stock-item">
                  <div className="low-stock-info">
                    <strong>{p.name}</strong>
                    <span>Stock: {p.stock}</span>
                  </div>
                  <FiAlertTriangle color="#dc2626" />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No low stock products</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Dashboard;
