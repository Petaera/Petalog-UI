import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import FloatingOwnerEntry from '@/components/FloatingOwnerEntry';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  Home,
  Users,
  Receipt,
  BarChart3,
  Settings,
  Menu,
  Building2,
  Calendar,
  ArrowLeft,
  MapPin,
  ChevronDown,
  LogOut,
  User
} from 'lucide-react';

const sidebarItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/payroll',
    description: 'Overview & Stats',
    roles: ['owner', 'manager']
  },
  {
    id: 'staff',
    label: 'Staff Management',
    icon: Users,
    path: '/payroll/staff',
    description: 'Manage Team',
    roles: ['owner', 'manager']
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: Calendar,
    path: '/payroll/attendance',
    description: 'Daily Tracking',
    roles: ['owner', 'manager']
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: Receipt,
    path: '/payroll/expenses',
    description: 'Track Costs',
    roles: ['owner', 'manager']
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/payroll/reports',
    description: 'Analytics',
    roles: ['owner']
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/payroll/settings',
    description: 'Configuration',
    roles: ['owner']
  }
];

const PayrollLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true); // Start collapsed by default for better mobile UX
  const [locations, setLocations] = useState<{ id: string; name: string; address: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedLocations = useRef(false);

  const getStoredLocation = (userId: string) => {
    try {
      const stored = localStorage.getItem(`selectedLocation_${userId}`);
      return stored || "";
    } catch (error) {
      return "";
    }
  };

  const storeLocation = (userId: string, locationId: string) => {
    try {
      localStorage.setItem(`selectedLocation_${userId}`, locationId);
    } catch (error) {
      // ignore
    }
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
    if (user?.id) {
      storeLocation(user.id, locationId);
      // Dispatch custom event to notify all components about location change
      window.dispatchEvent(new CustomEvent('locationChanged', {
        detail: {
          userId: user.id,
          locationId: locationId
        }
      }));
    }
  };

  useEffect(() => {
    if (hasFetchedLocations.current || !user?.id) {
      return;
    }

    const fetchLocations = async () => {
      try {
        if (!supabase) return;

        let query = supabase.from('locations').select('id, name, address');

        if (user.role === 'owner') {
          let ownIdLocations: any[] = [];
          if (user.own_id) {
            const { data: ownIdData } = await supabase
              .from('locations')
              .select('id, name, address')
              .eq('own_id', user.own_id);
            ownIdLocations = ownIdData || [];
          }

          let partnershipLocations: any[] = [];
          try {
            const { data: partnershipData } = await supabase
              .from('location_owners')
              .select('location_id')
              .eq('owner_id', user.id);
            if (partnershipData && partnershipData.length > 0) {
              const locationIds = partnershipData.map(lo => lo.location_id);
              const { data: partnershipLocData } = await supabase
                .from('locations')
                .select('id, name, address')
                .in('id', locationIds);
              partnershipLocations = partnershipLocData || [];
            }
          } catch (_) {}

          const allLocationIds = new Set([
            ...ownIdLocations.map(loc => loc.id),
            ...partnershipLocations.map(loc => loc.id)
          ]);

          if (allLocationIds.size > 0) {
            query = query.in('id', Array.from(allLocationIds));
          } else if (user.own_id) {
            query = query.eq('own_id', user.own_id);
          } else {
            query = query.eq('id', 'no-access');
          }
        } else if (user.role === 'manager' && user.assigned_location) {
          query = query.eq('id', user.assigned_location);
        } else {
          query = query.eq('id', 'no-access');
        }

        const { data } = await query;
        if (data && data.length > 0) {
          setLocations(data);
          if (user?.id) {
            const storedLocation = getStoredLocation(user.id);
            if (storedLocation && data.some(loc => loc.id === storedLocation)) {
              setSelectedLocation(storedLocation);
            } else {
              setSelectedLocation(data[0].id);
              storeLocation(user.id, data[0].id);
            }
          } else {
            setSelectedLocation(data[0].id);
          }
        } else {
          setLocations([]);
          setSelectedLocation("");
        }
      } finally {
        setIsLoading(false);
        hasFetchedLocations.current = true;
      }
    };

    fetchLocations();
  }, [user?.id]);

  const handleBackToMainApp = () => {
    navigate('/dashboard');
    // Close mobile sidebar after navigation
    if (window.innerWidth < 1024) {
      setCollapsed(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/'; // Full reload to ensure session is cleared
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setCollapsed(true)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-80 lg:w-80 md:w-72 sm:w-64",
        "lg:relative fixed z-50 h-full lg:h-auto",
        collapsed && "lg:w-20 -translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            {!collapsed && (
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <h1 className="font-bold text-lg text-foreground">PetaLog Payroll</h1>
                  <p className="text-sm text-muted-foreground">Staff & Expenses</p>
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

        </div>

        {/* Back to Main Menu Button */}
        <div className="px-6 pb-4">
          <button
            onClick={handleBackToMainApp}
            className={cn(
              "w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group",
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
                  <div className="text-sm font-medium text-foreground">Back to Main Menu</div>
                  <div className="text-xs text-muted-foreground">Return to main dashboard</div>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {sidebarItems
            .filter(item => {
              const userRole = user?.role?.toLowerCase() || '';
              return item.roles.includes(userRole);
            })
            .map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path !== '/payroll' && location.pathname.startsWith(item.path));

            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  // Close mobile sidebar after navigation
                  if (window.innerWidth < 1024) {
                    setCollapsed(true);
                  }
                }}
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

        {/* User Info */}
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 overflow-auto flex flex-col min-w-0",
        "lg:ml-0", 
        collapsed ? "ml-0" : "lg:ml-0"
      )}>
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed((v) => !v)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              {user?.role === 'manager' ? (
                <div className="flex flex-col items-start min-w-0 flex-1 border rounded px-3 lg:px-4 py-2 bg-white">
                  <span className="font-medium text-sm truncate">
                    {locations.find(l => l.id === selectedLocation)?.name || 'Location'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {locations.find(l => l.id === selectedLocation)?.address || ''}
                  </span>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 min-w-0 flex-1 max-w-xs lg:max-w-sm">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="font-medium text-sm truncate">
                          {locations.find(l => l.id === selectedLocation)?.name || 'Select Location'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {locations.find(l => l.id === selectedLocation)?.address || ''}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 ml-auto flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 lg:w-80">
                    <DropdownMenuLabel>Select Location</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {locations.map((location) => (
                      <DropdownMenuItem
                        key={location.id}
                        onClick={() => handleLocationChange(location.id)}
                        className="flex flex-col items-start p-3"
                      >
                        <span className="font-medium">{location.name}</span>
                        <span className="text-xs text-muted-foreground">{location.address}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {/* User Info */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {(user?.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.email || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.role === 'manager' ? 'Location Manager' : 'Business Owner'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleBackToMainApp}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span>Back to Main App</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
        {/* Mobile Floating Owner Entry Button (global within payroll area as well) */}
        <FloatingOwnerEntry />
      </div>
    </div>
  );
};

export default PayrollLayout;
