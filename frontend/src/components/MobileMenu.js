import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiHome, FiGrid, FiShoppingBag, FiHeart, FiUser, FiMail, FiInfo, FiHeadphones } from 'react-icons/fi';

const menuItems = [
  { label: 'Home', path: '/', icon: <FiHome /> },
  { label: 'Products', path: '/products', icon: <FiGrid /> },
  { label: 'Wishlist', path: '/wishlist', icon: <FiHeart /> },
  { label: 'Cart', path: '/cart', icon: <FiShoppingBag /> },
  { label: 'Profile', path: '/profile', icon: <FiUser /> },
  { label: 'About', path: '/about', icon: <FiInfo /> },
  { label: 'Contact', path: '/contact', icon: <FiHeadphones /> },
];

const MobileMenu = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 9998,
            }}
            onClick={onClose}
          />
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              maxWidth: '80vw',
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 0',
              boxShadow: '4px 0 40px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <Link to="/" onClick={onClose} style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#2E5A44', textDecoration: 'none' }}>
                Parkuthi<span style={{ color: '#A3C9A8' }}> Bags</span>
              </Link>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6b7280', padding: 4 }}>
                <FiX />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 24px',
                      fontSize: 15,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#2E5A44' : '#374151',
                      background: isActive ? 'rgba(46,90,68,0.06)' : 'transparent',
                      borderRight: isActive ? '3px solid #2E5A44' : '3px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 18, opacity: 0.7 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#9ca3af' }}>
              Eco-friendly bags for a better tomorrow
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
