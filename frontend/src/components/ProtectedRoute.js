import React, { useState, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiAlertTriangle, FiArrowRight } from 'react-icons/fi';
import { useCart } from '../context/CartContext';

const ProtectedRoute = () => {
  const { user, sessionReady } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);
  const hasToken = !!localStorage.getItem('token');
  const warnedToken = useRef(false);

  if (!sessionReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (user) {
    return <Outlet />;
  }

  // If a token exists in localStorage but CartContext says no user (i.e.
  // sessionReady === true && user === null && hasToken === true), this means
  // the bootstrap fetch (/api/auth/profile) failed (401/invalid). Remove the
  // stale token silently once so the next render lands on the login modal.
  if (hasToken && !warnedToken.current) {
    warnedToken.current = true;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ProtectedRoute] token present but no user – clearing stale token');
    }
    localStorage.removeItem('token');
  }

  const handleBrowse = () => {
    navigate('/products', { replace: true });
  };

  const handleRedirect = () => {
    setRedirecting(true);
  };

  return (
    <AnimatePresence>
      {redirecting ? (
        <Navigate to="/login" state={{ from: location }} replace />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            padding: 24,
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 20,
              padding: '40px 36px',
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <button
              onClick={() => navigate('/products', { replace: true })}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280'
              }}
            >
              <FiX />
            </button>
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#fef3c7', color: '#f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 20px',
              }}
            >
              <FiAlertTriangle />
            </motion.div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#2E5A44', marginBottom: 8 }}>
              Login Required
            </h2>
            <p style={{ color: '#6b7280', marginBottom: 28, fontSize: 15, lineHeight: 1.6 }}>
              Please login first to continue shopping.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn btn-outline"
                onClick={handleBrowse}
              >
                Browse Products
              </button>
              <button className="btn btn-primary" onClick={handleRedirect}>
                Sign In <FiArrowRight />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProtectedRoute;
