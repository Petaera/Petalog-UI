import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  Receipt,
  BarChart3,
  Settings,
  Menu,
  X,
  Building2,
  Calendar,
  ArrowLeft
} from 'lucide-react';

// All available sidebar items
const allSidebarItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/payroll',
    description: 'Overview & Stats',
    roles: ['owner', 'manager'] // Available to both
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: Users,
    path: '/payroll/staff',
    description: 'Employee Management',
    roles: ['owner'] // Owner only
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: Calendar,
    path: '/payroll/attendance',
    description: 'Time Tracking',
    roles: ['owner', 'manager'] // Available to both
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: Receipt,
    path: '/payroll/expenses',
    description: 'Expense Management',
    roles: ['owner', 'manager'] // Available to both
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/payroll/reports',
    description: 'Analytics & Reports',
    roles: ['owner'] // Owner only
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/payroll/settings',
    description: 'Configuration',
    roles: ['owner'] // Owner only
  }
];

interface PayrollSidebarProps {
  activeSection?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<PayrollSidebarProps> = ({ 
  activeSection, 
  collapsed = false, 
  onToggle 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = React.useState(false);

  // Filter sidebar items based on user role
  const sidebarItems = React.useMemo(() => {
    const userRole = user?.role?.toLowerCase() || 'manager';
    return allSidebarItems.filter(item => item.roles.includes(userRole));
  }, [user?.role]);

  // Check if mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleBackToMainApp = () => {
    navigate('/dashboard');
  };

  // Get current active section
  const getCurrentActiveSection = () => {
    if (activeSection) return activeSection;
    
    const currentPath = location.pathname;
    const matchedItem = sidebarItems.find(item => 
      item.path === currentPath || (item.path !== '/payroll' && currentPath.startsWith(item.path))
    );
    return matchedItem?.id || 'dashboard';
  };

  const currentActiveSection = getCurrentActiveSection();

  // Mobile view - only show top bar with hamburger
  if (isMobile) {
    return (
      <>
        {/* Mobile top bar with hamburger */}
        <div className="fixed top-0 left-0 right-0 h-14 z-40 bg-white border-b border-border flex items-center justify-between px-4 md:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <h1 className="font-semibold text-lg text-foreground">Payroll</h1>
          </div>
          <button
            onClick={handleBackToMainApp}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Back to main dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        
        {/* Spacer to prevent content being hidden under the fixed top bar */}
        <div className="h-14 md:hidden" />
      </>
    );
  }

  // Desktop sidebar
  return (
    <div className={cn(
      "bg-white border-r border-border flex flex-col transition-all duration-300 hidden md:flex",
      collapsed ? "w-20" : "w-80 lg:w-80"
    )}>
      
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          {!collapsed && (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 flex items-center justify-between">
              <div>
                <h1 className="font-bold text-lg text-foreground">PetaLog Payroll</h1>
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'manager' ? 'Location Manager' : 'Business Owner'}
                </p>
              </div>
              <button
                onClick={onToggle}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
          {collapsed && (
            <button
              onClick={onToggle}
              className="w-full p-2 rounded-md hover:bg-muted transition-colors flex items-center justify-center"
              aria-label="Expand sidebar"
            >
              <Menu className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {/* Back to Main App Button */}
        <button
          onClick={handleBackToMainApp}
          className={cn(
            "w-full mt-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group",
            collapsed && "flex items-center justify-center"
          )}
        >
          <div className="flex items-center gap-3">
            <ArrowLeft className={cn(
              "w-4 h-4 text-muted-foreground group-hover:text-foreground",
              collapsed && "mr-0"
            )} />
            {!collapsed && (
              <div>
                <div className="text-sm font-medium text-foreground">Back to Main Dashboard</div>
                <div className="text-xs text-muted-foreground">Return to dashboard</div>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentActiveSection === item.id || location.pathname.startsWith(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full text-left p-4 rounded-xl transition-all duration-300 group",
                "hover:bg-primary/10 hover:shadow-card",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-card" 
                  : "text-foreground hover:text-primary"
              )}
            >
              <div className={cn("flex items-center gap-3 mb-1", collapsed && "justify-center mb-0")}>
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </div>
              {!collapsed && (
                <p className={cn(
                  "text-xs pl-8",
                  isActive ? "text-primary/80" : "text-muted-foreground"
                )}>
                  {item.description}
                </p>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;