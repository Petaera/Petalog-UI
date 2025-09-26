import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  ChevronDown
} from 'lucide-react';

const sidebarItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/payroll',
    description: 'Overview & Stats'
  },
  {
    id: 'staff',
    label: 'Staff Management',
    icon: Users,
    path: '/payroll/staff',
    description: 'Manage Team'
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: Calendar,
    path: '/payroll/attendance',
    description: 'Daily Tracking'
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: Receipt,
    path: '/payroll/expenses',
    description: 'Track Costs'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/payroll/reports',
    description: 'Analytics'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/payroll/settings',
    description: 'Configuration'
  }
];

const PayrollLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
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
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-80 lg:w-80 md:w-72 sm:w-64"
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
            const isActive = location.pathname === item.path || 
                           (item.path !== '/payroll' && location.pathname.startsWith(item.path));

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

        {/* User Info */}
        {!collapsed && (
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

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col min-w-0">
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1">
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
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default PayrollLayout;
