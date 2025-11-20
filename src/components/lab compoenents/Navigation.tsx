import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lab types/user";
import { CurrentView } from "@/lab pages/Index";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lab hooks/use-notifications";
import { 
  Menu, 
  X, 
  TestTube2, 
  FileText, 
  Package,
  Settings,
  Bell,
  LogOut,
  User,
  Activity,
  BarChart3,
  UserCheck,
  DollarSign
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  link?: string;
}

interface NavigationProps {
  currentRole: UserRole;
  onLogout: () => void;
  onViewChange: (view: CurrentView) => void;
  currentView: CurrentView;
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ 
  currentRole, 
  onLogout, 
  onViewChange, 
  currentView, 
  className 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { unreadCount } = useNotifications({ pollMs: 30000, limit: 20 });

  const getMenuItems = (): MenuItem[] => {
    // Full catalog of possible items
    const allItems: MenuItem[] = [
      { id: "dashboard" as CurrentView, label: "Dashboard", icon: Activity },
      { id: "test-catalog" as CurrentView, label: "Test Catalog", icon: TestTube2 },
      { id: "sample-intake" as CurrentView, label: "Sample Intake", icon: Package },
      { id: "sample-tracking" as CurrentView, label: "Sample Tracking", icon: Activity },
      { id: "result-entry" as CurrentView, label: "Result Entry", icon: FileText },
      { id: "report-generator" as CurrentView, label: "Report Generator", icon: FileText },
      { id: "inventory" as CurrentView, label: "Inventory", icon: Package },
      { id: "suppliers" as CurrentView, label: "Suppliers", icon: Package },
      { id: "staff-attendance" as CurrentView, label: "Staff Attendance", icon: UserCheck },
      { id: "user-management" as CurrentView, label: "User Management", icon: User },
      { id: "audit-logs" as CurrentView, label: "Audit Logs", icon: BarChart3 },
      { id: "notifications" as CurrentView, label: "Notifications", icon: Bell },
      { id: "settings" as CurrentView, label: "Settings", icon: Settings },
      { id: "finance" as CurrentView, label: "Finance", icon: DollarSign },
      { id: "expenses" as CurrentView, label: "Expenses", icon: DollarSign },
    ];

    // Role based subsets
    if (currentRole === "receptionist") {
      const receptionistIds: CurrentView[] = [
        "sample-intake",
        "sample-tracking",
        "report-generator",
      ];
      return allItems.filter(i => receptionistIds.includes(i.id as CurrentView));
    }

    if (currentRole === "researcher") {
      // researcher sees all except: user-management, audit-logs, settings, finance
      const excluded: CurrentView[] = [
        "user-management",
        "audit-logs",
        "settings",
        "finance",
      ];
      return allItems.filter(i => !excluded.includes(i.id as CurrentView));
    }

    // lab-technician: see all
    return allItems;
  };

  const navigate = useNavigate();
  const menuItems = getMenuItems();

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case "receptionist":
        return "Receptionist";
      case "researcher":
        return "Researcher";
      default:
        return "Lab Technician";
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "receptionist":
        return "bg-amber-100 text-amber-800";
      case "researcher":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <nav className={cn("flex flex-col w-full px-2 py-4", className)}>
      {/* Logo and Title */}
      <div className="flex flex-col items-start space-y-2 mb-4">
        <div className="flex items-center space-x-2">
          <TestTube2 className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">MedSync</span>
        </div>
        <Badge className={getRoleBadgeColor(currentRole)}>
          {getRoleDisplayName(currentRole)}
        </Badge>
      </div>
      {/* Sidebar Vertical Menu */}
      <div className="flex flex-col space-y-1 w-full">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            false ? (
              <Link
                key={item.id}
                to="/"
                className="hidden"
                onClick={() => {}}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ) : (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange(item.id as CurrentView)}
                className="flex items-center gap-2 w-full justify-start"
              >
              {item.id === "notifications" ? (
                <span className="relative inline-block">
                  <Icon className={cn("w-4 h-4", unreadCount > 0 && "text-red-600")} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </span>
              ) : (
                <Icon className="w-4 h-4" />
              )}
              {item.label}
              </Button>
            )
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 w-full justify-start"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;
