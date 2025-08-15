
import { useState, useEffect } from 'react';
import { ArrowLeft, Car, CreditCard, Banknote } from "lucide-react";
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

interface ManagerOwnerEntryProps {
  selectedLocation?: string;
}

export default function ManagerOwnerEntry({ selectedLocation }: ManagerOwnerEntryProps) {
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
  const [paymentMode, setPaymentMode] = useState('cash');
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
  const [availableModels, setAvailableModels] = useState<{name: string, id: string}[]>([]);
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

  const { user } = useAuth();

  // Check for edit data on component mount
  useEffect(() => {
    const editData = sessionStorage.getItem('editLogData');
    if (editData) {
      try {
        const logData = JSON.parse(editData);
        console.log('Edit data found:', logData);
        // Apply wheel category first if present
        if (logData.wheel_type) {
          const derivedFromLog = mapTypeToWheelCategory(normalizeTypeString(logData.wheel_type));
          if (derivedFromLog) setWheelCategory(derivedFromLog);
        }

        // Pre-fill form fields with edit data
        setVehicleNumber(logData.vehicleNumber || '');
        setVehicleType(logData.vehicleType || '');
        setService(logData.service || []);
        setAmount(logData.amount || '');
        setEntryType(logData.entryType || 'normal');
        setDiscount(logData.discount || '');
        setRemarks(logData.remarks || '');
        setPaymentMode(logData.paymentMode || 'cash');
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
        
        // Set edit mode
        setIsEditing(true);
        setEditLogId(logData.id);
        
        // Clear the sessionStorage
        sessionStorage.removeItem('editLogData');
        
        toast.success('Edit mode activated. Please review and update the entry.');
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
        
        // Defer brand list population until wheel category is chosen
        if (data[0].hasOwnProperty('Vehicle Brands')) {
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

  // Update available models when vehicle brand changes (respecting wheeler)
  useEffect(() => {
    if (selectedVehicleBrand && vehicleData.length > 0) {
      console.log('Filtering models for vehicle brand:', selectedVehicleBrand);
      
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
            id: item.id
          }))
          .filter(item => item.name);
        
        const uniqueModels = modelsForBrand.filter((model, index, arr) => 
          arr.findIndex(m => m.name === model.name) === index
        );
        
        console.log('Models found for brand:', uniqueModels);
        setAvailableModels(uniqueModels);
      } else {
        console.warn('Vehicle Brands or Models field not found in data');
        setAvailableModels([]);
      }
      if (!isEditing) {
        setSelectedModel('');
        setSelectedModelId('');
      }
    } else {
      setAvailableModels([]);
      if (!isEditing) {
        setSelectedModel('');
        setSelectedModelId('');
      }
    }
  }, [selectedVehicleBrand, vehicleData, isEditing, wheelCategory]);

  // Derive wheel category from selected brand/model if not set
  useEffect(() => {
    try {
      if (vehicleData.length > 0 && selectedVehicleBrand && selectedModel) {
        const matching = vehicleData.find(item =>
          item['Vehicle Brands'] === selectedVehicleBrand &&
          item['Models'] === selectedModel
        );
        if (matching && (matching as any).type != null) {
          const derived = mapTypeToWheelCategory(normalizeTypeString((matching as any).type));
          if (derived) setWheelCategory(derived);
        }
      }
    } catch (e) {
      console.warn('Failed to derive wheeler from vehicle data:', e);
    }
  }, [vehicleData.length, selectedVehicleBrand, selectedModel]);

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

  // Reset and repopulate dropdowns when entryType changes
  useEffect(() => {
    setWorkshop('');
    setVehicleType('');
    setService([]); // Reset service to empty array
    setAmount('');

    if (entryType === 'customer') {
      if (wheelCategory) {
        const filteredRows = priceMatrix.filter(row => doesTypeMatchWheelCategory((row as any).type, wheelCategory));
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
  }, [entryType, priceMatrix, wheelCategory]);

  // Recompute vehicle types/services for customer flow when wheel category changes
  useEffect(() => {
    if (entryType !== 'customer') return;
    if (!wheelCategory) {
      setVehicleTypes([]);
      setServiceOptions([]);
      if (!isEditing) {
        setVehicleType('');
        setService([]);
      }
      return;
    }

    const filteredRows = priceMatrix.filter(row => doesTypeMatchWheelCategory((row as any).type, wheelCategory));
    const uniqueVehicles = [...new Set(filteredRows.map(row => row.VEHICLE && row.VEHICLE.trim()).filter(Boolean))];
    const uniqueServices = [...new Set(filteredRows.map(row => row.SERVICE && row.SERVICE.trim()).filter(Boolean))];
    setVehicleTypes(uniqueVehicles);
    setServiceOptions(uniqueServices);

    if (!isEditing) {
      setVehicleType('');
      setService([]);
      if (wheelCategory !== 'other') setAmount('');
    }
  }, [wheelCategory, priceMatrix, entryType, isEditing]);

  // When workshop changes, update vehicle types
  useEffect(() => {
    if (entryType === 'workshop' && workshop) {
      const filtered = workshopPriceMatrix.filter(row => row.WORKSHOP === workshop);
      const uniqueVehicles = [...new Set(filtered.map(row => row.VEHICLE && row.VEHICLE.trim()).filter(Boolean))];
      setVehicleTypes(uniqueVehicles);
      setVehicleType('');
      setService([]); // Reset service to empty array for workshop
      setAmount('');
      setServiceOptions([]);
    }
  }, [workshop, entryType, workshopPriceMatrix]);
  
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

  // Timer effect to re-enable submit button after 5 seconds
  useEffect(() => {
    if (isSubmitDisabled) {
      const timer = setTimeout(() => {
        setIsSubmitDisabled(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitDisabled]);

  // Auto-fill customer and vehicle brand/model details from most recent manual log
  useEffect(() => {
    if (isEditing) return; // don't override when editing an existing entry
    const plate = vehicleNumber.trim();
    if (!plate || plate.length < 3) {
      // Clear form when vehicle number is too short
      setCustomerName('');
      setPhoneNumber('');
      setDateOfBirth('');
      setCustomerLocation('');
      setSelectedVehicleBrand('');
      setSelectedModel('');
      setSelectedModelId('');
      setWheelCategory('');
      setVehicleType('');
      setService([]);
      setAmount('500');
      setDiscount('');
      setRemarks('');
      setWorkshop('');
      return;
    }
    let cancelled = false;

    const loadLatestDetails = async () => {
      try {
        setIsLoadingVehicleData(true);
        const { data, error } = await supabase
          .from('logs-man')
          .select('Name, Phone_no, Location, "D.O.B", vehicle_brand, vehicle_model, Brand_id, wheel_type, created_at')
          .ilike('vehicle_number', `%${plate}%`)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error || !data || data.length === 0) {
          // No previous data found, clear the form
          if (!cancelled) {
            setCustomerName('');
            setPhoneNumber('');
            setDateOfBirth('');
            setCustomerLocation('');
            setSelectedVehicleBrand('');
            setSelectedModel('');
            setSelectedModelId('');
            setWheelCategory('');
            setVehicleType('');
            setService([]);
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

        if (last.wheel_type) {
          const derived = mapTypeToWheelCategory(normalizeTypeString(last.wheel_type));
          if (derived) setWheelCategory(derived);
        }

        setSelectedVehicleBrand(last.vehicle_brand || '');
        setTimeout(() => {
          if (!cancelled) {
            setSelectedModel(last.vehicle_model || '');
            setSelectedModelId(last.Brand_id || '');
          }
        }, 200);

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
          console.warn('Visit count vehicles lookup error (manager):', vehErr);
        }

        let manualCount = 0;
        const base = supabase.from('logs-man').select('id', { count: 'exact', head: true });
        const withLocation = user?.assigned_location
          ? (q: any) => q.eq('location_id', user.assigned_location)
          : (q: any) => q;

        if (veh?.id) {
          const { count, error } = await withLocation(base)
            .or(`vehicle_id.eq.${veh.id},vehicle_number.ilike.%${plate}%`);
          if (!error) manualCount = count || 0; else console.warn('Manual visit count error (manager by id or ilike number):', error);
        } else {
          const { count, error } = await withLocation(base)
            .ilike('vehicle_number', `%${plate}%`);
          if (!error) manualCount = count || 0; else console.warn('Manual visit count error (manager by ilike number):', error);
        }

        if (!cancelled) setVisitCount(manualCount);
      } catch (e) {
        console.warn('Visit count (manager) error:', e);
        if (!cancelled) setVisitCount(0);
      }
    };

    const t = setTimeout(fetchVisits, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [vehicleNumber]);

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
    
    if (!vehicleNumber || !vehicleType || (entryType === 'customer' && service.length === 0)) {
      toast.error('Please fill in all required fields (Vehicle Number, Vehicle Type, and Service)');
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
      const imageUrl = null; // Set to null since scratch marking is commented out
      // Calculate final amount
      const priceNum = parseFloat(amount) || 0;
      const discountNum = discount === '' ? 0 : parseFloat(discount) || 0;
      const finalAmount = priceNum - discountNum;

      // Prepare entry time data
      const entryTimeData = useCustomDateTime 
        ? { entry_time: new Date(`${customEntryDate}T${customEntryTime}:00`).toISOString() }
        : {};

      if (useCustomDateTime) {
        console.log('Custom DateTime Debug (Manager):', {
          userSelectedDate: customEntryDate,
          userSelectedTime: customEntryTime,
          combinedString: `${customEntryDate}T${customEntryTime}:00`,
          finalISOString: new Date(`${customEntryDate}T${customEntryTime}:00`).toISOString(),
          localDate: new Date(`${customEntryDate}T${customEntryTime}:00`).toLocaleString(),
          utcDate: new Date(`${customEntryDate}T${customEntryTime}:00`).toUTCString()
        });
      }

      if (isEditing && editLogId) {
        // Update existing log entry
        const { error: updateError } = await supabase
          .from('logs-man')
          .update({
            vehicle_id: vehicleId,
            vehicle_number: vehicleNumber,
            entry_type: entryType,
            image_url: imageUrl,
            Amount: finalAmount,
            discount: discountNum,
            remarks: remarks,
            payment_mode: paymentMode,
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
          })
          .eq('id', editLogId);

        if (updateError) throw updateError;
        toast.success('Entry updated successfully!');
      } else {
        // Insert new log entry
        const { error: insertError } = await supabase.from('logs-man').insert([
          {
            vehicle_id: vehicleId,
            vehicle_number: vehicleNumber,
            location_id: user?.assigned_location,
            entry_type: entryType,
            image_url: imageUrl,
            created_by: user?.id,
            Amount: finalAmount,
            discount: discountNum,
            remarks: remarks,
            payment_mode: paymentMode,
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
            created_at: new Date().toISOString(),
            // Custom entry time if specified
            ...entryTimeData,
            // Approval status
            approval_status: 'pending',
          },
        ]);
        if (insertError) throw insertError;
        toast.success('Manager entry submitted successfully!');

        // No persistent counter increment; count is derived from logs-man only
      }

      // Reset form
      setVehicleNumber('');
      setVehicleType('');
      setService([]); // Reset service to empty array
      setAmount('500');
      setDiscount('');
      setRemarks('');
      setPaymentMode('cash');
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
      
      // Reset edit mode
      setIsEditing(false);
      setEditLogId(null);
    } catch (err: any) {
      toast.error('Submission failed: ' + (err?.message || err));
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Entry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Entry Type - move this section above Vehicle Number */}
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

              

              {/* Vehicle Brand and Model */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <Label className="text-base font-semibold">Vehicle Details</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="selectedVehicleBrand">Vehicle Brand</Label>
                    <ReactSelect
                      isClearable
                      isSearchable
                      placeholder={wheelCategory ? "Type to search vehicle brand..." : "Select category first"}
                      options={(wheelCategory ? availableVehicleBrands : []).map(brand => ({ value: brand, label: brand }))}
                      value={selectedVehicleBrand ? { value: selectedVehicleBrand, label: selectedVehicleBrand } : null}
                      onChange={(selected) => setSelectedVehicleBrand(selected?.value || '')}
                      classNamePrefix="react-select"
                      noOptionsMessage={() => "No brands found"}
                      isDisabled={!wheelCategory}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selectedModel">Vehicle Model</Label>
                    <ReactSelect
                      isClearable
                      isSearchable
                      placeholder={selectedVehicleBrand ? "Type to search vehicle model..." : (wheelCategory ? "Select vehicle brand first" : "Select category first")}
                      options={availableModels.map(model => ({ value: model.name, label: model.name }))}
                      value={selectedModel ? { value: selectedModel, label: selectedModel } : null}
                      onChange={(selected) => {
                        setSelectedModel(selected?.value || '');
                        // Find and set the corresponding model ID
                        const modelObj = availableModels.find(m => m.name === selected?.value);
                        setSelectedModelId(modelObj?.id || '');
                      }}
                      classNamePrefix="react-select"
                      isDisabled={!wheelCategory || !selectedVehicleBrand}
                      noOptionsMessage={() => "No models found"}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {entryType === 'customer' && (
                  <>
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
                            ? sortServicesWithPriority(
                                priceMatrix
                                  .filter(row => row.VEHICLE && row.VEHICLE.trim() === vehicleType.trim())
                                  .filter(row => doesTypeMatchWheelCategory((row as any).type, wheelCategory))
                                  .map(row => row.SERVICE)
                                  .filter((v, i, arr) => v && arr.indexOf(v) === i)
                              ).map(option => ({ value: option, label: option }))
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
                      />
                    </div>
                  </>
                )}

                {entryType === 'workshop' && (
                  <>
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
                  </>
                )}
              </div>

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
              </div>

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
            </CardContent>
          </Card>

          {/* Scratch Marking Section */}
          {/* <ScratchMarking onSave={handleScratchSave} /> */}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button 
            variant="default" 
            size="lg" 
            className="px-8"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {isEditing ? 'Update Entry' : 'Submit Entry'}
          </Button>
        </div>
       </div>
   );
 }
