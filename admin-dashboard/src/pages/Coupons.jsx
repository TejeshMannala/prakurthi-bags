import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPercent, FiAlertTriangle, FiStar, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import api from '../utils/axios';
import { onAdminRealtime } from '../utils/adminRealtime';

const initialForm = {
  code: '',
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minimumOrderAmount: '',
  maximumDiscount: '',
  startDate: '',
  expiryDate: '',
  usageLimit: '',
  perUserLimit: '',
  isWelcomeCoupon: false,
  active: true,
  featured: false,
  autoApply: false,
  restrictedProducts: '',
  restrictedBrands: '',
  restrictedUsers: '',
};

function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedCoupon, setExpandedCoupon] = useState(null);

  useEffect(() => { fetchCoupons(); }, []);

  // Real-time: keep the coupon list in sync when created/edited/deleted.
  useEffect(() => onAdminRealtime('admin:coupon:updated', () => fetchCoupons()), []);

  const fetchCoupons = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/coupons');
      setCoupons(Array.isArray(data) ? data : data.coupons || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code || '',
      title: c.title || '',
      description: c.description || '',
      discountType: c.discountType || 'percentage',
      discountValue: c.discountValue?.toString() || '',
      minimumOrderAmount: c.minimumOrderAmount?.toString() || '',
      maximumDiscount: c.maximumDiscount?.toString() || '',
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      expiryDate: c.expiryDate ? c.expiryDate.slice(0, 10) : '',
      usageLimit: c.usageLimit?.toString() || '',
      perUserLimit: c.perUserLimit?.toString() || '1',
      isWelcomeCoupon: Boolean(c.isWelcomeCoupon),
      active: c.active !== false,
      featured: Boolean(c.featured),
      autoApply: Boolean(c.autoApply),
      restrictedProducts: Array.isArray(c.restrictedProducts) ? c.restrictedProducts.join(',') : '',
      restrictedBrands: Array.isArray(c.restrictedBrands) ? c.restrictedBrands.join(',') : '',
      restrictedUsers: Array.isArray(c.restrictedUsers) ? c.restrictedUsers.join(',') : '',
    });
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        discountValue: form.discountValue ? parseFloat(form.discountValue) : 0,
        minimumOrderAmount: form.minimumOrderAmount ? parseFloat(form.minimumOrderAmount) : 0,
        maximumDiscount: form.maximumDiscount ? parseFloat(form.maximumDiscount) : 0,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : 0,
        perUserLimit: form.perUserLimit ? parseInt(form.perUserLimit, 10) : 1,
        restrictedProducts: form.restrictedProducts.split(',').map((item) => item.trim()).filter(Boolean),
        restrictedBrands: form.restrictedBrands.split(',').map((item) => item.trim()).filter(Boolean),
        restrictedUsers: form.restrictedUsers.split(',').map((item) => item.trim()).filter(Boolean),
      };
      if (editing) {
        await api.put(`/api/admin/coupons/${editing._id || editing.id}`, payload);
      } else {
        await api.post('/api/admin/coupons', payload);
      }
      setModalOpen(false);
      fetchCoupons();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/admin/coupons/${id}`);
      setDeleteConfirm(null);
      fetchCoupons();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete coupon');
    }
  };

  const filtered = coupons.filter((c) =>
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" /><p>Loading coupons...</p>
      </div>
    );
  }

  if (error && coupons.length === 0) {
    return (
      <div className="error-container">
        <FiAlertTriangle size={48} /><h3>Error</h3><p>{error}</p>
        <button className="btn btn-primary" onClick={fetchCoupons}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Coupons</h1><p>Manage discount coupons</p></div>
        <motion.button className="btn btn-primary" onClick={openCreate} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <FiPlus /> Add Coupon
        </motion.button>
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      <div className="search-bar">
        <FiSearch />
        <input placeholder="Search by coupon code..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length > 0 ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Code</th><th>Discount</th><th>Type</th><th>Min Order</th><th>Uses</th><th>Expiry</th><th>Status</th><th>Welcome</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <motion.tr key={c._id || c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>
                    <code className="coupon-code">{c.code}</code>
                    <div className="text-muted">{c.title}</div>
                  </td>
                  <td>{c.discountType === 'percentage' ? `${c.discountValue ?? 0}%` : `₹${c.discountValue ?? 0}`}</td>
                  <td>{c.discountType || '-'}</td>
                  <td>₹{(c.minimumOrderAmount ?? 0).toFixed(2)}</td>
                  <td>{c.usedCount ?? 0}/{c.usageLimit > 0 ? c.usageLimit : '∞'}</td>
                  <td>{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'N/A'}</td>
                  <td><span className={`status-badge ${c.active !== false ? 'active' : 'inactive'}`}>{c.active !== false ? 'Active' : 'Inactive'}</span></td>
                  <td>{c.isWelcomeCoupon ? <span className="status-badge" style={{ background: '#FEF3C7', color: '#92400E' }}>Welcome</span> : '-'}</td>
                  <td className="actions-cell">
                    <button className="btn-icon" onClick={() => setExpandedCoupon(expandedCoupon === (c._id || c.id) ? null : (c._id || c.id))} title="Usage History">
                      {expandedCoupon === (c._id || c.id) ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                    <button className="btn-icon" onClick={() => openEdit(c)}><FiEdit2 /></button>
                    <button className="btn-icon danger" onClick={() => setDeleteConfirm(c)}><FiTrash2 /></button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {/* Usage History */}
          {filtered.map((c) => (
            expandedCoupon === (c._id || c.id) && (
              <motion.div key={`history-${c._id}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ padding: 16, background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#374151' }}>Usage History ({c.usageHistory?.length || 0} uses)</h4>
                {c.usageHistory?.length > 0 ? (
                  <div style={{ fontSize: 13, color: '#6B7280' }}>
                    {c.usageHistory.map((u, i) => (
                      <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
                        <span>User: {u.user?.name || u.user || 'Unknown'}</span>
                        <span>{u.usedAt ? new Date(u.usedAt).toLocaleDateString() : ''} | ₹{u.discountAmount || 0}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>No usage yet.</p>
                )}
                <div style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF' }}>
                  Used by {c.usedBy?.length || 0} unique user{(c.usedBy?.length || 0) !== 1 ? 's' : ''}
                </div>
              </motion.div>
            )
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FiPercent size={48} />
          <h3>{search ? 'No coupons found' : 'No coupons yet'}</h3>
          <p>{search ? 'Try a different search term' : 'Create your first coupon to start offering discounts'}</p>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)}>
            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <h2>{editing ? 'Edit Coupon' : 'Add Coupon'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Coupon Code</label>
                  <input name="code" value={form.code} onChange={handleChange} required placeholder="e.g. WELCOME20" />
                </div>
                <div className="form-group">
                  <label>Coupon Name</label>
                  <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Welcome 20% Off" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} placeholder="Short description shown to customers" rows="3" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Discount Value</label>
                    <input name="discountValue" type="number" step="0.01" value={form.discountValue} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Discount Type</label>
                    <select name="discountType" value={form.discountType} onChange={handleChange}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Minimum Order (₹)</label>
                    <input name="minimumOrderAmount" type="number" step="0.01" value={form.minimumOrderAmount} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Maximum Discount (₹)</label>
                    <input name="maximumDiscount" type="number" step="0.01" value={form.maximumDiscount} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input name="startDate" type="date" value={form.startDate} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input name="expiryDate" type="date" value={form.expiryDate} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Usage Limit</label>
                    <input name="usageLimit" type="number" min="0" value={form.usageLimit} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Per User Limit</label>
                    <input name="perUserLimit" type="number" min="0" value={form.perUserLimit} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Restricted Products (comma separated ids)</label>
                  <input name="restrictedProducts" value={form.restrictedProducts} onChange={handleChange} placeholder="productId1, productId2" />
                </div>
                <div className="form-group">
                  <label>Restricted Brands (comma separated)</label>
                  <input name="restrictedBrands" value={form.restrictedBrands} onChange={handleChange} placeholder="Brand A, Brand B" />
                </div>
                <div className="form-group">
                  <label>Restricted Users (comma separated ids)</label>
                  <input name="restrictedUsers" value={form.restrictedUsers} onChange={handleChange} placeholder="userId1, userId2" />
                </div>
                <div className="form-group checkbox-group">
                  <label><input name="isWelcomeCoupon" type="checkbox" checked={form.isWelcomeCoupon} onChange={handleChange} /> <FiStar size={14} /> Welcome Coupon (first order only)</label>
                  <label><input name="active" type="checkbox" checked={form.active} onChange={handleChange} /> Active</label>
                  <label><input name="featured" type="checkbox" checked={form.featured} onChange={handleChange} /> Featured</label>
                  <label><input name="autoApply" type="checkbox" checked={form.autoApply} onChange={handleChange} /> Auto Apply</label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal confirm-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <h3>Delete Coupon</h3>
              <p>Are you sure you want to delete coupon <strong>{deleteConfirm.code}</strong>?</p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm._id || deleteConfirm.id)}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Coupons;
