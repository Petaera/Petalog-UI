import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface UseSupabaseQueryOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export function useSupabaseQuery<T = any>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: UseSupabaseQueryOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000
  } = options;

  const executeQuery = useCallback(async (attempt = 1): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      // Execute the query with timeout
      const result = await Promise.race([
        queryFn(),
        timeoutPromise
      ]);

      if (result.error) {
        throw result.error;
      }

      setData(result.data);
      setLoading(false);
    } catch (err: any) {
      console.error(`Query attempt ${attempt} failed:`, err);
      
      // Check if we should retry
      if (attempt < retries && (
        err?.message?.includes('network') ||
        err?.message?.includes('timeout') ||
        err?.message?.includes('suspended') ||
        err?.code === 'NETWORK_ERROR' ||
        err?.message === 'Request timeout'
      )) {
        console.log(`Retrying query in ${retryDelay}ms... (attempt ${attempt + 1}/${retries})`);
        
        //setTimeout(() => {
          //executeQuery(attempt + 1);
       // }, retryDelay);
        return;
      }

      setError(err);
      setLoading(false);
    }
  }, [queryFn, retries, retryDelay, timeout]);

  const refetch = useCallback(() => {
    executeQuery();
  }, [executeQuery]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  return {
    data,
    error,
    loading,
    refetch
  };
}

// Specific hook for logs queries
export function useLogsQuery(table: 'logs-auto' | 'logs-man', options?: UseSupabaseQueryOptions) {
  const queryFn = useCallback(async () => {
    const query = supabase
      .from(table)
      .select(`
        id, entry_time, location_id, vehicle_id, 
        vehicles(number_plate, type, Brand, model),
        customers(name, phone, date_of_birth, location_id)
      `)
      .order('entry_time', { ascending: false })
      .limit(10);

    return query;
  }, [table]);

  return useSupabaseQuery(queryFn, options);
}
