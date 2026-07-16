import axios from 'axios';

const getBaseURL = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin + '/api';
  }
  return '';
};

const api = axios.create({
  baseURL: getBaseURL(),
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
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[api] 401 Unauthorized for', error.config && error.config.url);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
