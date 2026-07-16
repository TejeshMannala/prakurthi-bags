import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiPackage, FiShoppingCart, FiUsers, FiPercent,
  FiHeadphones, FiStar, FiLogOut, FiMenu, FiX, FiBell,
  FiRefreshCw, FiHelpCircle, FiFileText, FiUsers as FiTeam, FiImage,
  FiLayers, FiMail, FiCreditCard, FiCheckCircle,
} from 'react-icons/fi';
import api from '../utils/axios';
import { getAdminSocket, disconnectAdminSocket } from '../utils/socket';
import { emitAdminRealtime } from '../utils/adminRealtime';

const sidebarLinks = [
  { to: '/', icon: FiGrid, label: 'Dashboard', end: true },
  { to: '/products', icon: FiPackage, label: 'Products' },
  { to: '/orders', icon: FiShoppingCart, label: 'Orders' },
  { to: '/payments', icon: FiCreditCard, label: 'Payments' },
  { to: '/users', icon: FiUsers, label: 'Users' },
  { to: '/support', icon: FiHeadphones, label: 'Support' },
  { to: '/returns', icon: FiRefreshCw, label: 'Returns' },
  { to: '/reviews', icon: FiStar, label: 'Reviews' },
  { to: '/faq', icon: FiHelpCircle, label: 'FAQ' },
  { to: '/policies', icon: FiFileText, label: 'Policies' },
  { to: '/categories', icon: FiLayers, label: 'Categories' },
  { to: '/team', icon: FiTeam, label: 'Team' },
  { to: '/banners', icon: FiImage, label: 'Banners' },
  { to: '/coupons', icon: FiPercent, label: 'Coupons' },
  { to: '/contact-info', icon: FiMail, label: 'Contact Info' },
];

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  // Real-time notification bell badge (refreshed on every socket push).
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        if (!token) return;
        const { data } = await api.get('/api/admin/notifications');
        const unread = Array.isArray(data) ? data.filter((n) => !n.read).length : 0;
        setNotifCount(unread);
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Live socket connection: forward every admin event to the realtime bus and
  // surface instant toasts for the most important ones.
  useEffect(() => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    if (!token) return;
    const socket = getAdminSocket();

    const showToast = (message, type = 'info') => {
      setToast({ message, type, id: Date.now() });
      setTimeout(() => setToast(null), 4000);
    };

    const onOrderNew = (data) => {
      emitAdminRealtime('admin:order:new', data);
      emitAdminRealtime('admin:stats', { reason: 'order_new' });
      showToast(`🛒 New order ${data?.orderNo || ''} from ${data?.user?.name || 'a customer'}`, 'order');
    };
    const onOrderUpdated = (data) => {
      emitAdminRealtime('admin:order:updated', data);
      emitAdminRealtime('admin:stats', { reason: 'order_updated' });
    };
    const onNotification = (notif) => {
      emitAdminRealtime('admin:notification', notif);
      setNotifCount((c) => c + 1);
      showToast(`🔔 ${notif?.title || 'New notification'}`, 'notification');
    };
    const onStats = (data) => emitAdminRealtime('admin:stats', data);
    const onCoupon = (data) => emitAdminRealtime('admin:coupon:updated', data);
    const onPresence = (data) => emitAdminRealtime('admin:presence', data);
    const onSupport = (data) => emitAdminRealtime('admin:support', data);
    const onReview = (data) => emitAdminRealtime('admin:review:new', data);

    socket.on('admin:order:new', onOrderNew);
    socket.on('admin:order:updated', onOrderUpdated);
    socket.on('admin:notification', onNotification);
    socket.on('admin:stats', onStats);
    socket.on('admin:coupon:updated', onCoupon);
    socket.on('admin:presence', onPresence);
    socket.on('admin:support', onSupport);
    socket.on('admin:review:new', onReview);

    return () => {
      socket.off('admin:order:new', onOrderNew);
      socket.off('admin:order:updated', onOrderUpdated);
      socket.off('admin:notification', onNotification);
      socket.off('admin:stats', onStats);
      socket.off('admin:coupon:updated', onCoupon);
      socket.off('admin:presence', onPresence);
      socket.off('admin:support', onSupport);
      socket.off('admin:review:new', onReview);
    };
  }, []);

  const handleLogout = () => {
    disconnectAdminSocket();
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            className="admin-sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="sidebar-header">
              <h2>AdminPanel</h2>
              <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
                <FiX />
              </button>
            </div>
            <nav className="sidebar-nav">
              {sidebarLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="sidebar-footer">
              <button className="sidebar-link logout" onClick={handleLogout}>
                <FiLogOut />
                <span>Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="topbar-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FiMenu />
          </button>
          <div className="topbar-title">Admin Dashboard</div>
          <div className="topbar-actions">
            <button className="topbar-notif">
              <FiBell />
              {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
            </button>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      {/* Real-time toast */}
      {toast && (
        <div
          key={toast.id}
          onClick={() => {
            if (toast.type === 'order') navigate('/orders');
            setToast(null);
          }}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: '#1f2937',
            color: '#fff',
            padding: '14px 20px',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            cursor: 'pointer',
            maxWidth: 360,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <FiCheckCircle style={{ display: 'inline', marginRight: 8 }} />
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default AdminLayout;
