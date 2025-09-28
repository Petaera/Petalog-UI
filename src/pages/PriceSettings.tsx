import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Settings, Plus, Edit, IndianRupee, Loader2, RefreshCw, AlertCircle } from "lucide-react";
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
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

// Types for our data - matching actual Supabase structure
interface ServicePrice {
  id: string;
  SERVICE: string;
  VEHICLE: string;
  PRICE: number;
  created_at?: string;
}



export default function PriceSettings() {
  // State for data
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);

  // Matrix data
  const [serviceList, setServiceList] = useState<string[]>([]);
  const [vehicleList, setVehicleList] = useState<string[]>([]);
  const [serviceMatrix, setServiceMatrix] = useState<Record<string, Record<string, number>>>({});
  const [originalVehicleNames, setOriginalVehicleNames] = useState<Record<string, string>>({});
  const [originalServiceNames, setOriginalServiceNames] = useState<Record<string, string>>({});

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
    console.log('🔄 Processing service prices to matrix...');
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

  // Fetch all data from Supabase
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
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
      // Handle service prices data
      if (servicePricesRes.error) {
        setError('Failed to fetch service prices');
        // Fallback: Use default service prices if table is not accessible
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
  }, []);

  // Calculate statistics
  const totalServices = serviceList.length;
  const totalRules = servicePrices.length;
  const avgPrice = totalRules > 0 
    ? servicePrices.reduce((sum, service) => sum + service.PRICE, 0) / totalRules 
    : 0;

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
          <Button variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
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
    </div>
  );
}

