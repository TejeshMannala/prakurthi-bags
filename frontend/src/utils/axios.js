import axios from 'axios';

// Single, canonical API client for the whole app.
//
// baseURL is intentionally relative (empty by default):
//   - In development (react-scripts / CRA) requests like `/api/auth/google`
//     are forwarded to the backend by the CRA dev proxy (see "proxy" in
//     package.json -> http://localhost:5000).
//   - In production (the React build served by the Express backend) the same
//     relative URL hits the backend on the same origin, so there is no
//     hard-coded port that can go stale and cause ERR_CONNECTION_REFUSED.
//
// Set REACT_APP_API_URL only if you must talk to a backend on another origin
// (e.g. a deployed API). Leave it empty for the standard local setup.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
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
      // Token missing/invalid. Auth slices already clear the token on 401
      // where appropriate, so we just surface the error to the caller.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[api] 401 Unauthorized for', error.config && error.config.url);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
