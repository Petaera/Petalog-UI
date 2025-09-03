
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
import { useAuth } from '@/contexts/AuthContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Switch } from "@/components/ui/switch";
// Types for our data
interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  vehicle_model: string;
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
  upi_account_name?: string; // Added for UPI breakdown
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

export default function Reports({ selectedLocation }: { selectedLocation?: string }) {
  const { user, loading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState("today");
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
// Switch between list and pie chart view for service breakdown
const [serviceBreakdownView, setServiceBreakdownView] = useState<"list" | "pie">("list");
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
        String(log.Phone_no || '').includes(searchTerm)
      );
      console.log('🔍 After search filter:', filteredLogs.length, 'records');
    }

// Apply date range filter
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

if (dateRange === "today") {
  filteredLogs = filteredLogs.filter(log => {
    const logDate = new Date(log.created_at);
    const logDateOnly = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
    return logDateOnly.getTime() === today.getTime();
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

} else if (dateRange === "singleday" && customFromDate) {
  // ✅ Single day (from = to = selected date)
  const singleDay = new Date(customFromDate.getFullYear(), customFromDate.getMonth(), customFromDate.getDate());
  const nextDay = new Date(singleDay.getTime() + 24 * 60 * 60 * 1000);

  filteredLogs = filteredLogs.filter(log => {
    const logDate = new Date(log.created_at);
    return logDate >= singleDay && logDate < nextDay;
  });

} else if (dateRange === "custom" && (customFromDate || customToDate)) {
  // ✅ Custom range (support partial selection too)
  const from = customFromDate 
    ? new Date(customFromDate.getFullYear(), customFromDate.getMonth(), customFromDate.getDate()) 
    : null;
  const to = customToDate 
    ? new Date(customToDate.getFullYear(), customToDate.getMonth(), customToDate.getDate()) 
    : null;

  filteredLogs = filteredLogs.filter(log => {
    const logDate = new Date(log.created_at);

    if (from && to) {
      return logDate >= from && logDate <= to;
    } else if (from) {
      const nextDay = new Date(from.getTime() + 24 * 60 * 60 * 1000);
      return logDate >= from && logDate < nextDay;
    } else if (to) {
      const prevDay = new Date(to.getTime() - 24 * 60 * 60 * 1000);
      return logDate >= prevDay && logDate <= to;
    }
    return true;
  });
}

console.log("🔍 After date filter:", filteredLogs.length, "records");
    // Apply other filters
    // Get the current location from the toolbar context
    const currentLocation = user?.role === 'manager' ? user?.assigned_location : 
                          (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
    
    if (currentLocation) {
      filteredLogs = filteredLogs.filter(log => log.location_id === currentLocation);
      console.log('🔍 After location filter:', filteredLogs.length, 'records');
    }

         // Only count approved/closed tickets for revenue calculations (including Pay Later/credit for display)
     filteredLogs = filteredLogs.filter(log => 
       log.approval_status === 'approved'
     );
     console.log('🔍 After approval status filter (only approved/closed tickets):', filteredLogs.length, 'records');

    if (vehicleType !== "all") {
      filteredLogs = filteredLogs.filter(log => {
        const normalizedLogType = (log.vehicle_type || '').toString().trim();
        const normalizedFilterType = vehicleType.trim();
        return normalizedLogType.toLowerCase() === normalizedFilterType.toLowerCase();
      });
      console.log('🔍 After vehicle type filter:', filteredLogs.length, 'records');
    }

    if (service !== "all") {
      filteredLogs = filteredLogs.filter(log => {
        const normalizedLogService = (log.service || '').toString().trim();
        const normalizedFilterService = service.trim();
        return normalizedLogService.toLowerCase() === normalizedFilterService.toLowerCase();
      });
      console.log('🔍 After service filter:', filteredLogs.length, 'records');
    }

    if (entryType !== "all") {
      filteredLogs = filteredLogs.filter(log => {
        const normalizedLogEntry = (log.entry_type || '').toString().trim();
        const normalizedFilterEntry = entryType.trim();
        return normalizedLogEntry.toLowerCase() === normalizedFilterEntry.toLowerCase();
      });
      console.log('🔍 After entry type filter:', filteredLogs.length, 'records');
    }

    if (manager !== "all") {
      filteredLogs = filteredLogs.filter(log => log.created_by === manager);
      console.log('🔍 After manager filter:', filteredLogs.length, 'records');
    }

         console.log('📊 Final filtered data:', filteredLogs.length, 'records');
     
     // Debug: Log all unique payment modes found
     const uniquePaymentModes = [...new Set(filteredLogs.map(log => log.payment_mode))];
     console.log('🔍 Unique payment modes found:', uniquePaymentModes);

    // Calculate statistics
    const totalRevenue = filteredLogs.reduce((sum, log) => sum + (log.Amount || 0), 0);
    const totalVehicles = filteredLogs.length;
    const avgService = totalVehicles > 0 ? totalRevenue / totalVehicles : 0;

         // Payment mode breakdown
     const paymentModeBreakdown = filteredLogs.reduce((acc, log) => {
       const paymentMode = log.payment_mode || 'Cash';
       const normalizedMode = paymentMode.toLowerCase();
       
       // Debug logging for payment modes
       console.log('🔍 Processing payment mode:', {
         original: paymentMode,
         normalized: normalizedMode,
         amount: log.Amount,
         vehicleNumber: log.vehicle_number
       });
       
       if (!acc[normalizedMode]) {
         acc[normalizedMode] = { 
           mode: paymentMode, // Keep original case for display
           count: 0, 
           revenue: 0,
           upiAccounts: {} // For UPI breakdown by account
         };
       }
       
       acc[normalizedMode].count++;
       acc[normalizedMode].revenue += log.Amount || 0;
       
       // If it's UPI, track by account
       if (normalizedMode === 'upi' && log.upi_account_name) {
         const accountName = log.upi_account_name;
         if (!acc[normalizedMode].upiAccounts[accountName]) {
           acc[normalizedMode].upiAccounts[accountName] = { count: 0, revenue: 0 };
         }
         acc[normalizedMode].upiAccounts[accountName].count++;
         acc[normalizedMode].upiAccounts[accountName].revenue += log.Amount || 0;
       }
       
       return acc;
     }, {} as Record<string, any>);
     
     // Debug logging for final breakdown
     console.log('📊 Final payment mode breakdown:', paymentModeBreakdown);

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
    const paymentModeBreakdownArray = Object.values(paymentModeBreakdown).map((item: any) => ({
      ...item,
      percentage: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0
    }));
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
        vehicle_model: log.vehicle_model,
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
      paymentModeBreakdown: paymentModeBreakdownArray,
      serviceBreakdown: serviceBreakdownArray,
      vehicleDistribution: vehicleDistributionArray,
      filteredVehicles: processedVehicles
    };
  };

  const filteredData = getFilteredData();



  const clearFilters = () => {
    setDateRange("today");
    setVehicleType("all");
    setService("all");
    setEntryType("all");
    setManager("all");
    setCustomFromDate(undefined);
    setCustomToDate(undefined);
    setSearchTerm("");
  };

  const exportToCSV = () => {
    const csvData = filteredData.filteredVehicles.map(vehicle => {
      // Find the corresponding log entry to get payment mode and UPI account info
      const logEntry = logs.find(log => log.id === vehicle.id);
      return {
        'Vehicle Number': vehicle.vehicle_number,
        'Owner Name': vehicle.owner_name,
        'Phone': vehicle.phone_number,
        'Vehicle Model': vehicle.vehicle_model || 'N/A',
        'Service Type': vehicle.service_type,
        'Price': vehicle.price,
        'Payment Mode': logEntry?.payment_mode || 'Cash',
        'UPI Account': logEntry?.upi_account_name || 'N/A',
        'Entry Type': vehicle.entry_type,
        'Date': format(new Date(vehicle.created_at), 'dd/MM/yyyy HH:mm'),
        'Location': locations.find(loc => loc.id === vehicle.location_id)?.name || 'Unknown'
      };
    });
    
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

  const exportPaymentBreakdown = () => {
    const breakdownData = filteredData.paymentModeBreakdown.map(item => ({
      'Payment Mode': item.mode,
      'Total Revenue': item.revenue,
      'Vehicle Count': item.count,
      'Percentage of Total': `${item.percentage.toFixed(1)}%`,
      'UPI Accounts': item.mode?.toLowerCase() === 'upi' && Object.keys(item.upiAccounts || {}).length > 0 
        ? Object.entries(item.upiAccounts).map(([accountName, accountData]: [string, any]) => 
            `${accountName}: ₹${accountData.revenue} (${accountData.count} vehicles)`
          ).join('; ')
        : 'N/A'
    }));
    
    const csvString = [
      Object.keys(breakdownData[0] || {}).join(','),
      ...breakdownData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-breakdown-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Check if owner has no location selected
  const isOwner = user?.role === 'owner';
  const hasNoLocation = isOwner && (!selectedLocation || selectedLocation.trim() === '');

  if (hasNoLocation) {
    return (
      <div className="flex-1 p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Reports & Statistics</h1>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Location Selected</h2>
          <p className="text-gray-600 mb-4 max-w-md">
            Please select a location from the dropdown above to view reports and statistics.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Reports are location-specific and require a location to be selected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
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
          <Button variant="outline" size="sm" onClick={exportPaymentBreakdown} disabled={loading}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Payment Breakdown
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
       <div className="space-y-3">
         <Label className="flex items-center gap-2 text-sm font-medium">
           <Calendar className="h-4 w-4" />
           Date Range
         </Label>
         
         {/* Date Range Selector */}
         <Select value={dateRange} onValueChange={setDateRange}>
           <SelectTrigger className="w-full">
             <SelectValue placeholder="Select date range" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="today">Today</SelectItem>
             <SelectItem value="yesterday">Yesterday</SelectItem>
             <SelectItem value="singleday">Single Day</SelectItem>
             <SelectItem value="last7days">Last 7 Days</SelectItem>
             <SelectItem value="last30days">Last 30 Days</SelectItem>
             <SelectItem value="custom">Custom Range</SelectItem>
           </SelectContent>
         </Select>

        {/* Single Day Selection */}
        {dateRange === "singleday" && (
          <div className="space-y-2 pt-2 p-3 bg-muted/30 rounded-lg border">
            <Label className="text-xs font-medium text-muted-foreground">Select a specific date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  {customFromDate ? (
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(customFromDate, "PPP")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Pick a Date
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={customFromDate}
                  onSelect={(date) => {
                    setCustomFromDate(date);
                    setCustomToDate(date); // ✅ treat as single-day (from = to)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {customFromDate && (
              <div className="text-xs text-muted-foreground">
                Showing data for: <span className="font-medium">{format(customFromDate, "PPP")}</span>
              </div>
            )}
          </div>
        )}

        {/* Custom Range Selection */}
        {dateRange === "custom" && (
          <div className="space-y-2 pt-2 p-3 bg-muted/30 rounded-lg border">
            <Label className="text-xs font-medium text-muted-foreground">Select date range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    {customFromDate ? (
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(customFromDate, "PPP")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        From Date
                      </span>
                    )}
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
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    {customToDate ? (
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(customToDate, "PPP")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        To Date
                      </span>
                    )}
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
            {(customFromDate || customToDate) && (
              <div className="text-xs text-muted-foreground">
                {customFromDate && customToDate ? (
                  <>Showing data from <span className="font-medium">{format(customFromDate, "PPP")}</span> to <span className="font-medium">{format(customToDate, "PPP")}</span></>
                ) : customFromDate ? (
                  <>Showing data from <span className="font-medium">{format(customFromDate, "PPP")}</span></>
                ) : (
                  <>Showing data until <span className="font-medium">{format(customToDate, "PPP")}</span></>
                )}
              </div>
            )}
          </div>
        )}

        {/* Clear Filters Button */}
        {(dateRange !== "today" || customFromDate || customToDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateRange("today");
              setCustomFromDate(undefined);
              setCustomToDate(undefined);
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Reset to Today
          </Button>
        )}
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
                  {(() => {
                    // Get unique vehicle types with proper normalization
                    const standardTypes = ['Car', 'Bike', 'SUV', 'Truck'];
                    const uniqueTypes = [...new Set(
                      logs
                        .map(log => log.vehicle_type)
                        .filter(type => type && typeof type === 'string')
                        .map(type => type.trim()) // Remove whitespace
                        .filter(type => type.length > 0)
                    )]
                      .filter(type => !standardTypes.some(std => std.toLowerCase() === type.toLowerCase()))
                      .sort(); // Sort alphabetically
                    
                    return uniqueTypes.map((type, index) => (
                      <SelectItem key={`vehicle-type-${type}-${index}`} value={type}>{type}</SelectItem>
                    ));
                  })()}
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
                  {(() => {
                    // Get unique service types with proper normalization
                    const standardServices = ['Basic Wash', 'Premium Wash', 'Full Service', 'Quick Wash', 'Workshop'];
                    const uniqueServices = [...new Set(
                      logs
                        .map(log => log.service)
                        .filter(service => service && typeof service === 'string')
                        .map(service => service.trim()) // Remove whitespace
                        .filter(service => service.length > 0)
                    )]
                      .filter(service => !standardServices.some(std => std.toLowerCase() === service.toLowerCase()))
                      .sort(); // Sort alphabetically
                    
                    return uniqueServices.map((service, index) => (
                      <SelectItem key={`service-type-${service}-${index}`} value={service}>{service}</SelectItem>
                    ));
                  })()}
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
                  {(() => {
                    // Get unique entry types with proper normalization
                    const standardTypes = ['Manual', 'Automatic'];
                    const uniqueTypes = [...new Set(
                      logs
                        .map(log => log.entry_type)
                        .filter(type => type && typeof type === 'string')
                        .map(type => type.trim()) // Remove whitespace
                        .filter(type => type.length > 0)
                    )]
                      .filter(type => !standardTypes.some(std => std.toLowerCase() === type.toLowerCase()))
                      .sort(); // Sort alphabetically
                    
                    return uniqueTypes.map((type, index) => (
                      <SelectItem key={`entry-type-${type}-${index}`} value={type}>{type}</SelectItem>
                    ));
                  })()}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Today's Collection - Commented out
        <Card className="metric-card-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Collection</CardTitle>
            <Badge variant="outline" className="text-warning border-warning">
              Today Only
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              ₹{(() => {
                const todayLogs = logs.filter(log => {
                  const logDate = new Date(log.created_at);
                  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                  const logDateOnly = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
                  return logDateOnly.getTime() === today.getTime() && log.approval_status === 'approved';
                });
                return todayLogs.reduce((sum, log) => sum + (log.Amount || 0), 0).toLocaleString();
              })()}
            </div>
            <p className="text-xs text-muted-foreground">Today's total collection</p>
          </CardContent>
        </Card>
        */}
      </div>



             {/* Payment Mode Breakdown */}
       <Card>
         <CardHeader>
           <CardTitle>Payment Mode Breakdown</CardTitle>
         </CardHeader>
                   <CardContent>
          <div className="space-y-4">
            {filteredData.paymentModeBreakdown.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                No payment mode data available
              </div>
            ) : (
              filteredData.paymentModeBreakdown.map((item: any, index: number) => (
                <div key={`payment-mode-breakdown-${item.mode || 'unknown'}-${index}`} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.mode || 'Unknown Mode'}</p>
                    <p className="text-sm text-muted-foreground">{item.count} vehicles • ₹{Math.round(item.revenue || 0).toLocaleString()} avg</p>
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

      {/* UPI Account Breakdown - Only show if there are UPI payments */}
      {filteredData.paymentModeBreakdown.some((item: any) => item.mode?.toLowerCase() === 'upi' && Object.keys(item.upiAccounts || {}).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>UPI Account Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredData.paymentModeBreakdown
                .filter((item: any) => item.mode?.toLowerCase() === 'upi')
                .map((upiItem: any) => 
                  Object.entries(upiItem.upiAccounts || {}).map(([accountName, accountData]: [string, any]) => (
                    <div key={`upi-account-${accountName}`} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div>
                        <p className="font-medium text-blue-900">{accountName}</p>
                        <p className="text-sm text-blue-700">{accountData.count} vehicles • ₹{Math.round(accountData.revenue / accountData.count || 0).toLocaleString()} avg</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-900">₹{(accountData.revenue || 0).toLocaleString()}</p>
                        <p className="text-xs text-blue-700">
                          {upiItem.revenue > 0 ? (((accountData.revenue || 0) / upiItem.revenue) * 100).toFixed(1) : 0}% of UPI total
                        </p>
                      </div>
                    </div>
                  ))
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Mode Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredData.paymentModeBreakdown.map((item: any) => (
          <Card key={`payment-summary-${item.mode}`} className="border-2 border-accent/20">
            <CardHeader className="pb-3">
                                                                                       <CardTitle className="text-lg flex items-center gap-2">
                   {(item.mode === 'Cash' || item.mode?.toLowerCase() === 'cash') && <span className="text-green-600">💵</span>}
                   {(item.mode === 'UPI' || item.mode?.toLowerCase() === 'upi') && <span className="text-blue-600">📱</span>}
                   {(item.mode === 'Credit' || item.mode?.toLowerCase() === 'credit') && <span className="text-orange-600">💳</span>}
                   {item.mode}
                 </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">₹{item.revenue.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Vehicles:</span>
                <span className="font-semibold">{item.count}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Percentage:</span>
                <span className="font-semibold text-primary">{item.percentage.toFixed(1)}%</span>
              </div>
              
              {item.mode?.toLowerCase() === 'upi' && Object.keys(item.upiAccounts || {}).length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">UPI Accounts:</p>
                  {Object.entries(item.upiAccounts).map(([accountName, accountData]: [string, any]) => (
                    <div key={accountName} className="flex items-center justify-between text-xs py-1">
                      <span className="truncate">{accountName}</span>
                      <span className="font-medium">₹{accountData.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service Breakdown */}
      <Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle>Service Breakdown - Filtered Results</CardTitle>
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">List</span>
      <Switch
        checked={serviceBreakdownView === "pie"}
        onCheckedChange={(checked) => setServiceBreakdownView(checked ? "pie" : "list")}
        aria-label="Toggle Service Breakdown View"
      />
      <span className="text-xs font-medium text-muted-foreground">Pie Chart</span>
    </div>
  </CardHeader>
  <CardContent>
    {filteredData.serviceBreakdown.length === 0 ? (
      <div className="text-center p-4 text-muted-foreground">
        No service data available
      </div>
    ) : serviceBreakdownView === "pie" ? (
      <div className="w-full flex flex-col md:flex-row items-center justify-center gap-4">
        <div className="w-full md:w-1/2 min-w-[220px] h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filteredData.serviceBreakdown}
                dataKey="revenue"
                nameKey="service"
                cx="50%"
                cy="50%"
                outerRadius="80%"
                innerRadius="45%"
                label={({ service, revenue, percentage }) =>
                  `${service?.length > 12 ? service.slice(0, 12) + '…' : service || 'Unknown'}`
                }
                labelLine={false}
                minAngle={10}
              >
                {filteredData.serviceBreakdown.map((entry: any, idx: number) => {
                  const COLORS = [
                    "#6366f1", "#22d3ee", "#f59e42", "#10b981",
                    "#f43f5e", "#a21caf", "#fbbf24", "#64748b"
                  ];
                  return (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  );
                })}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) =>
                  [
                    `₹${value.toLocaleString()} revenue`,
                    props.payload.service || 'Unknown'
                  ]
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend/Breakdown: right on desktop, bottom on mobile */}
        <div className="w-full md:w-1/2">
          <div className="space-y-2 md:ml-6 flex flex-col md:block">
            {/* On mobile, show below chart; on desktop, show on right */}
            {filteredData.serviceBreakdown.map((item: any, idx: number) => (
              <div
                key={`service-pie-legend-${item.service || 'unknown'}-${idx}`}
                className="flex items-center gap-3"
              >
                <span
                  className="inline-block w-4 h-4 rounded"
                  style={{
                    backgroundColor: [
                      "#6366f1", "#22d3ee", "#f59e42", "#10b981",
                      "#f43f5e", "#a21caf", "#fbbf24", "#64748b"
                    ][idx % 8]
                  }}
                />
                <span className="font-medium truncate max-w-[100px] md:max-w-[160px]">
                  {item.service || 'Unknown'}
                </span>
                <span className="ml-auto text-primary font-bold">{item.count}</span>
                <span className="ml-2 text-muted-foreground text-sm">
                  {filteredData.totalRevenue > 0 ? (((item.revenue || 0) / filteredData.totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-4">
        {filteredData.serviceBreakdown.map((item: any, index: number) => (
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
        ))}
      </div>
    )}
  </CardContent>
</Card>
      {/* Before the update on 03/09/2025 pushed by vishnu */}
      {/* <Card>
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
      </Card> */}

      {/* Vehicle Type Distribution */}
      



<Card>
  <CardHeader>
    <CardTitle>Vehicle Type Distribution</CardTitle>
  </CardHeader>
  <CardContent>
    {filteredData.vehicleDistribution.length === 0 ? (
      <div className="text-center p-4 text-muted-foreground">
        No vehicle type data available
      </div>
    ) : (
      <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8">
        <div className="w-full md:w-1/2 min-w-[220px] h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filteredData.vehicleDistribution}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius="80%"
                innerRadius="45%"
                label={({ type, percentage }) =>
                  `${type?.length > 12 ? type.slice(0, 12) + '…' : type || 'Unknown'} (${percentage.toFixed(1)}%)`
                }
                labelLine={false}
                minAngle={10}
              >
                {filteredData.vehicleDistribution.map((entry: any, idx: number) => {
                  const COLORS = [
                    "#6366f1", "#22d3ee", "#f59e42", "#10b981",
                    "#f43f5e", "#a21caf", "#fbbf24", "#64748b"
                  ];
                  return (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  );
                })}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) =>
                  [`${value} vehicles`, props.payload.type || 'Unknown']
                }
              />
              {/* Legend removed as per request */}
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 space-y-2">
          {filteredData.vehicleDistribution.map((item: any, idx: number) => (
            <div
              key={`vehicle-distribution-legend-${item.type || 'unknown'}-${idx}`}
              className="flex items-center gap-3"
            >
              <span
                className="inline-block w-4 h-4 rounded"
                style={{
                  backgroundColor: [
                    "#6366f1", "#22d3ee", "#f59e42", "#10b981",
                    "#f43f5e", "#a21caf", "#fbbf24", "#64748b"
                  ][idx % 8]
                }}
              />
              <span className="font-medium truncate max-w-[100px] md:max-w-[160px]">
                {item.type || 'Unknown Type'}
              </span>
              <span className="ml-auto text-primary font-bold">{item.count}</span>
              <span className="ml-2 text-muted-foreground text-sm">{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    )}
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
                    <th className="text-left p-2 font-medium">Model</th>
                    <th className="text-left p-2 font-medium">Service</th>
                    <th className="text-left p-2 font-medium">Amount</th>
                    <th className="text-left p-2 font-medium">Owner</th>
                    {/* <th className="text-left p-2 font-medium">Entry Type</th> */}
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-left p-2 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.filteredVehicles.slice(0, 50).map((vehicle) => (
                    <tr key={vehicle.id} className="border-b hover:bg-accent/50">
                      <td className="p-2 font-mono text-sm">{vehicle.vehicle_number}</td>
                      
                      <td className="p-2">
                        <Badge variant="outline">{vehicle.vehicle_model || 'N/A'}</Badge>
                      </td>
                      <td className="p-2">{vehicle.service_type}</td>
                      <td className="p-2 font-semibold text-financial">
                        {/* Amount */}
                        {vehicle.price && vehicle.price > 0 ? `₹${vehicle.price.toLocaleString()}` : "-"}
                        {/* Payment Method & UPI Account */}
                        <div className="mt-1 text-xs text-muted-foreground font-normal">
                          Payment: {(() => {
                            // Find the corresponding log entry for payment info
                            const logEntry = logs.find(log => log.id === vehicle.id);
                            if (!logEntry) return "-";
                            const mode = logEntry.payment_mode ? logEntry.payment_mode.toUpperCase() : "-";
                            if (logEntry.payment_mode === "upi" && logEntry.upi_account_name) {
                              return (
                                <>
                                  {mode} <span className="font-medium">{logEntry.upi_account_name}</span>
                                </>
                              );
                            }
                            return mode;
                          })()}
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{vehicle.owner_name}</p>
                          <p className="text-xs text-muted-foreground">{vehicle.phone_number}</p>
                        </div>
                      </td>
                      <td className="p-2 text-sm">
                        {format(new Date(vehicle.created_at), 'dd/MM/yy hh:mm a')}
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
  );
}
