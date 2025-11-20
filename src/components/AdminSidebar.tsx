import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  CalendarCheck,
  BarChart2,
  RotateCcw,
  BookOpen,
  ClipboardList,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  History,
  Calculator,
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';

export type AdminSidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

const navItems = [
  // Requested order first (IPD moved to custom dropdown below)
  // Removed Pharmacy and Lab from hospital sidebar
  // Remaining items
  { path: '/tokens', label: 'Generate Token', icon: <ClipboardList className="w-5 h-5" /> },
  { path: '/today-tokens', label: "Today's Tokens", icon: <CalendarCheck className="w-5 h-5" /> },
  { path: '/token-history', label: 'Token History', icon: <History className="w-5 h-5" /> },
  { path: '/departments', label: 'Departments', icon: <ClipboardList className="w-5 h-5" /> },
  { path: '/search', label: 'Search Patients', icon: <Search className="w-5 h-5" /> },
  { path: '/doctors', label: 'Doctors', icon: <UserPlus className="w-5 h-5" /> },
  { path: '/users', label: 'Users', icon: <Users className="w-5 h-5" /> },
  { path: '/audit', label: 'Audit', icon: <ClipboardList className="w-5 h-5" /> },
  { path: '/backup', label: 'Backup', icon: <RotateCcw className="w-5 h-5" /> },
  { path: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed = false, onToggle }) => {
  const { settings } = useSettings();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({ staff: false, reports: false });

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  // Role-based visibility: Receptionist sees only specified items
  const visibleItems = React.useMemo(() => {
    if (user?.role === 'receptionist') {
      return [
        { path: '/tokens', label: 'Generate Token', icon: <ClipboardList className="w-5 h-5" /> },
        { path: '/today-tokens', label: "Today's Tokens", icon: <CalendarCheck className="w-5 h-5" /> },
        { path: '/token-history', label: 'Token History', icon: <History className="w-5 h-5" /> },
        { path: '/search', label: 'Search Patients', icon: <Search className="w-5 h-5" /> },
      ];
    }
    return navItems;
  }, [user]);

  // Precompute IPD state for rendering (avoid IIFE in JSX)
  const staffActive = location.pathname === '/staff' || location.pathname.startsWith('/staff/');
  const reportsActive = location.pathname === '/reports' || location.pathname.startsWith('/reports/');
  const reportsOpen = !!openMenus['reports'];
  const staffOpen = !!openMenus['staff'];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r flex flex-col transition-[width] duration-200 z-20 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand + toggle */}
      <div className="h-16 border-b flex items-center px-3 gap-2">
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-semibold leading-5 truncate">{settings.hospitalName || 'Hospital Name'}</div>
            <div className="text-xs text-gray-500 truncate">{(user?.role || 'admin').replace(/\b\w/g, c => c.toUpperCase())}</div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-indigo-50 text-indigo-700"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* IPD menu removed */}
        {/* Staff dropdown */}
        <div className="space-y-1" key="staff-group">
          <div
            className={`flex items-center rounded-md px-2 h-9 text-sm ${
              collapsed ? 'justify-center' : 'gap-3'
            } ${staffActive ? 'bg-indigo-700 text-white shadow-sm' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-800'}`}
            title="Staff"
          >
            <span className={`${staffActive ? 'text-white' : 'text-indigo-700 group-hover:text-indigo-800'} inline-flex`}>
              <Users className="w-5 h-5" />
            </span>
            {!collapsed && (
              <>
                <Link to="/staff" className="flex-1 truncate">Staff</Link>
                <button
                  aria-label={staffOpen ? 'Collapse Staff menu' : 'Expand Staff menu'}
                  onClick={() => setOpenMenus((p) => ({ ...p, staff: !p.staff }))}
                  className="ml-auto inline-flex items-center justify-center w-6 h-6 rounded hover:bg-indigo-100"
                >
                  {staffOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
          {!collapsed && staffOpen && (
            <div className="ml-8 space-y-1">
              {[
                { to: '/staff/daily', label: 'Daily View' },
                { to: '/staff/monthly', label: 'Monthly View' },
                { to: '/staff/management', label: 'Staff Management' },
                { to: '/staff/settings', label: 'Settings' },
              ].map((link) => {
                const subActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center h-8 px-2 rounded-md text-sm ${
                      subActive ? 'bg-indigo-50 text-indigo-900' : 'text-gray-700 hover:bg-indigo-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        {/* Reports dropdown */}
        <div className="space-y-1" key="reports-group">
          <div
            className={`flex items-center rounded-md px-2 h-9 text-sm ${
              collapsed ? 'justify-center' : 'gap-3'
            } ${reportsActive ? 'bg-indigo-700 text-white shadow-sm' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-800'}`}
            title="Reports"
          >
            <span className={`${reportsActive ? 'text-white' : 'text-indigo-700 group-hover:text-indigo-800'} inline-flex`}>
              <BookOpen className="w-5 h-5" />
            </span>
            {!collapsed && (
              <>
                <Link to="/reports/dashboard" className="flex-1 truncate">Reports</Link>
                <button
                  aria-label={reportsOpen ? 'Collapse Reports menu' : 'Expand Reports menu'}
                  onClick={() => setOpenMenus((p) => ({ ...p, reports: !p.reports }))}
                  className="ml-auto inline-flex items-center justify-center w-6 h-6 rounded hover:bg-indigo-100"
                >
                  {reportsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
          {!collapsed && reportsOpen && (
            <div className="ml-8 space-y-1">
              {[
                { to: '/reports/dashboard', label: 'Dashboard' },
                { to: '/reports/expenses', label: 'Expenses' },
                { to: '/reports/expense-departments', label: 'Expense Departments' },
                { to: '/reports/trend', label: 'Trend' },
                { to: '/reports/doctors', label: 'Doctors' },
                { to: '/reports/transactions', label: 'Transactions' },
              ].map((link) => {
                const subActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center h-8 px-2 rounded-md text-sm ${
                      subActive ? 'bg-indigo-50 text-indigo-900' : 'text-gray-700 hover:bg-indigo-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        {visibleItems.map((item) => {

          // Default item with active highlighting (IPD handled above)
          const active = isActive(item.path);
          if (item.path === '/staff-attendance' || item.path === '/reports') return null;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center rounded-md px-2 h-9 text-sm transition-colors ${
                collapsed ? 'justify-center' : 'gap-3'
              } ${
                active
                  ? 'bg-indigo-700 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-800'
              }`}
              title={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`${active ? 'text-white' : 'text-indigo-700 group-hover:text-indigo-800'} inline-flex`}>{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer: logout */}
      <div className="p-2 border-t">
        <button onClick={() => { logout(); navigate('/login'); }} className={`w-full inline-flex items-center justify-center rounded-md border h-9 ${
          collapsed ? 'px-0' : 'gap-2 px-3'
        } hover:bg-red-50 text-red-600`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
