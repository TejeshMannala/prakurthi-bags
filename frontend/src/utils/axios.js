import axios from 'axios';

// Normalize any configured API URL to a bare origin (no trailing slash, no
// trailing /api). Every request path already begins with `/api/...`, so the
// baseURL MUST be origin-only — otherwise we get `origin/api/api/...` 404s.
// We strip any `/api` suffix here defensively so a misconfigured env var
// (e.g. REACT_APP_API_URL=https://x.onrender.com/api) can never double up.
const normalizeOrigin = (url) => {
  if (!url) return '';
  let u = url.trim().replace(/\/+$/, ''); // drop trailing slashes
  u = u.replace(/\/api$/, ''); // drop a trailing /api if present
  return u;
};

const getBaseURL = () => {
  const envUrl = normalizeOrigin(process.env.REACT_APP_API_URL);
  if (envUrl) return envUrl;
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  return ''; // empty => CRA dev proxy forwards /api to localhost:5000
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const isAuthRoute = url.includes('/api/auth/login') ||
        url.includes('/api/auth/register') ||
        url.includes('/api/auth/google') ||
        url.includes('/api/auth/forgot-password') ||
        url.includes('/api/auth/verify-otp') ||
        url.includes('/api/auth/reset-password');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
