
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
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, LabelList, CartesianGrid} from 'recharts';
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
  const navigate = useNavigate();
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
  const [comparisonLogs, setComparisonLogs] = useState<LogEntry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [servicePriceOptions, setServicePriceOptions] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");



  // Fetch filtered data from Supabase based on current filters
  const fetchFilteredData = async () => {
    try {
      console.log('🔄 Starting filtered data fetch from Supabase...');
      setLoading(true);

      // Build the logs query with filters applied at database level
      let logsQuery = supabase.from('logs-man').select('*');

      // Apply approval status filter (only approved logs for reports)
      logsQuery = logsQuery.eq('approval_status', 'approved');

      // Apply location filter
      const currentLocation = user?.role === 'manager' ? user?.assigned_location :
        (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
      
      if (currentLocation) {
        logsQuery = logsQuery.eq('location_id', currentLocation);
      }

      // Apply date range filter
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateRange === "today") {
        const startOfDay = new Date(today).toISOString();
        const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
        logsQuery = logsQuery.gte('created_at', startOfDay).lt('created_at', endOfDay);
      } else if (dateRange === "yesterday") {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const startOfYesterday = yesterday.toISOString();
        const endOfYesterday = today.toISOString();
        logsQuery = logsQuery.gte('created_at', startOfYesterday).lt('created_at', endOfYesterday);
      } else if (dateRange === "last7days") {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        logsQuery = logsQuery.gte('created_at', weekAgo.toISOString());
      } else if (dateRange === "last30days") {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        logsQuery = logsQuery.gte('created_at', monthAgo.toISOString());
      } else if (dateRange === "singleday" && customFromDate) {
        const singleDay = new Date(customFromDate.getFullYear(), customFromDate.getMonth(), customFromDate.getDate());
        const startOfDay = singleDay.toISOString();
        const endOfDay = new Date(singleDay.getTime() + 24 * 60 * 60 * 1000).toISOString();
        logsQuery = logsQuery.gte('created_at', startOfDay).lt('created_at', endOfDay);
      } else if (dateRange === "custom" && (customFromDate || customToDate)) {
        if (customFromDate) {
          const from = new Date(customFromDate.getFullYear(), customFromDate.getMonth(), customFromDate.getDate());
          logsQuery = logsQuery.gte('created_at', from.toISOString());
        }
        if (customToDate) {
          const to = new Date(customToDate.getFullYear(), customToDate.getMonth(), customToDate.getDate());
          const nextDay = new Date(to.getTime() + 24 * 60 * 60 * 1000);
          logsQuery = logsQuery.lt('created_at', nextDay.toISOString());
        }
      }

      // Apply vehicle type filter
      if (vehicleType !== "all") {
        logsQuery = logsQuery.ilike('vehicle_type', vehicleType);
      }

      // Apply service filter
      if (service !== "all") {
        logsQuery = logsQuery.ilike('service', service);
      }

      // Apply entry type filter
      if (entryType !== "all") {
        logsQuery = logsQuery.ilike('entry_type', entryType);
      }

      // Apply manager filter
      if (manager !== "all") {
        logsQuery = logsQuery.eq('created_by', manager);
      }

      // Apply search filter (if any)
      if (debouncedSearchTerm) {
        logsQuery = logsQuery.or(`vehicle_number.ilike.%${debouncedSearchTerm}%,Name.ilike.%${debouncedSearchTerm}%,Phone_no.ilike.%${debouncedSearchTerm}%`);
      }

      // Fetch filtered logs and other required data in parallel
      console.log('📡 Fetching filtered data from Supabase...');
      const [logsRes, vehiclesRes, locationsRes, servicePricesRes, usersRes] = await Promise.all([
        logsQuery,
        supabase.from('vehicles').select('*'),
        supabase.from('locations').select('*'),
        supabase.from('Service_prices').select('*'),
        supabase.from('users').select('*')
      ]);

      console.log('📊 Filtered fetch results:');
      console.log('- Logs:', logsRes);
      console.log('- Vehicles:', vehiclesRes);
      console.log('- Locations:', locationsRes);
      console.log('- Service Prices:', servicePricesRes);
      console.log('- Users:', usersRes);

      if (logsRes.error) {
        console.error('❌ Error fetching filtered logs:', logsRes.error);
        toast.error('Failed to fetch logs data');
      } else {
        console.log('✅ Filtered logs fetched successfully:', logsRes.data?.length || 0, 'records');
        setLogs(logsRes.data || []);
      }

      if (vehiclesRes.error) {
        console.error('❌ Error fetching vehicles:', vehiclesRes.error);
        toast.error('Failed to fetch vehicles data');
      } else {
        console.log('✅ Vehicles fetched successfully:', vehiclesRes.data?.length || 0, 'records');
        setVehicles(vehiclesRes.data || []);
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
        setServicePriceOptions(servicePricesRes.data || []);
      }

      if (usersRes.error) {
        console.error('❌ Error fetching users:', usersRes.error);
        toast.error('Failed to fetch users data');
      } else {
        console.log('✅ Users fetched successfully:', usersRes.data?.length || 0, 'records');
        setUsers(usersRes.data || []);
      }

      console.log('🎯 Filtered data fetch completed successfully!');
      console.log('📈 Final data summary:');
      console.log(`- Filtered Logs: ${logsRes.data?.length || 0}`);
      console.log(`- Vehicles: ${vehiclesRes.data?.length || 0}`);
      console.log(`- Locations: ${locationsRes.data?.length || 0}`);
      console.log(`- Service Prices: ${servicePricesRes.data?.length || 0}`);
      console.log(`- Users: ${usersRes.data?.length || 0}`);

    } catch (error) {
      console.error('💥 Critical error during filtered data fetch:', error);
      toast.error('Failed to fetch data from database');
    } finally {
      setLoading(false);
      console.log('🏁 Filtered data fetch process completed');
    }
  };
  // Switch between list and pie chart view for service breakdown
  const [serviceBreakdownView, setServiceBreakdownView] = useState<"list" | "pie">("list");

  const [pendingLogs, setPendingLogs] = useState([]);
  const [showSingleDayCalendar, setShowSingleDayCalendar] = useState(false);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Auto-fetch filtered data on mount and when filters change
  useEffect(() => {
    if (!authLoading) {
      fetchFilteredData();
    }
  }, [authLoading, selectedLocation, dateRange, vehicleType, service, entryType, manager, customFromDate, customToDate, debouncedSearchTerm, user?.assigned_location, user?.role]);

  // Fetch a superset of logs for comparison (yesterday/last week/previous period)
  useEffect(() => {
    if (authLoading) return;
    const fetchComparisonLogs = async () => {
      try {
        let query = supabase.from('logs-man').select('*');

        // Always approved for comparisons
        query = query.eq('approval_status', 'approved');

        // Location filter
        const currentLocation = user?.role === 'manager' ? user?.assigned_location : (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
        if (currentLocation) {
          query = query.eq('location_id', currentLocation);
        }

        // Other filters (same as comparisons use, excluding search term)
        if (vehicleType !== 'all') {
          query = query.ilike('vehicle_type', vehicleType);
        }
        if (service !== 'all') {
          query = query.ilike('service', service);
        }
        if (entryType !== 'all') {
          query = query.ilike('entry_type', entryType);
        }
        if (manager !== 'all') {
          query = query.eq('created_by', manager);
        }

        // Date window that covers current and previous comparison periods
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateRange === 'today') {
          const start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const end = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', start).lt('created_at', end);
        } else if (dateRange === 'yesterday') {
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
          const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 7).toISOString();
          const end = today.toISOString();
          query = query.gte('created_at', start).lt('created_at', end);
        } else if (dateRange === 'singleday' && customFromDate) {
          const single = new Date(customFromDate.getFullYear(), customFromDate.getMonth(), customFromDate.getDate());
          const start = new Date(single.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const end = new Date(single.getTime() + 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', start).lt('created_at', end);
        } else if (dateRange === 'last7days' || dateRange === 'last30days' || (dateRange === 'custom' && customFromDate && customToDate)) {
          let rangeDays = dateRange === 'last30days' ? 30 : 7;
          let periodStart: Date;
          let periodEnd: Date;
          if (dateRange === 'custom' && customFromDate && customToDate) {
            periodStart = new Date(customFromDate.getFullYear(), customFromDate.getMonth(), customFromDate.getDate());
            periodEnd = new Date(customToDate.getFullYear(), customToDate.getMonth(), customToDate.getDate() + 1);
            rangeDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000));
          } else {
            periodEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            periodStart = new Date(periodEnd.getTime() - rangeDays * 24 * 60 * 60 * 1000);
          }

          const prevPeriodStart = new Date(periodStart.getTime() - rangeDays * 24 * 60 * 60 * 1000);
          const start = prevPeriodStart.toISOString();
          const end = periodEnd.toISOString();
          query = query.gte('created_at', start).lt('created_at', end);
        }

        const { data, error } = await query;
        if (!error) {
          setComparisonLogs(data || []);
        } else {
          setComparisonLogs([]);
        }
      } catch (e) {
        setComparisonLogs([]);
      }
    };
    fetchComparisonLogs();
  }, [authLoading, selectedLocation, dateRange, vehicleType, service, entryType, manager, customFromDate, customToDate, user?.assigned_location, user?.role]);

