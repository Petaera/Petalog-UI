import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Search, Calendar, Car, Clock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

// Types for vehicle history data
interface VehicleHistory {
  id: string;
  vehicle_number: string;
  service: string;
  amount: number;
  location: string;
  entry_type: string;
  manager: string;
  created_at: string;
  exit_time?: string;
  log_type: 'Manual';
}

interface VehicleStats {
  totalVisits: number;
  totalSpent: number;
  averageService: number;
  daysSinceLast: number;
}

interface CustomerDetails {
  name: string;
  phone: string;
  location?: string;
  dateOfBirth?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
}

interface VehicleHistoryProps {
  selectedLocation?: string;
}

export default function VehicleHistory({ selectedLocation }: VehicleHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("MH12AB1234"); // Default value for demo
  const [vehicleHistory, setVehicleHistory] = useState<VehicleHistory[]>([]);
  const [vehicleStats, setVehicleStats] = useState<VehicleStats>({
    totalVisits: 7,
    totalSpent: 3200,
    averageService: 457,
    daysSinceLast: 12
  });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState("MH12AB1234");
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);

  // Fetch customer details for a vehicle
  const fetchCustomerDetails = async (vehicleNumber: string) => {
    try {
      // Search in manual logs for customer details
      const { data: manualData, error: manualError } = await supabase
        .from('logs-man')
        .select('Name, Phone_no, Location, "D.O.B", vehicle_brand, vehicle_model')
        .ilike('vehicle_number', `%${vehicleNumber.trim()}%`)
        .eq('location_id', selectedLocation)
        .not('Name', 'is', null)
        .limit(1);

      if (manualError) {
        console.error('Error fetching customer details:', manualError);
        return null;
      }

      if (manualData && manualData.length > 0) {
        const customer = manualData[0];
        return {
          name: customer.Name || 'Not provided',
          phone: customer.Phone_no || 'Not provided',
          location: customer.Location || undefined,
          dateOfBirth: customer['D.O.B'] || undefined,
          vehicleBrand: customer.vehicle_brand || undefined,
          vehicleModel: customer.vehicle_model || undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching customer details:', error);
      return null;
    }
  };

  // Search vehicle history
  const searchVehicleHistory = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a vehicle number");
      return;
    }

    if (!selectedLocation) {
      toast.error("Please select a location first");
      return;
    }

    setLoading(true);
    setSearched(true);
    setCustomerDetails(null); // Reset customer details

    try {
      console.log('🔍 Searching for vehicle:', searchQuery, 'in location:', selectedLocation);

      // Build query with location filter for manual logs only
      let manualQuery = supabase
        .from('logs-man')
        .select('*')
        .ilike('vehicle_number', `%${searchQuery.trim()}%`)
        .eq('location_id', selectedLocation);

      const { data: manualData, error: manualError } = await manualQuery.order('created_at', { ascending: false });

      if (manualError) {
        console.error('❌ Error fetching manual logs:', manualError);
        toast.error('Failed to fetch manual logs');
        return;
      }

      console.log('✅ Manual logs fetched:', manualData?.length || 0, 'records');

      // Process manual logs data only
      const processedHistory = manualData?.map(log => ({
        id: log.id,
        vehicle_number: log.vehicle_number,
        service: log.service,
        amount: log.Amount || 0,
        location: log.location,
        entry_type: log.entry_type || 'Normal',
        manager: log.manager || 'Unknown',
        created_at: log.created_at,
        exit_time: log.exit_time,
        log_type: 'Manual' as const
      })) || [];

      setVehicleHistory(processedHistory);
      setCurrentVehicle(searchQuery.trim());

      // Fetch customer details
      const customerData = await fetchCustomerDetails(searchQuery.trim());
      setCustomerDetails(customerData);

      // Calculate statistics
      if (processedHistory.length > 0) {
        const totalVisits = processedHistory.length;
        const totalSpent = processedHistory.reduce((sum, visit) => sum + visit.amount, 0);
        const averageService = totalSpent / totalVisits;
        
        // Calculate days since last visit
        const lastVisit = new Date(processedHistory[0].created_at);
        const today = new Date();
        const daysSinceLast = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

        setVehicleStats({
          totalVisits,
          totalSpent,
          averageService,
          daysSinceLast
        });

        console.log('📊 Vehicle statistics calculated:', {
          totalVisits,
          totalSpent,
          averageService,
          daysSinceLast
        });
      } else {
        // If no data found, use default stats for demo
        setVehicleStats({
          totalVisits: 7,
          totalSpent: 3200,
          averageService: 457,
          daysSinceLast: 12
        });
      }

    } catch (error) {
      console.error('💥 Error searching vehicle history:', error);
      toast.error('Failed to search vehicle history');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Time';
      }
      return date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid Time';
    }
  };

  // Load initial data on component mount
  useEffect(() => {
    searchVehicleHistory();
  }, []);

  // Check if no location is selected
  if (!selectedLocation) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Vehicle History Search</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Location Selected</h2>
          <p className="text-gray-600 mb-4 max-w-md">
            Please select a location from the dropdown above to search vehicle history.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Vehicle history search is location-specific and requires a location to be selected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Vehicle History Search</h1>
          </div>
        </div>
      </div>

              {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-500" />
              Search Vehicle History
              <span className="text-sm text-muted-foreground ml-auto">
                Location: {selectedLocation}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                                 <Input 
                   placeholder="Enter vehicle number (e.g., MH12AB1234)" 
                   className="text-center font-mono text-lg"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                   onKeyPress={(e) => e.key === 'Enter' && searchVehicleHistory()}
                 />
              </div>
              <Button 
                variant="default" 
                onClick={searchVehicleHistory}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

      {/* Customer Details Card */}
      {customerDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-green-500" />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Customer Name</label>
                <p className="text-lg font-semibold">{customerDetails.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                <p className="text-lg font-semibold">{customerDetails.phone}</p>
              </div>
              {customerDetails.location && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-lg font-semibold">{customerDetails.location}</p>
                </div>
              )}
              {customerDetails.dateOfBirth && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                  <p className="text-lg font-semibold">{customerDetails.dateOfBirth}</p>
                </div>
              )}
              {customerDetails.vehicleBrand && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Vehicle Brand</label>
                  <p className="text-lg font-semibold">{customerDetails.vehicleBrand}</p>
                </div>
              )}
              {customerDetails.vehicleModel && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Vehicle Model</label>
                  <p className="text-lg font-semibold">{customerDetails.vehicleModel}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{vehicleStats.totalVisits}</p>
              <p className="text-sm text-muted-foreground">Total Visits</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-financial">₹{vehicleStats.totalSpent.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Spent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">₹{Math.round(vehicleStats.averageService)}</p>
              <p className="text-sm text-muted-foreground">Average Service</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{vehicleStats.daysSinceLast}</p>
              <p className="text-sm text-muted-foreground">Days Since Last</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Visit History - {currentVehicle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading vehicle history...</span>
            </div>
          ) : vehicleHistory.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No vehicle history found</p>
              <p className="text-sm">No records found for vehicle number: {currentVehicle}</p>
              <p className="text-xs mt-2">Showing demo data for demonstration purposes</p>
            </div>
          ) : (
                          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Entry Type</TableHead>
                    <TableHead>Log Type</TableHead>
                    <TableHead>Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleHistory.map((visit) => (
                    <TableRow key={`${visit.log_type}-${visit.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(visit.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatTime(visit.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{visit.service}</TableCell>
                      <TableCell className="font-semibold text-financial">
                        {visit.amount > 0 ? `₹${visit.amount.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={visit.entry_type === "Workshop" ? "default" : visit.entry_type === "Automatic" ? "outline" : "secondary"}>
                          {visit.entry_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={visit.log_type === "Manual" ? "default" : "secondary"}>
                          {visit.log_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{visit.manager}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}