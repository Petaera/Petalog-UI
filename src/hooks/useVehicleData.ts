import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface VehicleData {
  id: string;
  'Vehicle Brands': string;
  'Models': string;
  type?: string;
}

export const useVehicleData = () => {
  const [vehicleData, setVehicleData] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicleData = async () => {
      try {
        const { data, error } = await supabase
          .from('Vehicles_in_india')
          .select('id, "Vehicle Brands", "Models", type');

        if (error) {
          console.error('Error fetching vehicle data:', error);
          return;
        }

        setVehicleData(data || []);
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleData();
  }, []);

  return { vehicleData, loading };
};
