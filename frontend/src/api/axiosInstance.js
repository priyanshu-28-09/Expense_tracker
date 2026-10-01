import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token automatically
API.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

// Simple response error handler
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !/^\/user\/(login|register)/.test(err.config?.url || '')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    const message = err?.response?.data?.message || err.message || 'API Error';
    return Promise.reject({ ...err, message });
  }
);

export default API;
