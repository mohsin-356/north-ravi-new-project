import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

type FinanceUser = { username: string; role: 'finance' } | null;

type Ctx = {
  user: FinanceUser;
  token: string | null;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
};

const FinanceAuthContext = createContext<Ctx | undefined>(undefined);

export const FinanceAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FinanceUser>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('finance_token'));
  const [loading, setLoading] = useState(false);
  const API_BASE = API_URL || (import.meta as any).env?.VITE_API_URL || '';

  useEffect(() => {
    const check = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/finance/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUser({ username: data.user.username, role: 'finance' });
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem('finance_token');
        }
      } catch {
        // ignore
      }
    };
    check();
  }, [token, API_BASE]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/finance/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('finance_token', data.token);
      setToken(data.token);
      setUser({ username: data.username, role: 'finance' });
      return true;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('finance_token');
    setToken(null);
    setUser(null);
  };

  return (
    <FinanceAuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </FinanceAuthContext.Provider>
  );
};

export const useFinanceAuth = () => {
  const ctx = useContext(FinanceAuthContext);
  if (!ctx) throw new Error('useFinanceAuth must be used within FinanceAuthProvider');
  return ctx;
};