useEffect(() => {
  const fetchTodayPendingLogs = async () => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    // Determine current location context similar to other cards
    const currentLocation = user?.role === 'manager' ? user?.assigned_location : (user?.role === 'owner' && selectedLocation ? selectedLocation : null);

    let query = supabase
      .from("logs-man")
      .select("*")
      .in("approval_status", ["pending", null])
      .gte("entry_time", startOfDay)
      .lte("entry_time", endOfDay);

    if (currentLocation) {
      query = query.eq('location_id', currentLocation);
    }

    const { data, error } = await query;
    if (!error) setPendingLogs(data || []);
  };
  if (!authLoading) {
    fetchTodayPendingLogs();
  }
}, [authLoading, selectedLocation, user?.assigned_location, user?.role]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [dateRange, vehicleType, service, entryType, manager, customFromDate, customToDate]);

  // Get filtered data (now logs are already filtered at database level)
  const getFilteredData = () => {
    // Logs are already filtered at the database level, so we just return them
    const filteredLogs = [...logs];
    console.log('📊 Using pre-filtered data from database:', filteredLogs.length, 'records');

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
        servicePriceFound: !!servicePrice,
        created_at: log.created_at
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
    // Use the already filtered data from getFilteredData() but get the original logs
    // We need to map back from filtered vehicles to their original log entries
    const filteredVehicleIds = filteredData.filteredVehicles.map(v => v.id);
    
    // Get the original log entries for these filtered vehicles
    const filteredLogs = logs.filter(log => filteredVehicleIds.includes(log.id));

    // Helper function to escape CSV values
    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value).trim();
      
      // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        // Remove any existing newlines and carriage returns, then escape quotes
        const cleanValue = stringValue.replace(/[\r\n]/g, ' ').replace(/"/g, '""');
        return `"${cleanValue}"`;
      }
      return stringValue;
    };

    // Create CSV data with all required fields
    const csvData = filteredLogs.map(log => ({
      'Vehicle Number': escapeCSV(log.vehicle_number),
      'Owner Name': escapeCSV(log.Name),
      'Phone': escapeCSV(log.Phone_no),
      'Vehicle Model': escapeCSV(log.vehicle_model),
      'Service Type': escapeCSV(log.service),
      'Price': escapeCSV(log.Amount),
      'Payment Mode': escapeCSV(log.payment_mode),
      'UPI Account': escapeCSV(log.upi_account_name),
      'Entry Type': escapeCSV(log.entry_type),
      'Date': escapeCSV(format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')),
      'Location': escapeCSV(locations.find(loc => loc.id === log.location_id)?.name || 'Unknown')
    }));
    
    // Generate CSV string with proper row handling
    const headers = Object.keys(csvData[0] || {});
    const csvRows = csvData.map(row => 
      headers.map(header => row[header as keyof typeof row])
    );
    
    const csvString = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    // Get location name for filename
    const currentLocation = user?.role === 'manager' ? user?.assigned_location : 
                          (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
    const locationName = locations.find(loc => loc.id === currentLocation)?.name || 'All-Locations';
    const sanitizedLocationName = locationName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    // Generate filename based on the actual date range being exported
    let filename = `${sanitizedLocationName}-car-wash-report`;
    
    if (dateRange === "today") {
      filename += `-${format(new Date(), 'dd-MM-yyyy')}`;
    } else if (dateRange === "yesterday") {
      const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
      filename += `-${format(yesterday, 'dd-MM-yyyy')}`;
    } else if (dateRange === "last7days") {
      const weekAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
      filename += `-${format(weekAgo, 'dd-MM-yyyy')}-to-${format(new Date(), 'dd-MM-yyyy')}`;
    } else if (dateRange === "last30days") {
      const monthAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
      filename += `-${format(monthAgo, 'dd-MM-yyyy')}-to-${format(new Date(), 'dd-MM-yyyy')}`;
    } else if (dateRange === "custom" && customFromDate && customToDate) {
      filename += `-${format(customFromDate, 'dd-MM-yyyy')}-to-${format(customToDate, 'dd-MM-yyyy')}`;
    } else {
      filename += `-${format(new Date(), 'dd-MM-yyyy')}`;
    }
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPaymentBreakdown = () => {
    // Helper function to escape CSV values
    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value).trim();
      
      // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        // Remove any existing newlines and carriage returns, then escape quotes
        const cleanValue = stringValue.replace(/[\r\n]/g, ' ').replace(/"/g, '""');
        return `"${cleanValue}"`;
      }
      return stringValue;
    };

    const breakdownData = filteredData.paymentModeBreakdown.map(item => ({
      'Payment Mode': escapeCSV(item.mode),
      'Total Revenue': escapeCSV(item.revenue),
      'Vehicle Count': escapeCSV(item.count),
      'Percentage of Total': escapeCSV(`${item.percentage.toFixed(1)}%`),
      'UPI Accounts': escapeCSV(
        item.mode?.toLowerCase() === 'upi' && Object.keys(item.upiAccounts || {}).length > 0
          ? Object.entries(item.upiAccounts).map(([accountName, accountData]: [string, any]) =>
            `${accountName}: ₹${accountData.revenue} (${accountData.count} vehicles)`
          ).join('; ')
          : 'N/A'
      )
    }));

    // Generate CSV string with proper row handling
    const headers = Object.keys(breakdownData[0] || {});
    const csvRows = breakdownData.map(row => 
      headers.map(header => row[header as keyof typeof row])
    );
    
    const csvString = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Get location name for filename
    const currentLocation = user?.role === 'manager' ? user?.assigned_location : 
                          (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
    const locationName = locations.find(loc => loc.id === currentLocation)?.name || 'All-Locations';
    const sanitizedLocationName = locationName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    // Generate filename based on the actual date range being exported
    let filename = `${sanitizedLocationName}-payment-breakdown`;
    
    if (dateRange === "today") {
      filename += `-${format(new Date(), 'dd-MM-yyyy')}`;
    } else if (dateRange === "yesterday") {
      const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
      filename += `-${format(yesterday, 'dd-MM-yyyy')}`;
    } else if (dateRange === "last7days") {
      const weekAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
      filename += `-${format(weekAgo, 'dd-MM-yyyy')}-to-${format(new Date(), 'dd-MM-yyyy')}`;
    } else if (dateRange === "last30days") {
      const monthAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
      filename += `-${format(monthAgo, 'dd-MM-yyyy')}-to-${format(new Date(), 'dd-MM-yyyy')}`;
    } else if (dateRange === "custom" && customFromDate && customToDate) {
      filename += `-${format(customFromDate, 'dd-MM-yyyy')}-to-${format(customToDate, 'dd-MM-yyyy')}`;
    } else {
      filename += `-${format(new Date(), 'dd-MM-yyyy')}`;
    }

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
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
          <Button variant="outline" size="sm" onClick={fetchFilteredData} disabled={loading}>
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
              <Select
                value={dateRange}
                onValueChange={(value) => {
                  setDateRange(value);
                  if (value === "singleday") {
                    setShowSingleDayCalendar(true);
                  } else {
                    setShowSingleDayCalendar(false);
                  }
                }}
              >
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
                <div className="space-y-2 pt-2 p-3 bg-muted/30 rounded-lg border min-w-[320px] overflow-visible">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Select a specific date</Label>
                    {/* <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSingleDayCalendar(true)}
                      aria-label="Open single day calendar"
                    >
                      Change date
                    </Button> */}
                  </div>
                  {showSingleDayCalendar && (
                    <div className="overflow-visible">
                      <CalendarComponent
                        mode="single"
                        selected={customFromDate}
                        defaultMonth={customFromDate || new Date()}
                        key={(customFromDate ? customFromDate.toISOString() : 'no-date') + String(showSingleDayCalendar)}
                        onSelect={(date) => {
                          setCustomFromDate(date as Date | undefined);
                          setCustomToDate(date as Date | undefined); // treat as single-day (from = to)
                          if (date) {
                            setShowSingleDayCalendar(false);
                          }
                        }}
                        className="bg-background rounded-md border shadow-sm"
                        initialFocus
                      />
                    </div>
                  )}
                  {customFromDate && !showSingleDayCalendar && (
                    <div className="text-xs text-muted-foreground">
                      Showing data for: 
                      <button
                        type="button"
                        className="ml-1 font-medium underline underline-offset-2 hover:text-foreground"
                        onClick={() => setShowSingleDayCalendar(true)}
                        aria-label="Change single day date"
                      >
                        {format(customFromDate, "PPP")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Range Selection */}
              {dateRange === "custom" && (
                <div className="space-y-3 pt-3 p-4 bg-muted/30 rounded-lg border min-w-[500px]">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-foreground">Select date range</Label>
                    <p className="text-xs text-muted-foreground">Choose your start and end dates</p>
                  </div>
                  
                  <div className="flex gap-4 min-w-0">
                    <div className="flex-1 space-y-1 min-w-0">
                      <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-start h-9 min-w-0">
                            {customFromDate ? (
                              <span className="flex items-center gap-2 min-w-0">
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{format(customFromDate, "MMM dd, yyyy")}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">Select start date</span>
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
                    </div>
                    
                    <div className="flex-1 space-y-1 min-w-0">
                      <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-start h-9 min-w-0">
                            {customToDate ? (
                              <span className="flex items-center gap-2 min-w-0">
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{format(customToDate, "MMM dd, yyyy")}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">Select end date</span>
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
                  </div>
                  
                  {(customFromDate || customToDate) && (
                    <div className="pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        {customFromDate && customToDate ? (
                          <>Showing data from <span className="font-medium text-foreground">{format(customFromDate, "MMM dd, yyyy")}</span> to <span className="font-medium text-foreground">{format(customToDate, "MMM dd, yyyy")}</span></>
                        ) : customFromDate ? (
                          <>Showing data from <span className="font-medium text-foreground">{format(customFromDate, "MMM dd, yyyy")}</span></>
                        ) : (
                          <>Showing data until <span className="font-medium text-foreground">{format(customToDate, "MMM dd, yyyy")}</span></>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Reset Button inside the container */}
                  <div className="pt-2 border-t">
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
                  </div>
                </div>
              )}

              {/* Clear Filters Button for other date ranges */}
              {dateRange !== "custom" && dateRange !== "today" && (
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
                  {(() => {
                    const currentLocation = user?.role === 'manager'
                      ? user?.assigned_location
                      : (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
                    const fromPrices = (servicePriceOptions || [])
                      .filter((sp: any) => !currentLocation || sp.locationid === currentLocation)
                      .map((sp: any) => (sp['VEHICLE'] || '').toString().trim())
                      .filter((v: string) => v.length > 0);
                    const uniqueVehicles = Array.from(new Set(fromPrices)).sort((a, b) => a.localeCompare(b));
                    return uniqueVehicles.map((type, index) => (
                      <SelectItem key={`vehicle-type-price-${type}-${index}`} value={type}>{type}</SelectItem>
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
                  {(() => {
                    const currentLocation = user?.role === 'manager'
                      ? user?.assigned_location
                      : (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
                    const fromPrices = (servicePriceOptions || [])
                      .filter((sp: any) => !currentLocation || sp.locationid === currentLocation)
                      .map((sp: any) => (sp['SERVICE'] || '').toString().trim())
                      .filter((v: string) => v.length > 0);
                    const uniqueServices = Array.from(new Set(fromPrices)).sort((a, b) => a.localeCompare(b));
                    return uniqueServices.map((svc, index) => (
                      <SelectItem key={`service-type-price-${svc}-${index}`} value={svc}>{svc}</SelectItem>
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
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                  {(() => {
                    // Include any other types present in logs just in case
                    const base = ['Customer', 'Workshop'];
                    const uniques = Array.from(new Set(
                      logs
                        .map(log => (log.entry_type || '').toString().trim())
                        .filter(v => v.length > 0)
                    ))
                      .filter(v => !base.some(b => b.toLowerCase() === v.toLowerCase()))
                      .sort((a, b) => a.localeCompare(b));
                    return uniques.map((v, idx) => (
                      <SelectItem key={`entry-type-extra-${v}-${idx}`} value={v}>{v}</SelectItem>
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
                  {(() => {
                    const currentLocation = user?.role === 'manager'
                      ? user?.assigned_location
                      : (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
                    // Prefer names from users table to avoid showing UUIDs
                    const byLocation = (users || [])
                      .filter((u: any) => (u.role || '').toString().toLowerCase() === 'manager')
                      .filter((u: any) => !currentLocation || u.assigned_location === currentLocation);
                    // Sort by name
                    byLocation.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
                    // If none found by location, fall back to any manager users we have
                    const source = byLocation.length > 0 ? byLocation : (users || []).filter((u: any) => (u.role || '').toString().toLowerCase() === 'manager');
                    return source.map((mgr: any) => (
                      <SelectItem key={`manager-${mgr.id}`} value={String(mgr.id)}>{mgr.name || 'Manager'}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* <Card className="metric-card-financial">
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
        </Card> */}
        <Card className="metric-card-financial">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Badge variant="outline" className="text-financial border-financial">
              {dateRange === "today"
                ? "Today"
                : dateRange === "yesterday"
                  ? "Yesterday"
                  : dateRange === "singleday"
                    ? customFromDate
                      ? format(customFromDate, "PPP")
                      : "Single Day"
                    : dateRange === "last7days"
                      ? "Last 7 Days"
                      : dateRange === "last30days"
                        ? "Last 30 Days"
                        : dateRange === "custom" && customFromDate && customToDate
                          ? `${format(customFromDate, "dd MMM yyyy")} - ${format(customToDate, "dd MMM yyyy")}`
                          : "Filtered Period"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-financial">
              ₹{filteredData.totalRevenue.toLocaleString()}
            </div>
            {/* --- Revenue Comparison Section --- */}
            {(() => {
              // Use the same filters as getFilteredData, except for date
              let baseFilteredLogs = [...comparisonLogs];
              // Location filter
              const currentLocation = user?.role === 'manager'
                ? user?.assigned_location
                : (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
              if (currentLocation) {
                baseFilteredLogs = baseFilteredLogs.filter(log => log.location_id === currentLocation);
              }
              // Approval status
              baseFilteredLogs = baseFilteredLogs.filter(log => log.approval_status === 'approved');
              // Vehicle type
              if (vehicleType !== "all") {
                baseFilteredLogs = baseFilteredLogs.filter(log =>
                  (log.vehicle_type || '').toString().trim().toLowerCase() === vehicleType.trim().toLowerCase()
                );
              }
              // Service
              if (service !== "all") {
                baseFilteredLogs = baseFilteredLogs.filter(log =>
                  (log.service || '').toString().trim().toLowerCase() === service.trim().toLowerCase()
                );
              }
              // Entry type
              if (entryType !== "all") {
                baseFilteredLogs = baseFilteredLogs.filter(log =>
                  (log.entry_type || '').toString().trim().toLowerCase() === entryType.trim().toLowerCase()
                );
              }
              // Manager
              if (manager !== "all") {
                baseFilteredLogs = baseFilteredLogs.filter(log => log.created_by === manager);
              }

              // Helper to get revenue for a specific date (full day)
              const getRevenueForDate = (date: Date) => {
                const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
                return baseFilteredLogs
                  .filter(
                    log =>
                      new Date(log.created_at) >= start &&
                      new Date(log.created_at) < end
                  )
                  .reduce((sum, log) => sum + (log.Amount || 0), 0);
              };

              // Helper to get revenue for a range (inclusive of start, exclusive of end)
              const getRevenueForRange = (start: Date, end: Date) => {
                return baseFilteredLogs
                  .filter(
                    log =>
                      new Date(log.created_at) >= start &&
                      new Date(log.created_at) < end
                  )
                  .reduce((sum, log) => sum + (log.Amount || 0), 0);
              };

              // Arrow and color helpers
              const Arrow = ({ change }: { change: number }) =>
                change > 0 ? (
                  <span className="text-green-600 ml-1">&#8593;</span>
                ) : change < 0 ? (
                  <span className="text-red-600 ml-1">&#8595;</span>
                ) : (
                  <span className="text-muted-foreground ml-1">&#8596;</span>
                );

              // Percentage change helpers
              const getChange = (current: number, prev: number) => {
                if (prev === 0) return current === 0 ? 0 : 100;
                return ((current - prev) / prev) * 100;
              };

              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

              // TODAY
              if (dateRange === "today") {
                const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                const todayRevenue = getRevenueForDate(today);
                const yesterdayRevenue = getRevenueForDate(yesterday);
                const lastWeekRevenue = getRevenueForDate(lastWeek);
                const yChange = getChange(todayRevenue, yesterdayRevenue);
                const lwChange = getChange(todayRevenue, lastWeekRevenue);

                return (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">Yesterday:</span>
                      <span className="font-semibold">
                        ₹{yesterdayRevenue.toLocaleString()}
                      </span>
                      <Arrow change={yChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (yChange > 0
                            ? "text-green-600"
                            : yChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(yChange).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">
                        Last {today.toLocaleString("en-US", { weekday: "long" })}:
                      </span>
                      <span className="font-semibold">
                        ₹{lastWeekRevenue.toLocaleString()}
                      </span>
                      <Arrow change={lwChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (lwChange > 0
                            ? "text-green-600"
                            : lwChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(lwChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }

              // YESTERDAY
              if (dateRange === "yesterday") {
                const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                const dayBefore = new Date(yesterday.getTime() - 24 * 60 * 60 * 1000);
                const lastWeek = new Date(yesterday.getTime() - 7 * 24 * 60 * 60 * 1000);
                const yesterdayRevenue = getRevenueForDate(yesterday);
                const dayBeforeRevenue = getRevenueForDate(dayBefore);
                const lastWeekRevenue = getRevenueForDate(lastWeek);
                const yChange = getChange(yesterdayRevenue, dayBeforeRevenue);
                const lwChange = getChange(yesterdayRevenue, lastWeekRevenue);

                return (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">Day Before:</span>
                      <span className="font-semibold">
                        ₹{dayBeforeRevenue.toLocaleString()}
                      </span>
                      <Arrow change={yChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (yChange > 0
                            ? "text-green-600"
                            : yChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(yChange).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">
                        Last {yesterday.toLocaleString("en-US", { weekday: "long" })}:
                      </span>
                      <span className="font-semibold">
                        ₹{lastWeekRevenue.toLocaleString()}
                      </span>
                      <Arrow change={lwChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (lwChange > 0
                            ? "text-green-600"
                            : lwChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(lwChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }

              // SINGLEDAY
              if (dateRange === "singleday" && customFromDate) {
                const singleDay = new Date(customFromDate.getFullYear(), customFromDate.getMonth(), customFromDate.getDate());
                const prevDay = new Date(singleDay.getTime() - 24 * 60 * 60 * 1000);
                const lastWeek = new Date(singleDay.getTime() - 7 * 24 * 60 * 60 * 1000);
                const singleDayRevenue = getRevenueForDate(singleDay);
                const prevDayRevenue = getRevenueForDate(prevDay);
                const lastWeekRevenue = getRevenueForDate(lastWeek);
                const yChange = getChange(singleDayRevenue, prevDayRevenue);
                const lwChange = getChange(singleDayRevenue, lastWeekRevenue);

                return (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">Previous Day:</span>
                      <span className="font-semibold">
                        ₹{prevDayRevenue.toLocaleString()}
                      </span>
                      <Arrow change={yChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (yChange > 0
                            ? "text-green-600"
                            : yChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(yChange).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">
                        Last {singleDay.toLocaleString("en-US", { weekday: "long" })}:
                      </span>
                      <span className="font-semibold">
                        ₹{lastWeekRevenue.toLocaleString()}
                      </span>
                      <Arrow change={lwChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (lwChange > 0
                            ? "text-green-600"
                            : lwChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(lwChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }

              // LAST 7/30 DAYS & CUSTOM
              if (
                dateRange === "last7days" ||
                dateRange === "last30days" ||
                (dateRange === "custom" && customFromDate && customToDate)
              ) {
                let rangeDays = 7;
                if (dateRange === "last30days") rangeDays = 30;
                if (dateRange === "custom" && customFromDate && customToDate) {
                  rangeDays =
                    Math.ceil(
                      (customToDate.getTime() -
                        customFromDate.getTime()) /
                      (24 * 60 * 60 * 1000)
                    ) + 1;
                }

                // Current period
                let periodStart: Date, periodEnd: Date;
                if (dateRange === "custom" && customFromDate && customToDate) {
                  periodStart = new Date(customFromDate.getFullYear(), customFromDate.getMonth(), customFromDate.getDate());
                  periodEnd = new Date(customToDate.getFullYear(), customToDate.getMonth(), customToDate.getDate() + 1);
                } else {
                  periodEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000); // tomorrow 00:00
                  periodStart = new Date(periodEnd.getTime() - rangeDays * 24 * 60 * 60 * 1000);
                }

                // Previous period: strictly before current period, same length
                const prevPeriodEnd = new Date(periodStart.getTime());
                const prevPeriodStart = new Date(
                  prevPeriodEnd.getTime() - rangeDays * 24 * 60 * 60 * 1000
                );

                const currentRevenue = getRevenueForRange(periodStart, periodEnd);
                const prevRevenue = getRevenueForRange(prevPeriodStart, prevPeriodEnd);
                const change = getChange(currentRevenue, prevRevenue);

                return (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">
                        Previous {rangeDays} days:
                      </span>
                      <span className="font-semibold">
                        ₹{prevRevenue.toLocaleString()}
                      </span>
                      <Arrow change={change} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (change > 0
                            ? "text-green-600"
                            : change < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(change).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }

              // Default: nothing
              return null;
            })()}
          </CardContent>
        </Card>

        {/* <Card className="metric-card-success">
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
        </Card> */}
        {/* These 2 cards updated on 03/09/25 by vishnu */}
        <Card className="metric-card-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Badge variant="outline" className="text-success border-success">
              {dateRange === "today"
                ? "Today"
                : dateRange === "yesterday"
                  ? "Yesterday"
                  : dateRange === "singleday"
                    ? customFromDate
                      ? format(customFromDate, "PPP")
                      : "Single Day"
                    : dateRange === "last7days"
                      ? "Last 7 Days"
                      : dateRange === "last30days"
                        ? "Last 30 Days"
                        : dateRange === "custom" && customFromDate && customToDate
                          ? `${format(customFromDate, "dd MMM yyyy")} - ${format(customToDate, "dd MMM yyyy")}`
                          : "Filtered Period"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{filteredData.totalVehicles}</div>
            {/* --- Vehicle Count Comparison Section --- */}
            {(() => {
              // Use the same filters as getFilteredData, except for date
              let baseFilteredLogs = [...comparisonLogs];
              // Location filter
              const currentLocation = user?.role === 'manager'
                ? user?.assigned_location
                : (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
              if (currentLocation) {
                baseFilteredLogs = baseFilteredLogs.filter(log => log.location_id === currentLocation);
              }
              // Approval status
              baseFilteredLogs = baseFilteredLogs.filter(log => log.approval_status === 'approved');
              // Vehicle type
              if (vehicleType !== "all") {
                baseFilteredLogs = baseFilteredLogs.filter(log =>
                  (log.vehicle_type || '').toString().trim().toLowerCase() === vehicleType.trim().toLowerCase()
                );
              }
              // Service
              if (service !== "all") {
                baseFilteredLogs = baseFilteredLogs.filter(log =>
                  (log.service || '').toString().trim().toLowerCase() === service.trim().toLowerCase()
                );
              }
              // Entry type
              if (entryType !== "all") {
                baseFilteredLogs = baseFilteredLogs.filter(log =>
                  (log.entry_type || '').toString().trim().toLowerCase() === entryType.trim().toLowerCase()
                );
              }
              // Manager
              if (manager !== "all") {
                baseFilteredLogs = baseFilteredLogs.filter(log => log.created_by === manager);
              }

              // Helper to get vehicle count for a specific date (full day)
              const getCountForDate = (date: Date) => {
                const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
                return baseFilteredLogs
                  .filter(
                    log =>
                      new Date(log.created_at) >= start &&
                      new Date(log.created_at) < end
                  ).length;
              };

              // Helper to get vehicle count for a range (inclusive of start, exclusive of end)
              const getCountForRange = (start: Date, end: Date) => {
                return baseFilteredLogs
                  .filter(
                    log =>
                      new Date(log.created_at) >= start &&
                      new Date(log.created_at) < end
                  ).length;
              };

              // Arrow and color helpers
              const Arrow = ({ change }: { change: number }) =>
                change > 0 ? (
                  <span className="text-green-600 ml-1">&#8593;</span>
                ) : change < 0 ? (
                  <span className="text-red-600 ml-1">&#8595;</span>
                ) : (
                  <span className="text-muted-foreground ml-1">&#8596;</span>
                );

              // Percentage change helpers
              const getChange = (current: number, prev: number) => {
                if (prev === 0) return current === 0 ? 0 : 100;
                return ((current - prev) / prev) * 100;
              };

              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

              // TODAY
              if (dateRange === "today") {
                const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                const todayCount = getCountForDate(today);
                const yesterdayCount = getCountForDate(yesterday);
                const lastWeekCount = getCountForDate(lastWeek);
                const yChange = getChange(todayCount, yesterdayCount);
                const lwChange = getChange(todayCount, lastWeekCount);

                return (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">Yesterday:</span>
                      <span className="font-semibold">{yesterdayCount}</span>
                      <Arrow change={yChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (yChange > 0
                            ? "text-green-600"
                            : yChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(yChange).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">
                        Last {today.toLocaleString("en-US", { weekday: "long" })}:
                      </span>
                      <span className="font-semibold">{lastWeekCount}</span>
                      <Arrow change={lwChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (lwChange > 0
                            ? "text-green-600"
                            : lwChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(lwChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }

              // YESTERDAY
              if (dateRange === "yesterday") {
                const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                const dayBefore = new Date(yesterday.getTime() - 24 * 60 * 60 * 1000);
                const lastWeek = new Date(yesterday.getTime() - 7 * 24 * 60 * 60 * 1000);
                const yesterdayCount = getCountForDate(yesterday);
                const dayBeforeCount = getCountForDate(dayBefore);
                const lastWeekCount = getCountForDate(lastWeek);
                const yChange = getChange(yesterdayCount, dayBeforeCount);
                const lwChange = getChange(yesterdayCount, lastWeekCount);

                return (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">Day Before:</span>
                      <span className="font-semibold">{dayBeforeCount}</span>
                      <Arrow change={yChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (yChange > 0
                            ? "text-green-600"
                            : yChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(yChange).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">
                        Last {yesterday.toLocaleString("en-US", { weekday: "long" })}:
                      </span>
                      <span className="font-semibold">{lastWeekCount}</span>
                      <Arrow change={lwChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (lwChange > 0
                            ? "text-green-600"
                            : lwChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(lwChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }

              // SINGLEDAY
              if (dateRange === "singleday" && customFromDate) {
                const singleDay = new Date(customFromDate.getFullYear(), customFromDate.getMonth(), customFromDate.getDate());
                const prevDay = new Date(singleDay.getTime() - 24 * 60 * 60 * 1000);
                const lastWeek = new Date(singleDay.getTime() - 7 * 24 * 60 * 60 * 1000);
                const singleDayCount = getCountForDate(singleDay);
                const prevDayCount = getCountForDate(prevDay);
                const lastWeekCount = getCountForDate(lastWeek);
                const yChange = getChange(singleDayCount, prevDayCount);
                const lwChange = getChange(singleDayCount, lastWeekCount);

                return (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">Previous Day:</span>
                      <span className="font-semibold">{prevDayCount}</span>
                      <Arrow change={yChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (yChange > 0
                            ? "text-green-600"
                            : yChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(yChange).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">
                        Last {singleDay.toLocaleString("en-US", { weekday: "long" })}:
                      </span>
                      <span className="font-semibold">{lastWeekCount}</span>
                      <Arrow change={lwChange} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (lwChange > 0
                            ? "text-green-600"
                            : lwChange < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(lwChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }

              // LAST 7/30 DAYS & CUSTOM
              if (
                dateRange === "last7days" ||
                dateRange === "last30days" ||
                (dateRange === "custom" && customFromDate && customToDate)
              ) {
                let rangeDays = 7;
                if (dateRange === "last30days") rangeDays = 30;
                if (dateRange === "custom" && customFromDate && customToDate) {
                  rangeDays =
                    Math.ceil(
                      (customToDate.getTime() -
                        customFromDate.getTime()) /
                      (24 * 60 * 60 * 1000)
                    ) + 1;
                }

                // Current period
                let periodStart: Date, periodEnd: Date;
                if (dateRange === "custom" && customFromDate && customToDate) {
                  periodStart = new Date(customFromDate.getFullYear(), customFromDate.getMonth(), customFromDate.getDate());
                  periodEnd = new Date(customToDate.getFullYear(), customToDate.getMonth(), customToDate.getDate() + 1);
                } else {
                  periodEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000); // tomorrow 00:00
                  periodStart = new Date(periodEnd.getTime() - rangeDays * 24 * 60 * 60 * 1000);
                }

                // Previous period: strictly before current period, same length
                const prevPeriodEnd = new Date(periodStart.getTime());
                const prevPeriodStart = new Date(
                  prevPeriodEnd.getTime() - rangeDays * 24 * 60 * 60 * 1000
                );

                const currentCount = getCountForRange(periodStart, periodEnd);
                const prevCount = getCountForRange(prevPeriodStart, prevPeriodEnd);
                const change = getChange(currentCount, prevCount);

                return (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center text-xs">
                      <span className="text-muted-foreground mr-1">
                        Previous {rangeDays} days:
                      </span>
                      <span className="font-semibold">{prevCount}</span>
                      <Arrow change={change} />
                      <span
                        className={
                          "ml-1 font-medium " +
                          (change > 0
                            ? "text-green-600"
                            : change < 0
                              ? "text-red-600"
                              : "text-muted-foreground")
                        }
                      >
                        {Math.abs(change).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }

              // Default: nothing
              return null;
            })()}
          </CardContent>
        </Card>

        {/* Pay Later Due - Unsettled credit amount in current filtered range */}
        <Card
          className="metric-card bg-red-50 border-red-100 shadow-none cursor-pointer hover:bg-red-100/60 transition-colors"
          onClick={() => navigate('/pay-later')}
          role="button"
          aria-label="View Pay Later details"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Pay Later Due</CardTitle>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              {dateRange === "today"
                ? "Today"
                : dateRange === "yesterday"
                  ? "Yesterday"
                  : dateRange === "singleday"
                    ? customFromDate
                      ? format(customFromDate, "PPP")
                      : "Single Day"
                    : dateRange === "last7days"
                      ? "Last 7 Days"
                      : dateRange === "last30days"
                        ? "Last 30 Days"
                        : dateRange === "custom" && customFromDate && customToDate
                          ? `${format(customFromDate, "dd MMM yyyy")} - ${format(customToDate, "dd MMM yyyy")}`
                          : "Filtered Period"}
            </Badge>
          </CardHeader>
          <CardContent>
            {(() => {
              // Logs are already filtered server-side by the current filters
              const payLaterLogs = logs.filter((log) => (log.payment_mode || '').toString().trim().toLowerCase() === 'credit');
              const payLaterCount = payLaterLogs.length;
              const payLaterDue = payLaterLogs.reduce((sum, log) => {
                const amount = Number(log.Amount) || 0;
                return sum + amount;
              }, 0);

              return (
                <div>
                  <div className="text-2xl font-bold text-red-900">₹{payLaterDue.toLocaleString()}</div>
                  <p className="text-xs text-red-800">{payLaterCount} unsettled pay later tickets</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {dateRange === "today" && (
          <Card className="metric-card bg-blue-50 border-blue-100 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Pending Tickets</CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                Today
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-blue-900">
                {pendingLogs.filter(log => {
                  const logDate = new Date(log.entry_time || log.created_at);
                  const today = new Date();
                  return (
                    logDate.getFullYear() === today.getFullYear() &&
                    logDate.getMonth() === today.getMonth() &&
                    logDate.getDate() === today.getDate()
                  );
                }).length}
                <span className="ml-2 text-xs text-blue-700">tickets</span>
              </div>
              <div className="text-xs text-blue-700 mt-1">
                Total Amount: ₹
                {pendingLogs
                  .filter(log => {
                    const logDate = new Date(log.entry_time || log.created_at);
                    const today = new Date();
                    return (
                      logDate.getFullYear() === today.getFullYear() &&
                      logDate.getMonth() === today.getMonth() &&
                      logDate.getDate() === today.getDate()
                    );
                  })
                  .reduce((sum, log) => sum + (log.Amount || 0), 0)
                  .toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )}

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
                      labelLine={false}
                      minAngle={10}
                     label={({ type, percentage, cx, cy, midAngle, outerRadius, index }) => {
    // Calculate label position
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 10;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    // Shorten long names
    const labelText = `${type?.length > 10 ? type.slice(0, 10) + '…' : type || 'Unknown'} (${percentage.toFixed(1)}%)`;
    return (
      <text
        x={x}
        y={y}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={10} // Smaller font size
        fill="#444"
        style={{ pointerEvents: "none" }}
      >
        {labelText}
      </text>
    );
  }}
                      
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

      {/* Hourly Sales Bar Chart - Available for all date ranges */}
      {(
        <Card>
          <CardHeader>
            <CardTitle>Hourly Sales Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              {dateRange === "today" && "Today's hourly sales"}
              {dateRange === "yesterday" && "Yesterday's hourly sales"}
              {dateRange === "singleday" && "Selected day hourly sales"}
              {dateRange === "last7days" && "Last 7 days - aggregated hourly sales"}
              {dateRange === "last30days" && "Last 30 days - aggregated hourly sales"}
              {dateRange === "custom" && "Custom period - aggregated hourly sales"}
            </p>
          </CardHeader>
          <CardContent>
            {filteredData.filteredVehicles.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                No data available for selected period
              </div>
            ) : (
              <div className="w-full h-64">
                {/* Responsive X-axis label logic */}
                {(() => {
                  // Detect mobile (width < 640px)
                  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
                  // Show every 3rd label on mobile, all on desktop
                  const interval = isMobile ? 4 : 1;
                  // Smaller font on mobile
                  const fontSize = isMobile ? 10 : 12;

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(() => {
                          const hours = Array.from({ length: 24 }, (_, i) => ({
                            hour: i,
                            label: `${((i % 12) === 0 ? 12 : i % 12).toString().padStart(2, "0")} ${i < 12 ? "AM" : "PM"}`,
                            amount: 0,
                            count: 0,
                          }));
                          // For all date ranges (single day and multi-day), aggregate hourly data
                          // The data is already filtered by date range at the database level
                          filteredData.filteredVehicles.forEach((vehicle) => {
                            const created = new Date(vehicle.created_at);
                            const hour = created.getHours();
                            hours[hour].amount += vehicle.price || 0;
                            hours[hour].count += 1;
                          });
                          return hours;
                        })()}
                        margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                      >
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize }}
                          interval={interval}
                          minTickGap={0}
                          angle={-15}
                          height={32}
                        />
                        <YAxis
                          tick={{ fontSize }}
                          width={isMobile ? 40 : 60}
                          tickFormatter={(v) => `₹${v}`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) =>
                            [`₹${value.toLocaleString()}`, "Sales"]
                          }
                          labelFormatter={(label: string) => `Hour: ${label}`}
                        />
                        
                       <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]}>
  <LabelList
    dataKey="amount"
    position="top"
    formatter={(value: number) => value > 0 ? `₹${value}` : ""}
    style={{ fontSize: isMobile ? 9 : 12, fill: "#222" }}
  />
</Bar>
                        
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Period Comparison Chart - Comparing current period with last 5 periods */}
      <Card>
        <CardHeader>
          <CardTitle>Period Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">
            Revenue and Vehicle Count comparison across 6 periods
          </p>
        </CardHeader>
        <CardContent>
          {filteredData.filteredVehicles.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              No data available for comparison
            </div>
          ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(() => {
                    const currentPeriod = {
                      revenue: filteredData.totalRevenue,
                      vehicleCount: filteredData.totalVehicles,
                      label: (() => {
                        if (dateRange === "today") return "Today";
                        if (dateRange === "yesterday") return "Yesterday";
                        if (dateRange === "singleday" && customFromDate) return format(customFromDate, "dd MMM");
                        if (dateRange === "last7days") return "Last 7 Days";
                        if (dateRange === "last30days") return "Last 30 Days";
                        if (dateRange === "custom" && (customFromDate || customToDate)) {
                          return `${format(customFromDate || new Date(), "dd MMM")} - ${format(customToDate || new Date(), "dd MMM")}`;
                        }
                        return "Current Period";
                      })()
                    };

                    // Generate 5 previous periods
                    const previousPeriods = (() => {
                      const periods = [];
                      const now = new Date();

                      if (dateRange === "today") {
                        for (let i = 1; i <= 5; i++) {
                          const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                          periods.push({
                            label: format(day, "dd MMM"),
                            revenue: 0, // Will be calculated from comparison logs
                            vehicleCount: 0
                          });
                        }
                      } else if (dateRange === "yesterday") {
                        for (let i = 2; i <= 6; i++) {
                          const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                          periods.push({
                            label: format(day, "dd MMM"),
                            revenue: 0,
                            vehicleCount: 0
                          });
                        }
                      } else if (dateRange === "singleday" && customFromDate) {
                        for (let i = 1; i <= 5; i++) {
                          const day = new Date(customFromDate.getTime() - i * 24 * 60 * 60 * 1000);
                          periods.push({
                            label: format(day, "dd MMM"),
                            revenue: 0,
                            vehicleCount: 0
                          });
                        }
                      } else if (dateRange === "last7days") {
                        for (let i = 1; i <= 5; i++) {
                          const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000) - 6 * 24 * 60 * 60 * 1000);
                          const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                          periods.push({
                            label: `Week ${6 - i}`,
                            revenue: 0,
                            vehicleCount: 0,
                            startDate: weekStart,
                            endDate: weekEnd
                          });
                        }
                      } else if (dateRange === "last30days") {
                        for (let i = 1; i <= 5; i++) {
                          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
                          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
                          periods.push({
                            label: `${monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
                            revenue: 0,
                            vehicleCount: 0,
                            startDate: monthStart,
                            endDate: monthEnd
                          });
                        }
                      } else if (dateRange === "custom" && customFromDate && customToDate) {
                        const customDays = Math.ceil((customToDate.getTime() - customFromDate.getTime()) / (24 * 60 * 60 * 1000));
                        for (let i = 1; i <= 5; i++) {
                          const periodStart = new Date(customFromDate.getTime() - (i * customDays * 24 * 60 * 60 * 1000));
                          const periodEnd = new Date(periodStart.getTime() + customDays * 24 * 60 * 60 * 1000);
                          periods.push({
                            label: `Period ${6 - i}`,
                            revenue: 0,
                            vehicleCount: 0,
                            startDate: periodStart,
                            endDate: periodEnd
                          });
                        }
                      }

                      return periods;
                    })();

                    // Calculate previous period data from comparison logs
                    previousPeriods.forEach((period, index) => {
                      if (dateRange === "today" || dateRange === "yesterday" || dateRange === "singleday") {
                        // For daily periods, calculate from comparison logs
                        const currentLocation = user?.role === 'manager' ? user?.assigned_location : 
                          (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
                        
                        let filteredLogs = [...comparisonLogs];
                        
                        if (currentLocation) {
                          filteredLogs = filteredLogs.filter(log => log.location_id === currentLocation);
                        }
                        
                        filteredLogs = filteredLogs.filter(log => log.approval_status === 'approved');
                        
                        // Filter by specific day
                        let dayStart: Date, dayEnd: Date;
                        if (period.label.includes('Week') || period.startDate) {
                          dayStart = period.startDate!;
                          dayEnd = period.endDate!;
                        } else {
                          // Parse day from label for daily periods
                          const dayDate = new Date();
                          if (dateRange === "today") {
                            dayDate.setTime(new Date().getTime() - (index + 1) * 24 * 60 * 60 * 1000);
                          } else if (dateRange === "yesterday") {
                            dayDate.setTime(new Date().getTime() - (index + 2) * 24 * 60 * 60 * 1000);
                          } else if (dateRange === "singleday" && customFromDate) {
                            dayDate.setTime(customFromDate.getTime() - (index + 1) * 24 * 60 * 60 * 1000);
                          }
                          dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
                          dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
                        }
                        
                        const dayLogs = filteredLogs.filter(log => {
                          const created = new Date(log.created_at);
                          return created >= dayStart && created < dayEnd;
                        });
                        
                        period.revenue = dayLogs.reduce((sum, log) => sum + (log.Amount || 0), 0);
                        period.vehicleCount = dayLogs.length;
                      } else {
                        // For weekly/monthly/custom periods
                        const currentLocation = user?.role === 'manager' ? user?.assigned_location : 
                          (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
                        
                        let filteredLogs = [...comparisonLogs];
                        
                        if (currentLocation) {
                          filteredLogs = filteredLogs.filter(log => log.location_id === currentLocation);
                        }
                        
                        filteredLogs = filteredLogs.filter(log => log.approval_status === 'approved');
                        
                        const dayLogs = filteredLogs.filter(log => {
                          const created = new Date(log.created_at);
                          return created >= period.startDate! && created <= period.endDate!;
                        });
                        
                        period.revenue = dayLogs.reduce((sum, log) => sum + (log.Amount || 0), 0);
                        period.vehicleCount = dayLogs.length;
                      }
                    });

                    return [
                      currentPeriod,
                      ...previousPeriods
                    ];
                  })()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis yAxisId="revenue" orientation="left" />
                  <YAxis yAxisId="count" orientation="right" />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "revenue") return [`₹${value.toLocaleString()}`, "Revenue"];
                      if (name === "vehicleCount") return [value.toLocaleString(), "Vehicles"];
                      return [value, name];
                    }}
                    labelFormatter={(label: string) => `Period: ${label}`}
                  />
                  <Bar dataKey="revenue" fill="#6366f1" yAxisId="revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vehicleCount" fill="#10b981" yAxisId="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Top Vehicle Types Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Vehicle Types Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            Top 6 vehicle types by count for selected period, grouped by categories
          </p>
        </CardHeader>
        <CardContent>
          {filteredData.filteredVehicles.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              No data available for vehicle type breakdown
          </div>
          ) : (() => {
            // Count vehicles by type for current period
            const typeCounts = filteredData.filteredVehicles.reduce((acc, vehicle) => {
              const type = vehicle.vehicle_type || 'Unknown';
              acc[type] = (acc[type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            // Get top 6 types for current period
            const topTypesCurrent = Object.entries(typeCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([type, count]) => ({ type, count }));

            // Generate comparison data for previous periods
            const comparisonData = topTypesCurrent.map(currentType => {
              const comparisonByPeriod = [];
              
              // Add current period first
              comparisonByPeriod.push({
                period: (() => {
                  if (dateRange === "today") return "Today";
                  if (dateRange === "yesterday") return "Yesterday";
                  if (dateRange === "singleday" && customFromDate) return format(customFromDate, "MMM dd");
                  if (dateRange === "last7days") return "Last 7 Days";
                  if (dateRange === "last30days") return "Last 30 Days";
                  if (dateRange === "custom" && customFromDate && customToDate) {
                    return `${format(customFromDate, "MMM dd")} - ${format(customToDate, "MMM dd")}`;
                  }
                  return "Current Period";
                })(),
                count: currentType.count
              });

              // Add previous periods (simplified - showing last 5 periods)
              for (let i = 1; i <= 5; i++) {
                let periodLabel = "";
                let periodStart: Date, periodEnd: Date;
                
                if (dateRange === "today") {
                  const day = new Date(new Date().getTime() - i * 24 * 60 * 60 * 1000);
                  periodLabel = format(day, "MMM dd");
                  periodStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                  periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
                } else if (dateRange === "yesterday") {
                  const day = new Date(new Date().getTime() - (i + 1) * 24 * 60 * 60 * 1000);
                  periodLabel = format(day, "MMM-dd");
                  periodStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                  periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
                } else if (dateRange === "singleday" && customFromDate) {
                  const day = new Date(customFromDate.getTime() - i * 24 * 60 * 60 * 1000);
                  periodLabel = format(day, "MMM-dd");
                  periodStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                  periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
                } else {
                  periodLabel = `Period ${i}`;
                  periodEnd = new Date();
                  if (dateRange === "last7days") {
                    periodStart = new Date(periodEnd.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000);
                    periodLabel = `Week ${i}`;
                  } else if (dateRange === "last30days") {
                    periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - i, 1);
                    periodLabel = periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  } else {
                    periodStart = new Date(periodEnd.getTime() - i * 30 * 24 * 60 * 60 * 1000);
                  }
                }
                
                // Calculate count for this vehicle type in this period
                const currentLocation = user?.role === 'manager' ? user?.assigned_location : 
                  (user?.role === 'owner' && selectedLocation ? selectedLocation : null);
                
                let filteredLogs = [...comparisonLogs];
                
                if (currentLocation) {
                  filteredLogs = filteredLogs.filter(log => log.location_id === currentLocation);
                }
                
                filteredLogs = filteredLogs.filter(log => log.approval_status === 'approved');
                
                const periodLogs = filteredLogs.filter(log => {
                  const created = new Date(log.created_at);
                  return created >= periodStart && created < periodEnd;
                });
                
                const typeLogs = periodLogs.filter(log => 
                  (log.vehicle_type || '').toLowerCase() === currentType.type.toLowerCase()
                );
                
                comparisonByPeriod.push({
                  period: periodLabel,
                  count: typeLogs.length
                });
              }

              return {
                vehicleType: currentType.type,
                data: comparisonByPeriod // Show current first, then reverse chronological order
              };
            });

            return (
              <div className="space-y-6">
                {/* Current Period Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {topTypesCurrent.map((item, idx) => (
                    <div key={item.type} className="p-3 bg-accent/50 rounded-lg border-2 border-accent/20">
                      <div className="text-lg font-bold text-primary">{item.count}</div>
                      <div className="text-sm font-medium">{item.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {filteredData.totalVehicles > 0 ? ((item.count / filteredData.totalVehicles) * 100).toFixed(1) : 0}% of total
                      </div>
                    </div>
                  ))}
                </div>

                {/* Individual Charts for each Top Type */}
                <div className="space-y-8">
                  {comparisonData.map((typeData, idx) => (
                    <div key={typeData.vehicleType} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block w-4 h-4 rounded"
                          style={{
                            backgroundColor: [
                              "#6366f1", "#22d3ee", "#f59e42", "#10b981",
                              "#f43f5e", "#a21caf"
                            ][idx % 6]
                          }}
                        />
                        <h3 className="font-semibold text-lg">{typeData.vehicleType}</h3>
                        <span className="text-sm text-muted-foreground">
                          Trend over last 6 periods
                        </span>
                      </div>
                      
                      <div className="w-full h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={typeData.data}
                            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="period" 
                              fontSize={11}
                              interval={0}
                            />
                            <YAxis width={40} fontSize={11} />
                            <Tooltip 
                              formatter={(value: number) => [value, "Count"]}
                              labelFormatter={(label: string) => `Period: ${label}`}
                            />
                            <Bar 
                              dataKey="count" 
                              fill={[
                                "#6366f1", "#22d3ee", "#f59e42", "#10b981",
                                "#f43f5e", "#a21caf"
                              ][idx % 6]} 
                              radius={[2, 2, 0, 0]}
                            >
                              <LabelList 
                                dataKey="count" 
                                position="top" 
                                fontSize={10}
                                formatter={(value: number) => value > 0 ? value : ""}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Vehicle Model Statistics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Model Statistics</CardTitle>
          <p className="text-sm text-muted-foreground">
            Top vehicle models/brands breakdown for selected period
          </p>
        </CardHeader>
        <CardContent>
          {filteredData.filteredVehicles.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              No data available for vehicle model breakdown
            </div>
          ) : (() => {
            // Count vehicles by model/brand
            const modelCounts = filteredData.filteredVehicles.reduce((acc, vehicle) => {
              const model = vehicle.vehicle_model || 'Unknown';
              acc[model] = (acc[model] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            // Get top models (limit to prevent overcrowding)
            const topModels = Object.entries(modelCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .map(([model, count]) => ({ model, count }));

            return (
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topModels}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="model" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [value, "Count"]} />
                    <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="count" position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Detailed breakdown button */}
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const detailedBreakdown = Object.entries(modelCounts)
                        .sort(([,a], [,b]) => b - a)
                        .map(([model, count]) => ({
                          model,
                          count,
                          percentage: ((count / filteredData.totalVehicles) * 100).toFixed(1) + '%'
                        }));

                      alert(`Detailed Vehicle Model Breakdown:\n\n${detailedBreakdown.map(item => 
                        `${item.model}: ${item.count} vehicles (${item.percentage})`
                      ).join('\n')}`);
                    }}
                  >
                    View Detailed Breakdown
                  </Button>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Records Table with Pagination */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vehicle Records ({filteredData.filteredVehicles.length} records)</CardTitle>
            <Badge variant="secondary">
              {loading ? "Loading..." : `${filteredData.filteredVehicles.length} filtered records`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pagination State */}
          {(() => {
            const rowsPerPage = 25;
            const total = filteredData.filteredVehicles.length;
            const totalPages = Math.ceil(total / rowsPerPage);
            const pagedVehicles = filteredData.filteredVehicles.slice((page - 1) * rowsPerPage, page * rowsPerPage);

            // Reset page if it's out of range
            if (page > totalPages && totalPages > 0) {
              setPage(1);
            }

            if (loading) {
              return (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading records...</span>
                </div>
              );
            }
            if (total === 0) {
              return (
                <div className="text-center p-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No records found matching your filters</p>
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                </div>
              );
            }
            return (
              <>
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
                      {pagedVehicles.map((vehicle) => (
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
                              <p className="text-xs text-muted-foreground">
                                <a href={`tel:${vehicle.phone_number}`} className="hover:text-primary transition-colors">
                                  {vehicle.phone_number}
                                </a>
                              </p>
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
                </div>
                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({pagedVehicles.length} shown)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
