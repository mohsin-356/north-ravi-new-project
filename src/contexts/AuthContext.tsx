
import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';
import { postAudit } from '@/lib/audit';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'receptionist' | 'doctor';
  username: string;
}

interface LoginResponse extends User {
  token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// The demo users array has been removed. Authentication now relies on the real backend API (/api/users/login).

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // On mount, do NOT auto-login from localStorage. Always require login on app reopen.
useEffect(() => {
  setUser(null);
  localStorage.removeItem('currentUser');
}, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const API_BASE = API_URL ? `${API_URL}/api` : '/api';
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        return false;
      }

      const data: LoginResponse = await res.json();
      // Persist user and token
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      const { token, ...userOnly } = data;
      setUser(userOnly);
      localStorage.setItem('currentUser', JSON.stringify(userOnly));
      try { await postAudit({ action: 'login', module: 'auth', details: { username } }); } catch {}
      return true;
    } catch (err) {
      console.error('Login error', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    try { postAudit({ action: 'logout', module: 'auth' }); } catch {}
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
