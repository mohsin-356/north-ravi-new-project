
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  Users,
  Building,
  ShieldCheck,
  Settings,
  LogOut,
  Clock,
  Calculator,
  UserCheck,
  Building2,
  Receipt,
  FileText,
  BarChart3,
  Database,
  ArrowLeftRight,
  LineChart,
  CreditCard,
  HelpCircle
} from 'lucide-react';


interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  currentUser: any;
  onLogout: () => void;
  isUrdu: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeModule, 
  setActiveModule, 
  currentUser, 
  onLogout, 
  isUrdu,
  collapsed = false,
  onToggle
}) => {

  const BRAND_NAME = 'SideBar ';
  const navigate = useNavigate();
  const text = {
    en: {
      dashboard: 'Dashboard',
      medicines: 'Medicines',
      medicineDatabase: '50K Database',
      pos: 'Point of Sale',
      inventory: 'Inventory',
      customers: 'Customers',
      suppliers: 'Suppliers',
      salesHistory: 'Sales History',
      purchaseHistory: 'Purchase History',
      returnHistory: 'Return History',
      
      staffAttendance: 'Staff Attendance',
      reports: 'Reports',
      guidelines: 'Guidelines',
      auditLogs: 'Audit Logs',
      expenses: 'Expenses',
      licenseManagement: 'Licenses',
      settings: 'Settings',
      logout: 'Logout',
      welcome: 'Welcome',
      enhancedReports: 'Analytics',
      creditOverview: 'Credit Overview',
      returns: 'Returns',
      prescriptions: 'Prescriptions',

    },
    ur: {
      dashboard: 'ڈیش بورڈ',
      medicines: 'ادویات',
      medicineDatabase: '50 ہزار ڈیٹابیس',
      pos: 'پوائنٹ آف سیل',
      inventory: 'انوینٹری',
      customers: 'کسٹمرز',
      suppliers: 'سپلائرز',
      salesHistory: 'سیلز ہسٹری',
      purchaseHistory: 'خریداری ہسٹری',
      returnHistory: 'ریٹرن ہسٹری',
      
      staffAttendance: 'عملے کی حاضری',
      reports: 'رپورٹس',
      guidelines: 'ہدایات',
      auditLogs: 'آڈٹ لاگز',
      expenses: 'اخراجات',
      licenseManagement: 'لائسنس',
      settings: 'سیٹنگز',
      logout: 'لاگ آؤٹ',
      welcome: 'خوش آمدید',
      enhancedReports: 'تجزیات',
      creditOverview: 'کریڈٹ اوورویو',
      returns: 'واپسی',
      prescriptions: 'پرچیان',

    }
  };

  const t = text.en;

  // Define all possible menu items
  const allMenuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'pos', label: t.pos, icon: ShoppingCart },
    { id: 'inventory', label: t.inventory, icon: Warehouse },
    { id: 'customers', label: t.customers, icon: Users },
    { id: 'suppliers', label: t.suppliers, icon: Building },
    { id: 'sales-history', label: t.salesHistory, icon: Receipt },
    { id: 'purchase-history', label: t.purchaseHistory, icon: FileText },
    { id: 'return-history', label: t.returnHistory, icon: ArrowLeftRight },
    { id: 'staff-attendance', label: t.staffAttendance, icon: UserCheck },
    { id: 'reports', label: t.reports, icon: LineChart },
    { id: 'guidelines', label: t.guidelines, icon: HelpCircle },
    { id: 'credit-overview', label: t.creditOverview, icon: CreditCard },
    { id: 'returns', label: t.returns, icon: ArrowLeftRight },
    
    { id: 'audit-logs', label: t.auditLogs, icon: Clock },
    { id: 'expenses', label: t.expenses, icon: Calculator },
    { id: 'settings', label: t.settings, icon: Settings }
  ];

  // Normalize role for safer checks (handles "Salesman", "sales man", etc.)
  const usernameNorm = (currentUser?.username || (currentUser as any)?.name || '')
    ?.toString?.()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  let roleNorm = (currentUser?.role || (currentUser as any)?.position || '')
    ?.toString?.()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  if (usernameNorm === 'salesman') roleNorm = 'salesman';

  // Map backend roles to pharmacy app roles
  const mapRole = (r?: string) => {
    switch (r) {
      case 'admin':
        return 'admin';
      case 'receptionist':
      case 'ipd':
        return 'staff';
      case 'doctor':
        return 'pharmacist';
      case 'salesman':
        return 'salesman';
      default:
        return r || 'staff';
    }
  };
  roleNorm = mapRole(roleNorm);

  // Filter menu items based on role
  const getMenuItemsForRole = (role?: string) => {
    switch (role) {
      case 'salesman':
      case 'staff':
        return allMenuItems.filter((m) =>
          ['dashboard', 'pos', 'inventory', 'customers', 'suppliers', 'sales-history', 'purchase-history', 'return-history', 'staff-attendance', 'returns', 'credit-overview'].includes(m.id)
        );
      case 'manager':
      case 'pharmacist':
        return allMenuItems.filter((m) =>
          ['dashboard', 'pos', 'inventory', 'customers', 'suppliers', 'sales-history', 'purchase-history', 'return-history', 'staff-attendance', 'returns', 'credit-overview'].includes(m.id)
        );
      case 'admin':
      default:
        return [
          ...allMenuItems,
          { id: 'user-management', label: 'User Management', icon: Users }
        ];
    }
  };

  const menuItems = getMenuItemsForRole(roleNorm);

  // Helper to handle logout and redirect (no full app reload)
  const handleLogoutClick = () => {
    onLogout();
    // Use router navigation to go to pharmacy login
    navigate('/pharmacy/login', { replace: true });
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable) return;

      // Ctrl + N - New Sale (Open POS)
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveModule('pos');
      }
      // Shift + I - Inventory
      else if (!e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        if (roleNorm === 'salesman' || roleNorm === 'staff') return; // block for salesman & staff
        e.preventDefault();
        setActiveModule('inventory');
      }
      // Ctrl + Shift + C - Customers
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        if (roleNorm === 'salesman' || roleNorm === 'staff') return; // block for salesman & staff
        e.preventDefault();
        setActiveModule('customers');
      }
      // Ctrl + Shift + S - Suppliers
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        if (roleNorm === 'salesman' || roleNorm === 'staff') return; // block for salesman & staff
        e.preventDefault();
        setActiveModule('suppliers');
      }
      // Shift + R - Reports
      else if (!e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        if (roleNorm === 'salesman' || roleNorm === 'staff') return; // block for salesman & staff
        e.preventDefault();
        setActiveModule('reports');
      }
      // Shift + F - Focus Inventory search
      else if (!e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        try {
          // Ensure inventory module is active, then focus
          setActiveModule('inventory');
          setTimeout(() => {
            const input = document.getElementById('inventory-search-input') as HTMLInputElement | null;
            input?.focus();
          }, 50);
        } catch {}
      }
      // Ctrl + D - Focus POS search
      else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        try {
          setActiveModule('pos');
          setTimeout(() => {
            const input = document.getElementById('pos-search-input') as HTMLInputElement | null;
            input?.focus();
          }, 50);
        } catch {}
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveModule, roleNorm]);

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-200`}>
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${collapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white truncate">{BRAND_NAME}</h2>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentUser?.username || 'Admin'}
                </p>
                <p className="text-xs text-gray-400">
                  {currentUser?.role || 'User'}
                </p>
              </div>
            </div>
          )}
          {onToggle && (
            <Button variant="ghost" size="icon" onClick={onToggle} className={`${collapsed ? '' : ''}`}>
              {/* simple hamburger */}
              <span className="block w-4 h-0.5 bg-gray-700 dark:bg-gray-200 mb-0.5"></span>
              <span className="block w-4 h-0.5 bg-gray-700 dark:bg-gray-200 mb-0.5"></span>
              <span className="block w-4 h-0.5 bg-gray-700 dark:bg-gray-200"></span>
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-4'} space-y-2 overflow-y-auto`}> 
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.id}>
              <Button
                variant={activeModule === item.id ? "default" : "ghost"}
                className={`w-full ${collapsed ? 'justify-center' : 'justify-start'} dark:text-gray-200`}
                onClick={() => {
                  // Treat 'prescriptions' as an internal module so the sidebar remains visible
                  setActiveModule(item.id);
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`h-4 w-4 ${!collapsed ? 'mr-2' : ''}`} />
                {!collapsed && item.label}
              </Button>
            
            </React.Fragment>
          );
        })}
      </nav>
      
      {/* Logout Button for all users at the bottom */}
      <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-gray-200 dark:border-gray-700`}> 
        <Button
          className={`w-full ${collapsed ? 'justify-center' : ''} dark:text-gray-200`}
          onClick={handleLogoutClick}
        >
          <LogOut className={`h-4 w-4 ${!collapsed ? 'mr-2' : ''}`} />
          {!collapsed && 'Logout'}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;