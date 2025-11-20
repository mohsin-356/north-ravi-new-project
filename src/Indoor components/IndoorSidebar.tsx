import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ShoppingCart, Warehouse, Users, Building, Receipt, FileText, ArrowLeftRight, UserCheck, LineChart, HelpCircle, Clock, Calculator, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  currentUser: any;
  onLogout: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

const IndoorSidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule, currentUser, onLogout, collapsed = false, onToggle }) => {
  const BRAND_NAME = 'SideBar';
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Warehouse },
    { id: 'suppliers', label: 'Suppliers', icon: Building },
    { id: 'sales-history', label: 'Sales History', icon: Receipt },
    { id: 'purchase-history', label: 'Purchase History', icon: FileText },
    { id: 'return-history', label: 'Return History', icon: ArrowLeftRight },
    { id: 'reports', label: 'Reports', icon: LineChart },
    { id: 'guidelines', label: 'Guidelines', icon: HelpCircle },
    { id: 'returns', label: 'Returns', icon: ArrowLeftRight },
    { id: 'audit-logs', label: 'Audit Logs', icon: Clock },
    { id: 'expenses', label: 'Expenses', icon: Calculator },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'user-management', label: 'User Management', icon: Users },
  ];

  const handleLogoutClick = () => {
    onLogout();
    navigate('/indoor/login', { replace: true });
  };

  // keyboard shortcuts similar to pharmacy
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable) return;
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); setActiveModule('pos'); }
      else if (!e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') { e.preventDefault(); setActiveModule('inventory'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveModule]);

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-200`}>
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${collapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white truncate">{BRAND_NAME}</h2>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.username || 'Admin'}</p>
                <p className="text-xs text-gray-400">{currentUser?.role || 'User'}</p>
              </div>
            </div>
          )}
          {onToggle && (
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <span className="block w-4 h-0.5 bg-gray-700 dark:bg-gray-200 mb-0.5"></span>
              <span className="block w-4 h-0.5 bg-gray-700 dark:bg-gray-200 mb-0.5"></span>
              <span className="block w-4 h-0.5 bg-gray-700 dark:bg-gray-200"></span>
            </Button>
          )}
        </div>
      </div>

      <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-4'} space-y-2 overflow-y-auto`}>
        {menuItems.map((item) => {
          const Icon = item.icon as any;
          return (
            <Button key={item.id}
              variant={activeModule === item.id ? 'default' : 'ghost'}
              className={`w-full ${collapsed ? 'justify-center' : 'justify-start'} dark:text-gray-200`}
              onClick={() => setActiveModule(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-4 w-4 ${!collapsed ? 'mr-2' : ''}`} />
              {!collapsed && item.label}
            </Button>
          );
        })}
      </nav>

      <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-gray-200 dark:border-gray-700`}>
        <Button className={`w-full ${collapsed ? 'justify-center' : ''} dark:text-gray-200`} onClick={handleLogoutClick}>
          <LogOut className={`h-4 w-4 ${!collapsed ? 'mr-2' : ''}`} />
          {!collapsed && 'Logout'}
        </Button>
      </div>
    </div>
  );
};

export default IndoorSidebar;
