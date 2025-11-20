import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFinanceAuth } from '@/Finance contexts/AuthContext';
import { Home } from 'lucide-react';

export default function FinanceLogin() {
  const { login, loading } = useFinanceAuth();
  const [username, setUsername] = useState('finance');
  const [password, setPassword] = useState('finance123');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Organization name from Finance Settings
  const DEFAULT_BRAND = 'Mindspire Hospital Management System';
  const [orgName, setOrgName] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('finance_settings');
      if (!raw) return DEFAULT_BRAND;
      const data = JSON.parse(raw);
      return (data?.orgName && String(data.orgName).trim()) || DEFAULT_BRAND;
    } catch { return DEFAULT_BRAND; }
  });
  useEffect(() => {
    const onCustom = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {};
        if (detail && typeof detail.orgName === 'string') {
          setOrgName(detail.orgName.trim() || DEFAULT_BRAND);
        } else {
          const raw = localStorage.getItem('finance_settings');
          const data = raw ? JSON.parse(raw) : null;
          setOrgName((data?.orgName && String(data.orgName).trim()) || DEFAULT_BRAND);
        }
      } catch { setOrgName(DEFAULT_BRAND); }
    };
    window.addEventListener('finance_settings_updated', onCustom as EventListener);
    return () => window.removeEventListener('finance_settings_updated', onCustom as EventListener);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = await login(username, password);
    if (!ok) setError('Invalid credentials');
    else navigate('/finance', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 relative">
      {/* Home icon to navigate back to the main portal */}
      <Link to="/" className="absolute top-5 right-5 text-gray-500 hover:text-gray-700" aria-label="Go to portal">
        <Home size={24} />
      </Link>
      <div className="w-full max-w-sm mx-auto">
        {/* Title block (matches hospital login) */}
        <div className="mb-6 text-center flex flex-col items-center">
          <div className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight drop-shadow-lg bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-600 bg-clip-text text-transparent select-none">
            {orgName}
          </div>
          <div className="mt-2 text-sm text-blue-700 font-medium">Hospital Management System</div>
        </div>

        {/* Login card */}
        <form onSubmit={onSubmit} className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-indigo-100 px-7 py-8 space-y-6">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Username</label>
            <input
              value={username}
              onChange={e=>setUsername(e.target.value)}
              placeholder="Username"
              className="w-full px-5 py-4 text-base rounded-xl border border-indigo-200 focus:border-indigo-500 bg-white shadow-sm focus:shadow-indigo-100 outline-none transition-all font-medium placeholder:text-indigo-300"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-5 py-4 text-base rounded-xl border border-indigo-200 focus:border-indigo-500 bg-white shadow-sm focus:shadow-indigo-100 outline-none transition-all font-medium placeholder:text-indigo-300"
            />
          </div>
          <button
            disabled={loading}
            className="w-full py-4 rounded-xl text-base font-bold tracking-wide text-white bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-600 hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
