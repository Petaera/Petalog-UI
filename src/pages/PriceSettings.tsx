import { useState, useEffect } from "react";
import { ArrowLeft, Settings, Plus, Edit, IndianRupee, Loader2, RefreshCw, AlertCircle, Upload, Download, FileSpreadsheet, Building2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import * as XLSX from 'xlsx';


// Types for our data - matching actual Supabase structure
interface ServicePrice {
  id: string;
  SERVICE: string;
  VEHICLE: string;
  PRICE: number;
  type?: string;
  created_at?: string;
}

interface WorkshopPrice {
  id: string;
  WORKSHOP: string;
  VEHICLE: string;
  Discount: number;
  "Created at"?: string;
  locationid?: string;
}

interface ServiceImportRow {
  SERVICE: string;
  [key: string]: string | number; // Dynamic vehicle columns
}

interface WorkshopImportRow {
  WORKSHOP: string;
  [key: string]: string | number; // Dynamic vehicle columns
}

interface VehiclePriceInput {
  vehicle: string;
  price: string;
  type?: string;
}

interface WorkshopVehicleDiscountInput {
  vehicle: string;
  discount: string;
}

export default function PriceSettings({ locationId }: { locationId: string }) {
  // State for data
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [workshopPrices, setWorkshopPrices] = useState<WorkshopPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  
  // Edit mode states
  const [serviceEditMode, setServiceEditMode] = useState(false);
  const [workshopEditMode, setWorkshopEditMode] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editingWorkshop, setEditingWorkshop] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  
  // Service Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ServicePrice[]>([]);

  // Edit dialog states
  const [serviceEditDialogOpen, setServiceEditDialogOpen] = useState(false);
  const [workshopEditDialogOpen, setWorkshopEditDialogOpen] = useState(false);

  // Workshop Import state
  const [workshopImportDialogOpen, setWorkshopImportDialogOpen] = useState(false);
  const [workshopImportFile, setWorkshopImportFile] = useState<File | null>(null);
  const [workshopImporting, setWorkshopImporting] = useState(false);
  const [workshopImportPreview, setWorkshopImportPreview] = useState<WorkshopPrice[]>([]);

  // Enhanced Manual Service Entry state
  const [addServiceDialogOpen, setAddServiceDialogOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [vehiclePrices, setVehiclePrices] = useState<VehiclePriceInput[]>([]);
  const [newVehicleType, setNewVehicleType] = useState('');
  const [addingService, setAddingService] = useState(false);

  // Enhanced Manual Workshop Entry state
  const [addWorkshopDialogOpen, setAddWorkshopDialogOpen] = useState(false);
  const [newWorkshopName, setNewWorkshopName] = useState('');
  const [workshopVehicleDiscounts, setWorkshopVehicleDiscounts] = useState<WorkshopVehicleDiscountInput[]>([]);
  const [newWorkshopVehicleType, setNewWorkshopVehicleType] = useState('');
  const [addingWorkshop, setAddingWorkshop] = useState(false);

  // Matrix data for services
  const [serviceList, setServiceList] = useState<string[]>([]);
  const [vehicleList, setVehicleList] = useState<string[]>([]);
  const [serviceMatrix, setServiceMatrix] = useState<Record<string, Record<string, number>>>({});
  const [originalVehicleNames, setOriginalVehicleNames] = useState<Record<string, string>>({});
  const [originalServiceNames, setOriginalServiceNames] = useState<Record<string, string>>({});

  // Matrix data for workshops
  const [workshopList, setWorkshopList] = useState<string[]>([]);
  const [workshopVehicleList, setWorkshopVehicleList] = useState<string[]>([]);
  const [workshopMatrix, setWorkshopMatrix] = useState<Record<string, Record<string, number>>>({});
  const [isServiceTableEmpty, setIsServiceTableEmpty] = useState(false);

  const currentLocationId = locationId;

  // Helper: Normalize service name for deduplication
  const normalizeService = (service: string) => {
    if (!service) return '';
    let normalized = service.trim().toUpperCase();
    
    normalized = normalized.replace(/\s+/g, ' ');
    
    const lowerService = service.toLowerCase();
    if (lowerService.includes('under') && (lowerService.includes('coating') || lowerService.includes('coatinng'))) {
      normalized = 'UNDER BODY COATING';
    } else if (lowerService.includes('underbody') && (lowerService.includes('coating') || lowerService.includes('coatinng'))) {
      normalized = 'UNDER BODY COATING';
    } else if (lowerService.includes('under') && lowerService.includes('body') && (lowerService.includes('coating') || lowerService.includes('coatinng'))) {
      normalized = 'UNDER BODY COATING';
    }
    
    if (lowerService.includes('silencer') && (lowerService.includes('coating') || lowerService.includes('coatinng'))) {
      normalized = 'SILENCER COATING';
    }
    
    return normalized;
  };

  // Helper: Normalize vehicle type for deduplication and grouping
  const normalizeVehicle = (vehicle: string) => {
    if (!vehicle) return '';
    const v = vehicle.trim().toLowerCase();
    if (v.includes('super bike') || v.includes('superbike')) return 'SUPER BIKE';
    if (v.includes('bullet')) return 'BULLET';
    if (v.includes('sedan/mini suv') || v.includes('sedan/mini-suv') || v.includes('sedan mini suv')) return 'SEDAN/MINI SUV';
    if (v.includes('hatch')) return 'HATCHBACK';
    if (v.includes('sedan')) return 'SEDAN';
    if (v.includes('suv') || v.includes('jeep')) return 'SUV';
    if (v.includes('truck') || v.includes('bus')) return 'TRUCK';
    if (v.includes('bike') || v.includes('motorcycle')) return 'BIKE';
    if (v.includes('car')) return 'CAR';
    return vehicle.trim().toUpperCase();
  };

  // Process raw service price data into matrix format
  const processServicePricesToMatrix = (rawData: ServicePrice[]) => {
    const pairMap = new Map<string, ServicePrice>();
    const originalNames: Record<string, string> = {};
    const originalServiceNames: Record<string, string> = {};
    
    rawData.forEach(item => {
      const normService = normalizeService(item.SERVICE);
      const normVehicle = normalizeVehicle(item.VEHICLE);
      const key = `${normService}|||${normVehicle}`;
      
      originalNames[normVehicle] = item.VEHICLE;
      originalServiceNames[normService] = item.SERVICE;
      
      if (!pairMap.has(key)) {
        pairMap.set(key, item);
      } else {
        const existing = pairMap.get(key)!;
        
        if (item.created_at && existing.created_at) {
          if (new Date(item.created_at) > new Date(existing.created_at)) {
            pairMap.set(key, item);
            originalNames[normVehicle] = item.VEHICLE;
            originalServiceNames[normService] = item.SERVICE;
          }
        }
      }
    });
    
    const deduped = Array.from(pairMap.entries()).map(([key, item]) => {
      const normService = normalizeService(item.SERVICE);
      const normVehicle = normalizeVehicle(item.VEHICLE);
      return { ...item, SERVICE: normService, VEHICLE: normVehicle };
    });
    
    const services = Array.from(new Set(deduped.map(item => item.SERVICE)));
    const vehicles = Array.from(new Set(deduped.map(item => item.VEHICLE)));
    
    const matrix: Record<string, Record<string, number>> = {};
    services.forEach(service => {
      matrix[service] = {};
      vehicles.forEach(vehicle => {
        const found = deduped.find(item => item.SERVICE === service && item.VEHICLE === vehicle);
        matrix[service][vehicle] = found ? found.PRICE : 0;
      });
    });
    
    setServiceList(services);
    setVehicleList(vehicles);
    setServiceMatrix(matrix);
    setOriginalVehicleNames(originalNames);
    setOriginalServiceNames(originalServiceNames);
  };

  // Process workshop prices into matrix format
  const processWorkshopPricesToMatrix = (rawData: WorkshopPrice[]) => {
    const workshops = Array.from(new Set(rawData.map(item => item.WORKSHOP)));
    const vehicles = Array.from(new Set(rawData.map(item => item.VEHICLE)));
    
    const matrix: Record<string, Record<string, number>> = {};
    workshops.forEach(workshop => {
      matrix[workshop] = {};
      vehicles.forEach(vehicle => {
        const found = rawData.find(item => item.WORKSHOP === workshop && item.VEHICLE === vehicle);
        matrix[workshop][vehicle] = found ? found.Discount : 0;
      });
    });
    
    setWorkshopList(workshops);
    setWorkshopVehicleList(vehicles);
    setWorkshopMatrix(matrix);
  };

  // Initialize vehicle prices when opening add service dialog
  const openAddServiceDialog = () => {
    if (vehicleList.length > 0) {
      // Try to infer type from existing servicePrices for the first matching vehicle entry
      setVehiclePrices(vehicleList.map(v => {
        const match = servicePrices.find(sp => normalizeVehicle(sp.VEHICLE) === normalizeVehicle(v));
        return { vehicle: v, price: '', type: match?.type || '' };
      }));
    }
    setAddServiceDialogOpen(true);
  };

  // Initialize workshop vehicle discounts when opening add workshop dialog
  const openAddWorkshopDialog = () => {
    if (vehicleList.length > 0) {
      setWorkshopVehicleDiscounts(vehicleList.map(v => ({ vehicle: v, discount: '' })));
    }
    setAddWorkshopDialogOpen(true);
  };

  // Add new vehicle type to service form
  const addNewVehicleToService = () => {
    if (!newVehicleType.trim()) {
      toast.error("Please enter a vehicle type");
      return;
    }
    
    const normalized = normalizeVehicle(newVehicleType);
    if (vehiclePrices.some(vp => normalizeVehicle(vp.vehicle) === normalized)) {
      toast.error("This vehicle type already exists");
      return;
    }
    
    // If user supplied a type in the newVehicleType input using a convention like "Name|Type", support that
    // e.g. "Hatchback|2/4" -> vehicle: 'Hatchback', type: '2/4'
    const parts = newVehicleType.split('|').map(p => p.trim());
    const vehicleName = parts[0];
    const vehicleTypeValue = parts[1] || '';
    setVehiclePrices([...vehiclePrices, { vehicle: vehicleName, price: '', type: vehicleTypeValue }]);
    setNewVehicleType('');
    toast.success("Vehicle type added");
  };

  // Add new vehicle type to workshop form
  const addNewVehicleToWorkshop = () => {
    if (!newWorkshopVehicleType.trim()) {
      toast.error("Please enter a vehicle type");
      return;
    }
    
    const normalized = normalizeVehicle(newWorkshopVehicleType);
    if (workshopVehicleDiscounts.some(wv => normalizeVehicle(wv.vehicle) === normalized)) {
      toast.error("This vehicle type already exists");
      return;
    }
    
    setWorkshopVehicleDiscounts([...workshopVehicleDiscounts, { vehicle: newWorkshopVehicleType.trim(), discount: '' }]);
    setNewWorkshopVehicleType('');
    toast.success("Vehicle type added");
  };

  // Handle enhanced service addition
  const handleAddService = async () => {
    if (!newServiceName.trim()) {
      toast.error("Please enter a service name");
      return;
    }

    const validPrices = vehiclePrices.filter(vp => {
      const price = parseFloat(vp.price);
      return !isNaN(price) && price > 0;
    });

    if (validPrices.length === 0) {
      toast.error("Please enter at least one valid price");
      return;
    }

    if (!currentLocationId) {
      toast.error("Location not selected");
      return;
    }

    setAddingService(true);
    try {
      const dataToInsert = validPrices.map(vp => ({
        SERVICE: newServiceName.trim().toUpperCase(),
        VEHICLE: vp.vehicle.trim().toUpperCase(),
        PRICE: parseFloat(vp.price),
        type: vp.type && vp.type.trim() ? vp.type.trim() : null,
        locationid: currentLocationId,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('Service_prices')
        .insert(dataToInsert);

      if (error) {
        console.error('Add service error:', error);
        toast.error(`Failed to add service: ${error.message}`);
        return;
      }

      toast.success(`Service added successfully with ${dataToInsert.length} vehicle types!`);
      setAddServiceDialogOpen(false);
      setNewServiceName('');
      setVehiclePrices([]);
      setNewVehicleType('');
      await refreshData();
    } catch (error) {
      console.error('Add service error:', error);
      toast.error("Failed to add service");
    } finally {
      setAddingService(false);
    }
  };

  // Handle enhanced workshop addition
  const handleAddWorkshop = async () => {
    if (!newWorkshopName.trim()) {
      toast.error("Please enter a workshop name");
      return;
    }

    const validDiscounts = workshopVehicleDiscounts.filter(wv => {
      const discount = parseFloat(wv.discount);
      return !isNaN(discount);
    });

    if (validDiscounts.length === 0) {
      toast.error("Please enter at least one valid discount");
      return;
    }

    if (!currentLocationId) {
      toast.error("Location not selected");
      return;
    }

    setAddingWorkshop(true);
    try {
      const dataToInsert = validDiscounts.map(wv => ({
        WORKSHOP: newWorkshopName.trim().toUpperCase(),
        VEHICLE: wv.vehicle.trim().toUpperCase(),
        Discount: parseFloat(wv.discount),
        location_id: currentLocationId,
        "Created at": new Date().toISOString()
      }));

      const { error } = await supabase
        .from('workshop_prices')
        .insert(dataToInsert);

      if (error) {
        console.error('Add workshop error:', error);
        toast.error(`Failed to add workshop: ${error.message}`);
        return;
      }

      toast.success(`Workshop added successfully with ${dataToInsert.length} vehicle types!`);
      setAddWorkshopDialogOpen(false);
      setNewWorkshopName('');
      setWorkshopVehicleDiscounts([]);
      setNewWorkshopVehicleType('');
      await refreshData();
    } catch (error) {
      console.error('Add workshop error:', error);
      toast.error("Failed to add workshop");
    } finally {
      setAddingWorkshop(false);
    }
  };

  // Open edit dialog for service
  const openServiceEdit = (service: string) => {
    const values: Record<string, number> = {};
    vehicleList.forEach(vehicle => {
      values[vehicle] = serviceMatrix[service][vehicle] || 0;
    });
    setEditValues(values);
    setEditingService(service);
    setServiceEditDialogOpen(true); // Add this line
  };

  // Open edit dialog for workshop
  const openWorkshopEdit = (workshop: string) => {
    const values: Record<string, number> = {};
    workshopVehicleList.forEach(vehicle => {
      values[vehicle] = workshopMatrix[workshop][vehicle] || 0;
    });
    setEditValues(values);
    setEditingWorkshop(workshop);
    setWorkshopEditDialogOpen(true); // Add this line
  };

  // Save service edits
  // Save service edits with proper update logic
const saveServiceEdits = async () => {
  if (!editingService || !currentLocationId) return;

  setSaving(true);
  try {
    // Get existing entries
    const { data: existingEntries } = await supabase
      .from('Service_prices')
      .select('*')
      .eq('SERVICE', editingService)
      .eq('locationid', currentLocationId);

    const existingMap = new Map(
      (existingEntries || []).map(entry => [entry.VEHICLE, entry])
    );

    // Separate into update, insert, and delete operations
    const toUpdate: any[] = [];
    const toInsert: any[] = [];
    const toDelete: string[] = [];

    Object.entries(editValues).forEach(([vehicle, price]) => {
      const existing = existingMap.get(vehicle);
      
      if (price > 0) {
        if (existing) {
          // Update existing entry
          toUpdate.push({ id: existing.id, PRICE: price });
        } else {
          // Insert new entry
          toInsert.push({
            SERVICE: editingService,
            VEHICLE: vehicle,
            PRICE: price,
            locationid: currentLocationId,
            created_at: new Date().toISOString()
          });
        }
        existingMap.delete(vehicle);
      } else if (existing) {
        // Delete entry with price 0
        toDelete.push(existing.id);
      }
    });

    // Delete remaining entries (vehicles not in editValues)
    existingMap.forEach(entry => toDelete.push(entry.id));

    // Execute updates
    if (toUpdate.length > 0) {
      for (const item of toUpdate) {
        const { error } = await supabase
          .from('Service_prices')
          .update({ PRICE: item.PRICE })
          .eq('id', item.id);
        if (error) throw error;
      }
    }

    // Execute inserts
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('Service_prices')
        .insert(toInsert);
      if (error) throw error;
    }

    // Execute deletes
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('Service_prices')
        .delete()
        .in('id', toDelete);
      if (error) throw error;
    }

    toast.success("Service prices updated successfully!");
    setEditingService(null);
    setEditValues({});
    await refreshData();
  } catch (error) {
    console.error('Save error:', error);
    toast.error("Failed to save changes");
  } finally {
    setSaving(false);
  }
};

  // Save workshop edits
  // Save workshop edits with proper update logic
const saveWorkshopEdits = async () => {
  if (!editingWorkshop || !currentLocationId) return;

  setSaving(true);
  try {
    // Get existing entries
    const { data: existingEntries } = await supabase
      .from('workshop_prices')
      .select('*')
      .eq('WORKSHOP', editingWorkshop)
      .eq('location_id', currentLocationId);

    const existingMap = new Map(
      (existingEntries || []).map(entry => [entry.VEHICLE, entry])
    );

    // Separate into update, insert, and delete operations
    const toUpdate: any[] = [];
    const toInsert: any[] = [];
    const toDelete: string[] = [];

    Object.entries(editValues).forEach(([vehicle, discount]) => {
      const existing = existingMap.get(vehicle);
      
      if (existing) {
        // Update existing entry (even if discount is 0, workshops can have 0 discount)
        toUpdate.push({ id: existing.id, Discount: discount });
        existingMap.delete(vehicle);
      } else {
        // Insert new entry
        toInsert.push({
          WORKSHOP: editingWorkshop,
          VEHICLE: vehicle,
          Discount: discount,
          location_id: currentLocationId,
          "Created at": new Date().toISOString()
        });
      }
    });

    // Delete remaining entries (vehicles not in editValues)
    existingMap.forEach(entry => toDelete.push(entry.id));

    // Execute updates
    if (toUpdate.length > 0) {
      for (const item of toUpdate) {
        const { error } = await supabase
          .from('workshop_prices')
          .update({ Discount: item.Discount })
          .eq('id', item.id);
        if (error) throw error;
      }
    }

    // Execute inserts
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('workshop_prices')
        .insert(toInsert);
      if (error) throw error;
    }

    // Execute deletes
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('workshop_prices')
        .delete()
        .in('id', toDelete);
      if (error) throw error;
    }

    toast.success("Workshop discounts updated successfully!");
    setEditingWorkshop(null);
    setEditValues({});
    await refreshData();
  } catch (error) {
    console.error('Save error:', error);
    toast.error("Failed to save changes");
  } finally {
    setSaving(false);
  }
};

  // Generate sample Excel file for services (matrix format)
  const downloadSampleFile = () => {
    const sampleData = [
      { SERVICE: 'TYPE -> (2/4/other)', 'HATCH BACK': 4, 'SEDAN / MINI SUV': 4, 'SUV/ PREMIUM SEDAN': 4, 'PREMIUM SUV': 4 },
      { SERVICE: 'FULL WASH', 'HATCH BACK': 500, 'SEDAN / MINI SUV': 600, 'SUV/ PREMIUM SEDAN': 700, 'PREMIUM SUV': 800 },
      { SERVICE: 'BODY WASH', 'HATCH BACK': 400, 'SEDAN / MINI SUV': 500, 'SUV/ PREMIUM SEDAN': 600, 'PREMIUM SUV': 700 },
      { SERVICE: 'PREMIUM WASH', 'HATCH BACK': 800, 'SEDAN / MINI SUV': 900, 'SUV/ PREMIUM SEDAN': 1000, 'PREMIUM SUV': 1100 },
      { SERVICE: 'CERAMIC WASH', 'HATCH BACK': 1500, 'SEDAN / MINI SUV': 1500, 'SUV/ PREMIUM SEDAN': 1600, 'PREMIUM SUV': 1600 },
      { SERVICE: 'INTERIOR DEEP CLEANING', 'HATCH BACK': 2000, 'SEDAN / MINI SUV': 2500, 'SUV/ PREMIUM SEDAN': 3000, 'PREMIUM SUV': 3500 },
      { SERVICE: 'EXTERIOR DETAILING', 'HATCH BACK': 4000, 'SEDAN / MINI SUV': 5000, 'SUV/ PREMIUM SEDAN': 6000, 'PREMIUM SUV': 7000 },
      { SERVICE: 'UNDER BODY COATING', 'HATCH BACK': 3500, 'SEDAN / MINI SUV': 4000, 'SUV/ PREMIUM SEDAN': 4500, 'PREMIUM SUV': 5000 }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Service Prices");

    const colWidths = [
      { wch: 25 },
      { wch: 15 },
      { wch: 18 },
      { wch: 20 },
      { wch: 15 }
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, "service_prices_sample.xlsx");
    toast.success("Sample file downloaded successfully!");
  };

  // Generate sample Excel file for workshops
  const downloadWorkshopSampleFile = () => {
    const vehicleTypes = vehicleList.length > 0 ? vehicleList : ['HATCHBACK', 'SEDAN', 'SUV'];
    
    const sampleData = [
      { WORKSHOP: 'Workshop A', ...Object.fromEntries(vehicleTypes.map((v, i) => [originalVehicleNames[v] || v, 200 + i * 50])) },
      { WORKSHOP: 'Workshop B', ...Object.fromEntries(vehicleTypes.map((v, i) => [originalVehicleNames[v] || v, 250 + i * 50])) },
      { WORKSHOP: 'Workshop C', ...Object.fromEntries(vehicleTypes.map((v, i) => [originalVehicleNames[v] || v, 180 + i * 50])) }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Workshop Discounts");

    const colWidths = [
      { wch: 20 },
      ...vehicleTypes.map(() => ({ wch: 18 }))
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, "workshop_discounts_sample.xlsx");
    toast.success("Workshop sample file downloaded successfully!");
  };

  // Handle file selection for services
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      previewFile(file);
    }
  };

  // Handle file selection for workshops
  const handleWorkshopFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setWorkshopImportFile(file);
      previewWorkshopFile(file);
    }
  };

  // Preview Excel file content for services
  const previewFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ServiceImportRow[];

      if (jsonData.length === 0) {
        toast.error("Excel file is empty");
        return;
      }

      const normalizedData: ServicePrice[] = [];
      
      let hasTypeRow = false;
      let typeMapping: Record<string, string> = {};
      let startIndex = 0;
      
      if (jsonData.length > 0) {
        const firstRow = jsonData[0];
        const serviceValue = String(firstRow.SERVICE || '').toLowerCase();
        
        if (serviceValue.includes('type')) {
          hasTypeRow = true;
          startIndex = 1;
          
          Object.keys(firstRow).forEach(key => {
            if (key !== 'SERVICE') {
              const vehicleType = key;
              const typeValue = firstRow[key];
              typeMapping[vehicleType] = String(typeValue || '');
            }
          });
        }
      }
      
      jsonData.slice(startIndex).forEach((row, rowIndex) => {
        const serviceName = row.SERVICE;
        
        if (!serviceName) return;

        Object.keys(row).forEach(key => {
          if (key !== 'SERVICE') {
            const vehicleType = key;
            const price = row[key];
            
            const priceNum = typeof price === 'number' ? price : parseFloat(String(price));
            
            if (!isNaN(priceNum) && priceNum > 0) {
              normalizedData.push({
                id: `temp-${normalizedData.length}`,
                SERVICE: String(serviceName).trim(),
                VEHICLE: vehicleType.trim(),
                PRICE: priceNum,
                type: typeMapping[vehicleType] || undefined
              });
            }
          }
        });
      });

      if (normalizedData.length === 0) {
        toast.error("No valid service-vehicle price data found");
        return;
      }

      setImportPreview(normalizedData);
      
      const message = hasTypeRow 
        ? `Found ${normalizedData.length} valid service-vehicle combinations (TYPE row detected and processed)`
        : `Found ${normalizedData.length} valid service-vehicle combinations for import`;
      
      toast.success(message);
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error("Error reading Excel file");
    }
  };

  // Preview Excel file content for workshops
  const previewWorkshopFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as WorkshopImportRow[];

      if (jsonData.length === 0) {
        toast.error("Excel file is empty");
        return;
      }

      const normalizedData: WorkshopPrice[] = [];
      
      jsonData.forEach((row, rowIndex) => {
        const workshopName = row.WORKSHOP;
        
        if (!workshopName) return;

        Object.keys(row).forEach(key => {
          if (key !== 'WORKSHOP') {
            const vehicleType = key;
            const discount = row[key];
            
            const discountNum = typeof discount === 'number' ? discount : parseFloat(String(discount));
            
            if (!isNaN(discountNum)) {
              normalizedData.push({
                id: `temp-${normalizedData.length}`,
                WORKSHOP: String(workshopName).trim(),
                VEHICLE: vehicleType.trim(),
                Discount: discountNum
              });
            }
          }
        });
      });

      if (normalizedData.length === 0) {
        toast.error("No valid workshop-vehicle discount data found");
        return;
      }

      setWorkshopImportPreview(normalizedData);
      toast.success(`Found ${normalizedData.length} valid workshop-vehicle combinations for import`);
    } catch (error) {
      console.error('Error previewing workshop file:', error);
      toast.error("Error reading Excel file");
    }
  };

  // Import data to database for services
  const handleImport = async () => {
    if (!importPreview.length || !currentLocationId) {
      toast.error("No data to import or location not selected");
      return;
    }

    setImporting(true);
    try {
      const dataToInsert = importPreview.map(row => ({
        SERVICE: row.SERVICE ? row.SERVICE.toUpperCase() : '',
        VEHICLE: row.VEHICLE ? row.VEHICLE.toUpperCase() : '',
        PRICE: row.PRICE,
        type: row.type || null,
        locationid: currentLocationId,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('Service_prices')
        .insert(dataToInsert);

      if (error) {
        console.error('Import error:', error);
        toast.error(`Import failed: ${error.message}`);
        return;
      }

      toast.success(`Successfully imported ${dataToInsert.length} service price records`);
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
      await refreshData();
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  // Import data to database for workshops
  const handleWorkshopImport = async () => {
    if (!workshopImportPreview.length || !currentLocationId) {
      toast.error("No data to import or location not selected");
      return;
    }

    setWorkshopImporting(true);
    try {
      const dataToInsert = workshopImportPreview.map(row => ({
        WORKSHOP: row.WORKSHOP ? row.WORKSHOP.toUpperCase() : '',
        VEHICLE: row.VEHICLE ? row.VEHICLE.toUpperCase() : '',
        Discount: row.Discount,
        location_id: currentLocationId,
        "Created at": new Date().toISOString()
      }));

      const { error } = await supabase
        .from('workshop_prices')
        .insert(dataToInsert);

      if (error) {
        console.error('Workshop import error:', error);
        toast.error(`Import failed: ${error.message}`);
        return;
      }

      toast.success(`Successfully imported ${dataToInsert.length} workshop discount records`);
      setWorkshopImportDialogOpen(false);
      setWorkshopImportFile(null);
      setWorkshopImportPreview([]);
      await refreshData();
    } catch (error) {
      console.error('Workshop import error:', error);
      toast.error("Import failed");
    } finally {
      setWorkshopImporting(false);
    }
  };

  // Fetch all data from Supabase
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let servicePricesRes = null;
      const tableNames = [
        'Service_prices',
        'service_prices', 
        'service-prices',
        'serviceprices',
        'prices',
        'service_pricing',
        'pricing'
      ];
      
      for (const tableName of tableNames) {
        try {
          const testResult = await supabase.from(tableName).select('*').limit(1);
          if (!testResult.error) {
            servicePricesRes = await supabase.from(tableName).select('*');
            break;
          }
        } catch (error) {}
      }
      
      if (!servicePricesRes) {
        servicePricesRes = { data: null, error: { message: 'No service prices table found' } };
      }
      
      const workshopPricesRes = await supabase
        .from('workshop_prices')
        .select('*');

      if (servicePricesRes.error) {
        setError('Failed to fetch service prices');
        const fallbackServicePrices: ServicePrice[] = [
          { id: '1', SERVICE: 'Basic Wash', VEHICLE: 'Car', PRICE: 200 },
          { id: '2', SERVICE: 'Basic Wash', VEHICLE: 'Bike', PRICE: 100 },
          { id: '3', SERVICE: 'Premium Wash', VEHICLE: 'Car', PRICE: 500 },
          { id: '4', SERVICE: 'Premium Wash', VEHICLE: 'Bike', PRICE: 300 },
          { id: '5', SERVICE: 'Full Service', VEHICLE: 'Car', PRICE: 800 },
          { id: '6', SERVICE: 'Full Service', VEHICLE: 'Bike', PRICE: 500 }
        ];
        setServicePrices(fallbackServicePrices);
        processServicePricesToMatrix(fallbackServicePrices);
        setUsingFallbackData(true);
        setIsServiceTableEmpty(false);
      } else {
        const rows = servicePricesRes.data || [];
        setServicePrices(rows);
        processServicePricesToMatrix(rows);
        setUsingFallbackData(false);
        setIsServiceTableEmpty(Array.isArray(rows) && rows.length === 0);
      }

      if (!workshopPricesRes.error && workshopPricesRes.data) {
        setWorkshopPrices(workshopPricesRes.data);
        processWorkshopPricesToMatrix(workshopPricesRes.data);
      } else {
        setWorkshopPrices([]);
        setWorkshopList([]);
        setWorkshopVehicleList([]);
        setWorkshopMatrix({});
      }
    } catch (error) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data function
  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [currentLocationId]);

  // Calculate statistics
  const totalServices = serviceList.length;
  const totalRules = servicePrices.length;
  const avgPrice = totalRules > 0 
    ? servicePrices.reduce((sum, service) => sum + service.PRICE, 0) / totalRules 
    : 0;
  const totalWorkshops = workshopList.length;

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Price Settings</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData} 
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          
          {/* Service Import Dialog */}
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Import Services</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Import Service Prices from Excel
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
                  <div>
                    <p className="font-medium text-blue-900">Need a template?</p>
                    <p className="text-sm text-blue-700">Download our sample Excel file with matrix format</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadSampleFile}>
                    <Download className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Download Sample</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Excel File</label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: First column = SERVICE, Other columns = Vehicle types with price values
                  </p>
                </div>

                {importPreview.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Preview ({importPreview.length} records)</h3>
                      <Badge variant="secondary">Ready to import</Badge>
                    </div>
                    
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.slice(0, 10).map((row, index) => (
                            <TableRow key={index}>
                              <TableCell>{row.SERVICE}</TableCell>
                              <TableCell>{row.VEHICLE}</TableCell>
                              <TableCell>₹{row.PRICE}</TableCell>
                              <TableCell>{row.type || '-'}</TableCell>
                            </TableRow>
                          ))}
                          {importPreview.length > 10 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                ... and {importPreview.length - 10} more rows
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setImportDialogOpen(false);
                          setImportFile(null);
                          setImportPreview([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleImport} 
                        disabled={importing || !currentLocationId}
                      >
                        {importing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Import {importPreview.length} Records
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Workshop Import Dialog */}
          <Dialog open={workshopImportDialogOpen} onOpenChange={setWorkshopImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" disabled={isServiceTableEmpty}>
                <Building2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Import Workshops</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Import Workshop Discounts from Excel
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border">
                  <div>
                    <p className="font-medium text-green-900">Need a template?</p>
                    <p className="text-sm text-green-700">Download sample with matrix format</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadWorkshopSampleFile}>
                    <Download className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Download Sample</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Excel File</label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleWorkshopFileSelect}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: First column = WORKSHOP, Other columns = Vehicle types with discount values
                  </p>
                </div>

                {workshopImportPreview.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Preview ({workshopImportPreview.length} records)</h3>
                      <Badge variant="secondary">Ready to import</Badge>
                    </div>
                    
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Workshop</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Discount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {workshopImportPreview.slice(0, 10).map((row, index) => (
                            <TableRow key={index}>
                              <TableCell>{row.WORKSHOP}</TableCell>
                              <TableCell>{row.VEHICLE}</TableCell>
                              <TableCell>₹{row.Discount}</TableCell>
                            </TableRow>
                          ))}
                          {workshopImportPreview.length > 10 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                ... and {workshopImportPreview.length - 10} more rows
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setWorkshopImportDialogOpen(false);
                          setWorkshopImportFile(null);
                          setWorkshopImportPreview([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleWorkshopImport} 
                        disabled={workshopImporting || !currentLocationId}
                      >
                        {workshopImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Import {workshopImportPreview.length} Records
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Enhanced Add Service Dialog */}
          <Dialog open={addServiceDialogOpen} onOpenChange={(open) => {
            setAddServiceDialogOpen(open);
            if (open) openAddServiceDialog();
          }}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Service</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  Add New Service
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="service-name">Service Name *</Label>
                  <Input
                    id="service-name"
                    placeholder="e.g., Basic Wash, Premium Wash"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Vehicle Types & Prices</Label>
                  <div className="border rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto">
                    {vehiclePrices.map((vp, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <div className="w-1/3">
                          <Input
                            value={vp.vehicle}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="w-1/3">
                          <Input
                            placeholder="Type (e.g., 2/4 or other)"
                            value={vp.type || ''}
                            onChange={(e) => {
                              const newPrices = [...vehiclePrices];
                              newPrices[index].type = e.target.value;
                              setVehiclePrices(newPrices);
                            }}
                          />
                        </div>
                        <div className="flex-1 relative">
                          <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="Price"
                            className="pl-10"
                            value={vp.price}
                            onChange={(e) => {
                              const newPrices = [...vehiclePrices];
                              newPrices[index].price = e.target.value;
                              setVehiclePrices(newPrices);
                            }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setVehiclePrices(vehiclePrices.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new vehicle type"
                      value={newVehicleType}
                      onChange={(e) => setNewVehicleType(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addNewVehicleToService();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={addNewVehicleToService}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vehicle
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAddServiceDialogOpen(false);
                      setNewServiceName('');
                      setVehiclePrices([]);
                      setNewVehicleType('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddService} 
                    disabled={addingService || !currentLocationId}
                  >
                    {addingService ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Enhanced Add Workshop Dialog */}
          <Dialog open={addWorkshopDialogOpen} onOpenChange={(open) => {
            setAddWorkshopDialogOpen(open);
            if (open) openAddWorkshopDialog();
          }}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" disabled={isServiceTableEmpty}>
                <Building2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Workshop</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Add New Workshop
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="workshop-name">Workshop Name *</Label>
                  <Input
                    id="workshop-name"
                    placeholder="e.g., Workshop A, ABC Motors"
                    value={newWorkshopName}
                    onChange={(e) => setNewWorkshopName(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Vehicle Types & Discounts</Label>
                  <div className="border rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto">
                    {workshopVehicleDiscounts.map((wv, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <div className="flex-1">
                          <Input
                            value={wv.vehicle}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="flex-1 relative">
                          <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="Discount"
                            className="pl-10"
                            value={wv.discount}
                            onChange={(e) => {
                              const newDiscounts = [...workshopVehicleDiscounts];
                              newDiscounts[index].discount = e.target.value;
                              setWorkshopVehicleDiscounts(newDiscounts);
                            }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setWorkshopVehicleDiscounts(workshopVehicleDiscounts.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new vehicle type"
                      value={newWorkshopVehicleType}
                      onChange={(e) => setNewWorkshopVehicleType(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addNewVehicleToWorkshop();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={addNewVehicleToWorkshop}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vehicle
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAddWorkshopDialogOpen(false);
                      setNewWorkshopName('');
                      setWorkshopVehicleDiscounts([]);
                      setNewWorkshopVehicleType('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddWorkshop} 
                    disabled={addingWorkshop || !currentLocationId}
                  >
                    {addingWorkshop ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Workshop
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Service Edit Dialog */}
      <Dialog open={serviceEditDialogOpen} onOpenChange={setServiceEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Service: {originalServiceNames[editingService || ''] || editingService}
            </DialogTitle>
          </DialogHeader>
    
          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
              {editingService && vehicleList.map((vehicle) => (
                <div key={vehicle} className="flex gap-3 items-center">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">
                      {originalVehicleNames[vehicle] || vehicle}
                    </Label>
                  </div>
                  <div className="flex-1 relative">
                    <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-10"
                      value={editValues[vehicle] || ''}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value) || 0;
                        setEditValues({ ...editValues, [vehicle]: newValue });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => {
            setServiceEditDialogOpen(false);
            setEditingService(null);
            setEditValues({});
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={async () => {
            await saveServiceEdits();
            setServiceEditDialogOpen(false);
          }} 
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
{/* Workshop Edit Dialog */}
<Dialog open={workshopEditDialogOpen} onOpenChange={setWorkshopEditDialogOpen}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        Edit Workshop: {editingWorkshop}
      </DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
        {editingWorkshop && workshopVehicleList.map((vehicle) => (
          <div key={vehicle} className="flex gap-3 items-center">
            <div className="flex-1">
              <Label className="text-sm font-medium">
                {vehicle}
              </Label>
            </div>
            <div className="flex-1 relative">
              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="0"
                className="pl-10"
                value={editValues[vehicle] || ''}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value) || 0;
                  setEditValues({ ...editValues, [vehicle]: newValue });
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => {
            setWorkshopEditDialogOpen(false);
            setEditingWorkshop(null);
            setEditValues({});
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={async () => {
            await saveWorkshopEdits();
            setWorkshopEditDialogOpen(false);
          }} 
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServices}</div>
            <p className="text-xs text-muted-foreground">
              Unique service types
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Price Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRules}</div>
            <p className="text-xs text-muted-foreground">
              Service-vehicle combinations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{Math.round(avgPrice)}</div>
            <p className="text-xs text-muted-foreground">
              Across all services
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workshops</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkshops}</div>
            <p className="text-xs text-muted-foreground">
              Workshop partners
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Service Pricing Matrix Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Service Pricing Matrix
            </CardTitle>
            <Button
              variant={serviceEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => setServiceEditMode(!serviceEditMode)}
            >
              {serviceEditMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel Edit
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Mode
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading service prices...</span>
            </div>
          ) : serviceList.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No service prices found</p>
              <Button variant="outline" onClick={refreshData} className="mt-4">
                Refresh Data
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {serviceEditMode && <TableHead className="w-20">Action</TableHead>}
                    <TableHead>Service Name</TableHead>
                    {vehicleList.map(vehicle => (
                      <TableHead key={vehicle} className="text-center">
                        {originalVehicleNames[vehicle] || vehicle}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceList.map(service => (
                    <TableRow key={service}>
                      {serviceEditMode && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openServiceEdit(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {originalServiceNames[service] || service}
                      </TableCell>
                      {vehicleList.map(vehicle => (
                        <TableCell key={vehicle} className="text-center">
                          {serviceMatrix[service][vehicle] ? `₹${serviceMatrix[service][vehicle]}` : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workshop Discount Matrix Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Workshop Discount Matrix
            </CardTitle>
            <Button
              variant={workshopEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => setWorkshopEditMode(!workshopEditMode)}
              disabled={workshopList.length === 0}
            >
              {workshopEditMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel Edit
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Mode
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading workshop discounts...</span>
            </div>
          ) : workshopList.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No workshop discounts found</p>
              <p className="text-sm mt-2">Import workshop data to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {workshopEditMode && <TableHead className="w-20">Action</TableHead>}
                    <TableHead>Workshop Name</TableHead>
                    {workshopVehicleList.map(vehicle => (
                      <TableHead key={vehicle} className="text-center">
                        {vehicle}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workshopList.map(workshop => (
                    <TableRow key={workshop}>
                      {workshopEditMode && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openWorkshopEdit(workshop)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{workshop}</TableCell>
                      {workshopVehicleList.map(vehicle => (
                        <TableCell key={vehicle} className="text-center">
                          {workshopMatrix[workshop][vehicle] ? `₹${workshopMatrix[workshop][vehicle]}` : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}