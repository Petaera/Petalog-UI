
import { useState, useEffect } from "react";
import { MapPin, User, LogOut, ChevronDown, Settings } from "lucide-react";
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
            <div className="flex flex-col items-start min-w-0 flex-1 border rounded px-3 lg:px-4 py-2 bg-yellow-50 border-yellow-200">
              <span className="font-medium text-sm text-yellow-800">{message}</span>
              <span className="text-xs text-yellow-600">{subMessage}</span>
            </div>
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
                {user?.role === 'owner' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/manager-settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Manager Settings
                    </DropdownMenuItem>
                  </>
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
            <div className="flex flex-col items-start min-w-0 flex-1 border rounded px-3 lg:px-4 py-2 bg-white">
              <span className="font-medium text-sm truncate">{managerLocation ? managerLocation.name : 'Loading...'}</span>
              <span className="text-xs text-muted-foreground truncate">{managerLocation ? managerLocation.address : ''}</span>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 min-w-0 flex-1 max-w-xs lg:max-w-sm">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="font-medium text-sm truncate">{currentLocation ? currentLocation.name : 'Select Location'}</span>
                    <span className="text-xs text-muted-foreground truncate">{currentLocation ? currentLocation.address : ''}</span>
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
              {user?.role === 'owner' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/manager-settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manager Settings
                  </DropdownMenuItem>
                </>
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
