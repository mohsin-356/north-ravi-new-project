import React, { createContext, useContext, useEffect, useState } from 'react';
import { indoorApi } from '@/Indoor lib/api';

type IndoorUser = { _id: string; username: string; role: string } | null;

type Ctx = {
  user: IndoorUser;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const IndoorAuthContext = createContext<Ctx | undefined>(undefined);

export const IndoorAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IndoorUser>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('indoor_auth');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const login = async (username: string, password: string) => {
    const { data } = await indoorApi.post('/users/login', { username, password });
    setUser(data);
    localStorage.setItem('indoor_auth', JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('indoor_auth');
  };

  return (
    <IndoorAuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </IndoorAuthContext.Provider>
  );
};

export const useIndoorAuth = () => {
  const ctx = useContext(IndoorAuthContext);
  if (!ctx) throw new Error('useIndoorAuth must be used within IndoorAuthProvider');
  return ctx;
};
