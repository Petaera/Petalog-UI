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
