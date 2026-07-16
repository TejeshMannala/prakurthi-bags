import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiCheck, FiStar, FiTruck, FiAlertTriangle, FiMessageSquare } from 'react-icons/fi';
import api from '../utils/axios';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import { onNotificationReceived } from '../utils/notificationSync';

const ICONS = {
  review_request: FiStar,
  review_approved: FiStar,
  order_update: FiTruck,
  ticketReply: FiMessageSquare,
  support_reply: FiMessageSquare,
  coupon: FiCheck,
  default: FiBell,
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const NotificationBell = () => {
  const { user } = useCart();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get('/api/notifications');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    const iv = setInterval(load, 45000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(iv);
    };
  }, [user]);

  // Real-time: a new notification arrives over the socket — show a toast and
  // prepend it to the list so the unread badge updates instantly.
  useEffect(() => {
    if (!user) return;
    const off = onNotificationReceived((notif) => {
      if (!notif) return;
      showNotification(notif.type, notif.message);
      setItems((prev) => {
        if (prev.some((n) => n._id === notif._id)) return prev;
        return [notif, ...prev];
      });
    });
    return off;
  }, [user, showNotification]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const unread = items.filter((n) => !n.read).length;

  const openNotif = async (n) => {
    setOpen(false);
    try {
      if (!n.read) await api.put(`/api/notifications/${n._id}/read`);
    } catch {
      /* ignore */
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await api.put('/api/notifications/read-all');
    } catch {
      /* ignore */
    }
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="cart-icon"
        aria-label="Notifications"
        style={{ position: 'relative' }}
      >
        <FiBell />
        {unread > 0 && (
          <span className="badge" style={{ background: '#DC2626' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-100 z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-bold text-gray-800">Notifications</span>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs font-semibold text-[#2E5A44] hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-400">No notifications yet</p>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] || ICONS.default;
                return (
                  <button
                    key={n._id}
                    onClick={() => openNotif(n)}
                    className={`w-full text-left flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${n.read ? '' : 'bg-[#f0fdf4]/50'}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#2E5A44]/10 text-[#2E5A44] flex items-center justify-center flex-shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm ${n.read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>{n.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <span className="ml-auto mt-1 w-2 h-2 rounded-full bg-[#2E5A44] flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
