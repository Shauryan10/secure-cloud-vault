import axios from "axios";

const api = axios.create({
    // Empty baseURL = relative to wherever the app is served from.
    // In Docker, nginx proxies /auth /assets /health → backend:8000.
    // In local dev (npm run dev), vite proxies those same paths to localhost:8000.
    baseURL: ""
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default api;