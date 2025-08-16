import React, { useEffect, useState, useRef } from "react";
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
  const { user } = useAuth();
  const [locations, setLocations] = useState<{ id: string; name: string; address: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedLocations = useRef(false);



  // Function to get stored location for current user
  const getStoredLocation = (userId: string) => {
    try {
      const stored = localStorage.getItem(`selectedLocation_${userId}`);
      return stored || "";
    } catch (error) {
      return "";
    }
  };

  // Function to store location for current user
  const storeLocation = (userId: string, locationId: string) => {
    try {
      localStorage.setItem(`selectedLocation_${userId}`, locationId);
    } catch (error) {
      // Silent fail for localStorage errors
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
    // Prevent multiple fetches
    if (hasFetchedLocations.current || !user?.id) {
      return;
    }

    const fetchLocations = async () => {
      try {
        // Check if Supabase client is properly configured
        if (!supabase) {
          return;
        }

        let query = supabase.from("locations").select("id, name, address");
        
        // Apply location filter based on user role and permissions
        query = applyLocationFilter(query, user);
        
        const { data, error } = await query;
        
        if (error) {
          return;
        }
        
        if (data && data.length > 0) {
          setLocations(data);
          
          // Try to restore the previously selected location
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
      } catch (error) {
        // Silent fail for location fetch errors
      } finally {
        setIsLoading(false);
        hasFetchedLocations.current = true;
      }
    };

    // Only fetch locations if we have user data and haven't fetched yet
    if (user) {
      fetchLocations();
    }
  }, [user?.id]); // Only depend on user ID, not the entire user object

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
            {React.isValidElement(children)
              ? (() => {
                                     // In production builds component names may be minified, so
                   // checking by name is unreliable. Always pass selectedLocation
                   // down to page components; components that don't use it will
                   // simply ignore the prop.
                   try {
                     const cloned = React.cloneElement(children as React.ReactElement<any>, { selectedLocation });
                     return cloned;
                   } catch (e) {
                     return children;
                   }
                })()
              : children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}