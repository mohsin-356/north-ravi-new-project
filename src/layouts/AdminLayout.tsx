import React, { useState } from 'react';
import Header from '@/components/Header';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

type AdminLayoutProps = {
  children: React.ReactNode;
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Receptionist guard: allow only certain paths
  const receptionistAllowed = ['/tokens', '/today-tokens', '/token-history', '/search'];
  if (user?.role === 'receptionist') {
    const isAllowed = receptionistAllowed.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
    if (!isAllowed) {
      return <Navigate to="/tokens" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuToggle={toggleSidebar} />
      <div className="flex pt-16">
        <AdminSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={toggleSidebar} 
        />
        <main 
          className={`flex-1 transition-all duration-200 ease-in-out ${
            sidebarCollapsed ? 'ml-16' : 'ml-64'
          } p-0`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
