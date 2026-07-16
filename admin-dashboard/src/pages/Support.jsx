import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiHeadphones, FiAlertTriangle, FiSend, FiMessageSquare } from 'react-icons/fi';
import api from '../utils/axios';

const statuses = ['open', 'in-progress', 'resolved', 'closed'];

function Support() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/support');
      setTickets(Array.isArray(data) ? data : data.tickets || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/admin/support/${id}`, { status });
      setTickets((prev) => prev.map((t) => (t._id === id || t.id === id ? { ...t, status } : t)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update ticket');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const id = replyModal._id || replyModal.id;
      await api.post(`/api/admin/support/${id}/reply`, { message: replyText });
      setReplyText('');
      setReplyModal(null);
      fetchTickets();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const filtered = tickets.filter((t) => {
    const matchSearch =
      (t.subject || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.user?.name || t.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" /><p>Loading tickets...</p>
      </div>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <div className="error-container">
        <FiAlertTriangle size={48} /><h3>Error</h3><p>{error}</p>
        <button className="btn btn-primary" onClick={fetchTickets}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Support Tickets</h1><p>Manage customer support requests</p></div>
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      <div className="filters-row">
        <div className="search-bar">
          <FiSearch />
          <input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
          <option value="all">All Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {filtered.length > 0 ? (
        <div className="tickets-list">
          {filtered.map((t, i) => (
            <motion.div
              key={t._id || t.id || i}
              className="ticket-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="ticket-header">
                <div className="ticket-subject">
                  <FiMessageSquare />
                  <strong>{t.subject || 'No Subject'}</strong>
                </div>
                <span className={`status-badge ${t.status}`}>{t.status}</span>
              </div>
              <div className="ticket-body">
                <p>{t.message || t.description || 'No description'}</p>
              </div>
              <div className="ticket-footer">
                <span className="ticket-user">{t.user?.name || t.name || 'Anonymous'}</span>
                <span className="ticket-date">{t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}</span>
              </div>
              <div className="ticket-actions">
                <select
                  value={t.status}
                  onChange={(e) => updateStatus(t._id || t.id, e.target.value)}
                  className={`status-select ${t.status}`}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => setReplyModal(t)}>
                  <FiSend /> Reply
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FiHeadphones size={48} />
          <h3>{search || statusFilter !== 'all' ? 'No matching tickets' : 'No tickets yet'}</h3>
          <p>{search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Support tickets will appear here'}</p>
        </div>
      )}

      <AnimatePresence>
        {replyModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReplyModal(null)}>
            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <h2>Reply to Ticket</h2>
              <p className="reply-subject">Re: {replyModal.subject}</p>
              <form onSubmit={handleReply}>
                <div className="form-group">
                  <label>Your Reply</label>
                  <textarea
                    rows="5"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setReplyModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={sending || !replyText.trim()}>
                    {sending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Support;
