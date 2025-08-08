import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogEntry } from '@/hooks/useComparisonData';

interface ComparisonTableProps {
  loading: boolean;
  data: LogEntry[];
  selectedDate: string;
  selectedLogType: string;
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

const ComparisonTable: React.FC<ComparisonTableProps> = ({ loading, data, selectedDate, selectedLogType }) => {
  return (
    <Card className="mt-6">
      <CardContent className="p-6">
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
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium"><LogTypeBadge logType={log.log_type} /></td>
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
    </Card>
  );
};

export default React.memo(ComparisonTable);
