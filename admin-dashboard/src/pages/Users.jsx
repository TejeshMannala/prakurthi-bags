import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiUsers, FiAlertTriangle, FiMail, FiCalendar } from 'react-icons/fi';
import api from '../utils/axios';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/users');
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" /><p>Loading users...</p>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="error-container">
        <FiAlertTriangle size={48} /><h3>Error</h3><p>{error}</p>
        <button className="btn btn-primary" onClick={fetchUsers}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Users</h1><p>Manage registered users</p></div>
        <div className="user-count">{users.length} total</div>
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      <div className="search-bar">
        <FiSearch />
        <input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length > 0 ? (
        <div className="users-grid">
          {filtered.map((u, i) => (
            <motion.div
              key={u._id || u.id || i}
              className="user-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="user-avatar">
                {u.name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="user-info">
                <h4>{u.name || 'Unnamed'}</h4>
                <p><FiMail size={12} /> {u.email}</p>
                <p><FiCalendar size={12} /> Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className={`user-role ${u.role || 'customer'}`}>
                {u.role || 'customer'}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FiUsers size={48} />
          <h3>{search ? 'No users found' : 'No users yet'}</h3>
          <p>{search ? 'Try a different search term' : 'Users will appear here once they register'}</p>
        </div>
      )}
    </motion.div>
  );
}

export default Users;
