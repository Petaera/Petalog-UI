
import { useState, useEffect } from "react";
import { MapPin, User, LogOut, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";

interface HeaderProps {
  locations: { id: string; name: string; address: string }[];
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
}

export function Header({ locations, selectedLocation, onLocationChange }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [managerLocation, setManagerLocation] = useState<{ name: string; address: string } | null>(null);
  const isManager = user?.role === 'manager';
  const [payLaterDue, setPayLaterDue] = useState<number>(0);
  const [isPayLaterLoading, setIsPayLaterLoading] = useState<boolean>(false);

  // Remove locations state and fetching logic
  // const [locations, setLocations] = useState<{ id: string; name: string; address: string }[]>([]);
  // useEffect(() => { ... });

  const currentLocation = locations.find(loc => loc.id === selectedLocation) || locations[0];

  useEffect(() => {
    const fetchLocation = async () => {
      if (isManager && user?.assigned_location) {
        const { data, error } = await supabase
          .from('locations')
          .select('name, address')
          .eq('id', user.assigned_location)
          .single();
        if (!error && data) {
          setManagerLocation({ name: data.name, address: data.address });
        } else {
          setManagerLocation(null);
        }
      }
    };
    fetchLocation();
  }, [isManager, user?.assigned_location]);

  // Fetch global Pay Later due (credit) across accessible locations; hidden on mobile via CSS
  useEffect(() => {
    const fetchPayLaterDue = async () => {
      if (!user) return;
      try {
        setIsPayLaterLoading(true);
        let query = supabase
          .from('logs-man')
          .select('Amount, discount, payment_mode, approval_status, location_id');

        // Filter by role and location selection
        if (user.role === 'owner') {
          if (selectedLocation && selectedLocation.trim() !== '') {
            query = query.eq('location_id', selectedLocation);
          } else {
            const locationIds = locations.map(l => l.id);
            if (locationIds.length > 0) {
              query = query.in('location_id', locationIds);
            } else {
              setPayLaterDue(0);
              setIsPayLaterLoading(false);
              return;
            }
          }
        } else if ((user.role === 'manager' || user.role === 'worker') && user.assigned_location) {
          query = query.eq('location_id', user.assigned_location);
        } else {
          setPayLaterDue(0);
          setIsPayLaterLoading(false);
          return;
        }

        // Only approved credit tickets
        query = query.eq('approval_status', 'approved').eq('payment_mode', 'credit');

        const { data, error } = await query;
        if (error) {
          setPayLaterDue(0);
          setIsPayLaterLoading(false);
          return;
        }

        const total = (data || []).reduce((sum: number, row: any) => {
          const amount = Number(row?.Amount) || 0;
          const discount = Number(row?.discount) || 0;
          const net = amount - discount;
          return sum + (net > 0 ? net : 0);
        }, 0);
        setPayLaterDue(total);
      } finally {
        setIsPayLaterLoading(false);
      }
    };

    fetchPayLaterDue();
  }, [user?.id, user?.role, user?.assigned_location, selectedLocation, locations.map(l => l.id).join(',')]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/'; // Full reload to ensure session is cleared
  };

  // Show message if no locations are available
  if (locations.length === 0) {
    const isOwner = user?.role === 'owner';
    const hasOwnId = !!user?.own_id;
    
    let message = "No Locations Available";
    let subMessage = "Contact administrator to assign locations";
    
    if (isOwner) {
      if (!hasOwnId) {
        message = "No Location Granted";
        subMessage = "Your account has not been assigned any locations yet";
      } else {
        message = "No Locations Found";
        subMessage = "No locations are associated with your account";
      }
    }
    
    return (
      <header className="h-16 border-b bg-card/50 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1">
            <SidebarTrigger className="h-8 w-8 flex-shrink-0" />
          <div className="flex flex-col items-start min-w-0 flex-1 max-w-[65%] sm:max-w-none border rounded px-3 lg:px-4 py-2 bg-yellow-50 border-yellow-200 overflow-hidden">
              <span className="font-medium text-sm text-yellow-800">{message}</span>
              <span className="text-xs text-yellow-600">{subMessage}</span>
            </div>
          {/* Global Pay Later badge (desktop only) */}
          <button
            type="button"
            onClick={() => navigate('/pay-later')}
            className="hidden md:inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-red-500 via-red-600 to-red-500 shadow-sm animate-pulse hover:animate-none hover:brightness-110 focus:outline-none"
            title="View Pay Later details"
          >
            {isPayLaterLoading ? 'Pay Later: …' : `Pay Later: ₹${payLaterDue.toLocaleString()}`}
          </button>
          {/* Global Pay Later badge (mobile only, compact) */}
          <button
            type="button"
            onClick={() => navigate('/pay-later')}
            className="inline-flex md:hidden ml-2 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold text-white bg-gradient-to-r from-red-500 via-red-600 to-red-500 shadow-sm focus:outline-none"
            title="View Pay Later details"
          >
            {isPayLaterLoading ? 'Due: …' : `Due: ₹${payLaterDue.toLocaleString()}`}
          </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hidden sm:inline-flex">
              {user?.role === 'owner' ? 'Owner' : 'Manager'}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="font-medium hidden sm:inline">{user?.email}</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 lg:w-64">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.role === 'owner' && (
                  <DropdownMenuItem onClick={() => navigate('/profileSettings')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="h-16 border-b bg-card/50 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1">
          <SidebarTrigger className="h-8 w-8 flex-shrink-0" />
          {isManager ? (
            <div className="flex flex-col items-start min-w-0 flex-1 max-w-[65%] sm:max-w-none border rounded px-3 lg:px-4 py-2 bg-white overflow-hidden">
              <span className="font-medium text-sm truncate">{managerLocation ? managerLocation.name : 'Loading...'}</span>
              <span className="text-xs text-muted-foreground truncate">{managerLocation ? managerLocation.address : ''}</span>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="relative flex items-center gap-2 min-w-0 flex-1 max-w-[65%] sm:max-w-xs lg:max-w-sm overflow-hidden pr-6">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0 flex-1 w-full pr-2">
                    <span className="font-medium text-sm truncate">{currentLocation ? currentLocation.name : 'Select Location'}</span>
                    <span className="text-xs text-muted-foreground truncate">{currentLocation ? currentLocation.address : ''}</span>
                  </div>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/95 ring-1 ring-gray-200 shadow-sm">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 lg:w-80">
                <DropdownMenuLabel>Select Location</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {locations.map((location) => (
                  <DropdownMenuItem
                    key={location.id}
                    onClick={() => onLocationChange(location.id)}
                    className="flex flex-col items-start p-3"
                  >
                    <span className="font-medium">{location.name}</span>
                    <span className="text-xs text-muted-foreground">{location.address}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Global Pay Later badge (desktop only) */}
          <button
            type="button"
            onClick={() => navigate('/pay-later')}
            className="hidden md:inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-red-500 via-red-600 to-red-500 shadow-sm animate-pulse hover:animate-none hover:brightness-110 focus:outline-none"
            title="View Pay Later details"
          >
            {isPayLaterLoading ? 'Pay Later: …' : `Pending payments: ₹${payLaterDue.toLocaleString()}`}
          </button>
          {/* Global Pay Later badge (mobile only, compact) */}
          <button
            type="button"
            onClick={() => navigate('/pay-later')}
            className="inline-flex md:hidden ml-2 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold text-white bg-gradient-to-r from-red-500 via-red-600 to-red-500 shadow-sm focus:outline-none"
            title="View Pay Later details"
          >
            {isPayLaterLoading ? 'Due: …' : `Due: ₹${payLaterDue.toLocaleString()}`}
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hidden sm:inline-flex">
            {user?.role === 'owner' ? 'Owner' : 'Manager'}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <span className="font-medium hidden sm:inline">{user?.email}</span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 lg:w-64">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.role === 'owner' && (
                <DropdownMenuItem onClick={() => navigate('/profileSettings')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
