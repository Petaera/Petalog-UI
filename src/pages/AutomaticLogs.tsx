import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Database, X, Calendar, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

// Debug Supabase client
console.log('🔍 AutomaticLogs Supabase client debug:', {
  hasSupabase: !!supabase,
  supabaseType: typeof supabase,
  hasFrom: !!supabase?.from,
  hasSelect: !!supabase?.from?.('test')?.select
});

interface AutomaticLogsProps {
  selectedLocation?: string;
}

export default function AutomaticLogs({ selectedLocation }: AutomaticLogsProps) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true); // Changed to true
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const defaultDate = today.toISOString().split('T')[0];
    console.log('🔍 AutomaticLogs Initial date state:', {
      today,
      todayISO: today.toISOString(),
      defaultDate
    });
    return defaultDate;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  // Debug selectedLocation prop changes
  useEffect(() => {
    console.log('🔍 AutomaticLogs selectedLocation prop changed:', {
      selectedLocation,
      hasLocation: !!selectedLocation,
      locationType: typeof selectedLocation,
      locationLength: selectedLocation?.length || 0
    });
  }, [selectedLocation]);

  // Debug logs state changes
  useEffect(() => {
    console.log('🔍 AutomaticLogs logs state changed:', {
      logsLength: logs?.length || 0,
      loading,
      hasLogs: !!logs
    });
  }, [logs, loading]);

  // Debug table rendering
  useEffect(() => {
    console.log('🔍 AutomaticLogs Table rendering with:', {
      loading,
      logsLength: logs?.length || 0,
      selectedDate,
      hasLogs: !!logs
    });
  }, [loading, logs, selectedDate]);

  // Debug component lifecycle
  useEffect(() => {
    console.log('🔍 AutomaticLogs Component mounted');
    return () => {
      console.log('🔍 AutomaticLogs Component unmounting');
    };
  }, []);

  console.log("AutomaticLogs component rendered:", {
    selectedLocation,
    selectedDate,
    loading,
    logsLength: logs?.length || 0
  });

  const fetchLogs = useCallback(async () => {
    console.log('🔍 AutomaticLogs Starting fetchLogs with:', {
      selectedLocation,
      selectedDate
    });

    // Safety check - don't proceed without location
    if (!selectedLocation) {
      console.warn('⚠️ AutomaticLogs fetchLogs called without selectedLocation, aborting');
      setLoading(false);
      setLogs([]);
      return;
    }

    setLoading(true);

    try {
      // Test Supabase connection first
      console.log('🔍 AutomaticLogs Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase
        .from("logs-auto")
        .select("id")
        .limit(1);
      console.log('🔍 AutomaticLogs Supabase connection test:', { testData, testError });

      // Build query step by step to ensure proper filtering
      let query = supabase
        .from("logs-auto")
        .select("id, entry_time, exit_time, vehicle_id, entry_url, exit_image, created_at, vehicles(number_plate), location_id");

      console.log('🔍 AutomaticLogs Query built:', { table: "logs-auto", hasQuery: !!query });

      // Apply location filter
      query = query.eq("location_id", selectedLocation);
      console.log('🔍 AutomaticLogs Location filter applied:', {
        selectedLocation,
        locationType: typeof selectedLocation,
        hasLocation: !!selectedLocation,
        queryAfterLocation: !!query
      });

      // Apply date filter if selected
      if (selectedDate) {
        const startOfDay = new Date(selectedDate);
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        query = query
          .gte('entry_time', startOfDay.toISOString())
          .lt('entry_time', endOfDay.toISOString());
        
        console.log('🔍 AutomaticLogs Date filter applied:', {
          selectedDate,
          startOfDay: startOfDay.toISOString(),
          endOfDay: endOfDay.toISOString(),
          queryAfterDate: !!query
        });
      }

      // Order by entry time (newest first) and limit results
      query = query.order('entry_time', { ascending: false }).limit(100);
      
      console.log('🔍 AutomaticLogs Final query ready, executing...');
      const { data, error } = await query;
      
      console.log('🔍 AutomaticLogs Query executed:', {
        error: error ? error.message : null,
        dataLength: data?.length || 0,
        hasData: !!data
      });

      if (error) {
        console.error('❌ AutomaticLogs Error fetching logs:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setLogs([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ AutomaticLogs No logs found for the selected criteria');
        setLogs([]);
        return;
      }

      // If no data with date filter, try without date filter to see if there's any data at all
      if ((!data || data.length === 0) && selectedDate) {
        console.log('🔍 AutomaticLogs No data with date filter, checking without date filter...');
        
        // Try without date filter
        const fallbackQuery = supabase
          .from("logs-auto")
          .select("id, entry_time, exit_time, vehicle_id, entry_url, exit_image, created_at, vehicles(number_plate), location_id")
          .eq("location_id", selectedLocation)
          .order("entry_time", { ascending: false })
          .limit(5);
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        console.log('🔍 AutomaticLogs Fallback query result:', { fallbackData, fallbackError, count: fallbackData?.length || 0 });
        
        // Also try without location filter to see if there's any data at all
        const noLocationQuery = supabase
          .from("logs-auto")
          .select("id, entry_time, exit_time, vehicle_id, entry_url, exit_image, created_at, vehicles(number_plate), location_id")
          .order("entry_time", { ascending: false })
          .limit(5);
        
        const { data: noLocationData, error: noLocationError } = await noLocationQuery;
        console.log('🔍 AutomaticLogs No location filter query result:', { noLocationData, noLocationError, count: noLocationData?.length || 0 });
        
        // Check what locations exist in the data
        if (noLocationData && noLocationData.length > 0) {
          const locations = [...new Set(noLocationData.map(item => item.location_id))];
          console.log('🔍 AutomaticLogs Available locations in database:', locations);
        }
      }
      
      // Additional check: Remove any duplicate IDs that might have slipped through
      let uniqueData = data;
      if (data && data.length > 0) {
        const seenIds = new Set();
        uniqueData = data.filter(item => {
          if (seenIds.has(item.id)) {
            console.log('🔍 AutomaticLogs Duplicate ID found and removed:', item.id);
            return false;
          }
          seenIds.add(item.id);
          return true;
        });
        
        console.log('🔍 AutomaticLogs Duplicate removal:', {
          originalCount: data.length,
          uniqueCount: uniqueData.length,
          duplicatesRemoved: data.length - uniqueData.length
        });
      }

      if (!error && uniqueData) {
        console.log('🔍 AutomaticLogs Setting logs state with data:', {
          dataLength: uniqueData.length,
          sampleData: uniqueData.slice(0, 2)
        });
        setLogs(uniqueData);
        console.log('AutomaticLogs logs state after setLogs:', uniqueData);
        console.log('AutomaticLogs Final logs count:', uniqueData.length);
      } else {
        console.warn('AutomaticLogs No data or error:', { error, uniqueData });
        console.log('🔍 AutomaticLogs Setting logs state to empty array');
        setLogs([]);
      }
    } catch (error) {
      console.error('AutomaticLogs Error in fetchLogs:', error);
      console.log('🔍 AutomaticLogs Error details:', {
        errorType: typeof error,
        errorMessage: error?.message,
        errorStack: error?.stack
      });
      setLogs([]);
    } finally {
      setLoading(false);
      console.log('AutomaticLogs Loading states reset:', { loading: false });
    }
  }, [selectedLocation, selectedDate]); // Removed isFetching from dependencies

  useEffect(() => {
    console.log("AutomaticLogs useEffect running:", {
      selectedLocation,
      selectedDate,
      fetchLogsFunction: typeof fetchLogs,
      hasLocation: !!selectedLocation,
      locationType: typeof selectedLocation
    });

    if (!selectedLocation) {
      console.log("🔍 AutomaticLogs No location selected, skipping fetch");
      setLoading(false);
      setLogs([]);
      return;
    }

    // Don't fetch if date is not set yet
    if (!selectedDate) {
      console.log("🔍 AutomaticLogs Date not set yet, skipping fetch");
      return;
    }

    console.log("🔍 AutomaticLogs Calling fetchLogs with location:", selectedLocation);
    fetchLogs();
  }, [selectedLocation, selectedDate, fetchLogs]);

  function formatToDateTime(dateString) {
  const date = new Date(dateString);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = String(hours).padStart(2, '0');

  return `${day}/${month}/${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
}

  function getDuration(entry, exit) {
    if (!entry || !exit) return "-";
    const ms = Number(new Date(exit)) - Number(new Date(entry));
    if (isNaN(ms) || ms < 0) return "-";
    const min = Math.floor(ms / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setIsModalOpen(false);
    setSelectedImage("");
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeImageModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isModalOpen]);

  const clearDateFilter = () => {
    // Reset to today's date
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('logs-auto')
        .delete()
        .eq('id', logId);

      if (error) {
        console.error('Error deleting log:', error);
        toast.error('Failed to delete log');
        return;
      }

      toast.success('Log deleted successfully');
      // Refresh the logs
      fetchLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Failed to delete log');
    }
  };
  console.log(selectedLocation)
  // Check if no location is selected
  if (!selectedLocation) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Automatic Logs</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Location Selected</h2>
          <p className="text-gray-600 mb-4 max-w-md">
            Please select a location from the dropdown above to view automatic logs.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Automatic logs are location-specific and require a location to be selected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Automatic Logs</h1>
        </div>
      </div>

        {/* Date Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="selectedDate" className="text-sm font-medium">
                  Filter by Date:
                </Label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="selectedDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    console.log('🔍 AutomaticLogs Date input changed:', {
                      oldValue: selectedDate,
                      newValue: e.target.value,
                      eventType: e.type
                    });
                    setSelectedDate(e.target.value);
                  }}
                  className="w-full sm:w-48"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDateFilter}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Today
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automatic Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                <span>Automatic Logs</span>
                <span className="text-sm text-muted-foreground">({logs.length} entries)</span>
              </div>
              {selectedDate && (
                <Badge variant="outline" className="sm:ml-2">
                  {new Date(selectedDate).toLocaleDateString()}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr>
                  <th className="border px-4 py-2">Vehicle No</th>
                  <th className="border px-4 py-2">Vehicle Type</th>
                  <th className="border px-4 py-2">Entry Time</th>
                  <th className="border px-4 py-2">Exit Time</th>
                  <th className="border px-4 py-2">Entry Image</th>
                  <th className="border px-4 py-2">Exit Image</th>
                  <th className="border px-4 py-2">Duration</th>
                  <th className="border px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-4">Loading...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4">
                    {selectedDate ? `No logs found for ${new Date(selectedDate).toLocaleDateString()}` : 'No logs found for this location.'}
                  </td></tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td className="border px-4 py-2">{log.vehicles?.number_plate || "-"}</td>
                      <td className="border px-4 py-2">-</td>
                      <td className="border px-4 py-2">
                        {log.entry_time ?
                          formatToDateTime(log.entry_time) : "-"
                        }
                      </td>
                      <td className="border px-4 py-2">
                        {log.exit_time ?
                          formatToDateTime(log.exit_time) : "-"
                        }
                      </td>
                      <td className="border px-4 py-2">
                        {log.entry_url ? (
                          <img
                            src={log.entry_url}
                            alt="Entry"
                            className="w-16 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openImageModal(log.entry_url)}
                            title="Click to view full image"
                          />
                        ) : (
                          <img src={"/placeholder.svg"} alt="Entry" className="w-16 h-10 object-cover" />
                        )}
                      </td>
                      <td className="border px-4 py-2">
                        {log.exit_image ? (
                          <img
                            src={log.exit_image}
                            alt="Exit"
                            className="w-16 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openImageModal(log.exit_image)}
                            title="Click to view full image"
                          />
                        ) : (
                          <img src={"/placeholder.svg"} alt="Exit" className="w-16 h-10 object-cover" />
                        )}
                      </td>
                      <td className="border px-4 py-2">{getDuration(log.entry_time, log.exit_time)}</td>
                      <td className="border px-4 py-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(log.id)}
                          className="text-xs"
                          title="Delete log"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Image Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeImageModal}
        >
          <div className="relative max-w-4xl max-h-4xl p-4">
            <button
              onClick={closeImageModal}
              className="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors z-10"
              title="Close (Esc)"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
            <img
              src={selectedImage}
              alt="Full size image"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}