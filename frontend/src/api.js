import axios from 'axios';

// For local development: uses relative /api (proxied by Vite)
// For production: uses VITE_API_URL environment variable (Cloudflare tunnel URL)
const API_BASE_URL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api` 
    : '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

export default api;
