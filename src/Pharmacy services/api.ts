import axios from 'axios';

// Centralized axios instance for backend API calls.
// - Dev (Vite): use VITE_API_BASE_URL or default to '/api'
// - Electron Prod (file://): default to http://127.0.0.1:5002
const fromEnv = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
let base = fromEnv && String(fromEnv).trim() ? String(fromEnv).trim() : '';
if (!base) {
  const isFileProtocol = typeof window !== 'undefined' && window.location?.protocol === 'file:';
  if (isFileProtocol) base = 'http://127.0.0.1:5002/api';
}
const api = axios.create({
  baseURL: base || '/api',
});

export default api;
