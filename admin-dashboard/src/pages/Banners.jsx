import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiImage, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../utils/axios';

function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', subtitle: '', link: '', image: '', bgColor: '#2E5A44', textColor: '#ffffff', position: 0, active: true });

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const { data } = await api.get('/api/admin/banners/all');
      setBanners(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (modal?.edit) {
        const { data } = await api.put(`/api/admin/banners/${modal.edit._id}`, form);
        setBanners((prev) => prev.map((b) => b._id === data._id ? data : b));
      } else {
        const { data } = await api.post('/api/admin/banners', form);
        setBanners((prev) => [data, ...prev]);
      }
      setModal(null);
    } catch {
      alert('Failed to save');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await api.delete(`/api/admin/banners/${id}`);
      setBanners((prev) => prev.filter((b) => b._id !== id));
    } catch {
      alert('Failed to delete');
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Banners</h1><p>Manage homepage banners</p></div>
        <button className="btn btn-primary" onClick={() => setModal({})}><FiPlus /> Add Banner</button>
      </div>

      {banners.length === 0 ? (
        <div className="empty-state"><FiImage size={48} /><h3>No banners</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {banners.map((b) => (
            <motion.div key={b._id} layout className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 120, height: 80, borderRadius: 8, background: b.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: b.textColor, fontSize: 11, fontWeight: 700, textAlign: 'center', padding: 8 }}>
                {b.title}
              </div>
              <div style={{ flex: 1 }}>
                <strong>{b.title}</strong>
                {b.subtitle && <p style={{ color: '#6b7280', fontSize: 13 }}>{b.subtitle}</p>}
              </div>
              <span className={`status-badge ${b.active ? 'active' : 'inactive'}`}>{b.active ? 'Active' : 'Inactive'}</span>
              <div className="actions-cell">
                <button className="btn-icon" onClick={() => { setForm({ title: b.title, subtitle: b.subtitle, link: b.link, image: b.image, bgColor: b.bgColor, textColor: b.textColor, position: b.position, active: b.active }); setModal({ edit: b }); }}>
                  <FiEdit2 />
                </button>
                <button className="btn-icon danger" onClick={() => remove(b._id)}><FiTrash2 /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.edit ? 'Edit Banner' : 'Add Banner'}</h2>
            <form onSubmit={save}>
              <div className="form-group"><label>Title</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="form-group"><label>Subtitle</label><input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
              <div className="form-group"><label>Link</label><input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></div>
              <div className="form-group"><label>Image URL</label><input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label>BG Color</label><input type="color" value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} /></div>
                <div className="form-group"><label>Text Color</label><input type="color" value={form.textColor} onChange={(e) => setForm({ ...form, textColor: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Position</label><input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} /></div>
                <div className="form-group checkbox-group">
                  <label><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
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

export default Banners;
