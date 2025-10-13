import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { mapTypeToWheelCategory } from '@/utils/vehicleUtils';

interface AutoFillData {
  customerName: string;
  phoneNumber: string;
  dateOfBirth: string;
  customerLocation: string;
  selectedVehicleBrand: string;
  selectedModel: string;
  selectedModelId: string;
  wheelCategory: string;
  vehicleType: string;
  lastServiceData: {
    service: string;
    amount: number;
    date: string;
  } | null;
}

export const useVehicleAutoFill = (
  vehicleNumber: string,
  vehicleData: any[],
  selectedLocation?: string,
  isEditing = false,
  isApplyingEditData = false
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [autoFillData, setAutoFillData] = useState<AutoFillData>({
    customerName: '',
    phoneNumber: '',
    dateOfBirth: '',
    customerLocation: '',
    selectedVehicleBrand: '',
    selectedModel: '',
    selectedModelId: '',
    wheelCategory: '',
    vehicleType: '',
    lastServiceData: null,
  });

  useEffect(() => {
    if (isEditing || isApplyingEditData) return;
    
    const plate = vehicleNumber.trim();
    if (!plate) {
      setAutoFillData({
        customerName: '',
        phoneNumber: '',
        dateOfBirth: '',
        customerLocation: '',
        selectedVehicleBrand: '',
        selectedModel: '',
        selectedModelId: '',
        wheelCategory: '',
        vehicleType: '',
        lastServiceData: null,
      });
      return;
    }

    if (plate.length < 3) return;
    let cancelled = false;

    const loadLatestDetails = async () => {
      try {
        setIsLoading(true);
        
        // First, find the vehicle by normalized plate
        const normalizedPlate = plate.toUpperCase().replace(/\s|-/g, '');
        const { data: vehicleRecord, error: vehicleError } = await supabase
          .from('vehicles')
          .select('id, number_plate, Brand, model, type, owner_id')
          .eq('number_plate', normalizedPlate)
          .maybeSingle();

        // Also pull latest matching manual log (any location) for this plate
        const { data: logData, error: logError } = await supabase
          .from('logs-man')
          .select('Name, Phone_no, Location, "D.O.B", vehicle_brand, vehicle_model, Amount, Brand_id, wheel_type, vehicle_type, service, created_at')
          .ilike('vehicle_number', `%${plate}%`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (vehicleError || !vehicleRecord) {
          // No vehicle found, clear customer-related fields
          if (!cancelled) {
            setAutoFillData({
              customerName: '',
              phoneNumber: '',
              dateOfBirth: '',
              customerLocation: '',
              selectedVehicleBrand: '',
              selectedModel: '',
              selectedModelId: '',
              wheelCategory: '',
              vehicleType: '',
              lastServiceData: null,
            });
          }
          return;
        }
        if (cancelled) return;

        // Get customer data if vehicle has an owner
        let customerData = null;
        if (vehicleRecord.owner_id) {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, name, phone, date_of_birth, location_id')
            .eq('id', vehicleRecord.owner_id)
            .maybeSingle();
          
          if (!customerError && customer) {
            customerData = customer;
          }
        }

        // Use log data if available, otherwise use vehicle record data
        const last = logData && logData.length > 0 ? logData[0] : null;

        // Get location name if customer has a location_id
        let locationName = '';
        if (customerData && customerData.location_id) {
          const { data: location, error: locationError } = await supabase
            .from('locations')
            .select('name')
            .eq('id', customerData.location_id)
            .maybeSingle();
          
          if (!locationError && location) {
            locationName = location.name;
          }
        }

        const newData: AutoFillData = {
          customerName: '',
          phoneNumber: '',
          dateOfBirth: '',
          customerLocation: '',
          selectedVehicleBrand: '',
          selectedModel: '',
          selectedModelId: '',
          wheelCategory: '',
          vehicleType: '',
          lastServiceData: null,
        };

        // Populate customer details - prioritize log data, fallback to customer data
        if (last) {
          newData.customerName = last.Name || '';
          newData.phoneNumber = last.Phone_no || '';
          newData.customerLocation = last.Location || '';
          newData.dateOfBirth = last['D.O.B'] || '';
        } else if (customerData) {
          newData.customerName = customerData.name || '';
          newData.phoneNumber = customerData.phone || '';
          newData.customerLocation = locationName;
          newData.dateOfBirth = customerData.date_of_birth || '';
        }

        // Populate vehicle details - prioritize log data, fallback to vehicle record
        if (last) {
          newData.selectedVehicleBrand = last.vehicle_brand || '';
          
          // Wheel category from log if available
          if (last.wheel_type) {
            const derived = mapTypeToWheelCategory(last.wheel_type);
            if (derived) newData.wheelCategory = derived;
          }

          // Vehicle type from log
          if (last.vehicle_type) {
            newData.vehicleType = last.vehicle_type;
          }

          // Model data (will be set later via timeout in component)
          newData.selectedModel = last.vehicle_model || '';
          newData.selectedModelId = last.Brand_id || '';

          // Store last service data for display
          if (last.service || last.Amount || last.created_at) {
            newData.lastServiceData = {
              service: last.service || 'N/A',
              amount: last.Amount || 0,
              date: last.created_at || ''
            };
          }
        } else {
          // Fallback to vehicle record data
          newData.selectedVehicleBrand = vehicleRecord.Brand || '';
          
          // Set wheel category from vehicle type
          if (vehicleRecord.type) {
            const derived = mapTypeToWheelCategory(vehicleRecord.type);
            if (derived) newData.wheelCategory = derived;
          }

          // Find the model name from Vehicles_in_india using the ID stored in vehicles.model
          if (vehicleRecord.model && vehicleData.length > 0) {
            const match = vehicleData.find(item => item.id === vehicleRecord.model);
            if (match) {
              newData.selectedModel = match['Models'] || '';
              newData.selectedModelId = match.id || '';
              
              // Auto-fill wheel category from Vehicles_in_india type
              if (match.type) {
                const derivedCategory = mapTypeToWheelCategory(match.type);
                if (derivedCategory) {
                  newData.wheelCategory = derivedCategory;
                }
              }
            }
          }
        }

        // Auto-fill vehicle type from last entry in logs-man for the same location
        if (selectedLocation && !cancelled) {
          try {
            const { data: lastLog, error: logError } = await supabase
              .from('logs-man')
              .select('vehicle_type')
              .eq('location_id', selectedLocation)
              .not('vehicle_type', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!logError && lastLog && lastLog.vehicle_type) {
              if (!cancelled) {
                newData.vehicleType = lastLog.vehicle_type;
              }
            }
          } catch (err) {
            console.warn('Error fetching last vehicle type from logs-man:', err);
          }
        }

        if (!cancelled) {
          setAutoFillData(newData);
        }
      } catch (e) {
        // ignore autofill errors silently
        console.warn('Auto-fill error:', e);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const t = setTimeout(loadLatestDetails, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [vehicleNumber, isEditing, vehicleData, selectedLocation, isApplyingEditData]);

  return {
    isLoading,
    ...autoFillData
  };
};

