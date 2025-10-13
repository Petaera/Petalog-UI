import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface VisitHistoryData {
  visitCount: number;
  latestVisitSummary: any | null;
  latestVisits: any[];
}

export const useVisitHistory = (vehicleNumber: string, selectedLocation?: string) => {
  const [visitCount, setVisitCount] = useState<number>(0);
  const [latestVisitSummary, setLatestVisitSummary] = useState<any | null>(null);
  const [latestVisits, setLatestVisits] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchVisits = async () => {
      const plate = vehicleNumber.trim();
      
      if (!plate || plate.length < 3) {
        if (!cancelled) {
          setVisitCount(0);
          setLatestVisitSummary(null);
          setLatestVisits([]);
        }
        return;
      }
      
      try {
        // Resolve vehicle_id; if found, count by vehicle_id, else fallback to vehicle_number
        const { data: veh, error: vehErr } = await supabase
          .from('vehicles')
          .select('id')
          .eq('number_plate', plate.toUpperCase().replace(/\s|-/g, ''))
          .maybeSingle();

        if (vehErr && vehErr.code !== 'PGRST116') {
          console.warn('Visit count vehicles lookup error:', vehErr);
        }

        let manualCount = 0;
        const base = supabase.from('logs-man').select('id', { count: 'exact', head: true });
        const withLocation = selectedLocation && selectedLocation.trim() !== ''
          ? (q: any) => q.eq('location_id', selectedLocation)
          : (q: any) => q;

        if (veh?.id) {
          const { count, error } = await withLocation(base)
            .or(`vehicle_id.eq.${veh.id},vehicle_number.ilike.%${plate}%`);
          if (!error) manualCount = count || 0;
          else console.warn('Manual visit count error (by id or ilike number):', error);
        } else {
          const { count, error } = await withLocation(base)
            .ilike('vehicle_number', `%${plate}%`);
          if (!error) manualCount = count || 0;
          else console.warn('Manual visit count error (by ilike number):', error);
        }

        if (!cancelled) setVisitCount(manualCount);

        // Fetch latest visit summary and latest 5 visits
        try {
          // Query latest single visit for summary
          const { data: latestSingle, error: singleErr } = await withLocation(
            supabase.from('logs-man').select('created_at, service, Amount, payment_mode').ilike('vehicle_number', `%${plate}%`).order('created_at', { ascending: false }).limit(1)
          );
          if (!singleErr && latestSingle && Array.isArray(latestSingle) && latestSingle.length > 0) {
            if (!cancelled) setLatestVisitSummary(latestSingle[0]);
          } else {
            if (!cancelled) setLatestVisitSummary(null);
          }

          // Query latest 5 visits
          const { data: latestFive, error: fiveErr } = await withLocation(
            supabase.from('logs-man').select('id, created_at, service, Amount, payment_mode, Location').ilike('vehicle_number', `%${plate}%`).order('created_at', { ascending: false }).limit(5)
          );
          if (!fiveErr && latestFive) {
            if (!cancelled) setLatestVisits(latestFive);
          } else {
            if (!cancelled) setLatestVisits([]);
          }
        } catch (e) {
          console.warn('Error fetching latest visits details:', e);
          if (!cancelled) {
            setLatestVisitSummary(null);
            setLatestVisits([]);
          }
        }
      } catch (e) {
        console.warn('Visit count error:', e);
        if (!cancelled) setVisitCount(0);
      }
    };

    const t = setTimeout(fetchVisits, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [vehicleNumber, selectedLocation]);

  return {
    visitCount,
    latestVisitSummary,
    latestVisits
  };
};

