import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiAlertTriangle, FiSearch } from 'react-icons/fi';
import api from '../utils/axios';

const statusColors = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  approved: { bg: '#dbeafe', color: '#1e40af' },
  rejected: { bg: '#fef2f2', color: '#991b1b' },
  picked_up: { bg: '#f3e8ff', color: '#6b21a8' },
  received: { bg: '#e0e7ff', color: '#3730a3' },
  refunded: { bg: '#d1fae5', color: '#065f46' },
};

function Returns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchReturns(); }, [statusFilter]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/api/admin/returns${params}`);
      setReturns(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/admin/returns/${id}`, { status });
      setReturns((prev) => prev.map((r) => r._id === id ? { ...r, status } : r));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><p>Loading returns...</p></div>;
  }

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Returns</h1><p>Manage return requests</p></div>
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      <div className="filters-row">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="picked_up">Picked Up</option>
          <option value="received">Received</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {returns.length === 0 ? (
        <div className="empty-state">
          <FiRefreshCw size={48} />
          <h3>No return requests</h3>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Customer</th><th>Order</th><th>Reason</th><th>Status</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <motion.tr key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>{r.user?.name || 'N/A'}</td>
                  <td>#{r.order?._id?.slice(-8) || 'N/A'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reason}</td>
                  <td>
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r._id, e.target.value)}
                      className={`status-select ${r.status}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="picked_up">Picked Up</option>
                      <option value="received">Received</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(r._id, r.status === 'pending' ? 'approved' : 'refunded')}>
                      {r.status === 'pending' ? 'Approve' : r.status === 'approved' ? 'Mark Refunded' : 'Update'}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

export default Returns;
