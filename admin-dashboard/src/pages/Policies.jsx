import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiPlus, FiEdit2, FiTrash2, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import api from '../utils/axios';

const policyTypes = [
  { key: 'return', label: 'Return Policy', apiPrefix: 'return-policies' },
  { key: 'exchange', label: 'Exchange Policy', apiPrefix: 'exchange-policies' },
  { key: 'page', label: 'Privacy Policy', pageSlug: 'privacy-policy' },
  { key: 'page', label: 'Terms & Conditions', pageSlug: 'terms' },
];

function Policies() {
  const [activeTab, setActiveTab] = useState('return');
  const [returnPolicies, setReturnPolicies] = useState([]);
  const [exchangePolicies, setExchangePolicies] = useState([]);
  const [pageContents, setPageContents] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', sections: [], active: true });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/return-policies').then(r => r.data).catch(() => []),
      api.get('/api/admin/exchange-policies').then(r => r.data).catch(() => []),
      api.get('/api/pages/privacy-policy').then(r => r.data).catch(() => null),
      api.get('/api/pages/terms').then(r => r.data).catch(() => null),
    ]).then(([ret, exch, priv, terms]) => {
      setReturnPolicies(Array.isArray(ret) ? ret : []);
      setExchangePolicies(Array.isArray(exch) ? exch : []);
      setPageContents({ 'privacy-policy': priv || { title: 'Privacy Policy', sections: [] }, 'terms': terms || { title: 'Terms & Conditions', sections: [] } });
      setLoading(false);
    });
  }, []);

  const getActiveItems = () => {
    if (activeTab === 'return') return returnPolicies;
    if (activeTab === 'exchange') return exchangePolicies;
    return [];
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', sections: [], active: true });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || '',
      content: item.content || '',
      sections: item.sections || [],
      active: item.active !== false,
    });
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const addSection = () => {
    setForm(prev => ({ ...prev, sections: [...prev.sections, { heading: '', body: '', order: prev.sections.length + 1 }] }));
  };

  const updateSection = (index, field, value) => {
    const sections = [...form.sections];
    sections[index] = { ...sections[index], [field]: value };
    setForm(prev => ({ ...prev, sections }));
  };

  const removeSection = (index) => {
    setForm(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const apiPrefix = activeTab === 'return' ? 'return-policies' : 'exchange-policies';
      if (editing) {
        const { data } = await api.put(`/api/admin/${apiPrefix}/${editing._id}`, form);
        if (activeTab === 'return') setReturnPolicies(prev => prev.map(p => p._id === data._id ? data : p));
        else setExchangePolicies(prev => prev.map(p => p._id === data._id ? data : p));
      } else {
        const { data } = await api.post(`/api/admin/${apiPrefix}`, form);
        if (activeTab === 'return') setReturnPolicies(prev => [data, ...prev]);
        else setExchangePolicies(prev => [data, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const apiPrefix = activeTab === 'return' ? 'return-policies' : 'exchange-policies';
      await api.delete(`/api/admin/${apiPrefix}/${id}`);
      if (activeTab === 'return') setReturnPolicies(prev => prev.filter(p => p._id !== id));
      else setExchangePolicies(prev => prev.filter(p => p._id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete policy');
    }
  };

  const isPageTab = activeTab === 'privacy-policy' || activeTab === 'terms';

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Policies</h1><p>Manage return policy, exchange policy, and legal pages</p></div>
        {!isPageTab && (
          <motion.button className="btn btn-primary" onClick={openCreate} whileHover={{ scale: 1.03 }}>
            <FiPlus /> Add Policy
          </motion.button>
        )}
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {policyTypes.map((p) => (
          <button key={p.label}
            className={`btn ${activeTab === p.key || activeTab === p.pageSlug ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(p.pageSlug || p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {isPageTab ? (
        <PageEditor pageSlug={activeTab} pageData={pageContents[activeTab]} setPageContents={setPageContents} />
      ) : (
        <>
          {getActiveItems().length > 0 ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Title</th><th>Sections</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {getActiveItems().map((item) => (
                    <motion.tr key={item._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <td><strong>{item.title || 'Untitled'}</strong></td>
                      <td>{(item.sections?.length || 0)} sections</td>
                      <td><span className={`status-badge ${item.active !== false ? 'active' : 'inactive'}`}>{item.active !== false ? 'Active' : 'Inactive'}</span></td>
                      <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}</td>
                      <td className="actions-cell">
                        <button className="btn-icon" onClick={() => openEdit(item)}><FiEdit2 /></button>
                        <button className="btn-icon danger" onClick={() => setDeleteConfirm(item)}><FiTrash2 /></button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <FiFileText size={48} />
              <h3>No policies yet</h3>
              <p>Create your first policy to display on the website</p>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)}>
            <motion.div className="modal modal-lg" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <h2>{editing ? 'Edit Policy' : 'Add Policy'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Title *</label>
                  <input name="title" value={form.title} onChange={handleChange} required placeholder="e.g. Return Policy" />
                </div>
                <div className="form-group">
                  <label>Content (HTML)</label>
                  <textarea name="content" value={form.content} onChange={handleChange} rows={4} placeholder="Main content in HTML format (optional if using sections below)" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0' }}>
                  <strong>Sections</strong>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addSection}><FiPlus /> Add Section</button>
                </div>
                {form.sections.map((section, i) => (
                  <div key={i} className="card" style={{ marginBottom: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong>Section {i + 1}</strong>
                      <button type="button" className="btn-icon danger" onClick={() => removeSection(i)}><FiTrash2 /></button>
                    </div>
                    <div className="form-group">
                      <label>Heading</label>
                      <input value={section.heading} onChange={(e) => updateSection(i, 'heading', e.target.value)} placeholder="Section heading" />
                    </div>
                    <div className="form-group">
                      <label>Body</label>
                      <textarea rows={3} value={section.body} onChange={(e) => updateSection(i, 'body', e.target.value)} placeholder="Section content" />
                    </div>
                  </div>
                ))}
                <div className="form-group checkbox-group">
                  <label><input name="active" type="checkbox" checked={form.active} onChange={handleChange} /> Active</label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
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
              <h3>Delete Policy</h3>
              <p>Are you sure you want to delete <strong>{deleteConfirm.title}</strong>?</p>
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

function PageEditor({ pageSlug, pageData, setPageContents }) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [sections, setSections] = useState(pageData?.sections || []);

  useEffect(() => { setSections(pageData?.sections || []); }, [pageData]);

  const addSection = () => setSections(prev => [...prev, { heading: '', body: '', order: prev.length + 1 }]);
  const updateSection = (index, field, value) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };
  const removeSection = (index) => setSections(prev => prev.filter((_, i) => i !== index));

  const save = async () => {
    setSaving(true);
    setSuccess('');
    try {
      const { data } = await api.put(`/api/admin/pages/${pageSlug}`, { ...pageData, sections });
      setPageContents(prev => ({ ...prev, [pageSlug]: data }));
      setSuccess('Saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const label = pageSlug === 'privacy-policy' ? 'Privacy Policy' : 'Terms & Conditions';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3>{label} Sections</h3>
        <button className="btn btn-secondary btn-sm" onClick={addSection}><FiPlus /> Add Section</button>
      </div>
      {success && <div className="toast toast-success" style={{ marginBottom: 16 }}><FiCheck /> {success}</div>}
      {sections.map((section, i) => (
        <div key={i} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <strong>Section {i + 1}</strong>
            <button className="btn-icon danger" onClick={() => removeSection(i)}><FiTrash2 /></button>
          </div>
          <div className="form-group"><label>Heading</label><input value={section.heading} onChange={(e) => updateSection(i, 'heading', e.target.value)} /></div>
          <div className="form-group"><label>Body</label><textarea rows={4} value={section.body} onChange={(e) => updateSection(i, 'body', e.target.value)} /></div>
        </div>
      ))}
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

export default Policies;
