import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Pharmacy components/Sidebar';
import Dashboard from '@/components/Pharmacy components/Dashboard'; 
import POSSystem from '@/components/Pharmacy components/POSSystem';
import SummaryReportClean from '@/components/Pharmacy components/SummaryReportClean';
import Settings from '@/components/Pharmacy components/Settings';
import Login from '@/components/Pharmacy components/Login';
import Footer from '@/components/Pharmacy components/Footer';
import AuditLogs from '@/components/Pharmacy components/AuditLogs';
import ExpenseTracker from '@/components/Pharmacy components/ExpenseTracker';
import CustomerManagement from '@/components/Pharmacy components/CustomerManagement';
import SupplierManagement from '@/components/Pharmacy components/SupplierManagement';
import BranchManagement from '@/components/Pharmacy components/BranchManagement';
import StaffAttendance from '@/components/Pharmacy components/StaffAttendance';
import CompanyCreditOverview from '@/components/Pharmacy components/CompanyCreditOverview';
import EnhancedHeader from '@/components/Pharmacy components/EnhancedHeader';
import SalesHistory from '@/components/Pharmacy components/SalesHistory';
import PurchaseHistory from '@/components/Pharmacy components/PurchaseHistory';
import ReturnHistory from '@/components/Pharmacy components/ReturnHistory';

import InventoryAndReturns from '@/components/Pharmacy components/InventoryAndReturns';
import ReturnsContainer from '@/components/Pharmacy components/ReturnsContainer';
import { Guidelines } from '@/components/Pharmacy components/Guidelines';
import UserManagement from '@/components/Pharmacy components/UserManagement';
import { offlineManager } from '@/pharmacy utilites/offlineManager';
import { useAuditLog } from '@/Pharmacy contexts/AuditLogContext';
import { useAuth } from '@/Pharmacy contexts/AuthContext';

