import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface UpiAccount {
  id: string;
  account_name: string;
  upi_id: string;
  is_active: boolean;
  qr_code_url?: string;
}

export function useUpiAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<UpiAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Determine the owner ID to fetch accounts for
      const ownerId = user.role === 'owner' ? user.id : user.own_id;
      
      if (!ownerId) {
        setError('Owner ID not found');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('owner_payment_details')
        .select('id, account_name, upi_id, is_active, qr_code_url')
        .eq('owner_id', ownerId)
        .eq('payment_method', 'upi')
        .eq('is_active', true)
        .order('account_name');

      if (fetchError) {
        throw fetchError;
      }

      setAccounts(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch UPI accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts
  };
}
