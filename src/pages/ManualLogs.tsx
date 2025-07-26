import { useEffect, useState } from "react";
import { ArrowLeft, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

interface ManualLogsProps {
  selectedLocation?: string;
}

export default function ManualLogs({ selectedLocation }: ManualLogsProps) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  console.log("ManualLogs component rendered. selectedLocation:", selectedLocation);

  useEffect(() => {
    console.log("ManualLogs useEffect running. selectedLocation:", selectedLocation);
    if (!selectedLocation) return;
    setLoading(true);
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("logs-man")
        .select("*, vehicles(number_plate)")
        .eq("location_id", selectedLocation)
        .order("entry_time", { ascending: false });
      console.log('ManualLogs Supabase logs-man data:', data);
      console.log('ManualLogs Supabase error:', error);
      if (!error && data && data.length > 0) {
        console.log('Available fields in first manual log entry:', Object.keys(data[0]));
        setLogs(data);
        console.log('ManualLogs logs state after setLogs:', data);
      } else if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };
    fetchLogs();
  }, [selectedLocation]);

  function getDuration(entry, exit) {
    if (!entry || !exit) return "-";
    const ms = Number(new Date(exit)) - Number(new Date(entry));
    if (isNaN(ms) || ms < 0) return "-";
    const min = Math.floor(ms / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <PenTool className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Manual Logs</h1>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
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
                      <th className="border px-4 py-2">Image</th>
                      <th className="border px-4 py-2">Duration</th>
                    </tr>
                  </thead>
                                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-4">No logs found for this location.</td></tr>
                    ) : (
                      logs.map((log, idx) => (
                        <tr key={log.id || idx}>
                          <td className="border px-4 py-2">{log.vehicles?.number_plate || "-"}</td>
                          <td className="border px-4 py-2">-</td>
                          <td className="border px-4 py-2">{log.entry_time ? new Date(log.entry_time).toLocaleString() : "-"}</td>
                          <td className="border px-4 py-2">{log.exit_time ? new Date(log.exit_time).toLocaleString() : "-"}</td>
                          <td className="border px-4 py-2"><img src={"/placeholder.svg"} alt="Image" className="w-16 h-10 object-cover" /></td>
                          <td className="border px-4 py-2">{getDuration(log.entry_time, log.exit_time)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
  );
}