const Index = () => {
  // Load user from localStorage on initial render
  
  
    const { logAction } = useAuditLog();
  const { user: currentUser, login, logout } = useAuth();
  const [activeModule, setActiveModule] = useState(() => {
    return localStorage.getItem('activeModule') || 'dashboard';
  });

  const roleNorm = React.useMemo(() => {
    const username = (currentUser as any)?.username?.toString?.().trim().toLowerCase();
    if (username === 'salesman') return 'salesman';
    const raw = (currentUser as any)?.role || (currentUser as any)?.position || '';
    return raw?.toString?.().trim().toLowerCase().replace(/\s+/g, '');
  }, [currentUser]);

  // Allowed modules for salesman role
  const salesmanAllowed = React.useMemo(() => (
    ['dashboard', 'pos', 'inventory', 'customers', 'suppliers', 'returns', 'credit-overview', 'sales-history', 'purchase-history', 'return-history']
  ), []);
  // Allowed modules for pharmacist role (same as salesman per requirement)
  const pharmacistAllowed = React.useMemo(() => (
    ['dashboard', 'pos', 'inventory', 'customers', 'suppliers', 'returns', 'credit-overview', 'sales-history', 'purchase-history', 'return-history']
  ), []);

  // Helper to change module and persist choice
  const changeModule = (module: string) => {
    // Enforce role-based restriction for salesman
    if (roleNorm === 'salesman' && !salesmanAllowed.includes(module)) {
      setActiveModule('pos');
      localStorage.setItem('activeModule', 'pos');
      return;
    }
    // Enforce role-based restriction for pharmacist
    if (roleNorm === 'pharmacist' && !pharmacistAllowed.includes(module)) {
      setActiveModule('pos');
      localStorage.setItem('activeModule', 'pos');
      return;
    }
    setActiveModule(module);
    localStorage.setItem('activeModule', module);
  };

  // Keep localStorage in sync in case activeModule changes elsewhere
  useEffect(() => {
    localStorage.setItem('activeModule', activeModule);
  }, [activeModule]);

  // If logged-in user is a salesman or pharmacist, force an allowed module (default to POS)
  useEffect(() => {
    if (roleNorm === 'salesman' && !salesmanAllowed.includes(activeModule)) {
      setActiveModule('pos');
      localStorage.setItem('activeModule', 'pos');
    }
    if (roleNorm === 'pharmacist' && !pharmacistAllowed.includes(activeModule)) {
      setActiveModule('pos');
      localStorage.setItem('activeModule', 'pos');
    }
  }, [roleNorm, activeModule, salesmanAllowed, pharmacistAllowed]);
  // Urdu mode removed; always use English and LTR
  const isUrdu = false;
  // Initialise dark mode from saved preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Sidebar collapse state MUST be declared before any conditional return
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed((s) => !s);

  // Sync dark mode with DOM & localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Handle user login
  

    const handleLogout = () => {
    if (currentUser) {
      logAction('LOGOUT', `${currentUser.name} logged out`, 'user', currentUser.id);
    }
    logout();
  };

  // Login screen: no pharmacy header/footer; plain white background
  if (!currentUser) {
    return (
      <div className={"min-h-screen bg-white ltr"}>
        <Login onLogin={login} isUrdu={false} setIsUrdu={() => {}} />
      </div>
    );
  }

  const hasAccess = (module: string) => {
    const role = roleNorm;
    const username = (currentUser as any)?.username;
    if (!role && username === 'admin1') return true; // fallback
    if (role === 'admin' || username === 'admin1') return true;
    if (role === 'salesman' || username === 'salesman') {
      return salesmanAllowed.includes(module);
    }
    if (role === 'pharmacist') {
      return pharmacistAllowed.includes(module);
    }
    if (role === 'manager') {
      return module !== 'settings';
    }
    return false;
  };

  const renderActiveModule = () => {
    if (!hasAccess(activeModule)) {
      return <div className="p-8 text-red-600 font-bold">Access Denied</div>;
    }
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard isUrdu={false} />;
      case 'pos':
        return <POSSystem isUrdu={false} />;
      case 'inventory':
        return <InventoryAndReturns isUrdu={false} />;
      case 'customers':
        return <CustomerManagement isUrdu={false} />;
      case 'suppliers':
        return <SupplierManagement isUrdu={false} />;
      
      case 'sales-history':
        return <SalesHistory />;
      case 'purchase-history':
        return <PurchaseHistory />;
      case 'return-history':
        return <ReturnHistory />;
      case 'branches':
        return <BranchManagement isUrdu={false} />;
      
      case 'reports':
        return <SummaryReportClean isUrdu={false} />;
      case 'guidelines':
        return <Guidelines isUrdu={false} />;
      case 'audit-logs':
        return <AuditLogs isUrdu={false} />;
      case 'staff-attendance':
        return <StaffAttendance isUrdu={false} />;
      case 'expenses':
        return <ExpenseTracker isUrdu={false} />;
      case 'settings':
        return <Settings isUrdu={false} setIsUrdu={() => {}} />;
      case 'credit-overview':
        return <CompanyCreditOverview />;
      case 'returns':
        return <ReturnsContainer isUrdu={false} />;
      case 'user-management':
        return <UserManagement />;
      default:
        return <Dashboard isUrdu={false} />;
    }
  };

  const handleProfileClick = () => {
    setActiveModule('settings');
  };

  const handleSettingsClick = () => {
    setActiveModule('settings');
  };

  return (
    <div className={"min-h-screen bg-gray-50 dark:bg-gray-900 ltr"}>
      <div className="flex">
        <Sidebar 
          activeModule={activeModule}
          setActiveModule={changeModule}
          currentUser={currentUser}
          onLogout={handleLogout}
          isUrdu={false}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
        <div className="flex-1 overflow-hidden">
        {activeModule !== 'pos' && (
          <EnhancedHeader
            isUrdu={false}
            setIsUrdu={() => {}}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            currentUser={currentUser}
            onProfileClick={handleProfileClick}
            onSettingsClick={handleSettingsClick}
          />
        )}
        <div className="p-1">
          {renderActiveModule()}
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Index;

