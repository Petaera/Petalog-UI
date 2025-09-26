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
import { useAuth } from '@/contexts/AuthContext';

// All available sidebar items
const allSidebarItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/loyalty/dashboard',
    description: 'Overview & Stats',
    roles: ['owner', 'manager'] // Available to both
  },
  {
    id: 'schemes',
    label: 'Subscription Schemes',
    icon: CreditCard,
    path: '/loyalty/schemes',
    description: 'Manage Plans',
    roles: ['owner', 'manager'] // Available to both
  },
  {
    id: 'create-scheme',
    label: 'Create New Scheme',
    icon: Plus,
    path: '/loyalty/create',
    description: 'Setup Wizard',
    roles: ['owner'] // Owner only
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    path: '/loyalty/customers',
    description: 'Member Directory',
    roles: ['owner', 'manager'] // Available to both
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    icon: BarChart3,
    path: '/loyalty/analytics',
    description: 'Insights & Data',
    roles: ['owner'] // Owner only
  }
];

interface LoyaltySidebarProps {
  activeSection: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function LoyaltySidebar({ activeSection, collapsed = false, onToggle }: LoyaltySidebarProps) {
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

  // Mobile overlay when expanded
  if (isMobile && !collapsed) {
    return (
      <>
        {/* Mobile overlay with smooth fade */}
        <div 
          className="fixed inset-0 bg-black/60 z-50 md:hidden animate-in fade-in duration-300"
          onClick={onToggle}
        />
        
        {/* Mobile sidebar with slide animation */}
        <div className="fixed left-0 top-0 h-full w-80 bg-white/95 backdrop-blur-xl border-r border-border/50 flex flex-col z-50 md:hidden animate-in slide-in-from-left duration-300 ease-out shadow-2xl">
          {/* Enhanced Header with gradient */}
          <div className="relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-indigo-50/80" />
            
            {/* Content */}
            <div className="relative p-6 border-b border-border/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="font-bold text-xl text-foreground">PetaLog Loyalty</h1>
                    <p className="text-sm text-muted-foreground">Subscription & Rewards</p>
                  </div>
                </div>
                
                {/* Close button */}
                <button
                  onClick={onToggle}
                  className="p-2 rounded-xl hover:bg-white/50 transition-colors duration-200 group"
                  aria-label="Close sidebar"
                >
                  <Menu className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </div>
              
              {/* Back to main button */}
              <button
                onClick={() => {
                  navigate('/dashboard');
                  onToggle?.();
                }}
                className="w-full p-3 rounded-xl bg-white/60 hover:bg-white/80 transition-all duration-200 text-left group border border-white/20 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-muted transition-colors">
                    <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Back to Main Dashboard</div>
                    <div className="text-xs text-muted-foreground">Return to main app</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Navigation with staggered animations */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id || location.pathname.startsWith(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    onToggle?.(); // Close sidebar after navigation on mobile
                  }}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-all duration-300 group relative overflow-hidden",
                    "hover:shadow-lg hover:shadow-primary/10 transform hover:scale-[1.02]",
                    isActive 
                      ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/20 shadow-lg shadow-primary/10" 
                      : "bg-white/40 backdrop-blur-sm text-foreground hover:bg-white/60 hover:text-primary border border-white/20"
                  )}
                  style={{ 
                    animationDelay: `${(index + 1) * 100}ms`,
                    animation: `slideInRight 0.4s ease-out ${(index + 1) * 100}ms both`
                  }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-r-full" />
                  )}
                  
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                      isActive 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted/30 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-sm">{item.label}</span>
                      <p className={cn(
                        "text-xs mt-0.5",
                        isActive ? "text-primary/70" : "text-muted-foreground group-hover:text-primary/70"
                      )}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
          
          {/* Bottom decorative element */}
          <div className="p-4">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-full opacity-20" />
          </div>
        </div>
        
        {/* Keyframes for staggered animation */}
        <style>{`
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
      </>
    );
  }

  // Mobile collapsed state - no sidebar shown (handled by layout)
  if (isMobile && collapsed) {
    return null;
  }

  // Desktop sidebar
  return (
    <div className={cn(
      "bg-white border-r border-border flex flex-col transition-all duration-300 hidden md:flex fixed left-0 top-0 h-full z-30",
      collapsed ? "w-20" : "w-80 lg:w-80"
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
          const isActive = activeSection === item.id || location.pathname.startsWith(item.path);

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
}
