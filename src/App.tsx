import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { scheduleDailyTokenReset } from "./utils/hospitalUtils";
import { TooltipProvider } from "@/components/ui/tooltip";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
// Index dashboard no longer used; root redirects to /tokens
import NotFound from "./pages/NotFound";
// Doctor Portal removed
// IPD routes are handled via IpdRoutes
import LoginForm from "./components/LoginForm";
import PatientHistory from "./components/PatientHistory";
import LicenseActivation from "./components/LicenseActivation";
import InstallerScreen from './components/InstallerScreen';
import ReceptionPortal from './components/reception/ReceptionPortal';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminUsers from '@/components/admin/AdminUsers';
import PharmacyApp from '@/Pharmacy pages/Index';
import PharmacyAddInvoicePage from '@/Pharmacy pages/AddInvoicePage';
import IndoorApp from '@/Indoor pages/Index';
import IndoorLogin from '@/Indoor pages/Login';
import { IndoorAuthProvider, useIndoorAuth } from '@/Indoor contexts/AuthContext';
import { CartProvider } from './Indoor contexts/CartContext';
import { IndoorSettingsProvider } from '@/Indoor contexts/SettingsContext';
 
 
import LabApp from '@/lab pages/Index';
import Portal from './pages/Portal';
import FinanceApp from '@/Finance pages/Index';
// Pharmacy module providers
import { AuthProvider as PharmacyAuthProvider } from '@/Pharmacy contexts/AuthContext';
import { AuditLogProvider } from '@/Pharmacy contexts/AuditLogContext';
import { SettingsProvider as PharmacySettingsProvider } from '@/Pharmacy contexts/PharmacySettingsContext';
import { InventoryProvider } from '@/Pharmacy contexts/InventoryContext';
import { DataProvider } from '@/Pharmacy contexts/DataContext';
// Indoor auth gate separate from hospital auth
const RequireIndoorAuth = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useIndoorAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/indoor/login" replace />;
};
// Full-screen section components
import TokenGenerator from '@/components/TokenGenerator';
import TodayTokens from '@/components/TodayTokens';
import PatientSearch from '@/components/PatientSearch';
import DoctorManagement from '@/components/DoctorManagement';
import UsersManagement from '@/components/UsersManagement';
import ReportsDashboard from '@/pages/reports/Dashboard';
import ReportsExpenses from '@/pages/reports/Expenses';
import ExpenseDepartmentsPage from '@/pages/reports/ExpenseDepartments';
import ReportsTrend from '@/pages/reports/Trend';
import ReportsDoctors from '@/pages/reports/Doctors';
import ReportsTransactions from '@/pages/reports/Transactions';
import Backup from '@/components/Backup';
import SettingsPage from '@/components/Settings';
import TokenHistory from '@/components/TokenHistory';
import DepartmentOverview from '@/components/DepartmentOverview';
import DailyViewPage from '@/pages/staff/DailyView';
import MonthlyViewPage from '@/pages/staff/MonthlyView';
import StaffManagementPage from '@/pages/staff/StaffManagement';
import StaffSettingsPage from '@/pages/staff/Settings';
import AuditPage from '@/pages/Audit';
// Corporate portal removed
// Simple form components (user-requested direct components)
// Staff module removed

// Temporarily using basic auth check until we find RequireAuth
const RequireAuth = ({ children, roles }: { children: React.ReactNode, roles: string[] }) => {
  const { user } = useAuth();
  return user && roles.includes(user.role) ? children : <Navigate to="/login" />;
};

const queryClient = new QueryClient();

// Secure license key validation for Mindspire signed keys


function base64urlDecode(input: string): string {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  // Use atob for browser compatibility
  return decodeURIComponent(escape(window.atob(input)));
}

async function verifySignature(encoded: string, signature: string): Promise<boolean> {
  const secret = 'mindspire-2025-secure-secret'; // Must match keygen_signed.js
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  const sigBuf = await window.crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(encoded)
  );
  const hex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 16) === signature;
}

async function validateSignedLicenseKey(key: string): Promise<boolean> {
  const match = key.match(/^mindspire-(.+)-([a-f0-9]{16})$/);
  if (!match) return false;
  const encoded = match[1];
  const signature = match[2];
  return await verifySignature(encoded, signature);
}

const isLicenseActivated = async () => {
  const key = localStorage.getItem('licenseKey');
  return !!(key && await validateSignedLicenseKey(key));
};

