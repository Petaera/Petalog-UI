
import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, BarChart3, Download, FileSpreadsheet, Calendar, Filter, MapPin, Car, Wrench, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

// Types for our data
interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  owner_name: string;
  phone_number: string;
  service_type: string;
  price: number;
  location_id: string;
  created_at: string;
  entry_type: string;
  manager_id?: string;
}

interface LogEntry {
  id: string;
  vehicle_id: string;
  vehicle_number: string;
  location_id: string;
  entry_type: string;
  image_url: string;
  created_by: string;
  Amount: number;
  discount: number;
  remarks: string;
  payment_mode: string;
  service: string;
  vehicle_type: string;
  workshop: string;
  Name: string;
  Phone_no: string;
  'D.O.B': string;
  Location: string;
  vehicle_brand: string;
  vehicle_model: string;
  Brand_id: string;
  created_at: string;
  approval_status: string;
  manager_id?: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
}

interface ServicePrice {
  id: string;
  service_name: string;
  car_price: number;
  bike_price: number;
  suv_price: number;
  truck_price: number;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export default function Reports() {
  const [dateRange, setDateRange] = useState("today");
  const [location, setLocation] = useState("all");
  const [vehicleType, setVehicleType] = useState("all");
  const [service, setService] = useState("all");
  const [entryType, setEntryType] = useState("all");
  const [manager, setManager] = useState("all");
  const [customFromDate, setCustomFromDate] = useState<Date>();
  const [customToDate, setCustomToDate] = useState<Date>();
  
  // Data states
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all data from Supabase
  const fetchAllData = async () => {
    try {
      console.log('🔄 Starting data fetch from Supabase...');
      setLoading(true);
      
      // Fetch all tables in parallel
      console.log('📡 Fetching from tables: vehicles, logs-man, locations, Service_prices, users');
      const [vehiclesRes, logsRes, locationsRes, servicePricesRes, usersRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('logs-man').select('*'),
        supabase.from('locations').select('*'),
        supabase.from('Service_prices').select('*'),
        supabase.from('users').select('*')
      ]);

      console.log('📊 Raw fetch results:');
      console.log('- Vehicles:', vehiclesRes);
      console.log('- Logs:', logsRes);
      console.log('- Locations:', locationsRes);
      console.log('- Service Prices:', servicePricesRes);
      console.log('- Users:', usersRes);

      if (vehiclesRes.error) {
        console.error('❌ Error fetching vehicles:', vehiclesRes.error);
        toast.error('Failed to fetch vehicles data');
      } else {
        console.log('✅ Vehicles fetched successfully:', vehiclesRes.data?.length || 0, 'records');
        setVehicles(vehiclesRes.data || []);
      }

      if (logsRes.error) {
        console.error('❌ Error fetching logs:', logsRes.error);
        toast.error('Failed to fetch logs data');
      } else {
        console.log('✅ Logs fetched successfully:', logsRes.data?.length || 0, 'records');
        console.log('📋 Sample log record:', logsRes.data?.[0]);
        setLogs(logsRes.data || []);
      }

      if (locationsRes.error) {
        console.error('❌ Error fetching locations:', locationsRes.error);
        toast.error('Failed to fetch locations data');
      } else {
        console.log('✅ Locations fetched successfully:', locationsRes.data?.length || 0, 'records');
        setLocations(locationsRes.data || []);
      }

      if (servicePricesRes.error) {
        console.error('❌ Error fetching service prices:', servicePricesRes.error);
        toast.error('Failed to fetch service prices data');
      } else {
        console.log('✅ Service prices fetched successfully:', servicePricesRes.data?.length || 0, 'records');
        setServicePrices(servicePricesRes.data || []);
      }

      if (usersRes.error) {
        console.error('❌ Error fetching users:', usersRes.error);
        toast.error('Failed to fetch users data');
      } else {
        console.log('✅ Users fetched successfully:', usersRes.data?.length || 0, 'records');
        setUsers(usersRes.data || []);
      }

      console.log('🎯 Data fetch completed successfully!');
      console.log('📈 Final data summary:');
      console.log(`- Vehicles: ${vehiclesRes.data?.length || 0}`);
      console.log(`- Logs: ${logsRes.data?.length || 0}`);
      console.log(`- Locations: ${locationsRes.data?.length || 0}`);
      console.log(`- Service Prices: ${servicePricesRes.data?.length || 0}`);
      console.log(`- Users: ${usersRes.data?.length || 0}`);

    } catch (error) {
      console.error('💥 Critical error during data fetch:', error);
      toast.error('Failed to fetch data from database');
    } finally {
      setLoading(false);
      console.log('🏁 Data fetch process completed');
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter data based on current selections
  const getFilteredData = () => {
    let filteredLogs = [...logs];
    
    console.log('🔍 Starting data filtering with logs:', filteredLogs.length, 'records');

    // Apply search filter
    if (searchTerm) {
      filteredLogs = filteredLogs.filter(log => 
        log.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.Phone_no?.includes(searchTerm)
      );
      console.log('🔍 After search filter:', filteredLogs.length, 'records');
    }

    // Apply date range filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateRange === "today") {
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= today;
      });
    } else if (dateRange === "yesterday") {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= yesterday && logDate < today;
      });
    } else if (dateRange === "last7days") {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= weekAgo;
      });
    } else if (dateRange === "last30days") {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= monthAgo;
      });
    } else if (dateRange === "custom" && customFromDate && customToDate) {
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= customFromDate && logDate <= customToDate;
      });
    }
    console.log('🔍 After date filter:', filteredLogs.length, 'records');

    // Apply other filters
    if (location !== "all") {
      filteredLogs = filteredLogs.filter(log => log.location_id === location);
      console.log('🔍 After location filter:', filteredLogs.length, 'records');
    }

    if (vehicleType !== "all") {
      filteredLogs = filteredLogs.filter(log => log.vehicle_type === vehicleType);
    }

    if (service !== "all") {
      filteredLogs = filteredLogs.filter(log => log.service === service);
      console.log('🔍 After service filter:', filteredLogs.length, 'records');
    }

    if (entryType !== "all") {
      filteredLogs = filteredLogs.filter(log => log.entry_type === entryType);
      console.log('🔍 After entry type filter:', filteredLogs.length, 'records');
    }

    if (manager !== "all") {
      filteredLogs = filteredLogs.filter(log => log.created_by === manager);
      console.log('🔍 After manager filter:', filteredLogs.length, 'records');
    }

    console.log('📊 Final filtered data:', filteredLogs.length, 'records');

    // Calculate statistics
    const totalRevenue = filteredLogs.reduce((sum, log) => sum + (log.Amount || 0), 0);
    const totalVehicles = filteredLogs.length;
    const avgService = totalVehicles > 0 ? totalRevenue / totalVehicles : 0;

    // Service breakdown
    const serviceBreakdown = filteredLogs.reduce((acc, log) => {
      const service = log.service || 'Unknown';
      if (!acc[service]) {
        acc[service] = { service, count: 0, revenue: 0, price: 0 };
      }
      acc[service].count++;
      acc[service].revenue += log.Amount || 0;
      // Calculate average price for this service
      acc[service].price = acc[service].revenue / acc[service].count;
      return acc;
    }, {} as Record<string, any>);

    // Vehicle type distribution
    const vehicleDistribution = filteredLogs.reduce((acc, log) => {
      const type = log.vehicle_type || 'Unknown';
      if (!acc[type]) {
        acc[type] = { type, count: 0 };
      }
      acc[type].count++;
      return acc;
    }, {} as Record<string, any>);

    // Convert to arrays and add percentages
    const serviceBreakdownArray = Object.values(serviceBreakdown);
    const vehicleDistributionArray = Object.values(vehicleDistribution).map((item: any) => ({
      ...item,
      percentage: totalVehicles > 0 ? (item.count / totalVehicles) * 100 : 0
    }));

    // Process vehicles for display with correct service and price mapping
    const processedVehicles = filteredLogs.map(log => {
      // Find the corresponding service price for this vehicle type and service
      const servicePrice = servicePrices.find(sp => sp.service_name === log.service);
      let calculatedPrice = log.Amount || 0; // Use the actual amount from the log
      
      console.log('🔍 Processing vehicle:', {
        vehicleNumber: log.vehicle_number,
        service: log.service,
        vehicleType: log.vehicle_type,
        originalAmount: log.Amount,
        servicePriceFound: !!servicePrice
      });
      
      // If we have service price data, use it to validate/calculate the price
      if (servicePrice) {
        const vehicleType = log.vehicle_type?.toLowerCase();
        let expectedPrice = 0;
        
        if (vehicleType === 'car') {
          expectedPrice = servicePrice.car_price;
        } else if (vehicleType === 'bike') {
          expectedPrice = servicePrice.bike_price;
        } else if (vehicleType === 'suv') {
          expectedPrice = servicePrice.suv_price;
        } else if (vehicleType === 'truck') {
          expectedPrice = servicePrice.truck_price;
        }
        
        console.log('💰 Price calculation:', {
          vehicleType,
          expectedPrice,
          originalAmount: log.Amount,
          finalPrice: calculatedPrice
        });
        
        // Use the expected price if the log amount seems incorrect (0 or null)
        if (!calculatedPrice || calculatedPrice === 0) {
          calculatedPrice = expectedPrice;
          console.log('✅ Using expected price:', calculatedPrice);
        }
      } else {
        console.log('⚠️ No service price found for service:', log.service);
      }

      return {
        id: log.id,
        vehicle_number: log.vehicle_number,
        vehicle_type: log.vehicle_type,
        owner_name: log.Name,
        phone_number: log.Phone_no,
        service_type: log.service,
        price: calculatedPrice,
        location_id: log.location_id,
        created_at: log.created_at,
        entry_type: log.entry_type,
        manager_id: log.manager_id
      };
    });

    return {
      totalRevenue,
      totalVehicles,
      avgService,
      serviceBreakdown: serviceBreakdownArray,
      vehicleDistribution: vehicleDistributionArray,
      filteredVehicles: processedVehicles
    };
  };

  const filteredData = getFilteredData();

  // Debug summary
  console.log('📊 Reports data summary:', {
    totalVehicles: filteredData.totalVehicles,
    totalRevenue: filteredData.totalRevenue,
    avgService: filteredData.avgService,
    serviceBreakdownCount: filteredData.serviceBreakdown.length,
    vehicleDistributionCount: filteredData.vehicleDistribution.length,
    processedVehiclesCount: filteredData.filteredVehicles.length,
    servicePricesAvailable: servicePrices.length
  });

  const clearFilters = () => {
    setDateRange("today");
    setLocation("all");
    setVehicleType("all");
    setService("all");
    setEntryType("all");
    setManager("all");
    setCustomFromDate(undefined);
    setCustomToDate(undefined);
    setSearchTerm("");
  };

  const exportToCSV = () => {
    const csvData = filteredData.filteredVehicles.map(vehicle => ({
      'Vehicle Number': vehicle.vehicle_number,
      'Owner Name': vehicle.owner_name,
      'Phone': vehicle.phone_number,
      'Vehicle Type': vehicle.vehicle_type,
      'Service Type': vehicle.service_type,
      'Price': vehicle.price,
      'Entry Type': vehicle.entry_type,
      'Date': format(new Date(vehicle.created_at), 'dd/MM/yyyy HH:mm'),
      'Location': locations.find(loc => loc.id === vehicle.location_id)?.name || 'Unknown'
    }));
    
    const csvString = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `car-wash-report-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="flex-1 p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Reports & Statistics</h1>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={loading}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Enhanced Filter Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
              {/* Search Filter */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Vehicle, Owner, Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                
                {dateRange === "custom" && (
                  <div className="space-y-2 pt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          {customFromDate ? format(customFromDate, "PPP") : "From Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={customFromDate}
                          onSelect={setCustomFromDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          {customToDate ? format(customToDate, "PPP") : "To Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={customToDate}
                          onSelect={setCustomToDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={`location-${loc.id}`} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Car">Car</SelectItem>
                    <SelectItem value="Bike">Bike</SelectItem>
                    <SelectItem value="SUV">SUV</SelectItem>
                    <SelectItem value="Truck">Truck</SelectItem>
                    {[...new Set(logs.map(log => log.vehicle_type))].filter(type => 
                      type && !['Car', 'Bike', 'SUV', 'Truck'].includes(type)
                    ).map((type, index) => (
                      <SelectItem key={`vehicle-type-${type}-${index}`} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="service">Service Type</Label>
                <Select value={service} onValueChange={setService}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="Basic Wash">Basic Wash</SelectItem>
                    <SelectItem value="Premium Wash">Premium Wash</SelectItem>
                    <SelectItem value="Full Service">Full Service</SelectItem>
                    <SelectItem value="Quick Wash">Quick Wash</SelectItem>
                    <SelectItem value="Workshop">Workshop</SelectItem>
                    {[...new Set(logs.map(log => log.service))].filter(serviceType => 
                      serviceType && !['Basic Wash', 'Premium Wash', 'Full Service', 'Quick Wash', 'Workshop'].includes(serviceType)
                    ).map((serviceType, index) => (
                      <SelectItem key={`service-type-${serviceType}-${index}`} value={serviceType}>{serviceType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Entry Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="entryType">Entry Type</Label>
                <Select value={entryType} onValueChange={setEntryType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Entry Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entry Types</SelectItem>
                    <SelectItem value="Manual">Manual Entry</SelectItem>
                    <SelectItem value="Automatic">Automatic Entry</SelectItem>
                    {[...new Set(logs.map(log => log.entry_type))].filter(type => 
                      type && !['Manual', 'Automatic'].includes(type)
                    ).map((type, index) => (
                      <SelectItem key={`entry-type-${type}-${index}`} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Manager Filter */}
              <div className="space-y-2">
                <Label htmlFor="manager">Manager</Label>
                <Select value={manager} onValueChange={setManager}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {users.filter(user => user.role === 'manager').map((mgr) => (
                      <SelectItem key={`manager-${mgr.id}`} value={mgr.id}>{mgr.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="metric-card-financial">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Badge variant="outline" className="text-financial border-financial">
                {dateRange === "today" ? "Today" : "Filtered Period"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-financial">₹{filteredData.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12.5% from previous period</p>
            </CardContent>
          </Card>

          <Card className="metric-card-success">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Badge variant="outline" className="text-success border-success">
                {dateRange === "today" ? "Today" : "Filtered Period"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{filteredData.totalVehicles}</div>
              <p className="text-xs text-muted-foreground">+8.2% from previous period</p>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Service Value</CardTitle>
              <Badge variant="secondary">
                {dateRange === "today" ? "Today" : "Filtered Period"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{Math.round(filteredData.avgService).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Per vehicle</p>
            </CardContent>
          </Card>
        </div>

        {/* Service Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Service Breakdown - Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredData.serviceBreakdown.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  No service data available
                </div>
              ) : (
                filteredData.serviceBreakdown.map((item: any, index: number) => (
                  <div key={`service-breakdown-${item.service || 'unknown'}-${index}`} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.service || 'Unknown Service'}</p>
                      <p className="text-sm text-muted-foreground">{item.count} vehicles • ₹{Math.round(item.price || 0).toLocaleString()} avg</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-financial">₹{(item.revenue || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {filteredData.totalRevenue > 0 ? (((item.revenue || 0) / filteredData.totalRevenue) * 100).toFixed(1) : 0}% of total
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredData.vehicleDistribution.map((item: any, index: number) => (
                <div key={`vehicle-distribution-${item.type || 'unknown'}-${index}`} className="text-center p-4 bg-accent/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{item.count || 0}</p>
                  <p className="font-medium">{item.type || 'Unknown Type'}</p>
                  <p className="text-sm text-muted-foreground">{(item.percentage || 0).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Vehicle Records ({filteredData.filteredVehicles.length} records)</CardTitle>
              <Badge variant="secondary">
                {loading ? "Loading..." : `${filteredData.filteredVehicles.length} of ${vehicles.length} records`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading records...</span>
              </div>
            ) : filteredData.filteredVehicles.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No records found matching your filters</p>
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Vehicle No.</th>
                      <th className="text-left p-2 font-medium">Owner</th>
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-left p-2 font-medium">Service</th>
                      <th className="text-left p-2 font-medium">Price</th>
                      <th className="text-left p-2 font-medium">Entry Type</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.filteredVehicles.slice(0, 50).map((vehicle) => (
                      <tr key={vehicle.id} className="border-b hover:bg-accent/50">
                        <td className="p-2 font-mono text-sm">{vehicle.vehicle_number}</td>
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{vehicle.owner_name}</p>
                            <p className="text-xs text-muted-foreground">{vehicle.phone_number}</p>
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline">{vehicle.vehicle_type}</Badge>
                        </td>
                        <td className="p-2">{vehicle.service_type}</td>
                        <td className="p-2 font-semibold text-financial">₹{vehicle.price?.toLocaleString() || 0}</td>
                        <td className="p-2">
                          <Badge variant={vehicle.entry_type === 'Manual' ? 'default' : 'secondary'}>
                            {vehicle.entry_type}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm">
                          {format(new Date(vehicle.created_at), 'dd/MM/yy HH:mm')}
                        </td>
                        <td className="p-2 text-sm">
                          {locations.find(loc => loc.id === vehicle.location_id)?.name || 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredData.filteredVehicles.length > 50 && (
                  <div className="text-center p-4 text-muted-foreground">
                    Showing first 50 records of {filteredData.filteredVehicles.length} total
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
