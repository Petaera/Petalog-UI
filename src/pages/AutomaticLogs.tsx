import { useEffect, useState } from "react";
import { ArrowLeft, Database, X, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";

interface AutomaticLogsProps {
  selectedLocation?: string;
}

export default function AutomaticLogs({ selectedLocation }: AutomaticLogsProps) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  console.log("AutomaticLogs component rendered. selectedLocation:", selectedLocation);

  // Set default date to current day
  useEffect(() => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    setStartDate(todayString);
    setEndDate(todayString);
  }, []);

  useEffect(() => {
    console.log("AutomaticLogs useEffect running. selectedLocation:", selectedLocation);
    if (!selectedLocation) {
      console.log("No location selected for automatic logs");
      return;
    }
    setLoading(true);
    const fetchLogs = async () => {
      console.log('🔍 Starting fetchLogs with:', { selectedLocation, startDate, endDate });
      
      // Build query step by step to ensure proper filtering
      let query = supabase
        .from("logs-auto")
        .select("id, entry_time, exit_time, vehicle_id, entry_url, exit_image, created_at, vehicles(number_plate), location_id");

      // Apply location filter
      query = query.eq("location_id", selectedLocation);
      console.log('🔍 Location filter applied:', { selectedLocation });

      // Apply date filters if provided
      if (startDate) {
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        query = query.gte("entry_time", startDateTime.toISOString());
        console.log('🔍 Start date filter applied:', startDateTime.toISOString());
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte("entry_time", endDateTime.toISOString());
        console.log('🔍 End date filter applied:', endDateTime.toISOString());
      }

      const { data, error } = await query.order("entry_time", { ascending: false });
      
      console.log('AutomaticLogs Supabase logs-auto data:', data);
      console.log('AutomaticLogs Supabase error:', error);
      
      // Check if returned data has correct location_id
      if (data && data.length > 0) {
        const locationIds = [...new Set(data.map(item => item.location_id))];
        console.log('🔍 Returned data location IDs:', locationIds);
        console.log('🔍 Expected location ID:', selectedLocation);
        
        if (locationIds.length > 1 || !locationIds.includes(selectedLocation)) {
          console.warn('⚠️ Data returned from multiple locations or wrong location!');
        }
      }
      
      if (!error && data) {
        setLogs(data);
        console.log('AutomaticLogs logs state after setLogs:', data);
      }
      setLoading(false);
    };
    fetchLogs();
  }, [selectedLocation, startDate, endDate]);

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-500" />
              <span>Date Filter</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    const today = new Date();
                    const todayString = today.toISOString().split('T')[0];
                    setStartDate(todayString);
                    setEndDate(todayString);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Today
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>



        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              <span>Automatic Logs</span>
              <span className="text-sm text-muted-foreground">({logs.length} entries)</span>
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
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4">
                      No logs found for this location.
                    </td></tr>
                  ) : (
                    logs.map((log, idx) => (
                      <tr key={log.id || idx}>
                        <td className="border px-4 py-2">{log.vehicles?.number_plate || "-"}</td>
                        <td className="border px-4 py-2">-</td>
                        <td className="border px-4 py-2">
                          {log.entry_time ? 
                            new Date(log.entry_time).toLocaleString() : "-"
                          }
                        </td>
                        <td className="border px-4 py-2">
                          {log.exit_time ? 
                            new Date(log.exit_time).toLocaleString() : "-"
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