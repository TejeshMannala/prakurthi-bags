import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiShoppingCart, FiAlertTriangle, FiChevronDown } from 'react-icons/fi';
import api from '../utils/axios';
import { onAdminRealtime } from '../utils/adminRealtime';

const statuses = ['Pending', 'Processing', 'Confirmed', 'Packed', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled', 'Completed'];

const toCssClass = (s) => s?.toLowerCase().replace(/\s+/g, '-') || '';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  // Real-time: new orders and status changes refresh the list instantly.
  useEffect(() => {
    const offNew = onAdminRealtime('admin:order:new', () => fetchOrders());
    const offUpd = onAdminRealtime('admin:order:updated', () => fetchOrders());
    return () => { offNew(); offUpd(); };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/orders');
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await api.put(`/api/admin/orders/${id}`, { orderStatus: status });
      setOrders((prev) => prev.map((o) => (o._id === id || o.id === id ? { ...o, orderStatus: status } : o)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = orders.filter((o) => {
    const matchSearch =
      (o._id || o.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.user?.name || o.customer || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || (o.orderStatus || '') === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" /><p>Loading orders...</p>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="error-container">
        <FiAlertTriangle size={48} /><h3>Error</h3><p>{error}</p>
        <button className="btn btn-primary" onClick={fetchOrders}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Orders</h1><p>Manage customer orders</p></div>
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      <div className="filters-row">
        <div className="search-bar">
          <FiSearch />
          <input placeholder="Search by ID or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
          <option value="all">All Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length > 0 ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <motion.tr key={o._id || o.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>#{(o._id || o.id || '').slice(-6)}</td>
                  <td>{o.user?.name || o.customer || 'N/A'}</td>
                  <td>{o.items?.length || o.totalItems || 0}</td>
                  <td>₹{o.totalPrice?.toFixed(2) || o.totalAmount?.toFixed(2) || '0.00'}</td>
                  <td>{o.paymentMethod || o.payment?.method || 'N/A'}</td>
                  <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <div className="status-select-wrapper">
                      <select
                        value={o.orderStatus || ''}
                        onChange={(e) => updateStatus(o._id || o.id, e.target.value)}
                        disabled={updating === (o._id || o.id)}
                        className={`status-select ${toCssClass(o.orderStatus)}`}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {updating === (o._id || o.id) && <span className="spinner-sm" />}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <FiShoppingCart size={48} />
          <h3>{search || statusFilter !== 'all' ? 'No matching orders' : 'No orders yet'}</h3>
          <p>{search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Orders will appear here once customers start purchasing'}</p>
        </div>
      )}
    </motion.div>
  );
}

export default Orders;
