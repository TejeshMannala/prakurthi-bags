import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { initGoogleIdentity, promptGoogleCredential, getGoogleClientId, preloadGoogleScript } from '../utils/googleAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { FaLeaf } from 'react-icons/fa';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import api from '../utils/axios';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import { fetchProfile } from '../features/auth/authSlice';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(
    new URLSearchParams(location.search).get('signup') === '1'
  );
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const googleSubmitting = useRef(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const dispatch = useDispatch();
  const { setUser } = useCart();
  const { showNotification } = useNotification();
  const [googleEnabled, setGoogleEnabled] = useState(true);

  const from = location.state?.from?.pathname || '/';
  const isOriginLocal = window.location.origin.includes('localhost') ||
    window.location.origin.includes('127.0.0.1') ||
    window.location.origin.includes('192.168.');

  useEffect(() => {
    let active = true;
    api.get('/api/auth/google-config')
      .then(({ data }) => { if (active) setGoogleEnabled(!!data.enabled); })
      .catch(() => { if (active) setGoogleEnabled(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (googleError) {
      const timer = setTimeout(() => setGoogleError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [googleError]);

  // Initialize Google Identity Services exactly ONCE (singleton in
  // googleAuth.js). This prevents "google.accounts.id.initialize() called
  // multiple times" and avoids duplicate backend login requests.
  useEffect(() => {
    const clientId = getGoogleClientId();
    if (!clientId) return;
    let active = true;
    // Preload the Google SDK script immediately so it's cached by the
    // time the user clicks the Google button.
    preloadGoogleScript();
    initGoogleIdentity({
      clientId,
      onCredential: (credential) => {
        if (!active) return;
        handleGoogleSuccess({ credential });
      },
      onError: (err) => {
        if (!active) return;
        handleGoogleError(err);
      },
    }).catch(() => {
      if (active && !isOriginLocal) {
        setGoogleError(
          'Google sign-in is blocked for this origin (Error 400: origin_mismatch).\n\n' +
          'Fix: in Google Cloud Console -> APIs & Services -> Credentials -> your Web application OAuth Client ID, add this EXACT origin under "Authorized JavaScript origins":\n\n' +
          `${window.location.origin}\n\n` +
          'Then hard-refresh this page.'
        );
      }
    });
    return () => { active = false; };
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const { data } = await api.post(endpoint, form);
      localStorage.setItem('token', data.token);
      setUser(data);
      dispatch(fetchProfile());
      showNotification('login', `Welcome${isRegister ? '' : ' back'} to the Parkuthi Family`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (googleSubmitting.current) return;
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setError('Google sign-in did not return a credential. Please try again.');
      return;
    }
    googleSubmitting.current = true;
    setGoogleLoading(true);
    setError('');
    setGoogleError('');
    try {
      const { data } = await api.post('/api/auth/google', { idToken });
      if (!data?.token) throw new Error('No token returned');
      localStorage.setItem('token', data.token);
      setUser(data);
      dispatch(fetchProfile());
      showNotification('login', 'Welcome to the Parkuthi Family');
      navigate(from, { replace: true });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Google Login] authentication failed:', err?.response?.data || err?.message);
      }
      const serverMsg = err?.response?.data?.message;
      setError(
        serverMsg && typeof serverMsg === 'string'
          ? serverMsg
          : 'Google sign-in failed. Please try again or use Email / Password.'
      );
    } finally {
      googleSubmitting.current = false;
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[Login] Google error:', err?.message || err,
        '| Origin:', window.location.origin
      );
    }
    if (!isOriginLocal) {
      setGoogleError(
        'Google sign-in is blocked for this origin (Error 400: origin_mismatch).\n\n' +
        'Fix: in Google Cloud Console -> APIs & Services -> Credentials -> your Web application OAuth Client ID, add this EXACT origin under "Authorized JavaScript origins":\n\n' +
        `${window.location.origin}\n\n` +
        'Then hard-refresh this page.'
      );
    } else {
      setGoogleError('Google sign-in failed. Please try again or use Email / Password.');
    }
  };

  return (
    <div className="auth-page">
      <AnimatePresence mode="wait">
        <motion.div
          key={isRegister ? 'register' : 'login'}
          className="auth-card"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            key={isRegister ? 'c-r' : 'c-l'}
            transition={{ staggerChildren: 0.06 }}
          >
            <motion.div variants={itemVariants} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <FaLeaf size={28} color="#1B5E20" />
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22,
                  color: '#1B5E20',
                  fontWeight: 700,
                  letterSpacing: -0.3,
                }}>
                  Parkuthi
                </span>
              </div>
              <h2>{isRegister ? 'Create Account' : 'Welcome back'}</h2>
              <p className="auth-subtitle">
                {isRegister
                  ? "Join the eco-movement. It's free!"
                  : 'Sign in to your Parkuthi account'}
              </p>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  key="form-error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    marginBottom: 12,
                  }}
                >
                  <FiAlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span style={{ color: '#991b1b', fontSize: 13 }}>{error}</span>
                </motion.div>
              )}

              {googleError && (
                <motion.div
                  key="google-error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: 10,
                    padding: '12px 14px',
                    marginBottom: 12,
                    color: '#92400e',
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: 2 }}>
                    Google Login Configuration Required
                  </strong>
                  {googleError}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <motion.div variants={itemVariants} className="auth-input-group">
                  <label htmlFor="name">
                    <FiUser size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                    Full Name
                  </label>
                  <div className="auth-input-wrapper">
                    <FiUser className="auth-input-icon" size={17} />
                    <input
                      id="name" name="name" type="text" required
                      placeholder="Your name"
                      value={form.name} onChange={handleChange}
                    />
                  </div>
                </motion.div>
              )}

              <motion.div variants={itemVariants} className="auth-input-group">
                <label htmlFor="login-email">
                  <FiMail size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                  Email
                </label>
                <div className="auth-input-wrapper">
                  <FiMail className="auth-input-icon" size={17} />
                  <input
                    id="login-email" name="email" type="email" required
                    placeholder="you@example.com"
                    value={form.email} onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="auth-input-group">
                <label htmlFor="password">
                  <FiLock size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                  Password
                </label>
                <div className="auth-input-wrapper">
                  <FiLock className="auth-input-icon" size={17} />
                  <input
                    id="password" name="password"
                    type={showPw ? 'text' : 'password'} required minLength={6}
                    placeholder="Min 6 characters"
                    value={form.password} onChange={handleChange}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="auth-input-suffix"
                    onClick={() => setShowPw(!showPw)}
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </motion.div>

              {!isRegister && (
                <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
                  <Link to="/forgot-password" className="auth-link-small">
                    Forgot password?
                  </Link>
                </motion.div>
              )}

              <motion.div variants={itemVariants} style={{ marginTop: isRegister ? 4 : 8 }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span className="auth-spinner-inline" />
                      Processing...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {isRegister ? 'Sign Up' : 'Sign In'}
                      <FiArrowRight size={17} />
                    </span>
                  )}
                </button>
              </motion.div>
            </form>

            {googleEnabled && (
              <motion.div variants={itemVariants} style={{ marginTop: 18, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                  <span style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}>
                    Or
                  </span>
                  <span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                </div>
                <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (googleSubmitting.current) return;
                      googleSubmitting.current = true;
                      setGoogleLoading(true);
                      setGoogleError('');
                      try {
                        promptGoogleCredential();
                        // Safety: if no credential arrives shortly, release the guard.
                        setTimeout(() => {
                          googleSubmitting.current = false;
                          setGoogleLoading(false);
                        }, 60000);
                      } catch {
                        googleSubmitting.current = false;
                        setGoogleLoading(false);
                      }
                    }}
                    className="auth-google-btn"
                    aria-label="Continue with Google"
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6.01C46.44 38.04 48 31.51 48 24.55z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6.01c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                  {googleLoading && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}>
                      <span className="auth-spinner-inline" style={{ borderTopColor: '#1B5E20' }} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="auth-footer" style={{ marginTop: 24 }}>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError(''); setGoogleError(''); }}
              >
                {isRegister ? 'Sign In' : 'Sign Up'}
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <style>{`
        @keyframes authSpin { to { transform: rotate(360deg); } }
        @keyframes authRipple { to { transform: scale(4); opacity: 0; } }

        .auth-spinner-inline {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: authSpin 0.6s linear infinite;
        }

        .auth-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-input-group label {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .auth-input-wrapper {
          display: flex;
          align-items: center;
          border: 1.5px solid #e0e0e0;
          background: #fafafa;
          border-radius: 12px;
          padding: 2px;
          transition: border 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .auth-input-wrapper:focus-within {
          border-color: #1B5E20;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(27, 94, 32, 0.08);
        }

        .auth-input-icon {
          flex-shrink: 0;
          color: #9ca3af;
          margin: 0 0 0 14px;
          transition: color 0.2s;
        }

        .auth-input-wrapper:focus-within .auth-input-icon {
          color: #1B5E20;
        }

        .auth-input-wrapper input {
          flex: 1;
          padding: 12px 12px;
          border: none;
          background: transparent;
          font-size: 15px;
          color: #111827;
          outline: none;
          min-width: 0;
          font-family: inherit;
        }

        .auth-input-wrapper input::placeholder {
          color: #b0b0b0;
        }

        .auth-input-suffix {
          flex-shrink: 0;
          background: none;
          border: none;
          color: #9ca3af;
          padding: 0 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .auth-input-suffix:hover {
          color: #4b5563;
        }

        .auth-link-small {
          font-size: 13px;
          color: #1B5E20;
          font-weight: 600;
          transition: color 0.2s;
        }

        .auth-link-small:hover {
          color: #0f3a13;
        }

        .auth-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 13px 12px;
          background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          border: none;
          border-radius: 13px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.3s, transform 0.15s;
          box-shadow: 0 4px 16px rgba(27, 94, 32, 0.3);
          min-height: 52px;
          font-family: inherit;
          letter-spacing: 0.3px;
        }

        .auth-submit-btn:hover:not(:disabled) {
          box-shadow: 0 6px 24px rgba(27, 94, 32, 0.4);
          transform: translateY(-1px);
        }

        .auth-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .auth-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-google-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          background: #fff;
          color: #3c4043;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          border: 1px solid #dadce0;
          border-radius: 8px;
          cursor: pointer;
          transition: box-shadow 0.2s, background 0.2s;
        }
        .auth-google-btn:hover:not(:disabled) {
          box-shadow: 0 1px 6px rgba(60,64,67,0.25);
          background: #f8f9fa;
        }
        .auth-google-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .auth-card { padding: 36px 24px; }
        }

        @media (max-width: 480px) {
          .auth-card { padding: 28px 18px; border-radius: 20px; }
          .auth-input-wrapper input { font-size: 16px; }
          .auth-submit-btn { min-height: 48px; font-size: 15px; }
          .auth-google-btn { font-size: 14px; padding: 11px 14px; }
        }

        @media (max-width: 360px) {
          .auth-card { padding: 24px 14px; border-radius: 18px; }
          .auth-google-btn { font-size: 13px; gap: 8px; }
        }
      `}</style>
    </div>
  );
};

export default Login;
