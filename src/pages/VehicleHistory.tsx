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
}

interface VehicleStats {
  totalVisits: number;
  totalSpent: number;
  averageService: number;
  daysSinceLast: number;
}

export default function VehicleHistory() {
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

  // Search vehicle history
  const searchVehicleHistory = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a vehicle number");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      console.log('🔍 Searching for vehicle:', searchQuery);

      // Fetch vehicle history from logs-man table
      const { data: historyData, error: historyError } = await supabase
        .from('logs-man')
        .select('*')
        .ilike('vehicle_number', `%${searchQuery.trim()}%`)
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('❌ Error fetching vehicle history:', historyError);
        toast.error('Failed to fetch vehicle history');
        return;
      }

      console.log('✅ Vehicle history fetched:', historyData?.length || 0, 'records');

      // Process the data
      const processedHistory = historyData?.map(log => ({
        id: log.id,
        vehicle_number: log.vehicle_number,
        service: log.service,
        amount: log.Amount || 0,
        location: log.location,
        entry_type: log.entry_type || 'Normal',
        manager: log.manager || 'Unknown',
        created_at: log.created_at,
        exit_time: log.exit_time
      })) || [];

      setVehicleHistory(processedHistory);
      setCurrentVehicle(searchQuery.trim());

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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Load initial data on component mount
  useEffect(() => {
    searchVehicleHistory();
  }, []);

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
          <CardTitle>Search Vehicle History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Enter vehicle number (e.g., MH12AB1234)" 
                className="text-center font-mono text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  <TableHead>Location</TableHead>
                  <TableHead>Entry Type</TableHead>
                  <TableHead>Manager</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleHistory.map((visit) => (
                  <TableRow key={visit.id}>
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
                    <TableCell className="font-semibold text-financial">₹{visit.amount.toLocaleString()}</TableCell>
                    <TableCell>{visit.location}</TableCell>
                    <TableCell>
                      <Badge variant={visit.entry_type === "Workshop" ? "default" : "secondary"}>
                        {visit.entry_type}
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