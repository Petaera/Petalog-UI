import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Search, Calendar, Car, Clock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  averageDaysBetweenVisits: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPhone, setSearchPhone] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [vehicleHistory, setVehicleHistory] = useState<VehicleHistory[]>([]);
  const [vehicleStats, setVehicleStats] = useState<VehicleStats>({
    totalVisits: 0,
    totalSpent: 0,
    averageService: 0,
    daysSinceLast: 0,
    averageDaysBetweenVisits: 0
  });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState("");
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [groupedSummaries, setGroupedSummaries] = useState<
    Array<{
      vehicle_number: string;
      name?: string | null;
      phone?: string | null;
      brand?: string | null;
      model?: string | null;
      visits: number;
      lastVisit: string;
      totalSpent: number;
    }>
  >([]);
  const [sortBy, setSortBy] = useState<'visits' | 'totalSpent'>('visits');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [locationName, setLocationName] = useState<string>("");
  const brandInputRef = useRef<HTMLDivElement>(null);
  const modelInputRef = useRef<HTMLDivElement>(null);

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
    if (!selectedLocation) {
      toast.error("Please select a location first");
      return;
    }

    setLoading(true);
    setSearched(true);
    setCustomerDetails(null); // Reset customer details
    setGroupedSummaries([]);

    try {
      console.log('🔍 Searching manual logs with filters:', {
        vehicle_number: searchQuery,
        phone: searchPhone,
        name: searchName,
        brand: selectedBrand,
        model: selectedModel,
        location: selectedLocation,
      });

      // Build query with location filter for manual logs only
      let manualQuery = supabase
        .from('logs-man')
        .select('*')
        .eq('location_id', selectedLocation);

      // Apply optional filters (AND semantics)
      if (searchQuery.trim()) {
        manualQuery = manualQuery.ilike('vehicle_number', `%${searchQuery.trim()}%`);
      }
      if (searchPhone.trim()) {
        const phoneAsNumber = Number(searchPhone.replace(/\D/g, ''));
        if (!Number.isNaN(phoneAsNumber)) {
          manualQuery = manualQuery.eq('Phone_no', phoneAsNumber);
        }
      }
      if (searchName.trim()) {
        manualQuery = manualQuery.ilike('Name', `%${searchName.trim()}%`);
      }
      if (selectedBrand) {
        manualQuery = manualQuery.ilike('vehicle_brand', `%${selectedBrand.trim()}%`);
      }
      if (selectedModel) {
        manualQuery = manualQuery.ilike('vehicle_model', `%${selectedModel.trim()}%`);
      }

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

      // Group by vehicle_number to show summaries when multiple vehicles match
      const groups = new Map<string, typeof groupedSummaries[number]>();
      (manualData || []).forEach((log: any) => {
        const key = (log.vehicle_number || 'UNKNOWN').toUpperCase();
        const existing = groups.get(key);
        const amount = Number(log.Amount || 0) || 0;
        if (existing) {
          existing.visits += 1;
          existing.totalSpent += amount;
          if (new Date(log.created_at) > new Date(existing.lastVisit)) {
            existing.lastVisit = log.created_at;
          }
        } else {
          groups.set(key, {
            vehicle_number: key,
            name: log.Name ?? null,
            phone: log.Phone_no ? String(log.Phone_no) : null,
            brand: log.vehicle_brand ?? null,
            model: log.vehicle_model ?? null,
            visits: 1,
            lastVisit: log.created_at,
            totalSpent: amount,
          });
        }
      });

      const summaries = Array.from(groups.values());
      setGroupedSummaries(summaries);

      // Choose current vehicle context
      if (summaries.length === 1) {
        setCurrentVehicle(summaries[0].vehicle_number);
      } else if (searchQuery.trim()) {
        setCurrentVehicle(searchQuery.trim());
      } else if (summaries.length > 1) {
        setCurrentVehicle('');
      }

      // Fetch customer details only when a single vehicle is clearly targeted
      if ((summaries.length === 1 && summaries[0].vehicle_number) || searchQuery.trim()) {
        const vehicleForDetails = summaries.length === 1 ? summaries[0].vehicle_number : searchQuery.trim();
        const customerData = await fetchCustomerDetails(vehicleForDetails);
        setCustomerDetails(customerData);
      }

      // Calculate statistics
      if (processedHistory.length > 0) {
        const totalVisits = processedHistory.length;
        const totalSpent = processedHistory.reduce((sum, visit) => sum + visit.amount, 0);
        const averageService = totalSpent / totalVisits;
        
        // Sort visits by date ascending to calculate days between visits
        const sortedVisits = [...processedHistory].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Calculate average days between visits
        let totalDaysBetweenVisits = 0;
        for (let i = 1; i < sortedVisits.length; i++) {
          const currentVisit = new Date(sortedVisits[i].created_at);
          const previousVisit = new Date(sortedVisits[i - 1].created_at);
          totalDaysBetweenVisits += Math.floor((currentVisit.getTime() - previousVisit.getTime()) / (1000 * 60 * 60 * 24));
        }
        const averageDaysBetweenVisits = totalVisits > 1 ? Math.round(totalDaysBetweenVisits / (totalVisits - 1)) : 0;
        
        // Calculate days since last visit
        const lastVisit = new Date(processedHistory[0].created_at);
        const today = new Date();
        const daysSinceLast = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

        setVehicleStats({
          totalVisits,
          totalSpent,
          averageService,
          daysSinceLast,
          averageDaysBetweenVisits
        });

        console.log('📊 Vehicle statistics calculated:', {
          totalVisits,
          totalSpent,
          averageService,
          daysSinceLast
        });
      } else {
        // If no data found, reset stats to zero
        setVehicleStats({
          totalVisits: 0,
          totalSpent: 0,
          averageService: 0,
          daysSinceLast: 0,
          averageDaysBetweenVisits: 0
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
    // Fetch location name when location changes
    const fetchLocationName = async () => {
      if (!selectedLocation) {
        setLocationName("");
        return;
      }
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('name')
          .eq('id', selectedLocation)
          .single();
        if (!error && data) {
          setLocationName((data as any).name || "");
        }
      } catch (e) {
        // ignore
      }
    };
    fetchLocationName();
  }, [selectedLocation]);
  
  useEffect(() => {
    searchVehicleHistory();
  }, []);

  // Debounced brand suggestions
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      const q = selectedBrand.trim();
      if (q.length < 2) {
        setBrandSuggestions([]);
        return;
      }
      try {
        setBrandLoading(true);
        console.log('🔍 Fetching brand suggestions for:', q);
        const { data, error } = await supabase
          .from('Vehicles_in_india')
          .select('"Vehicle Brands"')
          .ilike('"Vehicle Brands"', `%${q}%`)
          .limit(20);
        
        console.log('Brand query result:', { data, error });
        
        if (!error && data) {
          const list = Array.from(new Set((data as any[]).map(r => r['Vehicle Brands']).filter(Boolean)));
          console.log('Brand suggestions:', list);
          setBrandSuggestions(list);
        } else if (error) {
          console.error('Brand query error:', error);
        }
      } catch (err) {
        console.error('Brand suggestions error:', err);
      } finally {
        setBrandLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedBrand]);

  // Debounced model suggestions (depends on brand if provided)
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      const q = selectedModel.trim();
      if (q.length < 2) {
        setModelSuggestions([]);
        return;
      }
      try {
        setModelLoading(true);
        console.log('🔍 Fetching model suggestions for:', q, 'with brand:', selectedBrand);
        let query = supabase
          .from('Vehicles_in_india')
          .select('"Models"')
          .ilike('"Models"', `%${q}%`)
          .limit(20);
        if (selectedBrand.trim()) {
          query = query.ilike('"Vehicle Brands"', `%${selectedBrand.trim()}%`);
        }
        const { data, error } = await query;
        
        console.log('Model query result:', { data, error });
        
        if (!error && data) {
          const list = Array.from(new Set((data as any[]).map(r => r.Models).filter(Boolean)));
          console.log('Model suggestions:', list);
          setModelSuggestions(list);
        } else if (error) {
          console.error('Model query error:', error);
        }
      } catch (err) {
        console.error('Model suggestions error:', err);
      } finally {
        setModelLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedModel, selectedBrand]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandInputRef.current && !brandInputRef.current.contains(event.target as Node)) {
        setBrandSuggestions([]);
      }
      if (modelInputRef.current && !modelInputRef.current.contains(event.target as Node)) {
        setModelSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
                Location: {locationName || '—'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                placeholder="Vehicle number (e.g., MH12AB1234)"
                className="text-center font-mono"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && searchVehicleHistory()}
              />
              <Input
                placeholder="Phone number"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchVehicleHistory()}
              />
              <Input
                placeholder="Customer name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchVehicleHistory()}
              />
              <div className="relative" ref={brandInputRef}>
                <Input
                  placeholder="Vehicle brand"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchVehicleHistory()}
                />
                {brandSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-white shadow">
                    {brandSuggestions.map((b) => (
                      <div
                        key={b}
                        className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                        onMouseDown={() => { setSelectedBrand(b); setBrandSuggestions([]); }}
                      >
                        {b}
                      </div>
                    ))}
                    {brandLoading && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
                    )}
                  </div>
                )}
              </div>
              <div className="relative" ref={modelInputRef}>
                <Input
                  placeholder="Vehicle model"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchVehicleHistory()}
                />
                {modelSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-white shadow">
                    {modelSuggestions.map((m) => (
                      <div
                        key={m}
                        className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                        onMouseDown={() => { setSelectedModel(m); setModelSuggestions([]); }}
                      >
                        {m}
                      </div>
                    ))}
                    {modelLoading && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-stretch gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchPhone("");
                    setSearchName("");
                    setSelectedBrand("");
                    setSelectedModel("");
                    setBrandSuggestions([]);
                    setModelSuggestions([]);
                  }}
                  disabled={loading}
                >
                  Clear
                </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <p className="text-2xl font-bold text-blue-500">{vehicleStats.averageDaysBetweenVisits}</p>
              <p className="text-sm text-muted-foreground">Avg. Days Between Visits</p>
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

      {/* Sort and Grouped results when multiple vehicles match */}
      {groupedSummaries.length > 1 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-muted-foreground">Sort by</div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Metric" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visits">Visits</SelectItem>
                <SelectItem value="totalSpent">Total Spent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Order" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Matching Vehicles ({groupedSummaries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const sorted = [...groupedSummaries].sort((a, b) => {
                  const metricA = sortBy === 'visits' ? a.visits : a.totalSpent;
                  const metricB = sortBy === 'visits' ? b.visits : b.totalSpent;
                  return sortOrder === 'asc' ? metricA - metricB : metricB - metricA;
                });
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sorted.map((g) => (
                      <div key={g.vehicle_number} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-semibold">{g.vehicle_number}</div>
                          <Badge variant="secondary">{g.visits} visits</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {g.brand || '-'} {g.model ? `• ${g.model}` : ''}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Customer</div>
                            <div className="font-medium">{g.name || '-'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Phone</div>
                            <div className="font-medium">{g.phone || '-'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Last Visit</div>
                            <div className="font-medium">{formatDate(g.lastVisit)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Total Spent</div>
                            <div className="font-semibold text-financial">₹{Math.round(g.totalSpent).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => {
                            setSearchQuery(g.vehicle_number);
                            setSearchPhone('');
                            setSearchName('');
                            setSelectedBrand(g.brand || '');
                            setSelectedModel(g.model || '');
                            searchVehicleHistory();
                          }}>View history</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Visit History {currentVehicle ? `- ${currentVehicle}` : ''}
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
              <p className="text-sm">No records found for given specifications</p>
              {/* <p className="text-xs mt-2">Showing demo data for demonstration purposes</p> */}
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