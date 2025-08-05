import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from "./supabaseClient"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate UUID for vehicle creation
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback (not cryptographically secure)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Utility function to get or create vehicle ID
export async function getOrCreateVehicleId(vehicleNumber: string, vehicleType?: string) {
  try {
    // First, check if vehicle already exists
    const { data: existingVehicle, error: lookupError } = await supabase
      .from('vehicles')
      .select('id, type')
      .eq('number_plate', vehicleNumber)
      .single();

    if (lookupError && lookupError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new vehicles
      console.error('Error looking up vehicle:', lookupError);
      throw lookupError;
    }

    if (existingVehicle && existingVehicle.id) {
      // Vehicle exists, return existing ID
      console.log(`Found existing vehicle: ${vehicleNumber} with ID: ${existingVehicle.id}`);
      return existingVehicle.id;
    } else {
      // Vehicle doesn't exist, create new one
      const newVehicleId = generateUUID();
      const vehicleData: any = {
        id: newVehicleId,
        number_plate: vehicleNumber,
      };
      
      // Add vehicle type if provided
      if (vehicleType) {
        vehicleData.type = vehicleType;
      }

      const { error: insertError } = await supabase
        .from('vehicles')
        .insert([vehicleData]);

      if (insertError) {
        console.error('Error creating new vehicle:', insertError);
        throw insertError;
      }

      console.log(`Created new vehicle: ${vehicleNumber} with ID: ${newVehicleId}`);
      return newVehicleId;
    }
  } catch (error) {
    console.error('Error in getOrCreateVehicleId:', error);
    throw error;
  }
}

/**
 * Get location filter based on user role and permissions
 * @param user - The current user object
 * @returns Object containing filter query and metadata
 */
export const getLocationFilter = (user: any) => {
  if (!user) {
    return {
      query: null,
      isFiltered: false,
      filterType: 'none',
      reason: 'No user'
    };
  }

  if (user.role === 'owner') {
    if (user.own_id) {
      return {
        query: (baseQuery: any) => baseQuery.eq('own_id', user.own_id),
        isFiltered: true,
        filterType: 'owner',
        reason: `Owner filtering by own_id: ${user.own_id}`
      };
    } else {
      // Owner without own_id should see no locations
      return {
        query: (baseQuery: any) => baseQuery.eq('id', 'no-access'), // This will return no results
        isFiltered: true,
        filterType: 'owner_no_access',
        reason: 'Owner without own_id - no access granted'
      };
    }
  }

  if (user.role === 'manager' && user.assigned_location) {
    return {
      query: (baseQuery: any) => baseQuery.eq('id', user.assigned_location),
      isFiltered: true,
      filterType: 'manager',
      reason: `Manager filtering by assigned location: ${user.assigned_location}`
    };
  }

  // For managers without assigned_location or any other role
  return {
    query: (baseQuery: any) => baseQuery.eq('id', 'no-access'), // This will return no results
    isFiltered: true,
    filterType: 'no_access',
    reason: 'No access granted - missing required permissions'
  };
};

/**
 * Apply location filter to a Supabase query
 * @param baseQuery - The base Supabase query
 * @param user - The current user object
 * @returns Modified query with location filter applied
 */
export const applyLocationFilter = (baseQuery: any, user: any) => {
  const filter = getLocationFilter(user);
  
  if (filter.query) {
    return filter.query(baseQuery);
  }
  
  return baseQuery;
};

/**
 * Get user-friendly location filter description
 * @param user - The current user object
 * @returns Human-readable description of the applied filter
 */
export const getLocationFilterDescription = (user: any) => {
  const filter = getLocationFilter(user);
  
  switch (filter.filterType) {
    case 'owner':
      return 'Showing locations owned by you';
    case 'owner_no_access':
      return 'No locations granted - contact administrator';
    case 'manager':
      return 'Showing your assigned location';
    case 'no_access':
      return 'No access granted - contact administrator';
    case 'none':
      return 'Showing all locations';
    default:
      return 'Location filter not applied';
  }
};

/**
 * Debug function to log location filtering information
 * @param user - The current user object
 * @param selectedLocation - The selected location ID
 * @param data - The data to check
 * @param dataType - Type of data being checked
 */
export const debugLocationFiltering = (user: any, selectedLocation: string, data: any[], dataType: string) => {
  console.log(`🔍 ${dataType} Location Filtering Debug:`, {
    userRole: user?.role,
    userOwnId: user?.own_id,
    userAssignedLocation: user?.assigned_location,
    selectedLocation,
    dataCount: data?.length || 0,
    locationIds: data?.map(item => item.location_id) || [],
    sampleData: data?.slice(0, 2) || []
  });
};

/**
 * Debug function to log vehicle data fetching information
 * @param data - The log data with vehicle information
 * @param dataType - Type of data being checked
 */
export const debugVehicleData = (data: any[], dataType: string) => {
  console.log(`🚗 ${dataType} Vehicle Data Debug:`, {
    totalEntries: data?.length || 0,
    entriesWithVehicles: data?.filter(item => (item.vehicles as any)?.number_plate || (item.vehicles as any)?.[0]?.number_plate)?.length || 0,
    entriesWithoutVehicles: data?.filter(item => !((item.vehicles as any)?.number_plate || (item.vehicles as any)?.[0]?.number_plate))?.length || 0,
    vehiclePlates: data?.map(item => ({
      vehicle_id: item.vehicle_id,
      number_plate: (item.vehicles as any)?.number_plate || (item.vehicles as any)?.[0]?.number_plate || 'No plate',
      has_vehicle_data: !!((item.vehicles as any)?.number_plate || (item.vehicles as any)?.[0]?.number_plate)
    })) || [],
    sampleEntries: data?.slice(0, 3)?.map(item => ({
      id: item.id,
      entry_time: item.entry_time,
      vehicle_id: item.vehicle_id,
      vehicle_plate: (item.vehicles as any)?.number_plate || (item.vehicles as any)?.[0]?.number_plate || 'Unknown'
    })) || []
  });
};
