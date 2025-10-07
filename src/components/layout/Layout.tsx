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
import { getLocationFilterDescription } from "@/lib/utils";
import FloatingOwnerEntry from "@/components/FloatingOwnerEntry";

interface LayoutProps {
  children: React.ReactNode;
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
}

export function Layout({ children, selectedLocation, onLocationChange }: LayoutProps) {
  const { user } = useAuth();
  const [locations, setLocations] = useState<{ id: string; name: string; address: string }[]>([]);
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
    onLocationChange(locationId);
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
        
        // Apply comprehensive location filtering based on user role and permissions
        if (user.role === 'owner') {
          console.log('🔄 Layout: Applying comprehensive owner filtering...');
          
          // For owners, we need to get locations from both systems
          // First, get locations from the old own_id system
          let ownIdLocations: any[] = [];
          if (user.own_id) {
            const { data: ownIdData, error: ownIdError } = await supabase
              .from('locations')
              .select('id, name, address')
              .eq('own_id', user.own_id);
            
            if (!ownIdError && ownIdData) {
              ownIdLocations = ownIdData;
              console.log('🔄 Layout: Found locations from own_id system:', ownIdLocations.length);
            }
          }
          
          // Then, get locations from the new location_owners system
          let partnershipLocations: any[] = [];
          try {
            const { data: partnershipData, error: partnershipError } = await supabase
              .from('location_owners')
              .select('location_id')
              .eq('owner_id', user.id);
            
            if (!partnershipError && partnershipData && partnershipData.length > 0) {
              const locationIds = partnershipData.map(lo => lo.location_id);
              console.log('🔄 Layout: Found location IDs from partnership system:', locationIds);
              
              // Get the actual location data
              const { data: partnershipLocData, error: partnershipLocError } = await supabase
                .from('locations')
                .select('id, name, address')
                .in('id', locationIds);
              
              if (!partnershipLocError && partnershipLocData) {
                partnershipLocations = partnershipLocData;
                console.log('🔄 Layout: Found locations from partnership system:', partnershipLocations.length);
              }
            }
          } catch (partnershipError) {
            console.log('🔄 Layout: Partnership system not accessible, skipping:', partnershipError);
          }
          
          // Combine both sets of locations, removing duplicates
          const allLocationIds = new Set([
            ...ownIdLocations.map(loc => loc.id),
            ...partnershipLocations.map(loc => loc.id)
          ]);
          
          console.log('🔄 Layout: Total unique locations found:', allLocationIds.size);
          
          if (allLocationIds.size > 0) {
            // Use the IN clause to get all locations
            query = query.in('id', Array.from(allLocationIds));
            console.log('🔄 Layout: Applied comprehensive filter for', allLocationIds.size, 'locations');
          } else {
            // Fallback to own_id if no locations found
            if (user.own_id) {
              query = query.eq('own_id', user.own_id);
              console.log('🔄 Layout: Applied own_id fallback filter:', user.own_id);
            }
          }
        } else if ((user.role === 'manager' || user.role === 'worker') && user.assigned_location) {
          query = query.eq('id', user.assigned_location);
          console.log('🔄 Layout: Applied assigned_location filter:', user.assigned_location);
        } else {
          // For managers without assigned_location or any other role
          query = query.eq('id', 'no-access'); // This will return no results
          console.log('🔄 Layout: No access granted - missing required permissions');
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Layout: Error fetching locations:', error);
          return;
        }
        
        console.log('Layout: Fetched locations:', data?.length || 0);
        
        if (data && data.length > 0) {
          setLocations(data);
          
          // Try to restore the previously selected location
          if (user?.id) {
            const storedLocation = getStoredLocation(user.id);
            
            if (storedLocation && data.some(loc => loc.id === storedLocation)) {
              onLocationChange(storedLocation);
            } else {
              onLocationChange(data[0].id);
              storeLocation(user.id, data[0].id);
            }
          } else {
            onLocationChange(data[0].id);
          }
        } else {
          setLocations([]);
          onLocationChange("");
        }
      } catch (error) {
        console.error('Layout: Error in fetchLocations:', error);
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
      {/* Mobile Floating Owner Entry Button (global) */}
      <FloatingOwnerEntry />
    </SidebarProvider>
  );
}

