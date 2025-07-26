import { useEffect, useState } from "react";
import { ArrowLeft, Database, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

interface AutomaticLogsProps {
  selectedLocation?: string;
}

export default function AutomaticLogs({ selectedLocation }: AutomaticLogsProps) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  console.log("AutomaticLogs component rendered. selectedLocation:", selectedLocation);

  useEffect(() => {
    console.log("AutomaticLogs useEffect running. selectedLocation:", selectedLocation, "selectedDate:", selectedDate);
    if (!selectedLocation) return;
    setLoading(true);
    const fetchLogs = async () => {
      let query = supabase
        .from("logs-auto")
        .select("id, entry_time, exit_time, vehicle_id, entry_url, exit_image, created_at, vehicles(number_plate)")
        .eq("location_id", selectedLocation);

      // Add date filter if selected
      if (selectedDate) {
        const startOfDay = `${selectedDate}T00:00:00.000Z`;
        const endOfDay = `${selectedDate}T23:59:59.999Z`;
        query = query
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay);
      }

      const { data, error } = await query.order("entry_time", { ascending: false });
      
      console.log('AutomaticLogs Supabase logs-auto data:', data);
      console.log('AutomaticLogs Supabase error:', error);
      if (!error && data) {
        setLogs(data);
        console.log('AutomaticLogs logs state after setLogs:', data);
      }
      setLoading(false);
    };
    fetchLogs();
  }, [selectedLocation, selectedDate]);

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

  return (
    <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Automatic Logs</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <label htmlFor="date-filter" className="font-medium">Filter by Date:</label>
          <input
            id="date-filter"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
          {selectedDate && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedDate("")}
            >
              Clear Filter
            </Button>
          )}
        </div>

        <div className="metric-card">
          <div className="py-6">
            <div className="overflow-x-auto">
              <table className="min-w-full border mt-4">
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
                      {selectedDate 
                        ? `No logs found for ${selectedDate} at this location.`
                        : "No logs found for this location."
                      }
                    </td></tr>
                  ) : (
                    logs.map((log, idx) => (
                      <tr key={log.id || idx}>
                        <td className="border px-4 py-2">{log.vehicles?.number_plate || "-"}</td>
                        <td className="border px-4 py-2">-</td>
                        <td className="border px-4 py-2">{log.entry_time ? new Date(log.entry_time).toLocaleTimeString() : "-"}</td>
                        <td className="border px-4 py-2">{log.exit_time ? new Date(log.exit_time).toLocaleTimeString() : "-"}</td>
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
          </div>
        </div>

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