import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../utils/axios';

function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', position: '', bio: '', photo: '', socialLinks: {}, order: 0 });

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = async () => {
    try {
      const { data } = await api.get('/api/admin/team/all');
      setMembers(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (modal?.edit) {
        const { data } = await api.put(`/api/admin/team/${modal.edit._id}`, form);
        setMembers((prev) => prev.map((m) => m._id === data._id ? data : m));
      } else {
        const { data } = await api.post('/api/admin/team', form);
        setMembers((prev) => [data, ...prev]);
      }
      setModal(null);
      setForm({ name: '', position: '', bio: '', photo: '', socialLinks: {}, order: 0 });
    } catch {
      alert('Failed to save');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this team member?')) return;
    try {
      await api.delete(`/api/admin/team/${id}`);
      setMembers((prev) => prev.filter((m) => m._id !== id));
    } catch {
      alert('Failed to delete');
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Team</h1><p>Manage team members</p></div>
        <button className="btn btn-primary" onClick={() => setModal({})}><FiPlus /> Add Member</button>
      </div>

      {members.length === 0 ? (
        <div className="empty-state"><FiUsers size={48} /><h3>No team members</h3></div>
      ) : (
        <div className="users-grid">
          {members.map((m) => (
            <motion.div key={m._id} layout className="user-card">
              <div className="user-avatar" style={{ background: m.photo ? `url(${m.photo}) center/cover` : '#2E5A44' }}>
                {!m.photo && m.name?.charAt(0)}
              </div>
              <div className="user-info">
                <h4>{m.name}</h4>
                <p>{m.position}</p>
                {m.bio && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{m.bio}</p>}
              </div>
              <div className="actions-cell">
                <button className="btn-icon" onClick={() => { setForm({ name: m.name, position: m.position, bio: m.bio, photo: m.photo, socialLinks: m.socialLinks || {}, order: m.order }); setModal({ edit: m }); }}>
                  <FiEdit2 />
                </button>
                <button className="btn-icon danger" onClick={() => remove(m._id)}><FiTrash2 /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.edit ? 'Edit Member' : 'Add Member'}</h2>
            <form onSubmit={save}>
              <div className="form-group"><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-group"><label>Position</label><input required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
              <div className="form-group"><label>Bio</label><textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
              <div className="form-group"><label>Photo URL</label><input value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} /></div>
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

export default Team;
