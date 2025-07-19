
import { useState } from "react";
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

const locations = [
  { id: "1", name: "Main Branch - Downtown", address: "123 Main St" },
  { id: "2", name: "North Branch", address: "456 North Ave" },
  { id: "3", name: "West Side Center", address: "789 West Blvd" },
];

interface HeaderProps {
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
}

export function Header({ selectedLocation, onLocationChange }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const currentLocation = locations.find(loc => loc.id === selectedLocation) || locations[0];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="h-16 border-b bg-card/50 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8" />
          
          {/* Location Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 min-w-64">
                <MapPin className="h-4 w-4 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{currentLocation.name}</span>
                  <span className="text-xs text-muted-foreground">{currentLocation.address}</span>
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
