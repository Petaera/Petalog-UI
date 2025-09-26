import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface UpiAccount {
  id: string;
  account_name: string;
  upi_id: string;
  is_active: boolean;
  qr_code_url?: string;
  location_id?: string;
  location_name?: string;
}

export function useUpiAccounts(selectedLocation?: string) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<UpiAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Use the provided view for UPI accounts
      let query = supabase
        .from('upi_accounts_with_locations')
        .select('*')
        .eq('is_active', true);

      // Always prioritize location filter for branch-scoped accounts
      if (selectedLocation) {
        query = query.eq('location_id', selectedLocation);
      } else if (user.role === 'manager' && user.assigned_location) {
        query = query.eq('location_id', user.assigned_location);
      } else if (user.role === 'owner') {
        // Fallback: owner-all accounts when no location is selected
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const transformedData = (data || []).map((d: any) => ({
        id: d.id,
        account_name: d.account_name,
        upi_id: d.upi_id,
        is_active: d.is_active,
        qr_code_url: d.qr_code_url,
        location_id: d.location_id,
        location_name: d.location_name,
      }));

      setAccounts(transformedData);

    } catch (err: any) {
      console.error('❌ Error in fetchAccounts:', err);
      setError(err.message || 'Failed to fetch UPI accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [user, selectedLocation]);

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts
  };
}
