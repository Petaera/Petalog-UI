import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogEntry } from '@/hooks/useComparisonData';

interface ComparisonTableProps {
  loading: boolean;
  data: LogEntry[];
  selectedDate: string;
  selectedLogType: string;
  selectedLocation?: string;
}

const getDuration = (entry: string, exit: string) => {
  if (!entry || !exit) return "-";
  const ms = Number(new Date(exit)) - Number(new Date(entry));
  if (isNaN(ms) || ms < 0) return "-";
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const LogTypeBadge: React.FC<{ logType: string }> = ({ logType }) => {
  const badgeClass = {
    common: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
    manual: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100',
    automatic: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
  }[logType] || '';

  return (
    <Badge variant="outline" className={badgeClass}>
      {logType.charAt(0).toUpperCase() + logType.slice(1)}
    </Badge>
  );
};

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";

const ComparisonTable: React.FC<ComparisonTableProps> = ({ loading, data, selectedDate, selectedLogType, selectedLocation }) => {
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const handleAutomaticClick = async (vehicleNumber: string, entryTimeIso: string) => {
    try {
      setImageLoading(true);
      // Query logs-auto for closest entry for this vehicle near entryTime
      // We assume number_plate is linked via vehicles(number_plate)
      const start = new Date(entryTimeIso);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      let query = supabase
        .from('logs-auto')
        .select('entry_url, entry_time, vehicles(number_plate), location_id')
        .eq('location_id', selectedLocation)
        .gte('entry_time', start.toISOString())
        .lt('entry_time', end.toISOString())
        .order('entry_time', { ascending: true })
        .limit(1);
      const { data, error } = await query;
      if (error) throw error;
      const found = (data || []).find((row: any) => row.vehicles?.number_plate === vehicleNumber);
      const url = found?.entry_url || (data && data[0]?.entry_url) || null;
      setImageUrl(url);
      setImageOpen(true);
    } catch (e) {
      setImageUrl(null);
      setImageOpen(true);
    } finally {
      setImageLoading(false);
    }
  };
  // Debug logging to see what data is being rendered
  console.log('ComparisonTable render - data:', data);
  console.log('ComparisonTable render - selectedLogType:', selectedLogType);
  console.log('ComparisonTable render - data length:', data?.length);
  
  if (data && data.length > 0) {
    const logTypeCounts = data.reduce((acc: any, log: LogEntry) => {
      acc[log.log_type] = (acc[log.log_type] || 0) + 1;
      return acc;
    }, {});
    console.log('ComparisonTable log type counts:', logTypeCounts);
  }

  // Calculate summary counts
  const summaryCounts = data.reduce((acc: any, log: LogEntry) => {
    acc[log.log_type] = (acc[log.log_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        {/* Summary Section */}
        {!loading && data.length > 0 && (
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Summary</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  Common
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {summaryCounts.common || 0} entries
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  Manual
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {summaryCounts.manual || 0} entries
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                  Automatic
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {summaryCounts.automatic || 0} entries
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Total: {data.length} entries
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Time</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Time</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">
                      {selectedDate || selectedLogType !== "all"
                        ? `No logs found for ${selectedDate ? `date ${new Date(selectedDate).toLocaleDateString()}` : ''}${selectedDate && selectedLogType !== "all" ? ' and ' : ''}${selectedLogType !== "all" ? `type ${selectedLogType}` : ''}`
                        : 'No logs found'}
                    </td></tr>
                  ) : (
                    data.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.vehicle_number || "-"}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                          {log.log_type === 'automatic' ? (
                            <button
                              className="inline-flex"
                              onClick={() => handleAutomaticClick(log.vehicle_number, log.entry_time)}
                              title="View entry image"
                            >
                              <LogTypeBadge logType={log.log_type} />
                            </button>
                          ) : (
                            <LogTypeBadge logType={log.log_type} />
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.entry_time).toLocaleString()}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{log.exit_time ? new Date(log.exit_time).toLocaleString() : "-"}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{getDuration(log.entry_time, log.exit_time)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
      {/* Entry Image Dialog */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Entry Image</DialogTitle>
          </DialogHeader>
          <div className="min-h-[300px] flex items-center justify-center">
            {imageLoading ? (
              <div className="text-sm text-muted-foreground">Loading image…</div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="Entry" className="max-h-[70vh] object-contain" />
            ) : (
              <div className="text-sm text-muted-foreground">No image available</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default React.memo(ComparisonTable);