const AppContent = () => {
  const [checking, setChecking] = React.useState(true);
  const [activated, setActivated] = React.useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  React.useEffect(() => {
    (async () => {
      const valid = await isLicenseActivated();
      setActivated(valid);
      setChecking(false);
      // Do not force navigate to portal; respect the current route (e.g., module login pages)
    })();
  }, [isAuthenticated]);

  if (checking) {
    return <div className="flex items-center justify-center min-h-screen">Checking license...</div>;
  }

  if (!activated) {
    return <LicenseActivation />;
  }
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<Portal />} />
        {/* Pharmacy: Add Invoice (unauthenticated renders within pharmacy providers) */}
        <Route
          path="/pharmacy/invoices/new"
          element={
            <PharmacySettingsProvider>
              <PharmacyAuthProvider>
                <AuditLogProvider>
                  <DataProvider>
                    <InventoryProvider>
                      <PharmacyAddInvoicePage />
                    </InventoryProvider>
                  </DataProvider>
                </AuditLogProvider>
              </PharmacyAuthProvider>
            </PharmacySettingsProvider>
          }
        />
        <Route
          path="/pharmacy/*"
          element={
            <PharmacySettingsProvider>
              <PharmacyAuthProvider>
                <AuditLogProvider>
                  <DataProvider>
                    <InventoryProvider>
                      {/* Pharmacy module handles its own login UI */}
                      <PharmacyApp />
                    </InventoryProvider>
                  </DataProvider>
                </AuditLogProvider>
              </PharmacyAuthProvider>
            </PharmacySettingsProvider>
          }
        />
        
        
        <Route path="/login" element={<LoginForm />} />
        {/* Future modules */}
        <Route path="/lab/login" element={<LabApp />} />
        {/* Indoor module: independent auth */}
        <Route
          path="/indoor/login"
          element={
            <IndoorAuthProvider>
              <IndoorSettingsProvider>
                <IndoorLogin />
              </IndoorSettingsProvider>
            </IndoorAuthProvider>
          }
        />
        <Route
          path="/indoor-pharmacy/*"
          element={
            <IndoorAuthProvider>
              <IndoorSettingsProvider>
                <CartProvider>
                  <RequireIndoorAuth>
                    <IndoorApp />
                  </RequireIndoorAuth>
                </CartProvider>
              </IndoorSettingsProvider>
            </IndoorAuthProvider>
          }
        />
        <Route path="/finance/*" element={<FinanceApp />} />
        <Route path="*" element={<Portal />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Portal />} />
      {/* Pharmacy: Add Invoice (authenticated renders within providers; AdminLayout not needed since page has its own sidebar) */}
      <Route
        path="/pharmacy/invoices/new"
        element={
          <PharmacySettingsProvider>
            <PharmacyAuthProvider>
              <AuditLogProvider>
                <DataProvider>
                  <InventoryProvider>
                    <PharmacyAddInvoicePage />
                  </InventoryProvider>
                </DataProvider>
              </AuditLogProvider>
            </PharmacyAuthProvider>
          </PharmacySettingsProvider>
        }
      />
      <Route path="/patient-history" element={<PatientHistory />} />
      {/* Doctor Portal removed */}
      <Route 
        path="/reception" 
        element={user?.role === 'receptionist' ? <ReceptionPortal /> : <Navigate to="/" />} 
      />
      {/* IPD module removed */}
      {/* Pharmacy module rendered inside AdminLayout so Admin sidebar is visible */}
      <Route
        path="/pharmacy/*"
        element={
          <AdminLayout>
            <PharmacySettingsProvider>
              <PharmacyAuthProvider>
                <AuditLogProvider>
                  {/* DataProvider must come after AuditLogProvider because it calls useAuditLog */}
                  <DataProvider>
                    <InventoryProvider>
                      <PharmacyApp />
                    </InventoryProvider>
                  </DataProvider>
                </AuditLogProvider>
              </PharmacyAuthProvider>
            </PharmacySettingsProvider>
          </AdminLayout>
        }
      />
      {/* Indoor Pharmacy module: separate UI without hospital AdminLayout */}
      <Route
        path="/indoor/login"
        element={
          <IndoorAuthProvider>
            <IndoorSettingsProvider>
              <IndoorLogin />
            </IndoorSettingsProvider>
          </IndoorAuthProvider>
        }
      />
      <Route
        path="/indoor-pharmacy/*"
        element={
          <IndoorAuthProvider>
            <IndoorSettingsProvider>
              <CartProvider>
                <RequireIndoorAuth>
                  <IndoorApp />
                </RequireIndoorAuth>
              </CartProvider>
            </IndoorSettingsProvider>
          </IndoorAuthProvider>
        }
      />
      
      {/* Lab module rendered inside AdminLayout so Admin sidebar is visible */}
      <Route
        path="/lab/*"
        element={
          <AdminLayout>
            <LabApp />
          </AdminLayout>
        }
      />
      
      {/* Finance portal manages its own auth and layout */}
      <Route path="/finance/*" element={<FinanceApp />} />
      {/* IPD-related forms removed */}
      {/* Full-screen dashboard sections under AdminLayout */}
      <Route path="/tokens" element={<AdminLayout><TokenGenerator /></AdminLayout>} />
      <Route path="/today-tokens" element={<AdminLayout><TodayTokens /></AdminLayout>} />
      <Route path="/token-history" element={<AdminLayout><TokenHistory /></AdminLayout>} />
      <Route path="/departments" element={<AdminLayout><DepartmentOverview /></AdminLayout>} />
      <Route path="/search" element={<AdminLayout><PatientSearch /></AdminLayout>} />
      <Route path="/doctors" element={<AdminLayout><DoctorManagement /></AdminLayout>} />
      <Route path="/users" element={<AdminLayout><UsersManagement /></AdminLayout>} />
      {/* Reports section */}
      <Route path="/reports" element={<Navigate to="/reports/dashboard" replace />} />
      <Route path="/reports/dashboard" element={<AdminLayout><ReportsDashboard /></AdminLayout>} />
      <Route path="/reports/expenses" element={<AdminLayout><ReportsExpenses /></AdminLayout>} />
      <Route path="/reports/expense-departments" element={<AdminLayout><ExpenseDepartmentsPage /></AdminLayout>} />
      <Route path="/reports/trend" element={<AdminLayout><ReportsTrend /></AdminLayout>} />
      <Route path="/reports/doctors" element={<AdminLayout><ReportsDoctors /></AdminLayout>} />
      <Route path="/reports/transactions" element={<AdminLayout><ReportsTransactions /></AdminLayout>} />
      {/* Back-compat */}
      <Route path="/expenses" element={<Navigate to="/reports/expenses" replace />} />
      {/* Staff routes split into four pages */}
      <Route path="/staff" element={<Navigate to="/staff/daily" replace />} />
      <Route path="/staff/daily" element={<AdminLayout><DailyViewPage /></AdminLayout>} />
      <Route path="/staff/monthly" element={<AdminLayout><MonthlyViewPage /></AdminLayout>} />
      <Route path="/staff/management" element={<AdminLayout><StaffManagementPage /></AdminLayout>} />
      <Route path="/staff/settings" element={<AdminLayout><StaffSettingsPage /></AdminLayout>} />
      {/* Backwards compatibility */}
      <Route path="/staff-attendance" element={<Navigate to="/staff/daily" replace />} />
      <Route path="/audit" element={<AdminLayout><AuditPage /></AdminLayout>} />
      <Route path="/backup" element={<AdminLayout><Backup /></AdminLayout>} />
      <Route path="/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />
      {/* Staff portal removed */}
      <Route path="/admin" element={<AdminLayout><Outlet /></AdminLayout>}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>
      {/* Standalone invoice route removed with Corporate portal */}
      <Route path="/login" element={<LoginForm />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

import InstallLocationScreen from './components/InstallLocationScreen';

const App = () => {
  const [installerComplete, setInstallerComplete] = React.useState(
    !!localStorage.getItem('installerComplete')
  );
  const [installerStep, setInstallerStep] = React.useState<'welcome' | 'location' | 'done'>(
    installerComplete ? 'done' : 'welcome'
  );

  React.useEffect(() => {
    scheduleDailyTokenReset();
  }, []);

  const handleInstallerWelcomeComplete = () => {
    setInstallerStep('location');
  };

  const handleInstallerLocationComplete = () => {
    localStorage.setItem('installerComplete', 'true');
    setInstallerComplete(true);
    setInstallerStep('done');
    window.location.reload();
  };

  if (!installerComplete) {
    if (installerStep === 'welcome') {
      return <InstallerScreen onComplete={handleInstallerWelcomeComplete} />;
    }
    if (installerStep === 'location') {
      return <InstallLocationScreen onComplete={handleInstallerLocationComplete} />;
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
