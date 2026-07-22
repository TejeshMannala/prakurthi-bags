import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLogOut, FiPackage, FiUser, FiMail, FiShield, FiHeart, FiEdit2, FiX, FiCheck } from 'react-icons/fi';
import api from '../utils/axios';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import BackButton from '../components/BackButton';

const Profile = () => {
  const { user, logout, setUser, wishlist, cart } = useCart();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', street: '', city: '', state: '', zip: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get('/api/auth/profile')
      .then((res) => {
        setUser(res.data);
        setOrders(res.data.orders || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?._id]);

  const handleLogout = async () => {
    try {
      await api.delete('/api/cart');
    } catch {}
    try {
      await api.post('/api/auth/logout');
    } catch {}
    localStorage.removeItem('token');
    logout();
    navigate('/');
  };

  const startEdit = () => {
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      avatar: user.avatar || '',
      street: user.address?.street || '',
      city: user.address?.city || '',
      state: user.address?.state || '',
      zip: user.address?.zip || '',
    });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveProfile = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.put('/api/auth/profile', {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        avatar: editForm.avatar.trim(),
        address: {
          street: editForm.street.trim(),
          city: editForm.city.trim(),
          state: editForm.state.trim(),
          zip: editForm.zip.trim(),
        },
      });
      setUser(data);
      setEditing(false);
      showNotification('profile');
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return '#2E5A44';
      case 'Completed': return '#2E5A44';
      case 'Shipped': return '#3b82f6';
      case 'Out For Delivery': return '#0ea5e9';
      case 'Confirmed': return '#3b82f6';
      case 'Packed': return '#ec4899';
      case 'Processing': return '#f59e0b';
      case 'Cancelled': return '#dc2626';
      default: return '#6b7280';
    }
  };

  return (
    <div className="container" style={{ padding: '40px 24px' }}>
      <BackButton />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="profile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                flexShrink: 0,
                background: user.avatar ? `url(${user.avatar}) center/cover` : '#1B5E20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                overflow: 'hidden',
              }}
              aria-label="Profile picture"
            >
              {!user.avatar && (user.name ? user.name.charAt(0).toUpperCase() : <FiUser />)}
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>My Profile</h1>
              <p style={{ color: '#6b7280' }}>Welcome back, {user.name}.</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiLogOut /> Sign Out
          </button>
        </div>

        <div className="profile-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3><FiUser /> Account Details</h3>
            {!editing ? (
              <button onClick={startEdit} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 13 }}>
                <FiEdit2 size={14} /> Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={cancelEdit} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', fontSize: 13 }}>
                  <FiX size={14} /> Cancel
                </button>
                <button onClick={saveProfile} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', fontSize: 13 }}>
                  <FiCheck size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Profile Picture URL</label>
                <input type="url" value={editForm.avatar} onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Phone</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Street Address</label>
                <input type="text" value={editForm.street} onChange={(e) => setEditForm({ ...editForm, street: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>City</label>
                <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>State</label>
                <input type="text" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>ZIP Code</label>
                <input type="text" value={editForm.zip} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
              </div>
            </div>
          ) : (
            <div className="profile-details">
              <div className="profile-detail">
                <FiUser size={16} />
                <span><strong>Name:</strong> {user.name}</span>
              </div>
              <div className="profile-detail">
                <FiMail size={16} />
                <span><strong>Email:</strong> {user.email}</span>
              </div>
              <div className="profile-detail">
                <FiShield size={16} />
                <span><strong>Role:</strong> {user.role}</span>
              </div>
              <div className="profile-detail">
                <FiHeart size={16} />
                <span><strong>Wishlist:</strong> {wishlist.length} item{wishlist.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="profile-detail">
                <FiPackage size={16} />
                <span><strong>Cart:</strong> {cart.length} item{cart.length !== 1 ? 's' : ''}</span>
              </div>
              {user.phone && (
                <div className="profile-detail">
                  <FiUser size={16} />
                  <span><strong>Phone:</strong> {user.phone}</span>
                </div>
              )}
              {user.address?.city && (
                <div className="profile-detail">
                  <FiPackage size={16} />
                  <span><strong>Address:</strong> {[user.address.street, user.address.city, user.address.state, user.address.zip].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {user.createdAt && (
                <div className="profile-detail">
                  <FiUser size={16} />
                  <span><strong>Date Joined:</strong> {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              )}
            </div>
          )}
          {user.role === 'admin' && (
            <a
              href={`${process.env.REACT_APP_API_URL || window.location.origin}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ marginTop: 16, display: 'inline-flex', gap: 8 }}
            >
              <FiShield /> Go to Admin Panel
            </a>
          )}
        </div>

        <h2 className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiPackage /> My Orders
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-order" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <FiPackage size={48} style={{ color: '#A3C9A8', marginBottom: 16 }} />
            <h3>No orders placed yet</h3>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Start shopping to see your orders here.</p>
            <Link to="/products" className="btn btn-primary">Shop Now</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order, i) => (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="order-card"
              >
                <div className="order-header">
                  <div>
                    <strong>Order #{order._id.slice(-8).toUpperCase()}</strong>
                    <p className="order-date">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                      {' | '}{order.orderItems?.length || order.products?.length || 0} item{(order.orderItems?.length || order.products?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="order-right">
                    <span className="order-status" style={{ background: getStatusColor(order.orderStatus), color: '#fff' }}>
                      {order.orderStatus}
                    </span>
                    <span className="order-total">&#8377;{order.totalPrice?.toLocaleString()}</span>
                    <Link to={`/order-tracking/${order._id}`} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>
                      Track
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Profile;
