import axios from 'axios';

// Indoor module axios instance pointing to /api/indoor
const fromEnv = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
let resolvedBase = fromEnv && String(fromEnv).trim() ? String(fromEnv).trim() : '';

if (!resolvedBase) {
  try { if ((import.meta as any)?.env?.DEV) resolvedBase = ''; } catch {}
  const isFileProtocol = typeof window !== 'undefined' && window.location?.protocol === 'file:';
  if (isFileProtocol) {
    resolvedBase = 'http://127.0.0.1:5002';
  }
}

export const INDOOR_API_URL = resolvedBase;

export const indoorApi = axios.create({
  baseURL: INDOOR_API_URL ? `${INDOOR_API_URL}/api/indoor` : '/api/indoor',
  headers: { 'Content-Type': 'application/json' }
});

export const get = <T = any>(url: string) => indoorApi.get<T>(url).then(res => res.data);
export const post = <T = any>(url: string, data: any) => indoorApi.post<T>(url, data).then(res => res.data);
export const put = <T = any>(url: string, data: any) => indoorApi.put<T>(url, data).then(res => res.data);
export const del = <T = any>(url: string) => indoorApi.delete<T>(url).then(res => res.data);
