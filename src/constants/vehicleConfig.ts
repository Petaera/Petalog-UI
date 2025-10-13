// Vehicle configuration constants
export const SERVICE_PRICES: { [key: string]: number } = {
  'basic': 200,
  'premium': 500,
  'full': 800,
  'quick': 150
};

export const PRIORITY_SERVICES = [
  'Full wash',
  'Body Wash',
  'VACCUM ONLY',
  'Vaccum Only',
  'Premium Wash'
];

export const PRIORITY_VEHICLE_TYPES = [
  'HATCH BACK',
  'SEDAN/MINI SUV',
  'SUV/PREMIUM SEDAN',
  'PREMIUM SUV',
  'PREMIUM SUV '
];

// Utility functions for sorting
export const sortServicesWithPriority = (services: string[]) => {
  return services.sort((a, b) => {
    const aIndex = PRIORITY_SERVICES.findIndex(priority => 
      a.toLowerCase().includes(priority.toLowerCase()) ||
      priority.toLowerCase().includes(a.toLowerCase())
    );
    const bIndex = PRIORITY_SERVICES.findIndex(priority => 
      b.toLowerCase().includes(priority.toLowerCase()) ||
      priority.toLowerCase().includes(b.toLowerCase())
    );

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
};

export const sortVehicleTypesWithPriority = (vehicleTypes: string[]) => {
  return vehicleTypes.sort((a, b) => {
    const aIndex = PRIORITY_VEHICLE_TYPES.findIndex(priority => 
      a.toLowerCase().includes(priority.toLowerCase()) ||
      priority.toLowerCase().includes(a.toLowerCase())
    );
    const bIndex = PRIORITY_VEHICLE_TYPES.findIndex(priority => 
      b.toLowerCase().includes(priority.toLowerCase()) ||
      priority.toLowerCase().includes(b.toLowerCase())
    );

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
};
