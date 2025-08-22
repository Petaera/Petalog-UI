import { useState, useEffect } from 'react';
import { Car, Banknote, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
// import { ScratchMarking } from "@/components/ScratchMarking";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import ReactSelect from 'react-select';
import { getOrCreateVehicleId } from "@/lib/utils";
import { useUpiAccounts } from '@/hooks/useUpiAccounts';

// Add SERVICE_PRICES fallback at the top-level
const SERVICE_PRICES: { [key: string]: number } = {
  'basic': 200,
  'premium': 500,
  'full': 800,
  'quick': 150
};

// Priority services that should appear first in the list
const PRIORITY_SERVICES = [
  'Full wash',
  'Body Wash',
  'VACCUM ONLY',
  'Vaccum Only',
  'Premium Wash'
];

// Priority vehicle types that should appear first in the list
const PRIORITY_VEHICLE_TYPES = [
  'HATCH BACK',
  'SEDAN/MINI SUV',
  'SUV/PREMIUM SEDAN',
  'PREMIUM SUV',
  'PREMIUM SUV '
];

// Function to sort services with priority services first
const sortServicesWithPriority = (services: string[]) => {
  console.log('🔍 Sorting services:', services);
  
  return services.sort((a, b) => {
    // More flexible matching for priority services
    const aIndex = PRIORITY_SERVICES.findIndex(priority => {
      const aLower = a.toLowerCase();
      const priorityLower = priority.toLowerCase();
      return aLower.includes(priorityLower) || 
             priorityLower.includes(aLower) ||
             aLower.replace(/\s+/g, '').includes(priorityLower.replace(/\s+/g, '')) ||
             priorityLower.replace(/\s+/g, '').includes(aLower.replace(/\s+/g, ''));
    });
    
    const bIndex = PRIORITY_SERVICES.findIndex(priority => {
      const bLower = b.toLowerCase();
      const priorityLower = priority.toLowerCase();
      return bLower.includes(priorityLower) || 
             priorityLower.includes(bLower) ||
             bLower.replace(/\s+/g, '').includes(priorityLower.replace(/\s+/g, '')) ||
             priorityLower.replace(/\s+/g, '').includes(bLower.replace(/\s+/g, ''));
    });
    
    console.log(`Comparing "${a}" (priority index: ${aIndex}) vs "${b}" (priority index: ${bIndex})`);
    
    // If both are priority services, maintain their original order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // If only a is priority, a comes first
    if (aIndex !== -1) return -1;
    // If only b is priority, b comes first
    if (bIndex !== -1) return 1;
    // If neither is priority, sort alphabetically
    return a.localeCompare(b);
  });
};

// Function to sort vehicle types with priority types first
const sortVehicleTypesWithPriority = (vehicleTypes: string[]) => {
  console.log('🚗 Sorting vehicle types:', vehicleTypes);
  
  return vehicleTypes.sort((a, b) => {
    // More flexible matching for priority vehicle types
    const aIndex = PRIORITY_VEHICLE_TYPES.findIndex(priority => {
      const aLower = a.toLowerCase();
      const priorityLower = priority.toLowerCase();
      return aLower.includes(priorityLower) || 
             priorityLower.includes(aLower) ||
             aLower.replace(/\s+/g, '').includes(priorityLower.replace(/\s+/g, '')) ||
             priorityLower.replace(/\s+/g, '').includes(aLower.replace(/\s+/g, ''));
    });
    
    const bIndex = PRIORITY_VEHICLE_TYPES.findIndex(priority => {
      const bLower = b.toLowerCase();
      const priorityLower = priority.toLowerCase();
      return bLower.includes(priorityLower) || 
             priorityLower.includes(bLower) ||
             bLower.replace(/\s+/g, '').includes(priorityLower.replace(/\s+/g, '')) ||
             priorityLower.replace(/\s+/g, '').includes(bLower.replace(/\s+/g, ''));
    });
    
    console.log(`Comparing vehicle types "${a}" (priority index: ${aIndex}) vs "${b}" (priority index: ${bIndex})`);
    
    // If both are priority types, maintain their original order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // If only a is priority, a comes first
    if (aIndex !== -1) return -1;
    // If only b is priority, b comes first
    if (bIndex !== -1) return 1;
    // If neither is priority, sort alphabetically
    return a.localeCompare(b);
  });
};

interface OwnerEntryProps {
  selectedLocation?: string;
}

export default function OwnerEntry({ selectedLocation }: OwnerEntryProps) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [priceMatrix, setPriceMatrix] = useState<any[]>([]);
  const [vehicleType, setVehicleType] = useState('');
  // Change service to array for multi-select
  const [service, setService] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [entryType, setEntryType] = useState('customer');
  const [discount, setDiscount] = useState('');
  const [remarks, setRemarks] = useState('');
  // Payment mode state for cash/UPI selection
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'credit'>('cash');
  // const [scratchImage, setScratchImage] = useState<Blob | null>(null);
  const [workshop, setWorkshop] = useState('');
  const [workshopOptions, setWorkshopOptions] = useState<string[]>([]);
  const [workshopPriceMatrix, setWorkshopPriceMatrix] = useState<any[]>([]);
  // 2/4/Other selector next to entry type
  const [wheelCategory, setWheelCategory] = useState<string>('');
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  
  // Vehicle brand and model
  const [selectedVehicleBrand, setSelectedVehicleBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [availableVehicleBrands, setAvailableVehicleBrands] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<{name: string, id: string, brand: string}[]>([]);
  const [vehicleData, setVehicleData] = useState<any[]>([]);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editLogId, setEditLogId] = useState<string | null>(null);

  // Button disable state for 5 seconds after submit
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const [visitCount, setVisitCount] = useState<number>(0);

  // Custom entry date and time
  const [customEntryDate, setCustomEntryDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [customEntryTime, setCustomEntryTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  const [useCustomDateTime, setUseCustomDateTime] = useState(false);

  // Loading state for auto-fill
  const [isLoadingVehicleData, setIsLoadingVehicleData] = useState(false);

  // UPI accounts state
  const [selectedUpiAccount, setSelectedUpiAccount] = useState<string>('');
  const { accounts: upiAccounts, loading: upiAccountsLoading } = useUpiAccounts(selectedLocation);

  const { user } = useAuth();

  // Store edit data for later use
  const [pendingEditData, setPendingEditData] = useState<any>(null);

  // Reset UPI account selection when payment mode changes
  useEffect(() => {
    if (paymentMode !== 'upi') {
      setSelectedUpiAccount('');
    }
  }, [paymentMode]);

  // Reset UPI account selection when selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      setSelectedUpiAccount('');
      console.log('📍 Location changed, resetting UPI account selection');
    }
  }, [selectedLocation]);

  // Check for edit data on component mount
  useEffect(() => {
    const editData = sessionStorage.getItem('editLogData');
    if (editData) {
      try {
        const logData = JSON.parse(editData);
        console.log('Edit data found:', logData);
        setPendingEditData(logData);
        
        // Clear the sessionStorage
        sessionStorage.removeItem('editLogData');
      } catch (error) {
        console.error('Error parsing edit data:', error);
        toast.error('Error loading edit data');
      }
    }
  }, []);

  // Fetch vehicle brands and models from Vehicles_in_india table
  useEffect(() => {
    const fetchVehicleData = async () => {
      console.log('Fetching from Vehicles_in_india table...');
      
      // Fetch all fields including id for Brand_id mapping
      let result = await supabase
        .from('Vehicles_in_india')
        .select('id, "Vehicle Brands", "Models", type');
      
      console.log('Vehicles_in_india result:', result);
      
      // If that fails, try selecting all fields
      if (result.error) {
        console.log('Trying to select all fields...');
        result = await supabase
          .from('Vehicles_in_india')
          .select('*');
        console.log('Select all result:', result);
      }
      
      const { data, error } = result;
      
      if (!error && data && data.length > 0) {
        setVehicleData(data);
        console.log('Vehicle brands and models data:', data);
        console.log('Available fields:', Object.keys(data[0]));
        
        // Use the correct field names from Vehicles_in_india table
        if (data[0].hasOwnProperty('Vehicle Brands')) {
          // Defer brand list until wheeler is selected; keep full dataset in state
          setAvailableVehicleBrands([]);
        } else {
          console.warn('Vehicle Brands field not found in data');
        }
      } else {
        console.log('No data found or error occurred');
      }
    };
    fetchVehicleData();
  }, []);

  // Helpers to map/compare wheel category to table type
  const normalizeTypeString = (value: any): string => String(value ?? '').trim();
  const mapTypeToWheelCategory = (typeString: string): string => {
    const t = normalizeTypeString(typeString);
    if (t === '3') return 'other';
    if (t === '2') return '2';
    if (t === '4' || t === '1') return '4';
    return '';
  };
  const mapWheelCategoryToTypeCode = (wheelCat: string): string | null => {
    if (wheelCat === 'other') return '3';
    if (wheelCat === '2') return '2';
    if (wheelCat === '4') return '4';
    return null;
  };
  const doesTypeMatchWheelCategory = (typeString: string | undefined | null, wheelCat: string): boolean => {
    const t = normalizeTypeString(typeString);
    if (!wheelCat) return true;
    if (wheelCat === 'other') return t === '3';
    if (wheelCat === '2') return t === '2';
    if (wheelCat === '4') return t === '4' || t === '1';
    return false;
  };

  // Update available brands when wheel category changes
  useEffect(() => {
    if (vehicleData.length === 0) {
      setAvailableVehicleBrands([]);
      return;
    }

    if (!wheelCategory) {
      // Until a wheeler is chosen, keep brands empty (except edit mode will set via effect below)
      setAvailableVehicleBrands([]);
      return;
    }

    const filteredBrands = vehicleData
      .filter(item => {
        const typeStr = normalizeTypeString((item as any).type);
        if (wheelCategory === 'other') return typeStr === '3';
        if (wheelCategory === '2') return typeStr === '2';
        if (wheelCategory === '4') return typeStr === '4' || typeStr === '1';
        return false;
      })
      .map(item => item['Vehicle Brands'])
      .filter(Boolean);

    const uniqueBrands = [...new Set(filteredBrands)] as string[];
    setAvailableVehicleBrands(uniqueBrands);

    // Reset selections when wheel category changes (only if not editing)
    if (!isEditing) {
      setSelectedVehicleBrand('');
      setSelectedModel('');
      setSelectedModelId('');
    }
  }, [wheelCategory, vehicleData, isEditing]);

  // Update available models when wheel category changes (show all models for the wheel category)
  useEffect(() => {
    if (vehicleData.length === 0) {
      setAvailableModels([]);
      return;
    }

    if (!wheelCategory) {
      setAvailableModels([]);
      return;
    }

    // Show all models for the selected wheel category, regardless of brand
    const allModelsForWheelCategory = vehicleData
      .filter(item => {
        const typeStr = normalizeTypeString((item as any).type);
        if (wheelCategory === 'other') return typeStr === '3';
        if (wheelCategory === '2') return typeStr === '2';
        if (wheelCategory === '4') return typeStr === '4' || typeStr === '1';
        return false;
      })
      .map(item => ({
        name: item['Models'],
        id: item.id,
        brand: item['Vehicle Brands']
      }))
      .filter(item => item.name); // Filter out empty models

    // Remove duplicates based on model name but keep the id and brand
    const uniqueModels = allModelsForWheelCategory.filter((model, index, arr) => 
      arr.findIndex(m => m.name === model.name) === index
    );
    
    console.log('All models for wheel category:', uniqueModels);
    setAvailableModels(uniqueModels);

    // Reset selections when wheel category changes (only if not editing)
    if (!isEditing) {
      setSelectedVehicleBrand('');
      setSelectedModel('');
      setSelectedModelId('');
    }
  }, [wheelCategory, vehicleData, isEditing]);

  // Auto-select brand when model is selected
  useEffect(() => {
    if (selectedModel && availableModels.length > 0) {
      const selectedModelData = availableModels.find(model => model.name === selectedModel);
      if (selectedModelData && selectedModelData.brand && !selectedVehicleBrand) {
        console.log('Auto-selecting brand for model:', selectedModelData.brand);
        // Set a flag to indicate this is an auto-selection
        setSelectedVehicleBrand(selectedModelData.brand);
      }
    }
  }, [selectedModel, availableModels, selectedVehicleBrand]);

  // Update available models when vehicle brand changes (filtering by brand)
  useEffect(() => {
    if (selectedVehicleBrand && vehicleData.length > 0) {
      console.log('Filtering models for vehicle brand:', selectedVehicleBrand);
      
      // Use the correct field names from Vehicles_in_india table
      if (vehicleData[0]?.hasOwnProperty('Vehicle Brands') && vehicleData[0]?.hasOwnProperty('Models')) {
        const modelsForBrand = vehicleData
          .filter(item => item['Vehicle Brands'] === selectedVehicleBrand)
          .filter(item => {
            if (!wheelCategory) return true;
            const typeStr = normalizeTypeString((item as any).type);
            if (wheelCategory === 'other') return typeStr === '3';
            if (wheelCategory === '2') return typeStr === '2';
            if (wheelCategory === '4') return typeStr === '4' || typeStr === '1';
            return true;
          })
          .map(item => ({
            name: item['Models'],
            id: item.id,
            brand: item['Vehicle Brands']
          }))
          .filter(item => item.name); // Filter out empty models
        
        // Remove duplicates based on model name but keep the id and brand
        const uniqueModels = modelsForBrand.filter((model, index, arr) => 
          arr.findIndex(m => m.name === model.name) === index
        );
        
        console.log('Models found for brand:', uniqueModels);
        setAvailableModels(uniqueModels);
        
        // Only reset model when not in edit mode AND when the current model is not valid for the new brand
        if (!isEditing) {
          const currentModelValid = uniqueModels.some(model => model.name === selectedModel);
          if (!currentModelValid) {
            setSelectedModel(''); // Reset model when brand changes and current model is not valid
            setSelectedModelId(''); // Reset model ID when brand changes
          }
        }
      } else {
        console.warn('Vehicle Brands or Models field not found in data');
        setAvailableModels([]);
      }
    } else if (!selectedVehicleBrand && vehicleData.length > 0 && wheelCategory) {
      // When no brand is selected, show all models for the wheel category
      console.log('No brand selected, showing all models for wheel category');
      const allModelsForWheelCategory = vehicleData
        .filter(item => {
          const typeStr = normalizeTypeString((item as any).type);
          if (wheelCategory === 'other') return typeStr === '3';
          if (wheelCategory === '2') return typeStr === '2';
          if (wheelCategory === '4') return typeStr === '4' || typeStr === '1';
          return false;
        })
        .map(item => ({
          name: item['Models'],
          id: item.id,
          brand: item['Vehicle Brands']
        }))
        .filter(item => item.name); // Filter out empty models

      // Remove duplicates based on model name but keep the id and brand
      const uniqueModels = allModelsForWheelCategory.filter((model, index, arr) => 
        arr.findIndex(m => m.name === model.name) === index
      );
      
      console.log('All models for wheel category (no brand filter):', uniqueModels);
      setAvailableModels(uniqueModels);
    }
  }, [selectedVehicleBrand, vehicleData, isEditing, wheelCategory, selectedModel]);

  // Recompute vehicle types/services for customer flow when wheel category changes
  useEffect(() => {
    if (entryType !== 'customer') return;
    if (!wheelCategory) {
      // Require wheeler selection first
      setVehicleTypes([]);
      setServiceOptions([]);
      if (!isEditing) {
        setVehicleType('');
        setService([]);
      }
      return;
    }

    const filteredRows = priceMatrix.filter(row => {
      // If no wheel category is selected, show all rows
      if (!wheelCategory) return true;
      
      // If the row doesn't have a type field, show it (fallback)
      if (!(row as any).type) return true;
      
      // Otherwise, apply the type filtering
      return doesTypeMatchWheelCategory((row as any).type, wheelCategory);
    });
    
    console.log('🔍 Service filtering debug:', {
      wheelCategory,
      totalRows: priceMatrix.length,
      filteredRows: filteredRows.length,
      sampleRows: priceMatrix.slice(0, 3).map(row => ({ 
        VEHICLE: row.VEHICLE, 
        SERVICE: row.SERVICE, 
        type: (row as any).type 
      })),
      filteredSampleRows: filteredRows.slice(0, 3).map(row => ({ 
        VEHICLE: row.VEHICLE, 
        SERVICE: row.SERVICE, 
        type: (row as any).type 
      }))
    });
    
    const uniqueVehicles = [...new Set(filteredRows.map(row => row.VEHICLE && row.VEHICLE.trim()).filter(Boolean))];
    const uniqueServices = [...new Set(filteredRows.map(row => row.SERVICE && row.SERVICE.trim()).filter(Boolean))];
    setVehicleTypes(uniqueVehicles);
    setServiceOptions(uniqueServices);

    // Only reset vehicle type and service if the current selections are no longer valid
    // for the new wheel category
    if (!isEditing) {
      // Check if current vehicle type is still valid for the new wheel category
      if (vehicleType && !uniqueVehicles.includes(vehicleType)) {
        setVehicleType('');
        setService([]);
      }
      // Check if current services are still valid for the new wheel category
      if (service.length > 0) {
        const validServices = uniqueServices.filter(s => service.includes(s));
        if (validServices.length !== service.length) {
          setService(validServices);
        }
      }
      // For other, amount will be manual; keep as is
      if (wheelCategory !== 'other') setAmount('');
    }
  }, [wheelCategory, priceMatrix, entryType, isEditing, vehicleType, service]);

  useEffect(() => {
    const fetchServicePrices = async () => {
      const { data, error } = await supabase.from('Service_prices').select('*');
      console.log('Fetched Service_prices:', data, error);
      if (data && data.length > 0) {
        // Unique VEHICLE and SERVICE values, trimmed
        const uniqueVehicles = [...new Set(data.map(row => row.VEHICLE && row.VEHICLE.trim()).filter(Boolean))];
        const uniqueServices = [...new Set(data.map(row => row.SERVICE && row.SERVICE.trim()).filter(Boolean))];
        console.log('Unique vehicles:', uniqueVehicles);
        console.log('Unique services:', uniqueServices);
        console.log('Available service options:', uniqueServices);
        setVehicleTypes(uniqueVehicles);
        setServiceOptions(uniqueServices);
        setPriceMatrix(data);
      }
    };
    const fetchWorkshopPrices = async () => {
      const { data, error } = await supabase.from('workshop_prices').select('*');
      console.log('Fetched workshop_prices:', data, error);
      if (data) {
        setWorkshopPriceMatrix(data);
        const uniqueWorkshops = [...new Set(data.map(row => row.WORKSHOP && row.WORKSHOP.trim()).filter(Boolean))];
        console.log('Unique workshops:', uniqueWorkshops);
        setWorkshopOptions(uniqueWorkshops);
      }
    };
    fetchServicePrices();
    fetchWorkshopPrices();
  }, []);

  // Apply edit data after all required data is loaded
  useEffect(() => {
    if (pendingEditData && priceMatrix.length > 0 && vehicleData.length > 0) {
      const logData = pendingEditData;
      console.log('Applying edit data after data loaded:', logData);
      
      // Use setTimeout to ensure all data is properly loaded
      setTimeout(() => {
        // Pre-fill form fields with edit data
        setVehicleNumber(logData.vehicleNumber || '');
        setEntryType(logData.entryType || 'normal');
        setDiscount(logData.discount || '');
        setRemarks(logData.remarks || '');
        // Payment mode from edit data or default to cash
        setPaymentMode(logData.payment_mode || 'cash');
        setSelectedUpiAccount(logData.upi_account_id || '');
        setCustomerName(logData.customerName || '');
        setPhoneNumber(logData.phoneNumber || '');
        setDateOfBirth(logData.dateOfBirth || '');
        setCustomerLocation(logData.customerLocation || '');
        setSelectedVehicleBrand(logData.selectedVehicleBrand || '');
        setSelectedModel(logData.selectedModel || '');
        setSelectedModelId(logData.selectedModelId || '');
        setWorkshop(logData.workshop || '');

        // Handle custom entry date and time
        if (logData.entry_time) {
          const entryDateTime = new Date(logData.entry_time);
          setCustomEntryDate(entryDateTime.toISOString().split('T')[0]);
          setCustomEntryTime(entryDateTime.toTimeString().slice(0, 5));
          setUseCustomDateTime(true);
        } else {
          // If no custom entry time, use current date/time
          const now = new Date();
          setCustomEntryDate(now.toISOString().split('T')[0]);
          setCustomEntryTime(now.toTimeString().slice(0, 5));
          setUseCustomDateTime(false);
        }

        // If incoming edit data contains wheel_type, apply it first
        if (logData.wheel_type) {
          const derivedFromLog = mapTypeToWheelCategory(normalizeTypeString(logData.wheel_type));
          if (derivedFromLog) setWheelCategory(derivedFromLog);
        }

        // Derive wheeler from Vehicles_in_india type if possible
        try {
          const matching = vehicleData.find(item =>
            item['Vehicle Brands'] === (logData.selectedVehicleBrand || '') &&
            item['Models'] === (logData.selectedModel || '')
          );
          if (matching && (matching as any).type != null) {
            const derived = mapTypeToWheelCategory(normalizeTypeString((matching as any).type));
            if (derived) setWheelCategory(derived);
          }
        } catch (e) {
          console.warn('Failed to derive wheeler from vehicle data:', e);
        }
        
        // Set vehicle type first, then service after it's processed
        setTimeout(() => {
            console.log('Setting vehicle type:', logData.vehicleType);
          setVehicleType(logData.vehicleType || '');
          
          // Set service and amount after vehicle type is processed
          setTimeout(() => {
            console.log('Setting service:', logData.service);
            console.log('Setting amount:', logData.amount);
            console.log('Available service options at this time:', serviceOptions);
            setService(logData.service || []);
            setAmount(logData.amount || '');
          }, 200);
        }, 100);
        
        // Set edit mode
        setIsEditing(true);
        setEditLogId(logData.id);
        
        // Clear pending edit data
        setPendingEditData(null);
        
        toast.success('Edit mode activated. Please review and update the entry.');
      }, 200);
    }
  }, [pendingEditData, priceMatrix.length, vehicleData.length]);

  // Debug useEffect to log vehicle type changes
  useEffect(() => {
    console.log('Vehicle type changed to:', vehicleType);
    console.log('Service changed to:', service);
  }, [vehicleType, service]);

  // Timer effect to re-enable submit button after 5 seconds
  useEffect(() => {
    if (isSubmitDisabled) {
      const timer = setTimeout(() => {
        setIsSubmitDisabled(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitDisabled]);

  // Reset and repopulate dropdowns when entryType changes
  useEffect(() => {
    // Don't reset if we're in edit mode
    if (isEditing) return;
    
    setWorkshop('');
    setVehicleType('');
    setService([]); // Reset service to empty array
    setAmount('');

    if (entryType === 'customer') {
      // Wait for wheeler selection to populate lists
      if (wheelCategory) {
        const filteredRows = priceMatrix.filter(row => {
          // If no wheel category is selected, show all rows
          if (!wheelCategory) return true;
          
          // If the row doesn't have a type field, show it (fallback)
          if (!(row as any).type) return true;
          
          // Otherwise, apply the type filtering
          return doesTypeMatchWheelCategory((row as any).type, wheelCategory);
        });
        const uniqueVehicles = [...new Set(filteredRows.map(row => row.VEHICLE && row.VEHICLE.trim()).filter(Boolean))];
        const uniqueServices = [...new Set(filteredRows.map(row => row.SERVICE && row.SERVICE.trim()).filter(Boolean))];
        setVehicleTypes(uniqueVehicles);
        setServiceOptions(uniqueServices);
      } else {
        setVehicleTypes([]);
        setServiceOptions([]);
      }
    } else { 
      setVehicleTypes([]);
      setServiceOptions([]);
    }
  }, [entryType, priceMatrix, isEditing, wheelCategory]);

  // When workshop changes, update vehicle types
  useEffect(() => {
    // Don't reset if we're in edit mode
    if (isEditing) return;
    
    if (entryType === 'workshop' && workshop) {
      const filtered = workshopPriceMatrix.filter(row => row.WORKSHOP === workshop);
      const uniqueVehicles = [...new Set(filtered.map(row => row.VEHICLE && row.VEHICLE.trim()).filter(Boolean))];
      setVehicleTypes(uniqueVehicles);
      setVehicleType('');
      setService([]); // Reset service to empty array for workshop
      setAmount('');
      setServiceOptions([]);
    }
  }, [workshop, entryType, workshopPriceMatrix, isEditing]);
  
  // Calculate amount based on entry type and selections
  useEffect(() => {
    // If category is Other, allow manual amount entry and skip auto-calculation
    if (wheelCategory === 'other') {
      return;
    }
    if (entryType === 'customer' && vehicleType && service.length > 0) {
      // Try to use priceMatrix if available, else fallback
      let total = 0;
      for (const s of service) {
        // Trim both the database values and the service name for comparison
        const row = priceMatrix.find(row => 
          (row.VEHICLE && row.VEHICLE.trim()) === vehicleType.trim() && 
          (row.SERVICE && row.SERVICE.trim()) === s.trim()
        );
        if (row && row.PRICE !== undefined) {
          total += Number(row.PRICE);
        } else {
          total += SERVICE_PRICES[s] || 0;
        }
      }
      setAmount(total.toString());
    } else if (entryType === 'workshop' && workshop && vehicleType) {
      const row = workshopPriceMatrix.find(
        row => (row.WORKSHOP && row.WORKSHOP.trim()) === workshop.trim() && 
               (row.VEHICLE && row.VEHICLE.trim()) === vehicleType.trim()
      );
      if (row && row.PRICE !== undefined) {
        setAmount(row.PRICE);
      } else {
        setAmount('');
      }
    } else {
      setAmount('');
    }
  }, [entryType, vehicleType, service, workshop, priceMatrix, workshopPriceMatrix, wheelCategory]);

  // Fetch number of manual visits from logs-man for the typed vehicle number
  useEffect(() => {
    let cancelled = false;
    const fetchVisits = async () => {
      const plate = vehicleNumber.trim();
      if (!plate || plate.length < 3) {
        if (!cancelled) setVisitCount(0);
        return;
      }
      try {
        // Resolve vehicle_id; if found, count by vehicle_id, else fallback to vehicle_number
        const { data: veh, error: vehErr } = await supabase
          .from('vehicles')
          .select('id')
          .eq('number_plate', plate)
          .maybeSingle();
        if (vehErr && vehErr.code !== 'PGRST116') {
          console.warn('Visit count vehicles lookup error:', vehErr);
        }

        let manualCount = 0;
        const base = supabase.from('logs-man').select('id', { count: 'exact', head: true });
        const withLocation = selectedLocation && selectedLocation.trim() !== ''
          ? (q: any) => q.eq('location_id', selectedLocation)
          : (q: any) => q;

        if (veh?.id) {
          const { count, error } = await withLocation(base)
            .or(`vehicle_id.eq.${veh.id},vehicle_number.ilike.%${plate}%`);
          if (!error) manualCount = count || 0; else console.warn('Manual visit count error (by id or ilike number):', error);
        } else {
          const { count, error } = await withLocation(base)
            .ilike('vehicle_number', `%${plate}%`);
          if (!error) manualCount = count || 0; else console.warn('Manual visit count error (by ilike number):', error);
        }

        if (!cancelled) setVisitCount(manualCount);
      } catch (e) {
        console.warn('Visit count error:', e);
        if (!cancelled) setVisitCount(0);
      }
    };

    const t = setTimeout(fetchVisits, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [vehicleNumber]);

  // Auto-fill customer and vehicle brand/model details from most recent manual log
  useEffect(() => {
    if (isEditing) return; // don't override when editing an existing entry
    const plate = vehicleNumber.trim();
    if (!plate) {
      // Only clear form when vehicle number is completely empty
      setCustomerName('');
      setPhoneNumber('');
      setDateOfBirth('');
      setCustomerLocation('');
      setSelectedVehicleBrand('');
      setSelectedModel('');
      setSelectedModelId('');
      // Don't clear wheel category, vehicle type, and service when just typing
      // setWheelCategory('');
      // setVehicleType('');
      // setService([]);
      setAmount('500');
      setDiscount('');
      setRemarks('');
      setWorkshop('');
      return;
    }
    
    // If vehicle number is too short, don't proceed with auto-fill but also don't clear selections
    if (plate.length < 3) {
      return;
    }
    let cancelled = false;

    const loadLatestDetails = async () => {
      try {
        setIsLoadingVehicleData(true);
        // Pull latest matching manual log (any location) for this plate
        const { data, error } = await supabase
          .from('logs-man')
          .select('Name, Phone_no, Location, "D.O.B", vehicle_brand, vehicle_model, Brand_id, wheel_type, created_at')
          .ilike('vehicle_number', `%${plate}%`)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error || !data || data.length === 0) {
          // No previous data found, only clear customer-related fields
          // Don't clear wheel category, vehicle type, and service selections
          if (!cancelled) {
            setCustomerName('');
            setPhoneNumber('');
            setDateOfBirth('');
            setCustomerLocation('');
            setSelectedVehicleBrand('');
            setSelectedModel('');
            setSelectedModelId('');
            // Preserve user's current selections
            // setWheelCategory('');
            // setVehicleType('');
            // setService([]);
            setAmount('500');
            setDiscount('');
            setRemarks('');
            setWorkshop('');
          }
          return;
        }
        if (cancelled) return;

        const last = data[0] as any;
        
        // Always populate with the latest data for this vehicle number
        setCustomerName(last.Name || '');
        setPhoneNumber(last.Phone_no || '');
        setCustomerLocation(last.Location || '');
        setDateOfBirth(last['D.O.B'] || '');

        // Wheel category from log if available
        if (last.wheel_type) {
          const derived = mapTypeToWheelCategory(normalizeTypeString(last.wheel_type));
          if (derived) setWheelCategory(derived);
        }

        // Vehicle brand/model
        setSelectedVehicleBrand(last.vehicle_brand || '');
        // Defer model/id set to allow brand effect to populate models
        setTimeout(() => {
          if (!cancelled) {
            setSelectedModel(last.vehicle_model || '');
            setSelectedModelId(last.Brand_id || '');
          }
        }, 200);

        // If wheel category still empty, try to derive from Vehicles_in_india type by brand+model
        if (!last.wheel_type && (last.vehicle_brand || last.vehicle_model) && vehicleData.length > 0) {
          try {
            const match = vehicleData.find(item =>
              item['Vehicle Brands'] === (last.vehicle_brand || '') && item['Models'] === (last.vehicle_model || '')
            );
            if (match && (match as any).type != null) {
              const derived = mapTypeToWheelCategory(normalizeTypeString((match as any).type));
              if (derived && !cancelled) setWheelCategory(derived);
            }
          } catch {}
        }
      } catch (e) {
        // ignore autofill errors silently
      } finally {
        if (!cancelled) {
          setIsLoadingVehicleData(false);
        }
      }
    };

    const t = setTimeout(loadLatestDetails, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [vehicleNumber, isEditing, vehicleData]);

  const handleVehicleNumberChange = (value: string) => {
    setVehicleNumber(value.toUpperCase());
  };

  // Handle service change for multi-select
  const handleServiceCheckbox = (value: string, checked: boolean | "indeterminate") => {
    setService((prev) =>
      checked ? [...prev, value] : prev.filter((v) => v !== value)
    );
  };
  // Handle single-select for workshop
  const handleServiceChange = (value: string) => {
    setService([value]);
  };

  // const handleScratchSave = (imageBlob: Blob) => {
  //   setScratchImage(imageBlob);
  // };

  // Polyfill for uuid if needed
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // fallback (not cryptographically secure)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  const handleSubmit = async () => {
    // Disable submit button for 5 seconds
    setIsSubmitDisabled(true);
    
    const trimmedCustomerName = customerName.trim();
    
    if (!selectedLocation) {
      toast.error('Please select a location from the toolbar');
      setIsSubmitDisabled(false); // Re-enable button on validation error
      return;
    }
    
    if (!vehicleNumber || !vehicleType || (entryType === 'customer' && service.length === 0)) {
      toast.error('Please fill in all required fields (Vehicle Number, Vehicle Type, and Service)');
      setIsSubmitDisabled(false); // Re-enable button on validation error
      return;
    }

    // Validate UPI account selection when UPI payment mode is selected
    if (paymentMode === 'upi' && !selectedUpiAccount) {
      toast.error('Please select a UPI account when using UPI payment mode');
      setIsSubmitDisabled(false); // Re-enable button on validation error
      return;
    }

    // Validate that UPI accounts are available when UPI payment mode is selected
    if (paymentMode === 'upi' && upiAccounts.length === 0) {
      toast.error('No UPI accounts found. Please add UPI accounts in the settings first.');
      setIsSubmitDisabled(false); // Re-enable button on validation error
      return;
    }

    // Validate custom date and time if enabled
    if (useCustomDateTime) {
      const selectedDateTime = new Date(`${customEntryDate}T${customEntryTime}`);
      const now = new Date();
      
      if (selectedDateTime > now) {
        toast.error('Entry date and time cannot be in the future');
        setIsSubmitDisabled(false);
        return;
      }
    }

    // if (!scratchImage) {
    //   toast.error('Please save the scratch marking before submitting.');
    //   return;
    // }
    try {
      // Use the utility function to get or create vehicle ID
      const vehicleId = await getOrCreateVehicleId(vehicleNumber, vehicleType);
      
      // 1. Upload image to Supabase Storage
      // const safeVehicleNumber = vehicleNumber.replace(/[^a-zA-Z0-9_-]/g, '');
      // const fileName = `${safeVehicleNumber}_${Date.now()}.png`;
      // const { data: uploadData, error: uploadError } = await supabase.storage
      //   .from('man-images')
      //   .upload(fileName, scratchImage, { contentType: 'image/png' });
      // if (uploadError) throw uploadError;
      // 2. Get public URL
      // const { data: publicUrlData } = supabase.storage.from('man-images').getPublicUrl(fileName);
      // const imageUrl = publicUrlData?.publicUrl;
      const imageUrl = null; // Temporarily set to null since scratch marking is disabled
      // Calculate final amount
      const priceNum = parseFloat(amount) || 0;
      const discountNum = discount === '' ? 0 : parseFloat(discount) || 0;
      const finalAmount = priceNum - discountNum;

      // Prepare entry time data
      const entryTimeData = useCustomDateTime 
        ? { entry_time: new Date(`${customEntryDate}T${customEntryTime}:00`).toISOString() }
        : {};

      // Prepare created_at data - use custom date if specified, otherwise current time
      const createdAtData = useCustomDateTime 
        ? { created_at: new Date(`${customEntryDate}T${customEntryTime}:00`).toISOString() }
        : { created_at: new Date().toISOString() };

      // Prepare exit time and approval data for custom date tickets
      const exitTimeData = useCustomDateTime 
        ? { 
            exit_time: new Date(`${customEntryDate}T${customEntryTime}:00`).toISOString(),
            approved_at: new Date(`${customEntryDate}T${customEntryTime}:00`).toISOString()
          }
        : {};

      // Determine approval status - if custom date is used, go directly to approved
      const approvalStatus = useCustomDateTime ? 'approved' : 'pending';

      if (useCustomDateTime) {
        console.log('Custom DateTime Debug:', {
          userSelectedDate: customEntryDate,
          userSelectedTime: customEntryTime,
          combinedString: `${customEntryDate}T${customEntryTime}:00`,
          finalISOString: new Date(`${customEntryDate}T${customEntryTime}:00`).toISOString(),
          localDate: new Date(`${customEntryDate}T${customEntryTime}:00`).toLocaleString(),
          utcDate: new Date(`${customEntryDate}T${customEntryTime}:00`).toUTCString(),
          approvalStatus: approvalStatus
        });
      }

      // 3. Insert or update logs-man based on edit mode
      if (isEditing && editLogId) {
        // Update existing log
        const { error: updateError } = await supabase
          .from('logs-man')
          .update({
            vehicle_id: vehicleId,
            vehicle_number: vehicleNumber,
            location_id: selectedLocation,
            entry_type: entryType,
            image_url: imageUrl,
            Amount: finalAmount,
            discount: discountNum,
            remarks: remarks,
            // Payment mode and UPI account information
            payment_mode: paymentMode,
            upi_account_id: paymentMode === 'upi' ? selectedUpiAccount : null,
            service: service.join(','), // Store as comma-separated string
            vehicle_type: vehicleType,
            workshop: entryType === 'workshop' ? workshop : null,
            wheel_type: mapWheelCategoryToTypeCode(wheelCategory),
            // Customer details
            Name: trimmedCustomerName || null,
            Phone_no: phoneNumber || null,
            'D.O.B': dateOfBirth || null,
            Location: customerLocation || null,
            // Vehicle details
            vehicle_brand: selectedVehicleBrand || null,
            vehicle_model: selectedModel || null,
            Brand_id: selectedModelId || null,
            updated_at: new Date().toISOString(),
            // Custom entry time if specified
            ...entryTimeData,
            // Custom created_at if specified
            ...createdAtData,
            // Custom exit time and approval data if specified
            ...exitTimeData,
          })
          .eq('id', editLogId);
        
        if (updateError) throw updateError;
        toast.success('Entry updated successfully!');
        
        // Reset edit mode
        setIsEditing(false);
        setEditLogId(null);
      } else {
        // Insert new log
        const { error: insertError } = await supabase.from('logs-man').insert([
          {
            vehicle_id: vehicleId,
            vehicle_number: vehicleNumber,
            location_id: selectedLocation,
            entry_type: entryType,
            image_url: imageUrl,
            created_by: user?.id,
            Amount: finalAmount,
            discount: discountNum,
            remarks: remarks,
            // Payment mode and UPI account information
            payment_mode: paymentMode,
            upi_account_id: paymentMode === 'upi' ? selectedUpiAccount : null,
            service: service.join(','), // Store as comma-separated string
            vehicle_type: vehicleType,
            workshop: entryType === 'workshop' ? workshop : null,
            wheel_type: mapWheelCategoryToTypeCode(wheelCategory),
            // Customer details
            Name: trimmedCustomerName || null,
            Phone_no: phoneNumber || null,
            'D.O.B': dateOfBirth || null,
            Location: customerLocation || null,
            // Vehicle details
            vehicle_brand: selectedVehicleBrand || null,
            vehicle_model: selectedModel || null,
            Brand_id: selectedModelId || null,
            // Custom created_at if specified, otherwise current time
            ...createdAtData,
            // Custom entry time if specified
            ...entryTimeData,
            // Approval status - if custom date is used, go directly to approved
            approval_status: approvalStatus,
            // Custom exit time and approval data if specified
            ...exitTimeData,
          },
        ]);
        if (insertError) throw insertError;
        
        const statusMessage = useCustomDateTime 
          ? 'Owner entry submitted successfully! Ticket is now closed.'
          : 'Owner entry submitted successfully!';
        toast.success(statusMessage);

        // No persistent counter increment; count is derived from logs-man only
      }
      
      // Reset form only if not in edit mode
      if (!isEditing) {
        setVehicleNumber('');
        setVehicleType('');
        setService([]); // Reset service to empty array
        setAmount('500');
        setDiscount('');
        setRemarks('');
        // Reset payment mode and UPI account selection
        setPaymentMode('cash');
        setSelectedUpiAccount('');
        // setScratchImage(null);
        setCustomerName('');
        setPhoneNumber('');
        setDateOfBirth('');
        setCustomerLocation('');
        setSelectedVehicleBrand('');
        setSelectedModel('');
        setSelectedModelId('');
        // Reset custom datetime
        setUseCustomDateTime(false);
        setCustomEntryDate(new Date().toISOString().split('T')[0]);
        setCustomEntryTime(new Date().toTimeString().slice(0, 5));
      }
    } catch (err: any) {
      toast.error('Submission failed: ' + (err?.message || err));
    } finally {
      setIsSubmitDisabled(false);
    }
  };

  const handleCheckout = async () => {
    // Disable submit button for 5 seconds
    setIsSubmitDisabled(true);
    
    const trimmedCustomerName = customerName.trim();
    
    if (!selectedLocation) {
      toast.error('Please select a location from the toolbar');
      setIsSubmitDisabled(false); // Re-enable button on validation error
      return;
    }
    
    if (!vehicleNumber || !vehicleType || (entryType === 'customer' && service.length === 0)) {
      toast.error('Please fill in all required fields (Vehicle Number, Vehicle Type, and Service)');
      setIsSubmitDisabled(false); // Re-enable button on validation error
      return;
    }

    // Validate UPI account selection when UPI payment mode is selected
    if (paymentMode === 'upi' && !selectedUpiAccount) {
      toast.error('Please select a UPI account when using UPI payment mode');
      setIsSubmitDisabled(false); // Re-enable button on validation error
      return;
    }

    // Validate that UPI accounts are available when UPI payment mode is selected
    if (paymentMode === 'upi' && upiAccounts.length === 0) {
      toast.error('No UPI accounts found. Please add UPI accounts in the settings first.');
      setIsSubmitDisabled(false); // Re-enable button on validation error
      return;
    }

    try {
      // Use the utility function to get or create vehicle ID
      const vehicleId = await getOrCreateVehicleId(vehicleNumber, vehicleType);
      
      const imageUrl = null; // Temporarily set to null since scratch marking is disabled
      
      // Calculate final amount
      const priceNum = parseFloat(amount) || 0;
      const discountNum = discount === '' ? 0 : parseFloat(discount) || 0;
      const finalAmount = priceNum - discountNum;

      // For checkout, we directly set the ticket as approved and closed
      const currentTime = new Date().toISOString();

      // Insert new log entry directly as approved
      const { error: insertError } = await supabase.from('logs-man').insert([
        {
          vehicle_id: vehicleId,
          vehicle_number: vehicleNumber,
          location_id: selectedLocation,
          entry_type: entryType,
          image_url: imageUrl,
          created_by: user?.id,
          Amount: finalAmount,
          discount: discountNum,
          remarks: remarks,
          // Payment mode and UPI account information
          payment_mode: paymentMode,
          upi_account_id: paymentMode === 'upi' ? selectedUpiAccount : null,
          service: service.join(','), // Store as comma-separated string
          vehicle_type: vehicleType,
          workshop: entryType === 'workshop' ? workshop : null,
          wheel_type: mapWheelCategoryToTypeCode(wheelCategory),
          // Customer details
          Name: trimmedCustomerName || null,
          Phone_no: phoneNumber || null,
          'D.O.B': dateOfBirth || null,
          Location: customerLocation || null,
          // Vehicle details
          vehicle_brand: selectedVehicleBrand || null,
          vehicle_model: selectedModel || null,
          Brand_id: selectedModelId || null,
          // Set as approved immediately
          approval_status: 'approved',
          // Set entry and exit time to current time (immediate checkout)
          entry_time: currentTime,
          exit_time: currentTime,
          approved_at: currentTime,
          // Set payment date to current time
          payment_date: currentTime,
        },
      ]);
      
      if (insertError) throw insertError;
      
      toast.success('Entry checked out successfully! Ticket is now closed.');
      
      // Reset form
      setVehicleNumber('');
      setVehicleType('');
      setService([]); // Reset service to empty array
      setAmount('500');
      setDiscount('');
      setRemarks('');
      // Reset payment mode and UPI account selection
      setPaymentMode('cash');
      setSelectedUpiAccount('');
      setCustomerName('');
      setPhoneNumber('');
      setDateOfBirth('');
      setCustomerLocation('');
      setSelectedVehicleBrand('');
      setSelectedModel('');
      setSelectedModelId('');
      setWheelCategory('4 Wheeler');
      setWorkshop('');
      setUseCustomDateTime(false);
      setCustomEntryDate(new Date().toISOString().split('T')[0]);
      setCustomEntryTime(new Date().toTimeString().slice(0, 5));
      
    } catch (error) {
      console.error('Error checking out entry:', error);
      toast.error('Failed to checkout entry: ' + error.message);
    } finally {
      setIsSubmitDisabled(false);
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            <h1 className="text-xl lg:text-2xl font-bold">
              {isEditing ? 'Edit Entry' : 'Manual Entry'}
            </h1>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
            {isEditing ? 'Edit Mode' : 'Owner Access'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Entry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Entry Type + Wheeler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entry Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={entryType === 'customer' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 text-xs sm:text-sm"
                    onClick={() => setEntryType('customer')}
                  >
                    Customer
                  </Button>
                  <Button
                    variant={entryType === 'workshop' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 text-xs sm:text-sm"
                    onClick={() => setEntryType('workshop')}
                  >
                    Workshop
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wheelCategory">Category</Label>
                <Select value={wheelCategory} onValueChange={setWheelCategory}>
                  <SelectTrigger id="wheelCategory">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Wheeler</SelectItem>
                    <SelectItem value="4">4 Wheeler</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Entry Date and Time */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="useCustomDateTime"
                  checked={useCustomDateTime}
                  onCheckedChange={(checked) => setUseCustomDateTime(checked as boolean)}
                />
                <Label htmlFor="useCustomDateTime" className="text-base font-semibold">
                  Use Custom Entry Date & Time
                </Label>
              </div>
              
              {useCustomDateTime && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customEntryDate">Entry Date</Label>
                    <Input
                      id="customEntryDate"
                      type="date"
                      value={customEntryDate}
                      onChange={(e) => setCustomEntryDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customEntryTime">Entry Time</Label>
                    <Input
                      id="customEntryTime"
                      type="time"
                      value={customEntryTime}
                      onChange={(e) => setCustomEntryTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {useCustomDateTime && (
                <div className="text-sm text-muted-foreground">
                  Entry will be recorded for: {customEntryDate} at {customEntryTime}
                </div>
              )}
            </div>

            {/* Vehicle Number */}
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <div className="relative">
                <Input 
                  id="vehicleNumber"
                  placeholder="Enter vehicle number (KL07AB0001)" 
                  className="text-center font-mono text-lg uppercase"
                  value={vehicleNumber}
                  onChange={(e) => handleVehicleNumberChange(e.target.value)}
                />
                {isLoadingVehicleData && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              {vehicleNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${visitCount > 0 ? 'bg-success' : 'bg-warning'}`}></div>
                  <span className="text-muted-foreground">
                    {visitCount > 0 ? `Previous Visits: ${visitCount} ${visitCount === 1 ? 'time' : 'times'}` : 'New Customer'}
                  </span>
                </div>
              )}
            </div>

            

            {/* Vehicle Brand and Model */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <Label className="text-base font-semibold">Vehicle Details</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="selectedVehicleBrand">Vehicle Brand</Label>
                  <ReactSelect
                    isClearable
                    isSearchable
                    placeholder={wheelCategory ? (selectedModel ? "Brand will be auto-selected" : "Type to search vehicle brand...") : "Select category first"}
                    options={(wheelCategory ? availableVehicleBrands : []).map(brand => ({ value: brand, label: brand }))}
                    value={selectedVehicleBrand ? { value: selectedVehicleBrand, label: selectedVehicleBrand } : null}
                    onChange={(selected) => setSelectedVehicleBrand(selected?.value || '')}
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "No brands found"}
                    isDisabled={!wheelCategory || !!selectedModel}
                  />
                  {selectedModel && !selectedVehicleBrand && (
                    <p className="text-sm text-muted-foreground">
                      Brand will be automatically selected based on the chosen model
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selectedModel">Vehicle Model</Label>
                  <ReactSelect
                    isClearable
                    isSearchable
                    placeholder={wheelCategory ? "Type to search vehicle model..." : "Select category first"}
                    options={availableModels.map(model => ({ value: model.name, label: model.name }))}
                    value={selectedModel ? { value: selectedModel, label: selectedModel } : null}
                    onChange={(selected) => {
                      setSelectedModel(selected?.value || '');
                      // Find and set the corresponding model ID
                      const modelObj = availableModels.find(m => m.name === selected?.value);
                      setSelectedModelId(modelObj?.id || '');
                    }}
                    classNamePrefix="react-select"
                    isDisabled={!wheelCategory}
                    noOptionsMessage={() => "No models found"}
                  />
                </div>
              </div>
            </div>

            {/* Service Selection */}
            {entryType === 'customer' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <Label className="text-base font-semibold">Service Selection</Label>
            <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType} disabled={!wheelCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={wheelCategory ? "Select vehicle type" : "Select category first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sortVehicleTypesWithPriority(vehicleTypes).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service">Service Chosen</Label>
                  <ReactSelect
                    isMulti
                    options={
                      vehicleType
                        ? (() => {
                            const filteredServices = priceMatrix
                              .filter(row => row.VEHICLE && row.VEHICLE.trim() === vehicleType.trim())
                              // Only filter by type if the type field exists and wheelCategory is set
                              .filter(row => {
                                // If no wheel category is selected, show all services for the vehicle type
                                if (!wheelCategory) return true;
                                
                                // If the row doesn't have a type field, show it (fallback)
                                if (!(row as any).type) return true;
                                
                                // Otherwise, apply the type filtering
                                return doesTypeMatchWheelCategory((row as any).type, wheelCategory);
                              })
                              .map(row => row.SERVICE)
                              .filter((v, i, arr) => v && arr.indexOf(v) === i);
                            
                            const sortedServices = sortServicesWithPriority(filteredServices);
                            const options = sortedServices.map(option => ({ value: option, label: option }));
                            
                            console.log('🚗 Service dropdown options for', vehicleType, ':', {
                              wheelCategory,
                              filteredServices,
                              sortedServices,
                              options
                            });
                            
                            return options;
                          })()
                        : []
                    }
                    value={service.map(option => ({
                      value: option,
                      label: option
                    }))}
                    onChange={(selected) => setService(Array.isArray(selected) ? selected.map((s: any) => s.value) : [])}
                    placeholder={vehicleType ? "Select services" : (wheelCategory ? "Select vehicle type first" : "Select category first")}
                    classNamePrefix="react-select"
                    isDisabled={!wheelCategory || !vehicleType}
                    onMenuOpen={() => {
                      console.log('Service menu opened. Vehicle type:', vehicleType);
                      console.log('Wheel category:', wheelCategory);
                      console.log('Price matrix:', priceMatrix);
                      
                      const availableServices = vehicleType
                        ? priceMatrix
                            .filter(row => row.VEHICLE && row.VEHICLE.trim() === vehicleType.trim())
                            // Only filter by type if the type field exists and wheelCategory is set
                            .filter(row => {
                              // If no wheel category is selected, show all services for the vehicle type
                              if (!wheelCategory) return true;
                              
                              // If the row doesn't have a type field, show it (fallback)
                              if (!(row as any).type) return true;
                              
                              // Otherwise, apply the type filtering
                              return doesTypeMatchWheelCategory((row as any).type, wheelCategory);
                            })
                            .map(row => row.SERVICE)
                            .filter((v, i, arr) => v && arr.indexOf(v) === i)
                        : [];
                      
                      console.log('Available services before sorting:', availableServices);
                      console.log('Services filtered by vehicle type:', priceMatrix
                        .filter(row => row.VEHICLE && row.VEHICLE.trim() === vehicleType.trim())
                        .map(row => ({ SERVICE: row.SERVICE, VEHICLE: row.VEHICLE, type: (row as any).type }))
                      );
                      
                      const sortedServices = sortServicesWithPriority(availableServices);
                      console.log('Available services after sorting:', sortedServices);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Workshop Selection */}
            {entryType === 'workshop' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <Label className="text-base font-semibold">Workshop Details</Label>
                <div className="space-y-2">
                  <Label htmlFor="workshop">Workshop</Label>
                  <Select value={workshop} onValueChange={setWorkshop}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select workshop" />
                    </SelectTrigger>
                    <SelectContent>
                      {workshopOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortVehicleTypesWithPriority(vehicleTypes).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Amount and Payment */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <Label className="text-base font-semibold">Payment Details</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    value={amount ? `₹${amount}` : ''} 
                    className="font-semibold text-financial"
                    readOnly={wheelCategory !== 'other'}
                    placeholder={wheelCategory === 'other' ? 'Enter amount' : ''}
                    onChange={(e) => setAmount(e.target.value.replace('₹', ''))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (Optional)</Label>
                  <Input
                    id="discount"
                    placeholder="Enter discount amount"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>

              {/* Customer Details - moved just above payment method */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <Label className="text-base font-semibold">Customer Details</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name (Optional)</Label>
                    <Input 
                      id="customerName"
                      placeholder="Enter customer name" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                    <Input 
                      id="phoneNumber"
                      placeholder="Enter phone number" 
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
                    <Input 
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <LocationAutocomplete
                      value={customerLocation}
                      onChange={setCustomerLocation}
                      placeholder="Type to search location..."
                      label="Location (Optional)"
                      id="customerLocation"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="flex gap-2">
                  <Button 
                    variant={paymentMode === 'cash' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPaymentMode('cash')}
                  >
                    <Banknote className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Cash</span>
                  </Button>
                  <Button 
                    variant={paymentMode === 'upi' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPaymentMode('upi')}
                  >
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">UPI</span>
                  </Button>
                  <Button 
                    variant={paymentMode === 'credit' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPaymentMode('credit')}
                  >
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Pay Later</span>
                  </Button>
                </div>
                {paymentMode === 'upi' && (
                  <p className="text-xs text-muted-foreground">
                    Select a UPI account below to display the QR code for payment
                  </p>
                )}
                {paymentMode === 'credit' && (
                  <p className="text-xs text-muted-foreground">
                    Customer will pay later. Ticket will be marked as pending payment.
                  </p>
                )}
              </div>

              {/* UPI Account Selection */}
              {paymentMode === 'upi' && (
                <div className="space-y-2">
                  <Label>Select UPI Account</Label>
                  {upiAccountsLoading ? (
                    <div className="text-sm text-muted-foreground">Loading UPI accounts...</div>
                  ) : upiAccounts.length === 0 ? (
                    <div className="p-3 border rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground text-center">
                        No UPI accounts found. Please add UPI accounts in the settings first.
                      </p>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        You can switch to Cash payment mode or add UPI accounts in the settings.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Select value={selectedUpiAccount} onValueChange={setSelectedUpiAccount}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select UPI account" />
                        </SelectTrigger>
                        <SelectContent>
                          {upiAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_name} - {account.upi_id} ({account.location_name || 'N/A'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  
                  {/* QR Code Display */}
                  {selectedUpiAccount && (
                    <div className="mt-4 space-y-2">
                      <Label>QR Code</Label>
                      {(() => {
                        const selectedAccount = upiAccounts.find(acc => acc.id === selectedUpiAccount);
                        if (selectedAccount?.qr_code_url) {
                          return (
                            <div className="flex justify-center p-2">
                              <img 
                                src={selectedAccount.qr_code_url} 
                                alt={`QR Code for ${selectedAccount.account_name}`}
                                className="w-32 h-32 object-contain border rounded-lg shadow-sm"
                              />
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg bg-muted/20">
                              No QR code available for this account
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea 
                  id="remarks" 
                  placeholder="Any additional notes..." 
                  rows={3} 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scratch Marking Section - Disabled */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Vehicle Scratch Marking</CardTitle>
          </CardHeader>
          <CardContent>
            <ScratchMarking onSave={handleScratchSave} />
          </CardContent>
        </Card> */}
      </div>

      {/* Submit Button */}
      <div className="flex justify-center gap-4">
        <Button 
          variant="default" 
          size="lg" 
          className="px-8"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {isEditing ? 'Update Entry' : 'Submit Entry'}
        </Button>
        
        {/* Checkout Button - only show when no custom date is given */}
        {!useCustomDateTime && !isEditing && (
          <Button 
            variant="outline" 
            size="lg" 
            className="px-8"
            onClick={handleCheckout}
            disabled={isSubmitDisabled}
          >
            Checkout
          </Button>
        )}
      </div>
    </div>
  );
}
