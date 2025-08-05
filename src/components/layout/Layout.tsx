import React, { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import Dashboard from '@/pages/Dashboard';
import AutomaticLogs from '@/pages/AutomaticLogs';
import ManualLogs from '@/pages/ManualLogs';
import OwnerEntry from '@/pages/OwnerEntry';
import Comparison from '@/pages/Comparison';
import Reports from '@/pages/Reports';
import VehicleHistory from '@/pages/VehicleHistory';
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { applyLocationFilter, getLocationFilterDescription } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [locations, setLocations] = useState<{ id: string; name: string; address: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const { user } = useAuth();

  // Function to get stored location for current user
  const getStoredLocation = (userId: string) => {
    try {
      const stored = localStorage.getItem(`selectedLocation_${userId}`);
      return stored || "";
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return "";
    }
  };

  // Function to store location for current user
  const storeLocation = (userId: string, locationId: string) => {
    try {
      localStorage.setItem(`selectedLocation_${userId}`, locationId);
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  // Handle location change
  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
    if (user?.id) {
      storeLocation(user.id, locationId);
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        let query = supabase.from("locations").select("id, name, address");
        
        // Apply location filter based on user role and permissions
        query = applyLocationFilter(query, user);
        
        console.log('🔍 Location filter:', getLocationFilterDescription(user));
        
        const { data, error } = await query;
        
        if (error) {
          console.error('❌ Error fetching locations:', error);
          return;
        }
        
        if (data && data.length > 0) {
          console.log('✅ Fetched locations:', data.length);
          setLocations(data);
          
          // Try to restore the previously selected location
          if (user?.id) {
            const storedLocation = getStoredLocation(user.id);
            if (storedLocation && data.some(loc => loc.id === storedLocation)) {
              console.log('🔄 Restoring stored location:', storedLocation);
              setSelectedLocation(storedLocation);
            } else {
              console.log('🔄 No valid stored location found, using first location');
              setSelectedLocation(data[0].id);
              storeLocation(user.id, data[0].id);
            }
          } else {
            console.log('🔄 No user ID, using first location');
            setSelectedLocation(data[0].id);
          }
        } else {
          console.log('ℹ️ No locations found for current user');
          setLocations([]);
          setSelectedLocation("");
        }
      } catch (error) {
        console.error('💥 Error in fetchLocations:', error);
      }
    };
    
    fetchLocations();
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header 
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
          />
          <main className="flex-1 overflow-auto">
            {React.isValidElement(children) && (children.type === Dashboard || children.type === AutomaticLogs || children.type === ManualLogs || children.type === OwnerEntry || children.type === Comparison || children.type === Reports || children.type === VehicleHistory)
              ? React.cloneElement(children as React.ReactElement<any>, { selectedLocation })
              : children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}