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

  // Debug selectedLocation changes
  useEffect(() => {
    console.log('🔍 Layout selectedLocation state changed:', {
      selectedLocation,
      hasLocation: !!selectedLocation,
      locationType: typeof selectedLocation,
      locationLength: selectedLocation?.length || 0,
      userId: user?.id,
      userRole: user?.role
    });
  }, [selectedLocation, user?.id, user?.role]);

  // Function to get stored location for current user
  const getStoredLocation = (userId: string) => {
    try {
      const stored = localStorage.getItem(`selectedLocation_${userId}`);
      console.log('📖 Reading stored location for user:', userId, 'value:', stored);
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
      console.log('💾 Stored location for user:', userId, 'location:', locationId);
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  // Handle location change
  const handleLocationChange = (locationId: string) => {
    console.log('🔄 Location changed to:', locationId);
    setSelectedLocation(locationId);
    if (user?.id) {
      storeLocation(user.id, locationId);
      console.log('💾 Stored location for user:', user.id, 'location:', locationId);
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        console.log('🔍 Layout fetchLocations started with user:', {
          userId: user?.id,
          userRole: user?.role,
          userOwnId: user?.own_id,
          userAssignedLocation: user?.assigned_location,
          hasUser: !!user
        });

        // Check if Supabase client is properly configured
        if (!supabase) {
          console.error('❌ Supabase client is not available');
          return;
        }

        let query = supabase.from("locations").select("id, name, address");
        
        // Apply location filter based on user role and permissions
        query = applyLocationFilter(query, user);
        
        console.log('🔍 Location filter applied:', getLocationFilterDescription(user));
        
        const { data, error } = await query;
        
        if (error) {
          console.error('❌ Error fetching locations:', error);
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          return;
        }
        
        console.log('✅ Raw locations data received:', {
          dataLength: data?.length || 0,
          data: data,
          hasData: !!data
        });
        
        if (data && data.length > 0) {
          console.log('✅ Fetched locations successfully:', data.length);
          setLocations(data);
          
          // Try to restore the previously selected location
          if (user?.id) {
            const storedLocation = getStoredLocation(user.id);
            console.log('🔍 Checking stored location:', {
              storedLocation,
              isValidStored: storedLocation && data.some(loc => loc.id === storedLocation),
              availableLocations: data.map(loc => loc.id)
            });
            
            if (storedLocation && data.some(loc => loc.id === storedLocation)) {
              console.log('🔄 Restoring stored location:', storedLocation);
              setSelectedLocation(storedLocation);
            } else {
              console.log('🔄 No valid stored location found, using first location:', data[0].id);
              setSelectedLocation(data[0].id);
              storeLocation(user.id, data[0].id);
            }
          } else {
            console.log('🔄 No user ID, using first location:', data[0].id);
            setSelectedLocation(data[0].id);
          }
        } else {
          console.log('ℹ️ No locations found for current user');
          console.log('ℹ️ This could indicate:');
          console.log('  - User has no permissions to see locations');
          console.log('  - Database query returned empty results');
          console.log('  - RLS policies are blocking access');
          setLocations([]);
          setSelectedLocation("");
        }
      } catch (error) {
        console.error('💥 Error in fetchLocations:', error);
        console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      }
    };
    
    // Only fetch locations if we have user data
    if (user) {
      console.log('🔍 User data available, fetching locations...');
      fetchLocations();
    } else {
      console.log('⏳ Waiting for user data to load...');
    }
  }, [user?.id, user?.role]);

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
            {React.isValidElement(children) && (() => {
              const childType = children.type;
              const childTypeName = typeof childType === 'function' ? childType.name : 'string or other';
              console.log('🔍 Layout component type check:', {
                childType,
                childTypeName,
                isDashboard: childTypeName === 'Dashboard',
                isAutomaticLogs: childTypeName === 'AutomaticLogs',
                isManualLogs: childTypeName === 'ManualLogs',
                isOwnerEntry: childTypeName === 'OwnerEntry',
                isComparison: childTypeName === 'Comparison',
                isReports: childTypeName === 'Reports',
                isVehicleHistory: childTypeName === 'VehicleHistory',
                selectedLocation,
                hasLocation: !!selectedLocation
              });
              
              return (childTypeName === 'Dashboard' || childTypeName === 'AutomaticLogs' || childTypeName === 'ManualLogs' || childTypeName === 'OwnerEntry' || childTypeName === 'Comparison' || childTypeName === 'Reports' || childTypeName === 'VehicleHistory');
            })()
              ? React.cloneElement(children as React.ReactElement<any>, { selectedLocation })
              : children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}