import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Database, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from '@/contexts/AuthContext';

export default function ManagerAutomaticLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Set default date to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  console.log("ManagerAutomaticLogs component rendered. assignedLocation:", user?.assigned_location);

  useEffect(() => {
    console.log("ManagerAutomaticLogs useEffect running. assignedLocation:", user?.assigned_location, "selectedDate:", selectedDate);
    if (!user?.assigned_location) {
      console.log("No location assigned to manager for automatic logs");
      return;
    }
    setLoading(true);
    const fetchLogs = async () => {
      let query = supabase
        .from("logs-auto")
        .select("id, entry_time, exit_time, vehicle_id, entry_url, exit_image, created_at, vehicles(number_plate)")
        .eq("location_id", user?.assigned_location);

      // Add date filter if selected
      if (selectedDate) {
        const startOfDay = `${selectedDate}T00:00:00.000Z`;
        const endOfDay = `${selectedDate}T23:59:59.999Z`;
        query = query
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay);
      }

      const { data, error } = await query.order("entry_time", { ascending: false });
      
      console.log('ManagerAutomaticLogs Supabase logs-auto data:', data);
      console.log('ManagerAutomaticLogs Supabase error:', error);
      if (!error && data) {
        setLogs(data);
        console.log('ManagerAutomaticLogs logs state after setLogs:', data);
      }
      setLoading(false);
    };
    fetchLogs();
  }, [user?.assigned_location, selectedDate]);

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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    setSelectedDate(today.toISOString().split('T')[0]);
                  }}
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
                <span className="text-sm text-muted-foreground">
                  {new Date(selectedDate).toLocaleDateString()}
                </span>
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
                      ) : logs.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">
                          {selectedDate 
                            ? `No automatic logs found for ${new Date(selectedDate).toLocaleDateString()} at this location.`
                            : "No automatic logs found for this location."
                          }
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