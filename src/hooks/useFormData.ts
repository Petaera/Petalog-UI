import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface ServicePrice {
  VEHICLE: string;
  SERVICE: string;
  PRICE: number;
  type?: string;
}

export interface WorkshopPrice {
  WORKSHOP: string;
  VEHICLE: string;
  DISCOUNT: number;
}

export const useFormData = () => {
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [priceMatrix, setPriceMatrix] = useState<ServicePrice[]>([]);
  const [workshopOptions, setWorkshopOptions] = useState<string[]>([]);
  const [workshopPriceMatrix, setWorkshopPriceMatrix] = useState<WorkshopPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch service prices
        const { data: serviceData, error: serviceError } = await supabase
          .from('Service_prices')
          .select('*');

        if (serviceError) {
          console.error('Error fetching service prices:', serviceError);
        } else if (serviceData) {
          setPriceMatrix(serviceData);
          const uniqueVehicles = [...new Set(serviceData.map(row => row.VEHICLE?.trim()).filter(Boolean))];
          const uniqueServices = [...new Set(serviceData.map(row => row.SERVICE?.trim()).filter(Boolean))];
          setVehicleTypes(uniqueVehicles);
          setServiceOptions(uniqueServices);
        }

        // Fetch workshop prices
        const { data: workshopData, error: workshopError } = await supabase
          .from('workshop_prices')
          .select('*');

        if (workshopError) {
          console.error('Error fetching workshop prices:', workshopError);
        } else if (workshopData) {
          setWorkshopPriceMatrix(workshopData);
          const uniqueWorkshops = [...new Set(workshopData.map(row => row.WORKSHOP?.trim()).filter(Boolean))];
          setWorkshopOptions(uniqueWorkshops);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    vehicleTypes,
    serviceOptions,
    priceMatrix,
    workshopOptions,
    workshopPriceMatrix,
    loading
  };
};
