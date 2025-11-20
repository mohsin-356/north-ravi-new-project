import { useState } from "react";
import { UserRole } from "@/lab types/user";
import { Sidebar, SidebarHeader, SidebarProvider, SidebarInset } from "@/components/lab compoenents/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import LoginForm from "@/components/lab compoenents/auth/LoginForm";
import SignupForm from "@/components/lab compoenents/auth/SignupForm";
import Navigation from "@/components/lab compoenents/Navigation";
import LabTechnicianDashboard from "@/components/lab compoenents/dashboards/LabTechnicianDashboard";
import TestCatalog from "@/components/lab compoenents/sample-management/TestCatalog";
import SampleIntake from "@/components/lab compoenents/sample-management/SampleIntake";
import UserManagement from "@/components/lab compoenents/admin/UserManagement";
import AuditLogs from "@/components/lab compoenents/admin/AuditLogs";
import SampleTracking from "@/components/lab compoenents/sample-management/SampleTracking";
import ResultEntry from "@/components/lab compoenents/results/ResultEntry";
import ReportGenerator from "@/components/lab compoenents/results/ReportGenerator";
import InventoryManagement from "@/components/lab compoenents/inventory/InventoryManagement";
import SuppliersPage from "@/components/lab compoenents/suppliers/SuppliersPage";
import StaffAttendance from "@/components/lab compoenents/staff attendance/StaffAttendance";
import Settings from "@/components/lab compoenents/common/Settings";
import Notifications from "@/components/lab compoenents/common/Notifications";
import FinanceDashboard from "@/components/lab compoenents/finance/FinanceDashboard";
import LabExpenses from "@/components/lab compoenents/finance/LabExpenses";

export type CurrentView = 
  | "dashboard" 
  | "test-catalog" 
  | "sample-intake" 
  | "sample-tracking" 
  | "result-entry" 
  | "report-generator" 
  | "inventory" 
  | "suppliers"
  | "staff-attendance" 
  | "settings" 
  | "notifications"
  | "finance"
  | "expenses"
  | "user-management"
  | "audit-logs";

const Index = () => {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (role: UserRole) => {
    setCurrentRole(role);
    setCurrentView("dashboard");
    setIsAuthenticated(true);
  };

  const handleSignup = (role: UserRole) => {
    setCurrentRole(role);
    setCurrentView("dashboard");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setCurrentRole(null);
    setCurrentView("dashboard");
    setIsAuthenticated(false);
  };

  const handleViewChange = (view: CurrentView) => {
    setCurrentView(view);
  };

  const renderContent = () => {
    if (currentView === "settings") return <Settings />;
    if (currentView === "notifications") return <Notifications />;
    if (currentView === "finance") return <FinanceDashboard />;
    if (currentView === "expenses") return <LabExpenses />;
    if (currentView === "suppliers") return <SuppliersPage />;
    if (currentView === "staff-attendance") return <StaffAttendance isUrdu={false} />;
    if (currentView === "user-management") return <UserManagement />;
    if (currentView === "audit-logs") return <AuditLogs />;

    // Only lab-technician portal
    switch (currentView) {
      case "test-catalog": return <TestCatalog onNavigateBack={() => setCurrentView("dashboard")} />;
      case "sample-intake": return <SampleIntake onNavigateBack={() => setCurrentView("dashboard")} />;
      case "sample-tracking": return <SampleTracking />;
      case "result-entry": return <ResultEntry onNavigateBack={() => setCurrentView("dashboard")} />;
      case "report-generator": return <ReportGenerator />;
      case "inventory": return <InventoryManagement />;
      default: return <LabTechnicianDashboard onViewChange={handleViewChange} />;
    }
  };

  if (!isAuthenticated) {
    if (authMode === "signup") {
      return (
        <SignupForm 
          onSignup={handleSignup}
          onShowLogin={() => setAuthMode("login")}
        />
      );
    }
    return (
      <LoginForm 
        onLogin={handleLogin}
        onShowSignup={() => setAuthMode("signup")}
      />
    );
  }

  return (
    <SidebarProvider className="flex min-h-screen bg-background">
      {/* Navigation Sidebar */}
      <Sidebar className="border-r">
        <div className="flex flex-col h-full">
          <SidebarHeader
            currentRole={currentRole}
            onLogout={handleLogout}
            onNotificationClick={() => handleViewChange("notifications")}
            className="p-4 border-b"
          />
          <div className="flex-1 overflow-y-auto">
            <Navigation
              currentRole={currentRole}
              onLogout={handleLogout}
              onViewChange={handleViewChange}
              currentView={currentView}
              className="p-2"
            />
          </div>
        </div>
      </Sidebar>

      {/* Page Content */}
      <SidebarInset className="flex-1 flex flex-col">
        {/* Mobile toggle button (visible < md) */}
        <header className="h-16 border-b flex items-center px-4 md:hidden">
          <Button variant="ghost" size="icon">
            <PanelLeft className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 overflow-auto">{renderContent()}</main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Index;
