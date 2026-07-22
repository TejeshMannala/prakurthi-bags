import axios from "axios";

// Normalize URL
const normalizeOrigin = (url) => {
  if (!url) return "";
  let u = url.trim().replace(/\/+$/, "");
  return u.replace(/\/api$/, "");
};

// Get Base URL
const getBaseURL = () => {
  // Vite exposes env vars as import.meta.env.VITE_*
  // For production, use the backend URL
  const viteUrl = import.meta.env.VITE_API_URL;
  const envUrl = normalizeOrigin(viteUrl);

  if (envUrl) {
    return envUrl;
  }

  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost"
  ) {
    return "https://prakurthi-bags.onrender.com";
  }

  return "http://localhost:5000";
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Login Check
const isLoginRequest = (config) =>
  config?.url?.includes("/api/admin/login");

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isLoginRequest(error.config)
    ) {
      localStorage.removeItem("adminToken");

      if (
        window.location.pathname.startsWith("/admin")
      ) {
        window.location.href = "/admin/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;