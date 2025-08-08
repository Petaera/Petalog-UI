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

    return result;
  }, [data, selectedLogType]);

  return { loading, data: filteredAndSortedData };
}
