import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export type LogType = 'manual' | 'automatic' | 'common' | 'all';

export interface LogEntry {
  id: string;
  vehicle_number: string;
  entry_time: string;
  exit_time: string;
  log_type: LogType;
  created_at: string;
}

interface UseComparisonDataProps {
  selectedLocation?: string;
  selectedDate: string;
  selectedLogType: LogType;
}

export function useComparisonData({
  selectedLocation,
  selectedDate,
  selectedLogType,
}: UseComparisonDataProps) {
  const [data, setData] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedLocation) {
      toast.error("No location selected");
      return;
    }
    fetchData();
  }, [selectedLocation, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_comparison_data', {
        p_location_id: selectedLocation,
        p_filter_date: selectedDate || null,
      });

      if (error) {
        console.error('Error fetching comparison data:', error);
        toast.error('Failed to fetch comparison data.');
        return;
      }
      
      // Debug logging to see what data is being returned
      console.log('Raw comparison data:', data);
      console.log('Data length:', data?.length);
      if (data && data.length > 0) {
        const logTypeCounts = data.reduce((acc: any, log: LogEntry) => {
          acc[log.log_type] = (acc[log.log_type] || 0) + 1;
          return acc;
        }, {});
        console.log('Log type counts:', logTypeCounts);
        
        // Additional debugging for common logs
        if (logTypeCounts.common) {
          const commonLogs = data.filter(log => log.log_type === 'common');
          console.log('🔍 Common logs details:', commonLogs.map(log => ({
            id: log.id,
            vehicle_number: log.vehicle_number,
            entry_time: log.entry_time,
            created_at: log.created_at
          })));
          
          // Check for potential duplicates in common logs
          const vehicleNumbers = commonLogs.map(log => log.vehicle_number);
          const uniqueVehicles = [...new Set(vehicleNumbers)];
          console.log('🔍 Common logs - Total entries:', commonLogs.length);
          console.log('🔍 Common logs - Unique vehicles:', uniqueVehicles.length);
          
          if (commonLogs.length !== uniqueVehicles.length) {
            console.warn('⚠️ WARNING: Common logs have duplicate vehicles!');
            const duplicateVehicles = vehicleNumbers.filter((v, i) => vehicleNumbers.indexOf(v) !== i);
            console.warn('⚠️ Duplicate vehicles:', [...new Set(duplicateVehicles)]);
          }
          
          // Additional timezone debugging
          console.log('🔍 Timezone debugging for common logs:');
          commonLogs.forEach((log, index) => {
            const entryTime = new Date(log.entry_time);
            const createdTime = new Date(log.created_at);
            console.log(`  Entry ${index + 1}:`, {
              vehicle: log.vehicle_number,
              entry_time_iso: log.entry_time,
              entry_time_local: entryTime.toLocaleString(),
              entry_time_utc: entryTime.toUTCString(),
              created_at_iso: log.created_at,
              created_at_local: createdTime.toLocaleString(),
              created_at_utc: createdTime.toUTCString(),
              timezone_offset: entryTime.getTimezoneOffset()
            });
          });
        }
      }
      
      setData(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = data;

    if (selectedLogType !== 'all') {
      result = result.filter(log => log.log_type === selectedLogType);
      console.log(`Filtered data for ${selectedLogType}:`, result);
    }

    // Additional timezone-based deduplication for common logs
    if (selectedLogType === 'common' || selectedLogType === 'all') {
      const commonLogs = result.filter(log => log.log_type === 'common');
      if (commonLogs.length > 0) {
        console.log('🔍 Applying timezone-based deduplication to common logs');
        
        // Group by vehicle number and normalize timestamps
        const vehicleGroups = commonLogs.reduce((acc: any, log) => {
          if (!acc[log.vehicle_number]) {
            acc[log.vehicle_number] = [];
          }
          acc[log.vehicle_number].push(log);
          return acc;
        }, {});
        
        // For each vehicle, keep only the most recent entry
        const deduplicatedCommonLogs = Object.values(vehicleGroups).map((logs: any) => {
          if (logs.length === 1) return logs[0];
          
          // Sort by created_at and take the most recent
          logs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          console.log(`🔍 Vehicle ${logs[0].vehicle_number}: keeping most recent of ${logs.length} entries`);
          return logs[0];
        });
        
        // Replace common logs with deduplicated version
        result = result.filter(log => log.log_type !== 'common');
        result.push(...deduplicatedCommonLogs);
        
        console.log('🔍 After timezone deduplication:', {
          original_common_count: commonLogs.length,
          deduplicated_common_count: deduplicatedCommonLogs.length
        });
      }
    }

    result.sort((a, b) => {
      const typePriority = { common: 0, automatic: 1, manual: 2 };
      const priorityA = typePriority[a.log_type as keyof typeof typePriority] ?? 3;
      const priorityB = typePriority[b.log_type as keyof typeof typePriority] ?? 3;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    console.log('Final filtered and sorted data:', result);
    return result;
  }, [data, selectedLogType]);

  return { loading, data: filteredAndSortedData, refresh: fetchData };
}
