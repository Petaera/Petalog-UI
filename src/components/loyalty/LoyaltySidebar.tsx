import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useNavigate
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  CreditCard, 
  Plus, 
  Users, 
  BarChart3,
  Crown,
  Sparkles,
  ArrowLeft,
  Home,
  Menu
} from 'lucide-react';

const sidebarItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/loyalty/dashboard', // Ensure this matches the route in App.tsx
    description: 'Overview & Stats'
  },
  {
    id: 'schemes',
    label: 'Subscription Schemes',
    icon: CreditCard,
    path: '/loyalty/schemes', // Updated to match our routes
    description: 'Manage Plans'
  },
  {
    id: 'create-scheme',
    label: 'Create New Scheme',
    icon: Plus,
    path: '/loyalty/create', // Updated to match our routes
    description: 'Setup Wizard'
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    path: '/loyalty/customers', // Ensure this matches the route in App.tsx
    description: 'Member Directory'
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    icon: BarChart3,
    path: '/loyalty/analytics', // Ensure this matches the route in App.tsx
    description: 'Insights & Data'
  }
];

export function LoyaltySidebar({ activeSection }: { activeSection: string }) {
  const navigate = useNavigate(); // Initialize navigate
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);

  const handleBackToMainApp = () => {
    navigate('/dashboard');
  };

  return (
    <div className={cn(
      "bg-white border-r border-border flex flex-col transition-all duration-300",
      collapsed ? "w-20" : "w-80 lg:w-80 md:w-72 sm:w-64"
    )}>
      
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          {!collapsed && (
            <div className="w-10 h-10 bg-gradient-loyalty rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-blue-500" />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 flex items-center justify-between">
              <div>
                <h1 className="font-bold text-lg text-foreground">PetaLog Loyalty</h1>
                <p className="text-sm text-muted-foreground">Subscription & Rewards</p>
              </div>
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="ml-auto p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Expand sidebar"
            >
              <Menu className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {/* <div className="flex items-center gap-1 text-xs text-accent font-medium">
          <Sparkles className="w-3 h-3" />
          Premium Module
        </div> */}
        
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
          const isActive = activeSection === item.id || location.pathname.startsWith(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)} // Navigate to the item's path
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

      {/* Footer */}
      {/* <div className="p-4 border-t border-border">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Module Version
          </div>
          <div className="text-sm font-bold text-primary">v1.0.0</div>
        </div>
      </div> */}
    </div>
  );
}
