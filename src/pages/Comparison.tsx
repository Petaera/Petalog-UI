import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOrCreateVehicleId } from "@/lib/utils";

interface ComparisonProps {
  selectedLocation?: string;
}

interface LogEntry {
  id: string;
  vehicle_number?: string;
  vehicles?: { number_plate: string };
  entry_time?: string;
  exit_time?: string;
  created_at: string;
  log_type: 'manual' | 'automatic' | 'common';
}

export default function Comparison({ selectedLocation }: ComparisonProps) {
  const [comparisonData, setComparisonData] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedLogType, setSelectedLogType] = useState<string>("all");

  useEffect(() => {
    console.log("Comparison useEffect - selectedLocation:", selectedLocation);
    console.log("Comparison useEffect - selectedLocation type:", typeof selectedLocation);
    console.log("Comparison useEffect - selectedDate:", selectedDate);
    
    if (!selectedLocation) {
      console.log("No location selected, showing error");
      toast.error("No location selected");
      return;
    }
    
    fetchComparisonData();
  }, [selectedLocation, selectedDate, selectedLogType]);

  const fetchComparisonData = async () => {
    setLoading(true);
    try {
      console.log("Fetching comparison data for location:", selectedLocation);
      
      // Fetch manual logs
      let manualQuery = supabase
        .from("logs-man")
        .select("*, vehicles(number_plate)")
        .eq("location_id", selectedLocation)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      // Add date filter if selected
      if (selectedDate) {
        const startOfDay = `${selectedDate}T00:00:00.000Z`;
        const endOfDay = `${selectedDate}T23:59:59.999Z`;
        manualQuery = manualQuery
          .gte("entry_time", startOfDay)
          .lte("entry_time", endOfDay);
      }

      const { data: manualLogs, error: manualError } = await manualQuery;

      if (manualError) {
        console.error('Error fetching manual logs:', manualError);
        return;
      }

      // Fetch automatic logs
      let automaticQuery = supabase
        .from("logs-auto")
        .select("*, vehicles(number_plate)")
        .eq("location_id", selectedLocation)
        .order("created_at", { ascending: false });

      // Add date filter if selected
      if (selectedDate) {
        const startOfDay = `${selectedDate}T00:00:00.000Z`;
        const endOfDay = `${selectedDate}T23:59:59.999Z`;
        automaticQuery = automaticQuery
          .gte("entry_time", startOfDay)
          .lte("entry_time", endOfDay);
      }

      const { data: automaticLogs, error: automaticError } = await automaticQuery;

      if (automaticError) {
        console.error('Error fetching automatic logs:', automaticError);
        return;
      }

      // Process and combine logs
      const processedManualLogs = (manualLogs || []).map(log => ({
        ...log,
        vehicle_number: log.vehicle_number || log.vehicles?.number_plate || "",
        log_type: 'manual' as const
      }));

      const processedAutomaticLogs = (automaticLogs || []).map(log => ({
        ...log,
        vehicle_number: log.vehicle_number || log.vehicles?.number_plate || "",
        log_type: 'automatic' as const
      }));

      // Create maps for finding common vehicles
      const manualVehicleMap = new Map();
      const automaticVehicleMap = new Map();

      processedManualLogs.forEach(log => {
        const key = `${log.vehicle_number}-${new Date(log.created_at).toDateString()}`;
        manualVehicleMap.set(key, log);
      });

      processedAutomaticLogs.forEach(log => {
        const key = `${log.vehicle_number}-${new Date(log.created_at).toDateString()}`;
        automaticVehicleMap.set(key, log);
      });

      // Find common vehicles
      const commonVehicles = new Set();
      for (const [key] of manualVehicleMap) {
        if (automaticVehicleMap.has(key)) {
          commonVehicles.add(key);
        }
      }

      // Mark common entries
      const allLogs = [
        ...processedManualLogs.map(log => {
          const key = `${log.vehicle_number}-${new Date(log.created_at).toDateString()}`;
          return {
            ...log,
            log_type: commonVehicles.has(key) ? 'common' as const : 'manual' as const
          };
        }),
        ...processedAutomaticLogs.map(log => {
          const key = `${log.vehicle_number}-${new Date(log.created_at).toDateString()}`;
          return {
            ...log,
            log_type: commonVehicles.has(key) ? 'common' as const : 'automatic' as const
          };
        })
      ];

      // Remove duplicates for common entries (keep only one entry per common vehicle+date)
      const finalLogs: LogEntry[] = [];
      const addedCommonKeys = new Set();

      allLogs.forEach(log => {
        const key = `${log.vehicle_number}-${new Date(log.created_at).toDateString()}`;
        
        if (log.log_type === 'common') {
          if (!addedCommonKeys.has(key)) {
            finalLogs.push(log);
            addedCommonKeys.add(key);
          }
        } else {
          finalLogs.push(log);
        }
      });

      // Apply log type filter
      let filteredLogs = finalLogs;
      if (selectedLogType !== "all") {
        filteredLogs = finalLogs.filter(log => log.log_type === selectedLogType);
      }

      // Sort by date
      filteredLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setComparisonData(filteredLogs);
      console.log('Comparison data set:', filteredLogs);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDuration = (entry: string, exit: string) => {
    if (!entry || !exit) return "-";
    const ms = Number(new Date(exit)) - Number(new Date(entry));
    if (isNaN(ms) || ms < 0) return "-";
    const min = Math.floor(ms / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const clearDateFilter = () => {
    setSelectedDate("");
  };

  const clearLogTypeFilter = () => {
    setSelectedLogType("all");
  };

  return (
    <div className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            <h1 className="text-xl lg:text-2xl font-bold">Comparison</h1>
          </div>
        </div>
      </div>

      {/* Date and Type Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="date-filter" className="text-sm font-medium">
                Filter by Date:
              </Label>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-48"
              />
              <Select value={selectedLogType} onValueChange={setSelectedLogType}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select log type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="common">Common Only</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                  <SelectItem value="automatic">Automatic Only</SelectItem>
                </SelectContent>
              </Select>
              {(selectedDate || selectedLogType !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearDateFilter();
                    clearLogTypeFilter();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Time</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Time</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                    ) : comparisonData.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">
                        {selectedDate || selectedLogType !== "all" 
                          ? `No logs found for ${selectedDate ? `date ${new Date(selectedDate).toLocaleDateString()}` : ''}${selectedDate && selectedLogType !== "all" ? ' and ' : ''}${selectedLogType !== "all" ? `type ${selectedLogType}` : ''}`
                          : 'No logs found'}
                      </td></tr>
                    ) : (
                      comparisonData.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-muted/30">
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {log.vehicle_number || log.vehicles?.number_plate || "-"}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.entry_time ? new Date(log.entry_time).toLocaleString() : 
                             log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.exit_time ? new Date(log.exit_time).toLocaleString() : "-"}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getDuration(log.entry_time, log.exit_time)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                            <Badge 
                              variant={log.log_type === 'common' ? 'secondary' : log.log_type === 'manual' ? 'default' : 'outline'}
                              className={log.log_type === 'common' ? 'bg-gray-100 text-gray-800' : ''}
                            >
                              {log.log_type === 'common' ? 'Common' : log.log_type === 'manual' ? 'Manual' : 'Automatic'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}