import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '');
const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default api;
