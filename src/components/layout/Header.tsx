
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
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
}

export function Header({ selectedLocation, onLocationChange }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [managerLocation, setManagerLocation] = useState<{ name: string; address: string } | null>(null);
  const isManager = user?.role === 'manager';

  // Move these inside the component
  const [locations, setLocations] = useState<{ id: string; name: string; address: string }[]>([]);
  useEffect(() => {
    // Only fetch locations for owner
    if (!isManager) {
      const fetchLocations = async () => {
        const { data, error } = await supabase.from('locations').select('id, name, address');
        if (!error && data) {
          setLocations(data);
        } else {
          setLocations([]);
        }
      };
      fetchLocations();
    }
  }, [isManager]);

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

  return (
    <header className="h-16 border-b bg-card/50 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8" />
          {isManager ? (
            <div className="flex flex-col items-start min-w-64 border rounded px-4 py-2 bg-white">
              <span className="font-medium text-sm">{managerLocation ? managerLocation.name : 'Loading...'}</span>
              <span className="text-xs text-muted-foreground">{managerLocation ? managerLocation.address : ''}</span>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 min-w-64">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{currentLocation ? currentLocation.name : 'Select Location'}</span>
                    <span className="text-xs text-muted-foreground">{currentLocation ? currentLocation.address : ''}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
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
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {user?.role === 'owner' ? 'Owner' : 'Manager'}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
                <span className="font-medium">{user?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
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
