import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', to: '/payroll', icon: Home },
    { name: 'Staff', to: '/payroll/staff', icon: Users },
    { name: 'Attendance', to: '/payroll/attendance', icon: Calendar },
    { name: 'Expenses', to: '/payroll/expenses', icon: Receipt },
    { name: 'Reports', to: '/payroll/reports', icon: BarChart3 },
    { name: 'Settings', to: '/payroll/settings', icon: Settings },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Helper function to check if route is active
  const isActiveRoute = (path: string) => {
    if (path === '/payroll') {
      return location.pathname === '/payroll';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full bg-card border-r border-border z-50 
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'w-64' : 'lg:w-16'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              {sidebarOpen && (
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Payroll</h1>
                  <p className="text-xs text-muted-foreground">Business Manager</p>
                </div>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-lg hover:bg-muted lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Back to Main App */}
          <div className="px-4 py-2 border-b border-border">
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {sidebarOpen && <span>Back to PetaLog</span>}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.to);
                return (
                  <Link
                    key={item.name}
                    to={item.to}
                    onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : 'mr-0'}`} />
                    {sidebarOpen && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Info */}
          {sidebarOpen && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-medium text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.email || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role || 'Manager'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
    </>
  );
};

export default Sidebar;