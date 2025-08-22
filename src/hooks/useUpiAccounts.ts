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
      console.log('🔄 Starting UPI accounts fetch for user:', user.role, 'ID:', user.id);
      
      let allAccounts: any[] = [];
      
      if (user.role === 'owner') {
        // For owners: fetch UPI accounts from their locations
        console.log('👑 Owner mode - fetching UPI accounts from owned locations');
        
        // Get UPI accounts from locations owned via own_id system
        if (user.own_id) {
          const { data: ownIdData, error: ownIdError } = await supabase
            .from('owner_payment_details')
            .select(`
              id, 
              account_name, 
              upi_id, 
              is_active, 
              qr_code_url,
              location_id,
              locations:location_id (
                id,
                name
              )
            `)
            .eq('owner_id', user.id)
            .eq('payment_method', 'upi')
            .eq('is_active', true);

          if (!ownIdError && ownIdData) {
            allAccounts.push(...ownIdData);
            console.log('✅ Found UPI accounts from own_id locations:', ownIdData.length);
          }
        }
        
        // Get UPI accounts from partnership locations
        try {
          const { data: partnershipData, error: partnershipError } = await supabase
            .from('location_owners')
            .select('location_id')
            .eq('owner_id', user.id);
          
          if (!partnershipError && partnershipData && partnershipData.length > 0) {
            const locationIds = partnershipData.map(lo => lo.location_id);
            console.log('🔄 Found partnership location IDs:', locationIds);
            
            const { data: partnershipAccountData, error: partnershipAccountError } = await supabase
              .from('owner_payment_details')
              .select(`
                id, 
                account_name, 
                upi_id, 
                is_active, 
                qr_code_url,
                location_id,
                locations:location_id (
                  id,
                  name
                )
              `)
              .eq('owner_id', user.id)
              .eq('payment_method', 'upi')
              .eq('is_active', true)
              .in('location_id', locationIds);

            if (!partnershipAccountError && partnershipAccountData) {
              for (const partnershipAccount of partnershipAccountData) {
                if (!allAccounts.find(account => account.id === partnershipAccount.id)) {
                  allAccounts.push(partnershipAccount);
                }
              }
              console.log('✅ Added UPI accounts from partnership locations:', partnershipAccountData.length);
            }
          }
        } catch (partnershipError) {
          console.log('🔄 Partnership system not accessible, skipping:', partnershipError);
        }
        
      } else if (user.role === 'manager') {
        // For managers: SIMPLE LOGIC - just get UPI accounts from their assigned location
        console.log('👨‍💼 Manager mode - simple location-based UPI fetch');
        console.log('🔍 Manager assigned_location:', user.assigned_location);
        console.log('🔍 Manager user data:', { id: user.id, role: user.role, assigned_location: user.assigned_location });
        
        if (user.assigned_location) {
          // First check if there are any UPI accounts for this location (bypass RLS temporarily)
          console.log('🔍 Checking for UPI accounts at location:', user.assigned_location);
          
          const { data: managerData, error: managerError } = await supabase
            .from('owner_payment_details')
            .select(`
              id, 
              account_name, 
              upi_id, 
              is_active, 
              qr_code_url,
              location_id,
              locations:location_id (
                id,
                name
              )
            `)
            .eq('location_id', user.assigned_location)
            .eq('payment_method', 'upi')
            .eq('is_active', true);

          console.log('🔍 Query result for manager:', { data: managerData, error: managerError });

          if (!managerError && managerData) {
            allAccounts.push(...managerData);
            console.log('✅ Found UPI accounts for manager location:', managerData.length);
          } else if (managerError) {
            console.log('❌ Error fetching manager UPI accounts:', managerError);
            console.log('❌ Error details:', managerError.message, managerError.code, managerError.details);
          } else {
            console.log('ℹ️ No UPI accounts found for manager location:', user.assigned_location);
          }
        } else {
          console.log('⚠️ Manager has no assigned location');
          setError('Manager has no assigned location');
        }
      }

      console.log('🔄 Total UPI accounts before filtering:', allAccounts.length);

      // Apply location filtering
      if (selectedLocation) {
        // Filter by selected location (highest priority)
        allAccounts = allAccounts.filter(account => account.location_id === selectedLocation);
        console.log('📍 Filtered UPI accounts for selected location:', selectedLocation, 'Count:', allAccounts.length);
      }

      // Remove duplicates and transform the data
      const uniqueAccounts = allAccounts.filter((account, index, self) => 
        index === self.findIndex(acc => acc.id === account.id)
      );
      
      const transformedData = uniqueAccounts.map(account => ({
        ...account,
        location_name: account.locations?.name || 'N/A'
      }));

      setAccounts(transformedData);
      console.log('✅ Final UPI accounts result:', transformedData.length);
      
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
