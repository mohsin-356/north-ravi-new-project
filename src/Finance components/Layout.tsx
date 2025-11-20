import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useFinanceAuth } from '@/Finance contexts/AuthContext';

export default function FinanceLayout() {
  const { user, logout } = useFinanceAuth();
  const location = useLocation();
  const isActive = (p: string) => location.pathname.startsWith(p);

  // Organization/brand name from Finance Settings
  const DEFAULT_BRAND = 'Mindspire Hospital Management System';
  const [orgName, setOrgName] = React.useState<string>(() => {
    try {
      const raw = localStorage.getItem('finance_settings');
      if (!raw) return DEFAULT_BRAND;
      const data = JSON.parse(raw);
      return (data?.orgName && String(data.orgName).trim()) || DEFAULT_BRAND;
    } catch {
      return DEFAULT_BRAND;
    }
  });
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'finance_settings') {
        try {
          const data = e.newValue ? JSON.parse(e.newValue) : null;
          setOrgName((data?.orgName && String(data.orgName).trim()) || DEFAULT_BRAND);
        } catch {
          setOrgName(DEFAULT_BRAND);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    // Custom event from Settings page (fires in same tab)
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
      } catch {
        setOrgName(DEFAULT_BRAND);
      }
    };
    window.addEventListener('finance_settings_updated', onCustom as EventListener);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r shadow-sm sticky top-0 h-screen hidden md:flex flex-col">
        <div className="px-4 py-4 border-b flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">F</div>
          <div>
            <div className="font-semibold leading-tight">{orgName}</div>
            <div className="text-xs text-gray-500">{user ? `Signed in as ${user.username}` : '—'}</div>
          </div>
        </div>
        <nav className="p-3 space-y-2">
          <Link to="/finance/lab" className={`block px-3 py-2 rounded-lg transition ${isActive('/finance/lab') ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-indigo-50 text-gray-800'}`}>Lab</Link>
          <Link to="/finance/pharmacy" className={`block px-3 py-2 rounded-lg transition ${isActive('/finance/pharmacy') ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-indigo-50 text-gray-800'}`}>Pharmacy</Link>
          <Link to="/finance/hospital" className={`block px-3 py-2 rounded-lg transition ${isActive('/finance/hospital') ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-indigo-50 text-gray-800'}`}>Hospital</Link>
          <div className="h-px bg-gray-200 my-2" />
          <Link to="/finance/users" className={`block px-3 py-2 rounded-lg transition ${isActive('/finance/users') ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-indigo-50 text-gray-800'}`}>Users</Link>
          <Link to="/finance/settings" className={`block px-3 py-2 rounded-lg transition ${isActive('/finance/settings') ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-indigo-50 text-gray-800'}`}>Settings</Link>
        </nav>
        <div className="mt-auto p-3 border-t">
          <button onClick={logout} className="w-full px-3 py-2 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800">Logout</button>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar / Header (visible on all screens) */}
        <header className="bg-white border-b shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">F</div>
              <div>
                <div className="font-semibold">{orgName}</div>
                <div className="text-xs text-gray-500">Signed in as {user?.username}</div>
              </div>
            </div>
            {/* Right side intentionally left blank (header buttons removed) */}
            <div />
          </div>
        </header>

        {/* Full-width main content */}
        <main className="p-4 md:p-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

