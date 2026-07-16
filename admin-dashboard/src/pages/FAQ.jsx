import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiHelpCircle, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../utils/axios';

function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', category: 'general', order: 0 });

  useEffect(() => { fetchFaqs(); }, []);

  const fetchFaqs = async () => {
    try {
      const { data } = await api.get('/api/admin/faqs');
      setFaqs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (modal?.edit) {
        const { data } = await api.put(`/api/admin/faqs/${modal.edit._id}`, form);
        setFaqs((prev) => prev.map((f) => f._id === data._id ? data : f));
      } else {
        const { data } = await api.post('/api/admin/faqs', form);
        setFaqs((prev) => [data, ...prev]);
      }
      setModal(null);
      setForm({ question: '', answer: '', category: 'general', order: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await api.delete(`/api/admin/faqs/${id}`);
      setFaqs((prev) => prev.filter((f) => f._id !== id));
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const edit = (faq) => {
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, order: faq.order });
    setModal({ edit: faq });
  };

  if (loading) return <div className="loading-container"><div className="spinner" /><p>Loading FAQs...</p></div>;

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>FAQ</h1><p>Manage frequently asked questions</p></div>
        <button className="btn btn-primary" onClick={() => setModal({})}><FiPlus /> Add FAQ</button>
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      {faqs.length === 0 ? (
        <div className="empty-state"><FiHelpCircle size={48} /><h3>No FAQs yet</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq) => (
            <motion.div key={faq._id} layout className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <strong>{faq.question}</strong>
                <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{faq.answer}</p>
                <span className="status-badge" style={{ background: '#f0f7f1', color: '#2E5A44', marginTop: 8 }}>{faq.category}</span>
              </div>
              <div className="actions-cell">
                <button className="btn-icon" onClick={() => edit(faq)}><FiEdit2 /></button>
                <button className="btn-icon danger" onClick={() => remove(faq._id)}><FiTrash2 /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.edit ? 'Edit FAQ' : 'Add FAQ'}</h2>
            <form onSubmit={save}>
              <div className="form-group">
                <label>Question</label>
                <input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Answer</label>
                <textarea required rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="general">General</option>
                    <option value="orders">Orders</option>
                    <option value="shipping">Shipping</option>
                    <option value="returns">Returns</option>
                    <option value="products">Products</option>
                    <option value="payment">Payment</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Order</label>
                  <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{modal.edit ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default FAQ;
