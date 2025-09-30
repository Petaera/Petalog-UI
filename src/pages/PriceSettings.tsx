import { useState, useEffect } from "react";
import { ArrowLeft, Settings, Plus, Edit, IndianRupee, Loader2, RefreshCw, AlertCircle, Upload, Download, FileSpreadsheet, Building2 } from "lucide-react";
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

interface ImportRow {
  SERVICE: string;
  VEHICLE: string;
  PRICE: number;
  type?: string;
}

interface WorkshopImportRow {
  WORKSHOP: string;
  [key: string]: string | number; // Dynamic vehicle columns
}

export default function PriceSettings({ locationId }: { locationId: string }) {
  // State for data
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [workshopPrices, setWorkshopPrices] = useState<WorkshopPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  
  // Service Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);

  // Workshop Import state
  const [workshopImportDialogOpen, setWorkshopImportDialogOpen] = useState(false);
  const [workshopImportFile, setWorkshopImportFile] = useState<File | null>(null);
  const [workshopImporting, setWorkshopImporting] = useState(false);
  const [workshopImportPreview, setWorkshopImportPreview] = useState<WorkshopPrice[]>([]);

  // Manual Service Entry state
  const [addServiceDialogOpen, setAddServiceDialogOpen] = useState(false);
  const [newService, setNewService] = useState({ SERVICE: '', VEHICLE: '', PRICE: '', type: '' });
  const [addingService, setAddingService] = useState(false);

  // Manual Workshop Entry state
  const [addWorkshopDialogOpen, setAddWorkshopDialogOpen] = useState(false);
  const [newWorkshop, setNewWorkshop] = useState({ WORKSHOP: '', VEHICLE: '', Discount: '' });
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

  // Use locationId prop for current location
  const currentLocationId = locationId;

  // Helper: Normalize service name for deduplication
  const normalizeService = (service: string) => {
    if (!service) return '';
    let normalized = service.trim().toUpperCase();
    
    // Handle common variations
    normalized = normalized.replace(/\s+/g, ' '); // Normalize multiple spaces to single space
    
    // More aggressive Under Body Coating detection
    const lowerService = service.toLowerCase();
    if (lowerService.includes('under') && (lowerService.includes('coating') || lowerService.includes('coatinng'))) {
      normalized = 'UNDER BODY COATING';
    } else if (lowerService.includes('underbody') && (lowerService.includes('coating') || lowerService.includes('coatinng'))) {
      normalized = 'UNDER BODY COATING';
    } else if (lowerService.includes('under') && lowerService.includes('body') && (lowerService.includes('coating') || lowerService.includes('coatinng'))) {
      normalized = 'UNDER BODY COATING';
    }
    
    // Handle Silencer Coating variations
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
    console.log('📄 Processing service prices to matrix...');
    console.log('📊 Raw data count:', rawData.length);
    
    // Deduplicate: for each (normalized service, normalized vehicle) pair, keep only the latest by created_at or the first found
    const pairMap = new Map<string, ServicePrice>();
    const originalNames: Record<string, string> = {};
    const originalServiceNames: Record<string, string> = {};
    
    rawData.forEach(item => {
      const normService = normalizeService(item.SERVICE);
      const normVehicle = normalizeVehicle(item.VEHICLE);
      const key = `${normService}|||${normVehicle}`;
      
      // Store the original names for display
      originalNames[normVehicle] = item.VEHICLE;
      originalServiceNames[normService] = item.SERVICE;
      
      if (!pairMap.has(key)) {
        pairMap.set(key, item);
      } else {
        // If duplicate, keep the latest by created_at if available
        const existing = pairMap.get(key)!;
        
        if (item.created_at && existing.created_at) {
          if (new Date(item.created_at) > new Date(existing.created_at)) {
            pairMap.set(key, item);
            originalNames[normVehicle] = item.VEHICLE; // Update with newer original name
            originalServiceNames[normService] = item.SERVICE; // Update with newer original service name
          }
        }
      }
    });
    
    const deduped = Array.from(pairMap.entries()).map(([key, item]) => {
      const normService = normalizeService(item.SERVICE);
      const normVehicle = normalizeVehicle(item.VEHICLE);
      return { ...item, SERVICE: normService, VEHICLE: normVehicle };
    });
    
    // Get all unique normalized services and vehicles
    const services = Array.from(new Set(deduped.map(item => item.SERVICE)));
    const vehicles = Array.from(new Set(deduped.map(item => item.VEHICLE)));
    
    // Build matrix: service -> vehicle -> price
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
    
    console.log('✅ Matrix processing completed');
  };

  // Process workshop prices into matrix format
  const processWorkshopPricesToMatrix = (rawData: WorkshopPrice[]) => {
    console.log('🏭 Processing workshop prices to matrix...');
    
    // Get unique workshops and vehicles
    const workshops = Array.from(new Set(rawData.map(item => item.WORKSHOP)));
    const vehicles = Array.from(new Set(rawData.map(item => item.VEHICLE)));
    
    // Build matrix: workshop -> vehicle -> discount
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
    
    console.log('✅ Workshop matrix processing completed');
  };

  // Generate sample Excel file for services
  const downloadSampleFile = () => {
    const sampleData = [
      { SERVICE: 'Basic Wash', VEHICLE: 'Car', PRICE: 200, type: 4 },
      { SERVICE: 'Basic Wash', VEHICLE: 'Bike', PRICE: 100, type: 2 },
      { SERVICE: 'Premium Wash', VEHICLE: 'Car', PRICE: 500, type: 4 },
      { SERVICE: 'Premium Wash', VEHICLE: 'Bike', PRICE: 300, type: 2 },
      { SERVICE: 'Full Service', VEHICLE: 'SUV', PRICE: 800, type: 4 },
      { SERVICE: 'Under Body Coating', VEHICLE: 'Car', PRICE: 1500, type: 4 },
      { SERVICE: 'Silencer Coating', VEHICLE: 'Bike', PRICE: 800, type: 2 }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Service Prices");

    // Add column widths
    const colWidths = [
      { wch: 20 }, // SERVICE
      { wch: 15 }, // VEHICLE
      { wch: 10 }, // PRICE
      { wch: 12 }  // type
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, "service_prices_sample.xlsx");
    toast.success("Sample file downloaded successfully!");
  };

  // Generate sample Excel file for workshops
  const downloadWorkshopSampleFile = () => {
    const sampleData = [
      { WORKSHOP: 'Workshop A', 'HATCH BACK': 300, 'SEDAN': 150, 'SUV': 200 },
      { WORKSHOP: 'Workshop B', 'HATCH BACK': 250, 'SEDAN': 180, 'SUV': 220 },
      { WORKSHOP: 'Workshop C', 'HATCH BACK': 280, 'SEDAN': 160, 'SUV': 190 }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Workshop Discounts");

    // Add column widths
    const colWidths = [
      { wch: 20 }, // WORKSHOP
      { wch: 15 }, // HATCH BACK
      { wch: 15 }, // SEDAN
      { wch: 15 }  // SUV
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
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRow[];

      // Validate required columns
      if (jsonData.length === 0) {
        toast.error("Excel file is empty");
        return;
      }

      const firstRow = jsonData[0];
      const requiredColumns = ['SERVICE', 'VEHICLE', 'PRICE'];
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));

      if (missingColumns.length > 0) {
        toast.error(`Missing required columns: ${missingColumns.join(', ')}`);
        return;
      }

      // Validate data types and clean up
      const validData: ImportRow[] = [];
      jsonData.forEach((row, index) => {
        if (row.SERVICE && row.VEHICLE && row.PRICE) {
          const price = typeof row.PRICE === 'number' ? row.PRICE : parseFloat(String(row.PRICE));
          if (!isNaN(price)) {
            validData.push({
              SERVICE: String(row.SERVICE).trim(),
              VEHICLE: String(row.VEHICLE).trim(),
              PRICE: price,
              type: row.type ? String(row.type).trim() : undefined
            });
          }
        }
      });

      setImportPreview(validData);
      toast.success(`Found ${validData.length} valid rows for import`);
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error("Error reading Excel file");
    }
  };

  // Preview Excel file content for workshops (matrix format)
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

      // Convert matrix format to normalized format
      const normalizedData: WorkshopPrice[] = [];
      
      jsonData.forEach((row, rowIndex) => {
        const workshopName = row.WORKSHOP;
        
        if (!workshopName) {
          console.warn(`Row ${rowIndex + 1}: Missing WORKSHOP name, skipping`);
          return;
        }

        // Get all columns except WORKSHOP
        Object.keys(row).forEach(key => {
          if (key !== 'WORKSHOP') {
            const vehicleType = key;
            const discount = row[key];
            
            // Convert discount to number
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
        type: row.type ? row.type.toUpperCase() : null,
        locationid: currentLocationId,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
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

      const { data, error } = await supabase
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

  // Handle manual service addition
  const handleAddService = async () => {
    if (!newService.SERVICE || !newService.VEHICLE || !newService.PRICE) {
      toast.error("Please fill in all required fields");
      return;
    }

    const price = parseFloat(newService.PRICE);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (!currentLocationId) {
      toast.error("Location not selected");
      return;
    }

    setAddingService(true);
    try {
      const dataToInsert = {
        SERVICE: newService.SERVICE.trim().toUpperCase(),
        VEHICLE: newService.VEHICLE.trim().toUpperCase(),
        PRICE: price,
        type: newService.type ? newService.type.trim().toUpperCase() : null,
        locationid: currentLocationId,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('Service_prices')
        .insert([dataToInsert]);

      if (error) {
        console.error('Add service error:', error);
        toast.error(`Failed to add service: ${error.message}`);
        return;
      }

      toast.success("Service price added successfully!");
      setAddServiceDialogOpen(false);
      setNewService({ SERVICE: '', VEHICLE: '', PRICE: '', type: '' });
      await refreshData();
    } catch (error) {
      console.error('Add service error:', error);
      toast.error("Failed to add service");
    } finally {
      setAddingService(false);
    }
  };

  // Handle manual workshop addition
  const handleAddWorkshop = async () => {
    if (!newWorkshop.WORKSHOP || !newWorkshop.VEHICLE || !newWorkshop.Discount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const discount = parseFloat(newWorkshop.Discount);
    if (isNaN(discount)) {
      toast.error("Please enter a valid discount amount");
      return;
    }

    if (!currentLocationId) {
      toast.error("Location not selected");
      return;
    }

    setAddingWorkshop(true);
    try {
      const dataToInsert = {
        WORKSHOP: newWorkshop.WORKSHOP.trim().toUpperCase(),
        VEHICLE: newWorkshop.VEHICLE.trim().toUpperCase(),
        Discount: discount,
        location_id: currentLocationId,
        "Created at": new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('workshop_prices')
        .insert([dataToInsert]);

      if (error) {
        console.error('Add workshop error:', error);
        toast.error(`Failed to add workshop: ${error.message}`);
        return;
      }

      toast.success("Workshop discount added successfully!");
      setAddWorkshopDialogOpen(false);
      setNewWorkshop({ WORKSHOP: '', VEHICLE: '', Discount: '' });
      await refreshData();
    } catch (error) {
      console.error('Add workshop error:', error);
      toast.error("Failed to add workshop");
    } finally {
      setAddingWorkshop(false);
    }
  };

  // Fetch all data from Supabase
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch service prices
      let servicePricesRes = null;
      let workingTableName = null;
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
            workingTableName = tableName;
            servicePricesRes = await supabase.from(tableName).select('*');
            break;
          }
        } catch (error) {}
      }
      
      if (!servicePricesRes) {
        servicePricesRes = { data: null, error: { message: 'No service prices table found' } };
      }
      
      // Fetch workshop prices
      const workshopPricesRes = await supabase
        .from('workshop_prices')
        .select('*');

      // Handle service prices data
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
      } else {
        setServicePrices(servicePricesRes.data || []);
        processServicePricesToMatrix(servicePricesRes.data || []);
        setUsingFallbackData(false);
      }

      // Handle workshop prices data
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
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData} 
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          
          {/* Service Import Dialog */}
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import Services
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
                    <p className="text-sm text-blue-700">Download our sample Excel file with the correct format</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadSampleFile}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample
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
                    Required columns: SERVICE, VEHICLE, PRICE. Optional: type
                  </p>
                </div>

                {importPreview.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Preview ({importPreview.length} rows)</h3>
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
              <Button variant="secondary" size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                Import Workshops
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
                    <p className="text-sm text-green-700">Download sample with matrix format (workshops as rows, vehicles as columns)</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadWorkshopSampleFile}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample
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

          {/* Add Service Dialog */}
          <Dialog open={addServiceDialogOpen} onOpenChange={setAddServiceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  Add New Service Price
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service-name">Service Name *</Label>
                  <Input
                    id="service-name"
                    placeholder="e.g., Basic Wash, Premium Wash"
                    value={newService.SERVICE}
                    onChange={(e) => setNewService({ ...newService, SERVICE: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle-type">Vehicle Type *</Label>
                  <Input
                    id="vehicle-type"
                    placeholder="e.g., Car, Bike, SUV"
                    value={newService.VEHICLE}
                    onChange={(e) => setNewService({ ...newService, VEHICLE: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.00"
                      className="pl-10"
                      value={newService.PRICE}
                      onChange={(e) => setNewService({ ...newService, PRICE: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type (Optional)</Label>
                  <Input
                    id="type"
                    placeholder="e.g., 2, 4"
                    value={newService.type}
                    onChange={(e) => setNewService({ ...newService, type: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAddServiceDialogOpen(false);
                      setNewService({ SERVICE: '', VEHICLE: '', PRICE: '', type: '' });
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

          {/* Add Workshop Dialog */}
          <Dialog open={addWorkshopDialogOpen} onOpenChange={setAddWorkshopDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                Add Workshop
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Add New Workshop Discount
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workshop-name">Workshop Name *</Label>
                  <Input
                    id="workshop-name"
                    placeholder="e.g., Workshop A, ABC Motors"
                    value={newWorkshop.WORKSHOP}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, WORKSHOP: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workshop-vehicle">Vehicle Type *</Label>
                  <Input
                    id="workshop-vehicle"
                    placeholder="e.g., HATCHBACK, SEDAN, SUV"
                    value={newWorkshop.VEHICLE}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, VEHICLE: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Discount Amount *</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="discount"
                      type="number"
                      placeholder="0.00"
                      className="pl-10"
                      value={newWorkshop.Discount}
                      onChange={(e) => setNewWorkshop({ ...newWorkshop, Discount: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the discount amount for this workshop-vehicle combination
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAddWorkshopDialogOpen(false);
                      setNewWorkshop({ WORKSHOP: '', VEHICLE: '', Discount: '' });
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
      
      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Fallback Data Notice */}
      {usingFallbackData && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-4 w-4" />
              <span>Showing fallback service prices. Service_prices table may not be accessible.</span>
            </div>
          </CardContent>
        </Card>
      )}
      
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
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Service Pricing Matrix
          </CardTitle>
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
                    <TableHead>Service Name</TableHead>
                    {vehicleList.map(vehicle => (
                      <TableHead key={vehicle}>{originalVehicleNames[vehicle] || vehicle}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceList.map(service => (
                    <TableRow key={service}>
                      <TableCell className="font-medium">{originalServiceNames[service] || service}</TableCell>
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
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Workshop Discount Matrix
          </CardTitle>
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
                    <TableHead>Workshop Name</TableHead>
                    {workshopVehicleList.map(vehicle => (
                      <TableHead key={vehicle} className="text-center">{vehicle}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workshopList.map(workshop => (
                    <TableRow key={workshop}>
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