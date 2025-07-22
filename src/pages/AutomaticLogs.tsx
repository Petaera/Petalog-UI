import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

export default function AutomaticLogs() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch locations on mount
    const fetchLocations = async () => {
      const { data, error } = await supabase.from("locations").select("id, name");
      if (!error && data) setLocations(data);
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (!selectedLocation) return;
    setLoading(true);
    // Fetch automatic logs for selected location
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("logs-auto")
        .select("vehicle_id, entry_time")
        .eq("location_id", selectedLocation)
        .order("entry_time", { ascending: false });
      if (!error && data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, [selectedLocation]);

  return (
    <Layout>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Automatic Logs</h1>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-4">
          <label htmlFor="location-select" className="block mb-2 font-medium">Select Location:</label>
          <select
            id="location-select"
            className="border rounded px-3 py-2 w-full max-w-xs"
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
          >
            <option value="">-- Choose a location --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div className="metric-card">
          <div className="text-center py-6">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Automatic Logs</h3>
            <p className="text-muted-foreground mb-4">
              ANPR system integration and automatic vehicle entry/exit logs will be displayed here.
            </p>
            {loading ? (
              <div>Loading logs...</div>
            ) : selectedLocation && logs.length === 0 ? (
              <div>No automatic logs found for this location.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border mt-4">
                  <thead>
                    <tr>
                      <th className="border px-4 py-2">Vehicle ID</th>
                      <th className="border px-4 py-2">Entry Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr key={idx}>
                        <td className="border px-4 py-2">{log.vehicle_id}</td>
                        <td className="border px-4 py-2">{new Date(log.entry_time).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}