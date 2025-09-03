import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Database, X, Calendar, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";



export default function ManagerAutomaticLogs() {
  const { user } = useAuth();
  

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
     const [selectedDate, setSelectedDate] = useState(() => {
     // Set default date to today
     const today = new Date();
     const defaultDate = today.toISOString().split('T')[0];
     return defaultDate;
   });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  

  

     const fetchLogs = useCallback(async () => {
     setLoading(true);
     
     try {
       // Build query step by step to ensure proper filtering
       let query = supabase
         .from("logs-auto")
         .select("id, entry_time, exit_time, vehicle_id, entry_url, exit_image, created_at, vehicles(number_plate), location_id");

             // Apply location filter
       query = query.eq("location_id", user?.assigned_location);

             // Apply single date filter if provided
       if (selectedDate) {
         const startOfDay = `${selectedDate}T00:00:00.000Z`;
         const endOfDay = `${selectedDate}T23:59:59.999Z`;
         query = query
           .gte("entry_time", startOfDay)
           .lte("entry_time", endOfDay);
       }

      // Add distinct to prevent duplicate rows
      console.log('🔍 ManagerAutomaticLogs Executing final query...');
      const { data, error } = await query.order("entry_time", { ascending: false });
      
      console.log('🔍 ManagerAutomaticLogs Raw query result:', { data, error });
      console.log('🔍 ManagerAutomaticLogs Data length:', data?.length || 0);
      console.log('🔍 ManagerAutomaticLogs Query completed successfully:', !error);
      
      // If no data with date filter, try without date filter to see if there's any data at all
      if ((!data || data.length === 0) && selectedDate) {
        console.log('🔍 ManagerAutomaticLogs No data with date filter, checking without date filter...');
        
        // Try without date filter
        const fallbackQuery = supabase
          .from("logs-auto")
          .select("id, entry_time, exit_time, vehicle_id, entry_url, exit_image, created_at, vehicles(number_plate), location_id")
          .eq("location_id", user?.assigned_location)
          .order("entry_time", { ascending: false })
          .limit(5);
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        console.log('🔍 ManagerAutomaticLogs Fallback query result:', { fallbackData, fallbackError, count: fallbackData?.length || 0 });
        
        // Also try without location filter to see if there's any data at all
        const noLocationQuery = supabase
          .from("logs-auto")
          .select("id, entry_time, exit_time, vehicle_id, entry_url, exit_image, created_at, vehicles(number_plate), location_id")
          .order("entry_time", { ascending: false })
          .limit(5);
        
        const { data: noLocationData, error: noLocationError } = await noLocationQuery;
        console.log('🔍 ManagerAutomaticLogs No location filter query result:', { noLocationData, noLocationError, count: noLocationData?.length || 0 });
        
        // Check what locations exist in the data
        if (noLocationData && noLocationData.length > 0) {
          const locations = [...new Set(noLocationData.map(item => item.location_id))];
          console.log('🔍 ManagerAutomaticLogs Available locations in database:', locations);
        }
      }
      
      // Additional check: Remove any duplicate IDs that might have slipped through
      let uniqueData = data;
      console.log('🔍 ManagerAutomaticLogs Processing data:', { 
        hasData: !!data, 
        dataLength: data?.length || 0,
        dataType: typeof data,
        isArray: Array.isArray(data)
      });
      
      if (data && data.length > 0) {
        const seenIds = new Set();
        uniqueData = data.filter((log: any) => {
          if (seenIds.has(log.id)) {
            console.warn('⚠️ Duplicate ID found in query result:', log.id);
            return false;
          }
          seenIds.add(log.id);
          return true;
        });
        
        if (uniqueData.length !== data.length) {
          console.warn(`⚠️ Removed ${data.length - uniqueData.length} duplicate IDs from query result`);
        }
        
        console.log('🔍 ManagerAutomaticLogs Data after deduplication:', { 
          originalLength: data.length, 
          uniqueLength: uniqueData.length 
        });
      }
      
      console.log('ManagerAutomaticLogs Supabase logs-auto data:', uniqueData);
      console.log('ManagerAutomaticLogs Supabase error:', error);
      
      // Check for duplicate entries
      if (uniqueData && uniqueData.length > 0) {
        const duplicateCheck = uniqueData.reduce((acc: any, log: any) => {
          const key = `${log.vehicle_id}_${log.entry_time}_${log.location_id}`;
          if (acc[key]) {
            acc[key].count++;
            acc[key].logs.push(log);
          } else {
            acc[key] = { count: 1, logs: [log] };
          }
          return acc;
        }, {});
        
        const duplicates = Object.entries(duplicateCheck).filter(([key, value]: [string, any]) => value.count > 1);
        if (duplicates.length > 0) {
          console.warn('⚠️ Found duplicate entries:', duplicates);
          console.warn('⚠️ Duplicate details:', duplicates.map(([key, value]: [string, any]) => ({
            key,
            count: value.count,
            logs: value.logs.map((log: any) => ({
              id: log.id,
              vehicle_id: log.vehicle_id,
              entry_time: log.entry_time,
              created_at: log.created_at,
              location_id: log.location_id
            }))
          })));
        }
        
        // Check for entries with very close timestamps (within 5 minutes)
        const timeBasedDuplicates = [];
        for (let i = 0; i < uniqueData.length; i++) {
          for (let j = i + 1; j < uniqueData.length; j++) {
            const timeDiff = Math.abs(new Date(uniqueData[i].entry_time).getTime() - new Date(uniqueData[j].entry_time).getTime());
            const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
            if (timeDiff < fiveMinutes && 
                uniqueData[i].vehicle_id === uniqueData[j].vehicle_id && 
                uniqueData[i].location_id === uniqueData[j].location_id) {
              timeBasedDuplicates.push({
                log1: { id: uniqueData[i].id, entry_time: uniqueData[i].entry_time, created_at: uniqueData[i].created_at },
                log2: { id: uniqueData[j].id, entry_time: uniqueData[j].entry_time, created_at: uniqueData[j].created_at },
                timeDiff: Math.round(timeDiff / 1000 / 60) + ' minutes'
              });
            }
          }
        }
        
        if (timeBasedDuplicates.length > 0) {
          console.warn('⚠️ Found entries with close timestamps (potential duplicates):', timeBasedDuplicates);
        }
      }
      
      // Check if returned data has correct location_id
      if (uniqueData && uniqueData.length > 0) {
        const locationIds = [...new Set(uniqueData.map(item => item.location_id))];
        console.log('🔍 ManagerAutomaticLogs Returned data location IDs:', locationIds);
        console.log('🔍 ManagerAutomaticLogs Expected location ID:', user?.assigned_location);
        
        if (locationIds.length > 1 || !locationIds.includes(user?.assigned_location)) {
          console.warn('⚠️ ManagerAutomaticLogs Data returned from multiple locations or wrong location!');
        }
      }
      
      if (!error && uniqueData) {
        console.log('🔍 ManagerAutomaticLogs Setting logs state with data:', { 
          dataLength: uniqueData.length, 
          sampleData: uniqueData.slice(0, 2) 
        });
        setLogs(uniqueData);
        console.log('ManagerAutomaticLogs logs state after setLogs:', uniqueData);
        console.log('ManagerAutomaticLogs Final logs count:', uniqueData.length);
      } else {
        console.warn('ManagerAutomaticLogs No data or error:', { error, uniqueData });
        console.log('🔍 ManagerAutomaticLogs Setting logs state to empty array');
        setLogs([]);
      }
    } catch (error) {
      console.error('ManagerAutomaticLogs Error in fetchLogs:', error);
      console.log('🔍 ManagerAutomaticLogs Error details:', {
        errorType: typeof error,
        errorMessage: error?.message,
        errorStack: error?.stack
      });
      setLogs([]);
    } finally {
      setLoading(false);
      console.log('ManagerAutomaticLogs Loading states reset:', { loading: false });
    }
  }, [user?.assigned_location, selectedDate]);

  useEffect(() => {
    console.log("ManagerAutomaticLogs useEffect running:", {
      assignedLocation: user?.assigned_location,
      selectedDate,
      hasUser: !!user,
      userId: user?.id,
      fetchLogsFunction: typeof fetchLogs
    });
    
    if (!user?.assigned_location) {
      console.log("No location assigned to manager for automatic logs");
      return;
    }
    
    // Don't fetch if date is not set yet
    if (!selectedDate) {
      console.log("Date not set yet, skipping fetch");
      return;
    }
    
    console.log("ManagerAutomaticLogs Calling fetchLogs...");
    fetchLogs();
  }, [user?.assigned_location, selectedDate]); // Removed fetchLogs from dependencies to prevent infinite loops

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
    // Reset to today's date instead of clearing
    const today = new Date();
    const newDate = today.toISOString().split('T')[0];
    console.log('🔍 ManagerAutomaticLogs clearDateFilter called:', { 
      oldDate: selectedDate, 
      newDate,
      todayISO: today.toISOString()
    });
    setSelectedDate(newDate);
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

  // Check if no location is assigned
  if (!user?.assigned_location) {
    return (
      <Layout>
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
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Location Assigned</h2>
            <p className="text-gray-600 mb-4 max-w-md">
              You don't have a location assigned. Please contact your administrator.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Automatic logs are location-specific and require a location to be assigned.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              <h1 className="text-xl lg:text-2xl font-bold">Automatic Logs</h1>
            </div>
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
                    console.log('🔍 ManagerAutomaticLogs Date input changed:', { 
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
                  {new Date(selectedDate).toLocaleDateString()} ({selectedDate})
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Vehicle Type</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Time</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Exit Time</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Image</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Image</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Duration</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr><td colSpan={8} className="text-center py-4">Loading...</td></tr>
                      ) : logs.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-4 text-muted-foreground">
                          {selectedDate ? `No automatic logs found for ${new Date(selectedDate).toLocaleDateString()}` : 'No automatic logs found for this location.'}
                        </td></tr>
                      ) : (
                        logs.map((log, idx) => (
                          <tr key={log.id || idx} className="hover:bg-muted/30">
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {log.vehicles?.number_plate || "-"}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">-</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.entry_time ? new Date(log.entry_time).toLocaleString() : "-"}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                              {log.exit_time ? new Date(log.exit_time).toLocaleString() : "-"}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
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
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
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
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                              {getDuration(log.entry_time, log.exit_time)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
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
              </div>
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
    </Layout>
  );
} 