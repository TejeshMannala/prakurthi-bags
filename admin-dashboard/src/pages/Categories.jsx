import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiGrid, FiAlertTriangle } from 'react-icons/fi';
import api from '../utils/axios';

const initialForm = { name: '', description: '', icon: '', color: '', banner: '', status: true, sortOrder: 0, parent: '' };

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load categories');
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
      name: c.name || '',
      description: c.description || '',
      icon: c.icon || '',
      color: c.color || '',
      banner: c.banner || '',
      status: c.status !== false,
      sortOrder: c.sortOrder || 0,
      parent: c.parent || '',
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
        sortOrder: form.sortOrder ? parseInt(form.sortOrder, 10) : 0,
        parent: form.parent || undefined,
      };
      if (editing) {
        await api.put(`/api/admin/categories/${editing._id}`, payload);
      } else {
        await api.post('/api/admin/categories', payload);
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/admin/categories/${id}`);
      setDeleteConfirm(null);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const filtered = categories.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-container"><div className="spinner" /><p>Loading categories...</p></div>;

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Categories</h1><p>Manage product categories</p></div>
        <motion.button className="btn btn-primary" onClick={openCreate} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <FiPlus /> Add Category
        </motion.button>
      </div>

      {error && <div className="toast toast-error">{error}<button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button></div>}

      <div className="search-bar">
        <FiSearch />
        <input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length > 0 ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Slug</th><th>Sort Order</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <motion.tr key={c._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {c.icon && (c.icon.startsWith('<svg') ? <span dangerouslySetInnerHTML={{ __html: c.icon }} style={{ width: 24, height: 24, display: 'flex' }} /> : <span style={{ fontSize: 20 }}>{c.icon}</span>)}
                      <div><strong>{c.name}</strong>{c.description && <div className="text-muted" style={{ fontSize: 12 }}>{c.description}</div>}</div>
                    </div>
                  </td>
                  <td><code>{c.slug}</code></td>
                  <td>{c.sortOrder}</td>
                  <td><span className={`status-badge ${c.status !== false ? 'active' : 'inactive'}`}>{c.status !== false ? 'Active' : 'Inactive'}</span></td>
                  <td className="actions-cell">
                    <button className="btn-icon" onClick={() => openEdit(c)}><FiEdit2 /></button>
                    <button className="btn-icon danger" onClick={() => setDeleteConfirm(c)}><FiTrash2 /></button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <FiGrid size={48} />
          <h3>{search ? 'No categories found' : 'No categories yet'}</h3>
          <p>{search ? 'Try a different search term' : 'Create your first category to organize products'}</p>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)}>
            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <h2>{editing ? 'Edit Category' : 'Add Category'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Category Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. School Bags" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} placeholder="Brief description" rows="3" />
                </div>
                <div className="form-group">
                  <label>Icon (SVG markup, emoji, or URL)</label>
                  <input name="icon" value={form.icon} onChange={handleChange} placeholder='<svg>...</svg> or 🎒 or https://...' />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Accent Color</label>
                    <input name="color" value={form.color} onChange={handleChange} placeholder="#3B82F6" />
                  </div>
                  <div className="form-group">
                    <label>Banner Image URL</label>
                    <input name="banner" value={form.banner} onChange={handleChange} placeholder="https://..." />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Sort Order</label>
                    <input name="sortOrder" type="number" value={form.sortOrder} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Parent Category ID</label>
                    <input name="parent" value={form.parent} onChange={handleChange} placeholder="Leave empty for top-level" />
                  </div>
                </div>
                <div className="form-group checkbox-group">
                  <label><input name="status" type="checkbox" checked={form.status} onChange={handleChange} /> Active</label>
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
              <h3>Delete Category</h3>
              <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Categories;
