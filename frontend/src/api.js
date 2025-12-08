import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const selectedDb = localStorage.getItem('selectedDatabase');
    if (selectedDb) {
        config.headers['x-database'] = selectedDb;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
