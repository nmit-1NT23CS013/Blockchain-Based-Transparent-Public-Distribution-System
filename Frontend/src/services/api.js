import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

// Inject authentication token into all outgoing requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("pds_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Gracefully handle session expiry (401 Unauthorized)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired or token invalid. Clearing local state...");
      localStorage.removeItem("pds_token");
      localStorage.removeItem("pds_user");
      // Force page reload redirecting to Login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default API;
