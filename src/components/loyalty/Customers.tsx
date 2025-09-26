import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  Search,
  Calendar,
  CreditCard,
  Plus,
  MoreHorizontal,
  Crown,
  Clock,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';

const typeColors = {
  Subscription: 'primary',
  Credit: 'success',
  'Visit-based': 'warning',
  package: 'primary',
  visit: 'warning',
  credit: 'success'
};

const statusColors = {
  Active: 'success',
  'Expiring Soon': 'warning',
  Expired: 'destructive',
  all: 'primary'
};

export function Customers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  // Check if user is manager
  const isManager = String(user?.role || '').toLowerCase().includes('manager');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expiringMode, setExpiringMode] = useState(false);
  const [loyaltyMode, setLoyaltyMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState<'selectPlan' | 'identify' | 'form'>('selectPlan');
  const [schemeType, setSchemeType] = useState('');
  const [planType, setPlanType] = useState('');
  const [vehicleNumberInput, setVehicleNumberInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [selectedScheme, setSelectedScheme] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [schemes, setSchemes] = useState<any[]>([]);
  const [permittedLocations, setPermittedLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState<any>({ number_plate: '', type: '', vehicle_brand: '', vehicle_model: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [modelQuery, setModelQuery] = useState('');
  const [modelSuggestions, setModelSuggestions] = useState<Array<{ id: string; brand: string; model: string; type?: string }>>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [upiAccounts, setUpiAccounts] = useState<Array<{ id: string; account_name: string; upi_id: string; qr_code_url: string }>>([]);
  const [selectedUpiAccountId, setSelectedUpiAccountId] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [subscriptionCustomers, setSubscriptionCustomers] = useState<any[]>([]);
  const [customerDetailsMap, setCustomerDetailsMap] = useState<Record<string, any>>({});
  const [planDetailsMap, setPlanDetailsMap] = useState<Record<string, any>>({});
  const [vehicleInfoMap, setVehicleInfoMap] = useState<Record<string, any>>({});
  const [creditAccountMap, setCreditAccountMap] = useState<Record<string, { id: string; balance: number; total_deposited: number }>>({});
  const [usageHistoryMap, setUsageHistoryMap] = useState<Record<string, Array<{ id: string; purchase_id: string; service_type: string | null; use_date: string | null; notes: string | null }>>>({});
  const [loyaltyVisitsMap, setLoyaltyVisitsMap] = useState<Record<string, Array<{ id: string; visit_type: string; service_rendered: string | null; amount_charged: number; visit_time: string | null; payment_method: string | null }>>>({});
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [editCustomerDraft, setEditCustomerDraft] = useState<{ id?: string; name?: string; phone?: string; email?: string; date_of_birth?: string }>({});
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState<string>('');
  const [topupMethod, setTopupMethod] = useState<string>('cash');
  const [topupUpiId, setTopupUpiId] = useState<string>('');
  const [topupUpiAccounts, setTopupUpiAccounts] = useState<Array<{ id: string; account_name: string; upi_id: string; qr_code_url: string }>>([]);
  const [topupSelectedUpiAccountId, setTopupSelectedUpiAccountId] = useState<string>('');
  const [topupShowQr, setTopupShowQr] = useState<boolean>(false);
  const [showMarkVisit, setShowMarkVisit] = useState(false);
  const [visitNotes, setVisitNotes] = useState('');
  const [visitService, setVisitService] = useState('');
  const [showMarkEntry, setShowMarkEntry] = useState(false);
  const [entryAmount, setEntryAmount] = useState('');
  const [entryService, setEntryService] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [existingCustomer, setExistingCustomer] = useState<any>(null);
  const [existingVehicle, setExistingVehicle] = useState<any>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('cash');
  const [renewUpiAccounts, setRenewUpiAccounts] = useState<Array<{ id: string; account_name: string; upi_id: string; qr_code_url: string }>>([]);
  const [renewSelectedUpiAccountId, setRenewSelectedUpiAccountId] = useState('');
  const [renewShowQr, setRenewShowQr] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetPurchase, setDeleteTargetPurchase] = useState<any | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    locationId: '',
    planType: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [isExporting, setIsExporting] = useState(false);

  // Function to fetch existing customer by phone
  const fetchExistingCustomer = async (phone: string) => {
    if (!phone.trim()) {
      setExistingCustomer(null);
      setShowCustomerSuggestions(false);
      return;
    }

    try {
      // First get the user's permitted locations
      const { data: userLocations } = await supabase
        .from('location_owners')
        .select('location_id')
        .eq('owner_id', user?.id);
      
      const locationIds = userLocations?.map(l => l.location_id) || [];
      // info popup removed
      
      if (locationIds.length === 0) {
        // no locations
        setExistingCustomer(null);
        setShowCustomerSuggestions(false);
        return;
      }
      
      // Try to find customer with location match using a different approach
      let customer = null;
      
      // First try to find the customer by phone
      const { data: allCustomers, error: customerFetchError } = await supabase
        .from('customers')
        .select('id, name, phone, email, date_of_birth, default_vehicle_id, location_id')
        .eq('phone', phone.trim());
      
      if (!customerFetchError && allCustomers && allCustomers.length > 0) {
        // Filter by location match manually
        const matchingCustomer = allCustomers.find(c => {
          if (!c.location_id) return false;
          return locationIds.includes(c.location_id);
        });
        
        if (matchingCustomer) {
          customer = matchingCustomer;
        }
      }

      // customer search completed

      if (customer) {
        setExistingCustomer(customer);
        setShowCustomerSuggestions(true);
        
        // Auto-fill the customer details in the form
        setCustomerDetails({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          dob: customer.date_of_birth || '',
          id: customer.id // Store the existing ID for reuse
        });
      } else {
        setExistingCustomer(null);
        setShowCustomerSuggestions(false);
      }
    } catch (error) {
      toast({ title: 'Fetch failed', description: 'Could not fetch customer details', variant: 'destructive' });
      setExistingCustomer(null);
      setShowCustomerSuggestions(false);
    }
  };

  // Function to fetch existing vehicle by number plate
  const fetchExistingVehicle = async (numberPlate: string) => {
    if (!numberPlate.trim()) {
      setExistingVehicle(null);
      setShowVehicleSuggestions(false);
      return;
    }

    try {
      // fetching vehicle
      
      // First get the user's permitted locations
      const { data: userLocations } = await supabase
        .from('location_owners')
        .select('location_id')
        .eq('owner_id', user?.id);
      
      const locationIds = userLocations?.map(l => l.location_id) || [];
      // resolved locations for vehicle fetch
      
      if (locationIds.length === 0) {
        // no locations
        setExistingVehicle(null);
        setShowVehicleSuggestions(false);
        return;
      }
      
      // Try to find vehicle with location overlap using a different approach
      let vehicle = null;
      let vehicleError = null;
      
      // First try to find the vehicle by number plate
      const { data: allVehicles, error: fetchError } = await supabase
        .from('vehicles')
        .select(`
          id, 
          number_plate, 
          type, 
          Brand, 
          model,
          location_id,
          owner_id,
          Vehicles_in_india (
            Models,
            "Vehicle Brands"
          )
        `)
        .eq('number_plate', numberPlate.trim().toUpperCase());
      
      if (fetchError) {
        vehicleError = fetchError;
      } else if (allVehicles && allVehicles.length > 0) {
        // Filter by location overlap manually
        const matchingVehicle = allVehicles.find(v => {
          if (!v.location_id || !Array.isArray(v.location_id)) return false;
          return v.location_id.some(locId => locationIds.includes(locId));
        });
        
        if (matchingVehicle) {
          vehicle = matchingVehicle;
        }
      }

      // vehicle query finished

      if (vehicle) {
        setExistingVehicle(vehicle);
        setShowVehicleSuggestions(true);
        
        // Auto-fill the vehicle details in the form
        setVehicleDetails({
          number_plate: vehicle.number_plate || '',
          type: vehicle.type || '',
          vehicle_brand: vehicle.Brand || '',
          vehicle_model: (vehicle as any).Vehicles_in_india?.Models || '',
          id: vehicle.id // Store the existing ID for reuse
        });

        // Also fetch and autofill the associated customer details
        if (vehicle.owner_id) {
          // fetching owner for vehicle
          
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, name, phone, email, date_of_birth, location_id')
            .eq('id', vehicle.owner_id)
            .maybeSingle();

          // customer fetch finished

          if (customer) {
            setExistingCustomer(customer);
            setShowCustomerSuggestions(true);
            
            // Auto-fill the customer details in the form
            setCustomerDetails({
              name: customer.name || '',
              phone: customer.phone || '',
              email: customer.email || '',
              dob: customer.date_of_birth || '',
              id: customer.id // Store the existing ID for reuse
            });
          }
        }
      } else {
        // no vehicle found
        setExistingVehicle(null);
        setShowVehicleSuggestions(false);
      }
    } catch (error) {
      toast({ title: 'Fetch failed', description: 'Could not fetch vehicle details', variant: 'destructive' });
      setExistingVehicle(null);
      setShowVehicleSuggestions(false);
    }
  };

  // Utility function to check and update expiry status for a specific purchase
  const checkAndUpdateExpiry = async (purchaseId: string, customerId: string, planType: string) => {
    if (planType !== 'credit') return;
    
    // Get current credit balance
    const { data: creditAccount } = await supabase
      .from('credit_accounts')
      .select('balance')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    const creditBalance = Number(creditAccount?.balance || 0);
    
    // If credit balance is zero or less, expire the plan
    if (creditBalance <= 0) {
      const { error } = await supabase
        .from('subscription_purchases')
        .update({ status: 'expired' })
        .eq('id', purchaseId);
      
      if (!error) {
        // Update local state
        setSubscriptionCustomers(prev => 
          prev.map(p => p.id === purchaseId ? { ...p, status: 'expired' } : p)
        );
      }
    }
  };

  const fetchPurchases = async () => {
    if (!user?.id) return;

    // Get user's permitted locations first
    let permittedLocationIds: string[] = [];
    const isManager = String(user.role || '').toLowerCase().includes('manager');
    
    if (isManager && user.assigned_location) {
      // Manager: only their assigned location
      permittedLocationIds = [user.assigned_location];
    } else {
      // Owner: get all locations they own
      const { data: ownerships } = await supabase
        .from('location_owners')
        .select('location_id')
        .eq('owner_id', user.id);
      permittedLocationIds = (ownerships || []).map((o: any) => o.location_id).filter(Boolean);
    }

    if (permittedLocationIds.length === 0) {
      setSubscriptionCustomers([]);
      return;
    }

    // Fetch purchases filtered by permitted locations
    const { data } = await supabase
      .from('subscription_purchases')
      .select('*')
      .in('location_id', permittedLocationIds)
      .order('created_at', { ascending: false })
      .limit(100); // Increased limit since we're filtering by location
    
    // Check for expired purchases and update their status
    if (data && data.length > 0) {
      const now = new Date();
      
      // Get plan details to identify credit plans
      const planIds = Array.from(new Set(data.map(p => p.plan_id).filter(Boolean)));
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id, type')
        .in('id', planIds);
      
      const planTypeMap: Record<string, string> = {};
      (plans || []).forEach(plan => {
        planTypeMap[plan.id] = plan.type;
      });
      
      // Get credit balances for credit plans
      const creditCustomerIds = data
        .filter(p => planTypeMap[p.plan_id] === 'credit')
        .map(p => p.customer_id)
        .filter(Boolean);
      
      let creditBalanceMap: Record<string, number> = {};
      if (creditCustomerIds.length > 0) {
        const { data: creditAccounts } = await supabase
          .from('credit_accounts')
          .select('customer_id, balance')
          .in('customer_id', creditCustomerIds);
        
        (creditAccounts || []).forEach(account => {
          creditBalanceMap[account.customer_id] = Number(account.balance || 0);
        });
      }
      
      const expiredPurchases = data.filter(purchase => {
        if (purchase.status !== 'active') return false;
        
        // Date-based expiry
        if (purchase.expiry_date && new Date(purchase.expiry_date) < now) {
          return true;
        }
        
        // Visit-based expiry (for visit/package plans)
        if (purchase.remaining_visits !== null && purchase.remaining_visits <= 0) {
          return true;
        }
        
        // Credit-based expiry (for credit plans)
        const planType = planTypeMap[purchase.plan_id];
        if (planType === 'credit' && purchase.customer_id) {
          const creditBalance = creditBalanceMap[purchase.customer_id] || 0;
          if (creditBalance <= 0) {
            return true;
          }
        }
        
        return false;
      });
      
      // Update expired purchases in batch
      if (expiredPurchases.length > 0) {
        const expiredIds = expiredPurchases.map(p => p.id);
        await supabase
          .from('subscription_purchases')
          .update({ status: 'expired' })
          .in('id', expiredIds);
        
        // Update local state
        const updatedData = data.map(purchase => 
          expiredIds.includes(purchase.id) 
            ? { ...purchase, status: 'expired' }
            : purchase
        );
        setSubscriptionCustomers(updatedData);
        return;
      }
    }
    
    setSubscriptionCustomers(data || []);
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  // Parse query params for preset filters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    const loyalty = params.get('loyalty');
    if (filter === 'active') {
      setFilterStatus('Active');
      setExpiringMode(false);
      setLoyaltyMode(false);
    } else if (filter === 'expiring') {
      setFilterStatus('Expiring Soon');
      setExpiringMode(true);
      setLoyaltyMode(false);
    } else if (loyalty === '1') {
      setFilterStatus('all');
      setLoyaltyMode(true);
      setExpiringMode(false);
    } else {
      setExpiringMode(false);
      setLoyaltyMode(false);
    }
  }, [location.search]);

  // Fetch available subscription plans
  useEffect(() => {
    async function fetchPlans() {
      if (!user?.id) {
        console.log('No user ID, skipping plan fetch');
        return;
      }

      try {
        // Get user's permitted locations
        let permittedLocationIds: string[] = [];
        const isManager = String(user.role || '').toLowerCase().includes('manager');
        
        console.log('User role:', user.role, 'isManager:', isManager);
        
        if (isManager && user.assigned_location) {
          permittedLocationIds = [user.assigned_location];
          console.log('Manager assigned location:', user.assigned_location);
        } else {
          const { data: ownerships, error: ownershipError } = await supabase
            .from('location_owners')
            .select('location_id')
            .eq('owner_id', user.id);
          
          if (ownershipError) {
            console.error('Error fetching location ownerships:', ownershipError);
            toast({ title: 'Error loading locations', description: 'Could not fetch your locations', variant: 'destructive' });
            return;
          }
          
          permittedLocationIds = (ownerships || []).map((o: any) => o.location_id).filter(Boolean);
          console.log('Owner locations:', permittedLocationIds);
        }

        if (permittedLocationIds.length === 0) {
          console.log('No permitted locations found');
          // Note: Since location-based filtering is not yet implemented in the database,
          // we'll proceed to fetch all plans regardless of user permissions
          console.log('Proceeding to fetch all plans since location filtering is not available');
        }

        // Fetch plans that are available for user's locations
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('id, name, type, price, active, duration_days, max_redemptions, plan_amount, currency, multiplier')
          .eq('active', true);
        
        if (error) {
          console.error('Error fetching plans:', error);
          toast({ title: 'Error loading plans', description: 'Could not fetch subscription plans', variant: 'destructive' });
          return;
        }
        
        console.log('Fetched plans:', data);

        if (data) {
          // Since the locations column doesn't exist in the database yet,
          // show all active plans for now. Location-based filtering will be
          // implemented when the database schema is updated.
          setSchemes(data);
          
          console.log('Available plans:', data);
          
          if (data.length === 0) {
            toast({ title: 'No plans available', description: 'No active subscription plans found', variant: 'destructive' });
          }
        }
      } catch (error) {
        console.error('Unexpected error in fetchPlans:', error);
        toast({ title: 'Error', description: 'An unexpected error occurred while loading plans', variant: 'destructive' });
      }
    }
    fetchPlans();
  }, [user?.id, user?.role, user?.assigned_location]);

  // Fetch UPI accounts for location when UPI is chosen
  useEffect(() => {
    const run = async () => {
      if (paymentMethod !== 'UPI' || !selectedLocationId) {
        setUpiAccounts([]);
        setSelectedUpiAccountId('');
        return;
      }
      const { data } = await supabase
        .from('upi_accounts_with_locations')
        .select('id, account_name, upi_id, qr_code_url')
        .eq('location_id', selectedLocationId)
        .eq('is_active', true);
      setUpiAccounts(data || []);
      if ((data || []).length === 1) setSelectedUpiAccountId(data![0].id);
    };
    run();
  }, [paymentMethod, selectedLocationId]);

  // Fetch permitted locations for logged-in user (owners or managers)
  useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      // Manager: use assigned_location if set
      const isManager = String(user.role || '').toLowerCase().includes('manager');
      if (isManager && user.assigned_location) {
        const { data: loc } = await supabase
          .from('locations')
          .select('id, name')
          .eq('id', user.assigned_location)
          .maybeSingle();
        setPermittedLocations(loc ? [{ id: loc.id, name: loc.name }] : []);
        return;
      }
      // Owner (or others): use location_owners mapping
      const { data: ownerships } = await supabase
        .from('location_owners')
        .select('location_id')
        .eq('owner_id', user.id);
      const ids = (ownerships || []).map((o: any) => o.location_id).filter(Boolean);
      if (ids.length === 0) {
        setPermittedLocations([]);
        return;
      }
      const { data: locs } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', ids);
      setPermittedLocations((locs || []).map((l: any) => ({ id: l.id, name: l.name })));
    };
    run();
  }, [user?.id, user?.role, user?.assigned_location]);

  useEffect(() => {
    async function fetchDetails() {
      // Get all unique customer_ids, plan_ids, and vehicle_ids from purchases
      const customerIds = Array.from(new Set(subscriptionCustomers.map(c => c.customer_id).filter(Boolean)));
      const planIds = Array.from(new Set(subscriptionCustomers.map(c => c.plan_id).filter(Boolean)));
      const vehicleIds = Array.from(new Set(subscriptionCustomers.map(c => c.vehicle_id).filter(Boolean)));

      // Fetch customer details first
      let customerMap: Record<string, any> = {};
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, phone, email, default_vehicle_id')
          .in('id', customerIds);
        (customers || []).forEach(c => { customerMap[c.id] = c; });
        setCustomerDetailsMap(customerMap);
      }

      // Fetch plan details
      if (planIds.length > 0) {
        const { data: plans } = await supabase
          .from('subscription_plans')
          .select('id, name, type, price, max_redemptions, currency, multiplier, plan_amount')
          .in('id', planIds);
        const map: Record<string, any> = {};
        (plans || []).forEach(p => { map[p.id] = p; });
        setPlanDetailsMap(map);
      }

      // Fetch vehicle details for both subscription vehicles and customer default vehicles
      const allVehicleIds = Array.from(new Set([
        ...vehicleIds,
        ...Object.values(customerMap).map((c: any) => c.default_vehicle_id).filter(Boolean)
      ]));

      if (allVehicleIds.length > 0) {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select(`
            id, 
            number_plate, 
            type, 
            Brand, 
            model,
            Vehicles_in_india (
              Models,
              "Vehicle Brands"
            )
          `)
          .in('id', allVehicleIds);
        
        const vehicleMap: Record<string, any> = {};
        
        // First, let's fetch the model names separately for vehicles that have UUIDs
        const vehicleUUIDs = (vehicles || [])
          .map(v => v.model)
          .filter(model => model && model.length === 36 && model.includes('-')); // Detect UUIDs
        
        let modelNameMap: Record<string, string> = {};
        if (vehicleUUIDs.length > 0) {
          const { data: modelData } = await supabase
            .from('Vehicles_in_india')
            .select('id, Models')
            .in('id', vehicleUUIDs);
          
          (modelData || []).forEach(model => {
            modelNameMap[model.id] = model.Models;
          });
        }
        
        (vehicles || []).forEach(v => { 
          // Get the model name from Vehicles_in_india join or fallback to raw model field
          const joinedData = (v.Vehicles_in_india?.[0] as any) || null;
          let modelName = joinedData?.Models || '';
          
          // If no joined data and model looks like UUID, try our separate lookup
          if (!modelName && v.model && v.model.length === 36 && v.model.includes('-')) {
            modelName = modelNameMap[v.model] || '';
          }
          
          const brandName = joinedData?.['Vehicle Brands'] || v.Brand || '';
          
          vehicleMap[v.id] = {
            ...v,
            Model: modelName || v.model || '',
            Brand: brandName,
            // Store original for debugging
            originalModel: v.model,
            joinedModel: joinedData?.Models,
            lookupModel: modelNameMap[v.model] || null
          };
        });
        setVehicleInfoMap(vehicleMap);
      }

      // Fetch credit accounts for these customers
      if (customerIds.length > 0) {
        const { data: credits } = await supabase
          .from('credit_accounts')
          .select('id, customer_id, balance, total_deposited')
          .in('customer_id', customerIds);
        const cmap: Record<string, any> = {};
        (credits || []).forEach((r: any) => { cmap[r.customer_id] = { id: r.id, balance: Number(r.balance || 0), total_deposited: Number(r.total_deposited || 0) }; });
        setCreditAccountMap(cmap);
      }

      // Fetch visit/package usage histories for current purchases
      if (planIds.length > 0 && subscriptionCustomers.length > 0) {
        const purchaseIdsForVisit = subscriptionCustomers
          .filter(p => {
            const pl = planDetailsMap[p.plan_id];
            const t = String(pl?.type || '').toLowerCase();
            return t === 'visit' || t === 'package';
          })
          .map(p => p.id);
        if (purchaseIdsForVisit.length > 0) {
          const { data: usages } = await supabase
            .from('package_usages')
            .select('id, purchase_id, service_type, use_date, notes')
            .in('purchase_id', purchaseIdsForVisit)
            .order('use_date', { ascending: false });
          const umap: Record<string, any[]> = {};
          (usages || []).forEach(u => {
            if (!umap[u.purchase_id]) umap[u.purchase_id] = [];
            umap[u.purchase_id].push(u);
          });
          setUsageHistoryMap(umap);
        } else {
          setUsageHistoryMap({});
        }
      }

      // Fetch loyalty visits for all purchases
      if (subscriptionCustomers.length > 0) {
        const allPurchaseIds = subscriptionCustomers.map(p => p.id);
        const { data: loyaltyVisits } = await supabase
          .from('loyalty_visits')
          .select('id, purchase_id, visit_type, service_rendered, amount_charged, visit_time, payment_method')
          .in('purchase_id', allPurchaseIds)
          .order('visit_time', { ascending: false })
          .limit(50); // Limit to recent visits
        
        const lvmap: Record<string, any[]> = {};
        (loyaltyVisits || []).forEach(lv => {
          if (!lvmap[lv.purchase_id]) lvmap[lv.purchase_id] = [];
          lvmap[lv.purchase_id].push(lv);
        });
        setLoyaltyVisitsMap(lvmap);
      }
    }
    if (subscriptionCustomers.length > 0) {
      fetchDetails();
    }
  }, [subscriptionCustomers]);

  const filteredCustomers = subscriptionCustomers.filter(purchase => {
    const cust = customerDetailsMap[purchase.customer_id] || {};
    const plan = planDetailsMap[purchase.plan_id] || {};
    const vehicle = vehicleInfoMap[cust.default_vehicle_id] || {};
    const name = String(cust.name || '');
    const phone = String(cust.phone || '');
    const scheme = String(plan.name || '');
    const vehicleNumber = String(vehicle.number_plate || '');
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = term.length === 0 ||
      name.toLowerCase().includes(term) ||
      phone.toLowerCase().includes(term) ||
      scheme.toLowerCase().includes(term) ||
      vehicleNumber.toLowerCase().includes(term);
    const normalizedStatus = String(purchase.status || '').toLowerCase();
    const filterNorm = filterStatus.toLowerCase();
    let matchesFilter = filterStatus === 'all' || normalizedStatus === filterNorm.replace(' ', '');
    // Expiring Soon derived filter mode
    if (expiringMode) {
      if (!purchase.expiry_date) return false;
      const now = new Date();
      const in7 = new Date(now.getTime() + 7*24*60*60*1000);
      const d = new Date(purchase.expiry_date);
      matchesFilter = d >= now && d <= in7;
    }
    // Loyalty mode: only visit-based plan purchases
    if (loyaltyMode) {
      matchesFilter = String(plan.type || '').toLowerCase() === 'visit';
    }
    return matchesSearch && matchesFilter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Subscription': return Crown;
      case 'Credit': return CreditCard;
      case 'Visit-based': return Zap;
      default: return Users;
    }
  };

  // Handler for Add Customer button
  const handleAddCustomerClick = () => {
    setShowAddModal(true);
    setAddStep('selectPlan');
    setSchemeType('');
    setPlanType('');
    setCustomerDetails(null);
    setVehicleNumberInput('');
    setPhoneInput('');
    setSelectedScheme('');
    setSelectedPlanId('');
    setSelectedLocationId('');
    setVehicleDetails({ number_plate: '', type: '', vehicle_brand: '', vehicle_model: '' });
    setModelQuery('');
    setModelSuggestions([]);
    setPaymentMethod('');
    setExistingCustomer(null);
    setExistingVehicle(null);
    setShowCustomerSuggestions(false);
    setShowVehicleSuggestions(false);
  };

  // Handler for discarding the add customer form
  const handleDiscard = () => {
    setShowAddModal(false);
    setAddStep('selectPlan');
    setSchemeType('');
    setPlanType('');
    setCustomerDetails(null);
    setVehicleNumberInput('');
    setPhoneInput('');
    setSelectedScheme('');
    setSelectedPlanId('');
    setSelectedLocationId('');
    setExistingCustomer(null);
    setExistingVehicle(null);
    setShowCustomerSuggestions(false);
    setShowVehicleSuggestions(false);
  };

  // When a plan is selected, store id and drive next step by type
  const handlePlanSelect = (planId: string) => {
    const plan = schemes.find((p) => p.id === planId);
    if (plan) {
      setSelectedPlanId(planId);
      setSelectedScheme(planId);
      setSchemeType(plan.type);
      setPlanType(plan.type);
      // Go to identify step: phone first for credit, vehicle first for others
      setVehicleNumberInput('');
      setPhoneInput('');
      setAddStep('identify');
    }
  };

  const handleIdentify = async () => {
    // Proceed to form from identify
    // Data should already be auto-filled by the fetch functions
    // Just ensure we have the basic required data
    
    if (planType === 'credit') {
      // For credit plans, ensure customer data is set
      if (!customerDetails) {
        setCustomerDetails({ 
          name: '', 
          phone: phoneInput.trim(), 
          email: '', 
          dob: '' 
        });
      }
    } else {
      // For non-credit plans, ensure vehicle data is set
      if (!vehicleDetails) {
        setVehicleDetails({ 
          number_plate: vehicleNumberInput.trim().toUpperCase(), 
          type: '', 
          vehicle_brand: '', 
          vehicle_model: '' 
        });
      }
      
      // If we found a vehicle with an associated customer, ensure customer data is also set
      if (existingCustomer && !customerDetails) {
        setCustomerDetails({
          name: existingCustomer.name || '',
          phone: existingCustomer.phone || '',
          email: existingCustomer.email || '',
          dob: existingCustomer.date_of_birth || '',
          id: existingCustomer.id
        });
      }
    }

    setAddStep('form');
  };

  // Reusable prefill function (removed)
  // const prefillFromInputs = async () => {};

  // Debounced fetch during identify step as user types
  useEffect(() => {
    // identify effect triggered
    
    const timeoutId = setTimeout(() => {
      if (planType === 'credit' && phoneInput.trim()) {
        // fetching customer by phone
        fetchExistingCustomer(phoneInput);
      } else if (planType !== 'credit' && vehicleNumberInput.trim()) {
        // fetching vehicle by number
        fetchExistingVehicle(vehicleNumberInput);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [phoneInput, vehicleNumberInput, planType, user?.id]);

  // Vehicles_in_india model suggestions
  useEffect(() => {
    const run = async () => {
      const q = modelQuery.trim();
      if (q.length < 2) { setModelSuggestions([]); return; }
      const { data } = await supabase
        .from('Vehicles_in_india')
        .select('id, "Vehicle Brands", Models, type')
        .ilike('Models', `%${q}%`)
        .limit(10);
      const list = (data || []).map((r: any) => ({ id: r.id, brand: r['Vehicle Brands'] || '', model: r.Models || '', type: r.type || '' }));
      setModelSuggestions(list);
    };
    run();
  }, [modelQuery]);

  // Save: upsert customer and vehicle; create subscription purchase
  const handleSaveCustomer = async () => {
    setIsLoading(true);

    try {
      if (!(selectedPlanId || selectedScheme)) {
        toast({ title: 'Select a plan', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (!customerDetails?.phone) {
        toast({ title: 'Phone number required', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // 1) Handle vehicle - reuse existing ID if available, otherwise create/update
      let vehicleId: string | null = null;
      const locationArray = selectedLocationId ? [selectedLocationId] : null;
      
      if (vehicleDetails.number_plate) {
        const numberPlate = vehicleDetails.number_plate.toUpperCase();
        
        // If we have an existing vehicle ID from the identify step, use it
        if (vehicleDetails.id) {
          vehicleId = vehicleDetails.id;
          // Update the existing vehicle with new details
          const modelId = vehicleDetails.vehicle_model ? 
            (await supabase.from('Vehicles_in_india').select('id').eq('Models', vehicleDetails.vehicle_model).maybeSingle()).data?.id : null;
          
          await supabase
            .from('vehicles')
            .update({
              type: vehicleDetails.type || null,
              Brand: vehicleDetails.vehicle_brand || null,
              model: modelId,
              location_id: locationArray,
            })
            .eq('id', vehicleId);
        } else {
          // Check if vehicle exists in vehicles table
          const { data: existingVehicle } = await supabase
            .from('vehicles')
            .select('id, type')
            .eq('number_plate', numberPlate)
            .eq('owner_id', user?.id)
            .limit(1);

          if (existingVehicle && existingVehicle.length > 0) {
            vehicleId = existingVehicle[0].id;
            const existingType = existingVehicle[0].type || null;
            const finalType = existingType || vehicleDetails.type || null;
            const modelId = vehicleDetails.vehicle_model ? 
              (await supabase.from('Vehicles_in_india').select('id').eq('Models', vehicleDetails.vehicle_model).maybeSingle()).data?.id : null;
            
            await supabase
              .from('vehicles')
              .update({
                type: finalType,
                Brand: vehicleDetails.vehicle_brand || null,
                model: modelId,
                location_id: locationArray,
              })
              .eq('id', vehicleId);
            if (!vehicleDetails.type && existingType) {
              setVehicleDetails((prev: any) => ({ ...prev, type: existingType }));
            }
          } else {
            const finalType = vehicleDetails.type || null;
            const modelId = vehicleDetails.vehicle_model ? 
              (await supabase.from('Vehicles_in_india').select('id').eq('Models', vehicleDetails.vehicle_model).maybeSingle()).data?.id : null;
            
            const { data: insertedVehicle, error: vehicleErr } = await supabase
              .from('vehicles')
              .insert([
                {
                  number_plate: numberPlate,
                  type: finalType,
                  owner_id: user?.id || null,
                  Brand: vehicleDetails.vehicle_brand || null,
                  model: modelId,
                  location_id: locationArray,
                }
              ])
              .select('id');
            if (vehicleErr || !insertedVehicle || !insertedVehicle[0]?.id) {
              throw new Error('Error adding vehicle');
            }
            vehicleId = insertedVehicle[0].id;
          }
        }
      }

      // 2) Handle customer - reuse existing ID if available, otherwise create/update
      const phoneKey = customerDetails.phone;
      let customerId: string | null = null;
      
      // If we have an existing customer ID from the identify step, use it
      if (customerDetails.id) {
        customerId = customerDetails.id;
        // Update the existing customer with new details
        const customerPayload: any = {
          name: customerDetails.name || null,
          phone: phoneKey,
          email: customerDetails.email || null,
          owner_id: user?.id || null,
        };
        if (customerDetails.dob) customerPayload.date_of_birth = customerDetails.dob;
        
        await supabase.from('customers').update(customerPayload).eq('id', customerId);
      } else {
        // Check if customer exists by phone
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', phoneKey)
          .limit(1);

        const customerPayload: any = {
          name: customerDetails.name || null,
          phone: phoneKey,
          email: customerDetails.email || null,
          owner_id: user?.id || null,
        };
        if (customerDetails.dob) customerPayload.date_of_birth = customerDetails.dob;

        if (existingCustomer && existingCustomer.length > 0) {
          customerId = existingCustomer[0].id;
          await supabase.from('customers').update(customerPayload).eq('id', customerId);
        } else {
          const { data: customerInsert, error: customerError } = await supabase
            .from('customers')
            .insert([customerPayload])
            .select('id');
          if (customerError || !customerInsert || !customerInsert[0]?.id) {
            throw new Error('Error adding customer');
          }
          customerId = customerInsert[0].id;
        }
      }

      // 3) Set default_vehicle_id if we created/selected a vehicle
      if (vehicleId && customerId) {
        await supabase.from('customers').update({ default_vehicle_id: vehicleId }).eq('id', customerId);
      }

      // 4) Create subscription purchase using returned ids and plan attributes
      const selPlan = (schemes || []).find((p: any) => p.id === (selectedPlanId || selectedScheme)) || {};
      const now = new Date();
      const startDate = now.toISOString();
      const expiryDate = selPlan?.duration_days ? new Date(now.getTime() + (Number(selPlan.duration_days) || 0) * 24 * 60 * 60 * 1000).toISOString() : null;
      const totalValue = Number(selPlan?.price || 0);
      const _planTypeNorm = String(selPlan?.type || '').toLowerCase().trim();
      const isCredit = _planTypeNorm === 'credit' || _planTypeNorm.startsWith('credit');
      const remainingValue = isCredit ? totalValue : null;
      const remainingVisits = !isCredit && selPlan?.max_redemptions != null ? Number(selPlan.max_redemptions) : null;
      const actualAmountPaid = selPlan?.plan_amount != null ? Number(selPlan.plan_amount) : totalValue;

      // Build payment method string
      let purchasePaymentMethod: string | null = null;
      if (paymentMethod) {
        if (paymentMethod === 'UPI') {
          const sel = upiAccounts.find(a => a.id === selectedUpiAccountId);
          if (sel) {
            purchasePaymentMethod = `UPI:${sel.account_name},${sel.upi_id}`;
          } else {
            purchasePaymentMethod = 'UPI';
          }
        } else if (paymentMethod === 'Pay later') {
          purchasePaymentMethod = 'paylater';
        } else if (paymentMethod === 'card' || paymentMethod === 'cash') {
          purchasePaymentMethod = paymentMethod;
        } else {
          purchasePaymentMethod = paymentMethod;
        }
      }

      const { error: purchaseError, data: purchaseInsertOut } = await supabase
        .from('subscription_purchases')
        .insert([
          {
            plan_id: selectedPlanId || selectedScheme,
            customer_id: customerId,
            vehicle_id: vehicleId, // This will be the ID from the vehicles table
            location_id: selectedLocationId || null,
            status: 'active',
            created_by: user?.id || null,
            start_date: startDate,
            expiry_date: expiryDate,
            total_value: totalValue,
            amount: actualAmountPaid,
            remaining_value: remainingValue,
            remaining_visits: remainingVisits,
            source_payment_method: purchasePaymentMethod,
          }
        ])
        .select('id')
        .limit(1);
 
       if (purchaseError) {
         throw new Error('Error creating subscription purchase');
       }

      // Create subscription_payments ledger for this purchase
      if (customerId) {
        const purchaseIdOut = (purchaseInsertOut && purchaseInsertOut[0]?.id) || null;
        const normalizedMethod = (() => {
          const m = String(purchasePaymentMethod || '').toLowerCase();
          if (m.startsWith('upi')) return 'upi';
          if (m === 'cash') return 'cash';
          if (m === 'card') return 'card';
          if (m === 'paylater' || m === 'credit') return 'credit';
          if (m === 'mixed') return 'mixed';
          return m || 'cash';
        })();
        const paymentMeta = (() => {
          if (normalizedMethod !== 'upi') return null as any;
          const sel = upiAccounts.find(a => a.id === selectedUpiAccountId);
          return sel ? { upi_account_id: sel.id, upi_id: sel.upi_id, account_name: sel.account_name } : null;
        })();
        const { data: payIns, error: payErr } = await supabase
          .from('subscription_payments')
          .insert([
            {
              purchase_id: purchaseIdOut,
              customer_id: customerId,
              amount: Number(totalValue || 0),
              payment_method: normalizedMethod,
              payment_meta: paymentMeta,
              created_by: user?.id || null,
            }
          ])
          .select('id')
          .limit(1);
        if (payErr) {
          toast({ title: 'Payment failed', description: 'Could not save payment', variant: 'destructive' });
        } else if (isCredit) {
          // For credit plans, record a credit_transactions topup referencing this payment
          const relatedPaymentId = payIns && payIns[0]?.id;
          // Ensure credit account exists/updated first (handled below), then log transaction
          const { data: creditAcc } = await supabase
            .from('credit_accounts')
            .select('id')
            .eq('customer_id', customerId)
            .maybeSingle();
          if (creditAcc?.id) {
            const { error: txErr } = await supabase
              .from('credit_transactions')
              .insert([
                {
                  credit_account_id: creditAcc.id,
                  transaction_type: 'topup',
                  amount: Number(totalValue || 0),
                  related_payment_id: relatedPaymentId || null,
                  created_by: user?.id || null,
                }
              ]);
            if (txErr) { toast({ title: 'Transaction failed', description: 'Could not record credit transaction', variant: 'destructive' }); }
          }
        }
      }

      // 5) If selected plan is credit, insert into credit_accounts (simple insert)
      if (customerId) {
        // Re-check plan type directly from DB using plan_id
        const currentPlanId = selectedPlanId || selectedScheme;
        if (currentPlanId) {
          const { data: planRow, error: planErr } = await supabase
            .from('subscription_plans')
            .select('id, type, price')
            .eq('id', currentPlanId)
            .maybeSingle();
          if (planErr) {
            toast({ title: 'Plan fetch failed', variant: 'destructive' });
          }
          const typeNorm = String(planRow?.type || '').toLowerCase().trim();
          if (typeNorm === 'credit') {
            const amount = Number(selPlan?.price || planRow?.price || 0) || 0;
            const nowIso = new Date().toISOString();
            const insertPayload = {
              customer_id: customerId,
              total_deposited: amount,
              balance: amount,
              currency: 'INR',
              last_topup_at: nowIso,
            } as any;
            const { error: insErr } = await supabase
              .from('credit_accounts')
              .insert([insertPayload]);
            if (insErr) {
              // ignore duplicate handling below
              // If duplicate (already exists), increment totals
              const duplicate = String(insErr?.message || '').toLowerCase().includes('duplicate') || insErr?.code === '23505';
              if (duplicate) {
                const { data: existing, error: selErr } = await supabase
                  .from('credit_accounts')
                  .select('id, total_deposited, balance')
                  .eq('customer_id', customerId)
                  .maybeSingle();
                if (!selErr && existing) {
                  const newTotalDeposited = Number(existing.total_deposited || 0) + amount;
                  const newBalance = Number(existing.balance || 0) + amount;
                  const { error: updErr } = await supabase
                    .from('credit_accounts')
                    .update({ total_deposited: newTotalDeposited, balance: newBalance, currency: 'INR', last_topup_at: nowIso })
                    .eq('id', existing.id);
                  if (updErr) {
                    // silent fail
                    toast({ title: 'Update failed', description: 'Could not update credit balance', variant: 'destructive' });
                  }
                } else if (selErr) {
                  // silent fail
                  toast({ title: 'Update failed', description: 'Could not update credit account', variant: 'destructive' });
                }
              } else {
                toast({ title: 'Create failed', description: 'Could not create credit account', variant: 'destructive' });
              }
            }
          }
        }
      }

      // Success overlay
      setShowSuccess(true);
      // Refresh customer list
      await fetchPurchases();
      setTimeout(() => {
        setShowSuccess(false);
        setShowAddModal(false);
      }, 1200);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadTopupUpi = async () => {
      if (topupMethod !== 'upi' || !selectedPurchase?.location_id) {
        setTopupUpiAccounts([]);
        setTopupSelectedUpiAccountId('');
        return;
      }
      const { data } = await supabase
        .from('upi_accounts_with_locations')
        .select('id, account_name, upi_id, qr_code_url')
        .eq('location_id', selectedPurchase.location_id)
        .eq('is_active', true);
      setTopupUpiAccounts(data || []);
      if ((data || []).length === 1) setTopupSelectedUpiAccountId((data as any)[0].id);
    };
    loadTopupUpi();
  }, [topupMethod, selectedPurchase?.location_id]);

  useEffect(() => {
    const loadRenewUpi = async () => {
      if (renewPaymentMethod !== 'UPI' || !selectedPurchase?.location_id) {
        setRenewUpiAccounts([]);
        setRenewSelectedUpiAccountId('');
        return;
      }
      const { data } = await supabase
        .from('upi_accounts_with_locations')
        .select('id, account_name, upi_id, qr_code_url')
        .eq('location_id', selectedPurchase.location_id)
        .eq('is_active', true);
      setRenewUpiAccounts(data || []);
      if ((data || []).length === 1) setRenewSelectedUpiAccountId((data as any)[0].id);
    };
    loadRenewUpi();
  }, [renewPaymentMethod, selectedPurchase?.location_id]);

  // Export function
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Get user's permitted locations for filtering
      let permittedLocationIds: string[] = [];
      const isManager = String(user.role || '').toLowerCase().includes('manager');
      
      if (isManager && user.assigned_location) {
        permittedLocationIds = [user.assigned_location];
      } else {
        const { data: ownerships } = await supabase
          .from('location_owners')
          .select('location_id')
          .eq('owner_id', user.id);
        permittedLocationIds = (ownerships || []).map((o: any) => o.location_id).filter(Boolean);
      }

      if (permittedLocationIds.length === 0) {
        toast({ title: 'No data to export', description: 'No accessible locations found', variant: 'destructive' });
        return;
      }

      // Build query with filters - fetch data separately to avoid FK issues
      let query = supabase
        .from('subscription_purchases')
        .select('*')
        .in('location_id', permittedLocationIds)
        .order('created_at', { ascending: false });

      // Apply filters
      if (exportFilters.locationId) {
        query = query.eq('location_id', exportFilters.locationId);
      }
      if (exportFilters.status) {
        query = query.eq('status', exportFilters.status);
      }
      if (exportFilters.startDate) {
        query = query.gte('created_at', new Date(exportFilters.startDate).toISOString());
      }
      if (exportFilters.endDate) {
        query = query.lte('created_at', new Date(exportFilters.endDate + 'T23:59:59').toISOString());
      }

      const { data: exportData, error } = await query.limit(1000);

      if (error) {
        toast({ title: 'Export failed', description: 'Could not fetch data for export', variant: 'destructive' });
        return;
      }

      if (!exportData || exportData.length === 0) {
        toast({ title: 'No data to export', description: 'No records match the selected filters', variant: 'destructive' });
        return;
      }

      // Get unique IDs for related data
      const customerIds = Array.from(new Set(exportData.map(item => item.customer_id).filter(Boolean)));
      const planIds = Array.from(new Set(exportData.map(item => item.plan_id).filter(Boolean)));
      const vehicleIds = Array.from(new Set(exportData.map(item => item.vehicle_id).filter(Boolean)));
      const locationIds = Array.from(new Set(exportData.map(item => item.location_id).filter(Boolean)));

      // Fetch related data separately
      const [customersData, plansData, vehiclesData, locationsData] = await Promise.all([
        customerIds.length > 0 ? supabase
          .from('customers')
          .select('id, name, phone, email, default_vehicle_id')
          .in('id', customerIds) : Promise.resolve({ data: [], error: null }),
        
        planIds.length > 0 ? supabase
          .from('subscription_plans')
          .select('id, name, type, price, max_redemptions, plan_amount, multiplier')
          .in('id', planIds) : Promise.resolve({ data: [], error: null }),
        
        vehicleIds.length > 0 ? supabase
          .from('vehicles')
          .select('id, number_plate, type, Brand, model')
          .in('id', vehicleIds) : Promise.resolve({ data: [], error: null }),
        
        locationIds.length > 0 ? supabase
          .from('locations')
          .select('id, name')
          .in('id', locationIds) : Promise.resolve({ data: [], error: null })
      ]);

      // Check for errors in related data fetching
      if (customersData.error) {
        console.error('Error fetching customers:', customersData.error);
      }
      if (plansData.error) {
        console.error('Error fetching plans:', plansData.error);
      }
      if (vehiclesData.error) {
        console.error('Error fetching vehicles:', vehiclesData.error);
      }
      if (locationsData.error) {
        console.error('Error fetching locations:', locationsData.error);
      }

      // Create lookup maps
      const customersMap: Record<string, any> = {};
      const plansMap: Record<string, any> = {};
      const vehiclesMap: Record<string, any> = {};
      const locationsMap: Record<string, any> = {};

      (customersData.data || []).forEach(c => { customersMap[c.id] = c; });
      (plansData.data || []).forEach(p => { plansMap[p.id] = p; });
      (vehiclesData.data || []).forEach(v => { 
        vehiclesMap[v.id] = {
          ...v,
          Model: v.model || '',
          Brand: v.Brand || ''
        };
      });
      (locationsData.data || []).forEach(l => { locationsMap[l.id] = l; });

      // Filter by plan type if specified
      let filteredData = exportData;
      if (exportFilters.planType) {
        filteredData = exportData.filter(item => {
          const plan = plansMap[item.plan_id];
          return String(plan?.type || '').toLowerCase() === exportFilters.planType.toLowerCase();
        });
      }

      // Fetch credit account details for credit plans
      const creditCustomerIds = filteredData
        .filter(item => {
          const plan = plansMap[item.plan_id];
          return String(plan?.type || '').toLowerCase() === 'credit';
        })
        .map(item => item.customer_id)
        .filter(Boolean);

      let creditAccountsMap: Record<string, any> = {};
      if (creditCustomerIds.length > 0) {
        const { data: creditAccounts } = await supabase
          .from('credit_accounts')
          .select('customer_id, balance, total_deposited')
          .in('customer_id', creditCustomerIds);
        
        (creditAccounts || []).forEach(account => {
          creditAccountsMap[account.customer_id] = account;
        });
      }

      // Prepare CSV data
      const csvData = filteredData.map(item => {
        const customer = customersMap[item.customer_id] || {};
        const plan = plansMap[item.plan_id] || {};
        const vehicle = vehiclesMap[item.vehicle_id] || {};
        const location = locationsMap[item.location_id] || {};
        const creditAccount = creditAccountsMap[item.customer_id] || {};

        return {
          'Customer Name': customer.name || '',
          'Phone': customer.phone || '',
          'Email': customer.email || '',
          'Location': location.name || '',
          'Plan Name': plan.name || '',
          'Plan Type': plan.type || '',
          'Plan Price': plan.price ? `₹${plan.price}` : '',
          'Plan Amount': plan.plan_amount ? `₹${plan.plan_amount}` : '',
          'Multiplier': plan.multiplier || '',
          'Vehicle Number': vehicle.number_plate || '',
          'Vehicle Model': vehicle.Model || '',
          'Vehicle Brand': vehicle.Brand || '',
          'Vehicle Type': vehicle.type || '',
          'Status': item.status || '',
          'Start Date': item.start_date ? new Date(item.start_date).toLocaleDateString() : '',
          'Expiry Date': item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '',
          'Remaining Visits': item.remaining_visits ?? '',
          'Total Value': item.total_value ? `₹${item.total_value}` : '',
          'Amount Paid': item.amount ? `₹${item.amount}` : '',
          'Credit Balance': creditAccount.balance ? `₹${creditAccount.balance}` : '',
          'Total Deposited': creditAccount.total_deposited ? `₹${creditAccount.total_deposited}` : '',
          'Purchase Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : '',
          'Payment Method': item.source_payment_method || '',
        };
      });

      // Generate filename
      const today = new Date().toISOString().split('T')[0];
      let filename = 'Customer_details';
      
      if (exportFilters.locationId) {
        const selectedLocation = permittedLocations.find(l => l.id === exportFilters.locationId);
        filename += `_${selectedLocation?.name || 'location'}`;
      }
      
      if (exportFilters.planType) {
        filename += `_${exportFilters.planType}`;
      }
      
      if (exportFilters.startDate || exportFilters.endDate) {
        filename += `_${exportFilters.startDate || 'start'}_to_${exportFilters.endDate || 'end'}`;
      } else {
        filename += `_${today}`;
      }

      // Check if we have data to export
      if (csvData.length === 0) {
        toast({ title: 'No data to export', description: 'No records match the selected filters after processing', variant: 'destructive' });
        return;
      }

      // Convert to CSV
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row] || '';
            // Escape commas and quotes in CSV
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowExportModal(false);
      toast({ title: 'Export successful', description: `Exported ${csvData.length} records to ${filename}.csv` });

    } catch (error) {
      toast({ title: 'Export failed', description: 'An error occurred during export', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Customers</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isManager 
              ? 'View and manage customers at your location'
              : 'Manage your subscription and loyalty members'
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          {!isManager && (
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowExportModal(true)}>
            Export Data
          </Button>
          )}
          <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg" onClick={handleAddCustomerClick}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in p-4">
          <Card className="w-full max-w-2xl p-0 overflow-hidden shadow-2xl animate-slide-up max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <Button variant="ghost" onClick={handleDiscard}>
                Discard
              </Button>
              <h2 className="text-xl font-bold">Add Customer</h2>
              <div style={{ width: 60 }}></div>
            </div>
            <CardContent className="max-h-[78vh] overflow-auto p-4 sm:p-6">
              {addStep === 'selectPlan' && (
                <div className="space-y-6">
                  <div className="font-medium mb-2">Select Plan</div>
                  <div className="space-y-2 max-h-64 overflow-auto pr-2">
                    {schemes.filter((p) => p.active !== false).length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground mb-2">No plans available</div>
                        <div className="text-sm text-muted-foreground">
                          No subscription plans are currently available for your locations.
                          Please contact your administrator to create plans.
                        </div>
                      </div>
                    ) : (
                      schemes.filter((p) => p.active !== false).map((p) => {
                        const type = String(p.type || '').toLowerCase();
                        const typeColor = type === 'credit' ? 'bg-green-100 text-green-700 border-green-200' : type === 'visit' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200';
                        return (
                          <Button
                            key={p.id}
                            className={`w-full justify-between border transition-colors ${selectedPlanId === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-foreground hover:bg-muted border-border'}`}
                            onClick={() => handlePlanSelect(p.id)}
                          >
                            <span>{p.name} - ₹{p.price || p.plan_amount || 0}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs border ${selectedPlanId === p.id ? 'bg-white/10 text-white border-white/20' : typeColor}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                          </Button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              {addStep === 'identify' && (
                <div className="space-y-6">
                  {planType === 'credit' ? (
                    <div>
                      <label className="block mb-2 font-medium">Phone Number</label>
                      <Input 
                        value={phoneInput} 
                        onChange={(e) => setPhoneInput(e.target.value)} 
                        placeholder="Enter phone number" 
                      />
                      {showCustomerSuggestions && existingCustomer && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-sm font-medium text-blue-900 mb-1">Existing Customer Found:</div>
                          <div className="text-sm text-blue-700">
                            <div>Name: {existingCustomer.name || 'Not provided'}</div>
                            <div>Email: {existingCustomer.email || 'Not provided'}</div>
                            <div>DOB: {existingCustomer.date_of_birth || 'Not provided'}</div>
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            This customer's details will be auto-filled in the next step.
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block mb-2 font-medium">Vehicle Number</label>
                      <Input 
                        value={vehicleNumberInput} 
                        onChange={(e) => setVehicleNumberInput(e.target.value.toUpperCase())} 
                        placeholder="Enter vehicle number" 
                      />
                      {showVehicleSuggestions && existingVehicle && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="text-sm font-medium text-green-900 mb-1">Existing Vehicle Found:</div>
                          <div className="text-sm text-green-700">
                            <div>Type: {existingVehicle.type || 'Not provided'}</div>
                            <div>Brand: {existingVehicle.Brand || 'Not provided'}</div>
                            <div>Model: {(existingVehicle as any).Vehicles_in_india?.Models || 'Not provided'}</div>
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            This vehicle's details will be auto-filled in the next step.
                          </div>
                        </div>
                      )}
                      {showCustomerSuggestions && existingCustomer && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-sm font-medium text-blue-900 mb-1">Associated Customer Found:</div>
                          <div className="text-sm text-blue-700">
                            <div>Name: {existingCustomer.name || 'Not provided'}</div>
                            <div>Phone: {existingCustomer.phone || 'Not provided'}</div>
                            <div>Email: {existingCustomer.email || 'Not provided'}</div>
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            This customer's details will also be auto-filled in the next step.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button onClick={handleIdentify} disabled={isLoading || (planType === 'credit' ? !phoneInput.trim() : !vehicleNumberInput.trim())}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
              {addStep === 'form' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button variant="ghost" onClick={handleDiscard}>Discard</Button>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Name</label>
                    <Input value={customerDetails?.name || ''} onChange={e => setCustomerDetails({ ...(customerDetails || {}), name: e.target.value })} placeholder="Customer Name" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Phone</label>
                    <Input value={customerDetails?.phone || ''} onChange={e => setCustomerDetails({ ...(customerDetails || {}), phone: e.target.value })} placeholder="Phone Number" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Email</label>
                    <Input value={customerDetails?.email || ''} onChange={e => setCustomerDetails({ ...(customerDetails || {}), email: e.target.value })} placeholder="Email (optional)" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Date of Birth</label>
                    <Input type="date" value={customerDetails?.dob || ''} onChange={e => setCustomerDetails({ ...(customerDetails || {}), dob: e.target.value })} placeholder="DOB" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Location</label>
                    <select className="w-full border rounded px-2 py-1" value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
                      <option value="">Select Location</option>
                      {permittedLocations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Payment Method</label>
                    <select className="w-full border rounded px-2 py-1" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="">Select method</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="Pay later">Pay later</option>
                    </select>
                  </div>
                  {paymentMethod === 'UPI' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block mb-1 font-medium">UPI Account</label>
                        <select className="w-full border rounded px-2 py-1" value={selectedUpiAccountId} onChange={(e) => setSelectedUpiAccountId(e.target.value)}>
                          <option value="">Select UPI account</option>
                          {upiAccounts.map(a => (
                            <option key={a.id} value={a.id}>{a.account_name} ({a.upi_id})</option>
                          ))}
                        </select>
                      </div>
                      {selectedUpiAccountId && (
                        <button type="button" className="text-blue-600 underline" onClick={() => setShowQr(true)}>
                          View QR code
                        </button>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block mb-1 font-medium">Vehicle Model</label>
                    <div className="relative">
                      <Input
                        value={vehicleDetails.vehicle_model || ''}
                        onChange={(e) => { setVehicleDetails({ ...vehicleDetails, vehicle_model: e.target.value }); setModelQuery(e.target.value); }}
                        onBlur={() => setTimeout(() => setModelSuggestions([]), 120)}
                        onFocus={() => { if ((vehicleDetails.vehicle_model || modelQuery).trim().length >= 2) { setModelQuery(vehicleDetails.vehicle_model || modelQuery); } }}
                        placeholder="Start typing model"
                      />
                      {modelSuggestions.length > 0 && (
                        <div className="absolute mt-1 left-0 right-0 border rounded-md max-h-40 overflow-auto bg-white z-50 shadow-md">
                          {modelSuggestions.map(s => (
                            <div
                              key={s.id}
                              className="px-3 py-2 hover:bg-muted cursor-pointer"
                              onMouseDown={() => {
                                setVehicleDetails({ ...vehicleDetails, vehicle_model: s.model, vehicle_brand: s.brand, type: s.type || vehicleDetails.type });
                                setModelQuery(s.model);
                                setModelSuggestions([]);
                              }}
                            >
                              {s.model} <span className="text-muted-foreground">({s.brand})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Manufacturer</label>
                    <Input value={vehicleDetails.vehicle_brand || ''} onChange={(e) => setVehicleDetails({ ...vehicleDetails, vehicle_brand: e.target.value })} placeholder="Brand / Manufacturer" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Vehicle Number</label>
                    <Input value={vehicleDetails.number_plate || ''} onChange={(e) => setVehicleDetails({ ...vehicleDetails, number_plate: e.target.value.toUpperCase() })} placeholder="Vehicle Number" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Vehicle Type</label>
                    <Input value={vehicleDetails.type || ''} onChange={(e) => setVehicleDetails({ ...vehicleDetails, type: e.target.value })} placeholder="Type (car/bike)" />
                  </div>
                  <div className="flex justify-end">
                    <Button className="mt-2" onClick={handleSaveCustomer} disabled={isLoading || !(selectedPlanId || selectedScheme) || !(customerDetails?.phone || '').trim()}>
                      {isLoading ? 'Saving...' : 'Save & Add to Scheme'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {showSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
              <div className="bg-white rounded-xl p-8 shadow-2xl text-center animate-scale-in">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 border border-green-200 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-600"><path fill="currentColor" d="M9 16.2l-3.5-3.5-1.4 1.4L9 19 20.3 7.7l-1.4-1.4z"/></svg>
                </div>
                <div className="text-lg font-semibold text-foreground mb-1">Customer added successfully</div>
              </div>
            </div>
          )}
          {showQr && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowQr(false)}>
              <div className="bg-white p-4 rounded shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold">UPI QR</div>
                  <button className="text-sm text-muted-foreground" onClick={() => setShowQr(false)}>Close</button>
                </div>
                {(() => {
                  const sel = upiAccounts.find(a => a.id === selectedUpiAccountId);
                  if (!sel?.qr_code_url) return <div className="text-sm text-muted-foreground">No QR available</div>;
                  return <img src={sel.qr_code_url} alt="UPI QR" className="w-full h-auto" />;
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 p-3 sm:p-4 bg-gradient-card rounded-xl border border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, vehicle number, or scheme..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm sm:text-base"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          {['all', 'Active', 'Expiring Soon', 'Expired'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className={`text-xs sm:text-sm ${filterStatus === status ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md' : 'hover:bg-primary/10'}`}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Customers', value: filteredCustomers.length, color: 'primary' },
          { label: 'Active', value: subscriptionCustomers.filter(c => String(c.status || '').toLowerCase() === 'active').length, color: 'success' },
          { label: 'Expiring Soon', value: subscriptionCustomers.filter(c => { const s = String(c.status || '').toLowerCase(); return s === 'expiring soon' || s === 'expiringsoon'; }).length, color: 'warning' },
          { label: 'Expired', value: subscriptionCustomers.filter(c => String(c.status || '').toLowerCase() === 'expired').length, color: 'destructive' }
        ].map((stat, index) => (
          <Card key={stat.label} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className={`text-xl sm:text-2xl font-bold text-${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Customers Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredCustomers.map((customer, index) => {
          const cust = customerDetailsMap[customer.customer_id] || {};
          const plan = planDetailsMap[customer.plan_id] || {};
          const vehicleInfo = vehicleInfoMap[cust.default_vehicle_id] || {};
          const showVehicleInfo = plan.type === 'package' || plan.type === 'visit';
          return (
            <Card 
              key={customer.id} 
              className="hover:shadow-card transition-all duration-300 bg-gradient-card animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-3 p-3 sm:p-6 sm:pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{cust.name || 'Customer'}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{cust.phone ? `Phone: ${cust.phone}` : ''}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{cust.email ? `Email: ${cust.email}` : ''}</p>
                    {showVehicleInfo && (
                      <>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{vehicleInfo.Model ? `Model: ${vehicleInfo.Model}` : ''}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{vehicleInfo.Brand ? `Brand: ${vehicleInfo.Brand}` : ''}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{vehicleInfo.number_plate ? `Vehicle: ${vehicleInfo.number_plate}` : ''}</p>
                      </>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedPurchase(customer); setShowViewModal(true); }}>View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedPurchase(customer);
                        const c = customerDetailsMap[customer.customer_id] || {};
                        setEditCustomerDraft({ id: c.id, name: c.name || '', phone: c.phone || '', email: c.email || '', date_of_birth: c.date_of_birth || '' });
                        setShowEditModal(true);
                      }}>Edit</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Status:</span>
                    <Badge 
                      variant="outline" 
                      className={
                        String(customer.status || '').toLowerCase() === 'active' 
                          ? 'border-green-500 text-green-700 bg-green-50' 
                          : String(customer.status || '').toLowerCase() === 'expired'
                          ? 'border-red-500 text-red-700 bg-red-50'
                          : 'border-gray-500 text-gray-700 bg-gray-50'
                      }
                    >
                      {String(customer.status || '').charAt(0).toUpperCase() + String(customer.status || '').slice(1)}
                    </Badge>
                  </div>
                  {customer.expiry_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Expiry Date:</span>
                      <span className="text-foreground font-medium">{customer.expiry_date?.slice(0,10)}</span>
                    </div>
                  )}
                  {customer.remaining_visits !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Visits Left:</span>
                      <span className={`${Number(customer.remaining_visits) === 0 ? 'text-red-600' : 'text-success'} font-medium`}>{customer.remaining_visits}</span>
                    </div>
                  )}
                  {String(plan.type || '').toLowerCase() === 'credit' && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Credit Balance:</span>
                      <span className={`${Number(creditAccountMap[customer.customer_id]?.balance ?? 0) === 0 ? 'text-red-600' : 'text-success'} font-medium`}>₹{(creditAccountMap[customer.customer_id]?.balance ?? 0).toLocaleString()}</span>
                    </div>
                  )}
                  {(String(plan.type || '').toLowerCase() === 'package' || String(plan.type || '').toLowerCase() === 'visit') && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-foreground mb-1">Visit History</div>
                      <div className="space-y-1 max-h-28 overflow-auto">
                        {(usageHistoryMap[customer.id] || []).slice(0, 5).map(u => (
                          <div key={u.id} className="text-xs text-muted-foreground flex justify-between">
                            <span>{u.service_type || 'full wash'}</span>
                            <span>{u.use_date ? new Date(u.use_date).toLocaleDateString() : ''}</span>
                          </div>
                        ))}
                        {!(usageHistoryMap[customer.id] || []).length && (
                          <div className="text-xs text-muted-foreground">No visits yet</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Recent Loyalty Visits */}
                  <div className="mt-2">
                    <div className="text-xs font-medium text-foreground mb-1">Recent Activity</div>
                    <div className="space-y-1 max-h-28 overflow-auto">
                      {(loyaltyVisitsMap[customer.id] || []).slice(0, 3).map(lv => (
                        <div key={lv.id} className="text-xs text-muted-foreground flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className={`px-1 py-0.5 rounded text-xs ${
                              lv.visit_type === 'redemption' ? 'bg-blue-100 text-blue-700' :
                              lv.visit_type === 'payment' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {lv.visit_type}
                            </span>
                            <span>{lv.service_rendered || 'Service'}</span>
                          </div>
                          <div className="text-right">
                            {lv.amount_charged > 0 && <span>₹{lv.amount_charged}</span>}
                            <div className="text-xs text-muted-foreground">
                              {lv.visit_time ? new Date(lv.visit_time).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                      {!(loyaltyVisitsMap[customer.id] || []).length && (
                        <div className="text-xs text-muted-foreground">No recent activity</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Show Remove from Plan button for expired customers below the details */}
                  {(() => {
                    const currentCreditBalance = Number(creditAccountMap[customer.customer_id]?.balance ?? 0);
                    const planType = String(plan.type || '').toLowerCase();
                    const isExpiredByDate = customer.expiry_date && new Date(customer.expiry_date) < new Date();
                    const isExpiredByVisits = customer.remaining_visits !== null && customer.remaining_visits <= 0;
                    const isExpiredByCredit = planType === 'credit' && currentCreditBalance <= 0;
                    const isExpiredByStatus = customer.status === 'expired';
                    
                    // Only show expiry notice if truly expired and no active value remaining
                    const shouldShowExpired = (isExpiredByStatus || isExpiredByDate || isExpiredByVisits || isExpiredByCredit) &&
                      // Additional safety checks
                      (planType !== 'credit' || currentCreditBalance <= 0) &&
                      (planType === 'credit' || customer.remaining_visits === 0 || customer.remaining_visits === null);
                    
                    if (!shouldShowExpired) return null;
                    
                    const expiryReason = isExpiredByStatus ? 'This plan has expired' :
                                       isExpiredByDate ? 'This plan has expired (date)' :
                                       isExpiredByVisits ? 'This plan has expired (no visits left)' :
                                       isExpiredByCredit ? 'This plan has expired (no credit left)' :
                                       'This plan has expired';
                    
                    return (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm text-red-700 font-medium mb-2">
                          {expiryReason}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 border-red-300 hover:bg-red-50" 
                        onClick={() => {
                          setDeleteTargetPurchase(customer);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        Remove from Plan
                      </Button>
                    </div>
                    );
                  })()}
                </div>
                {/* Plan Details Card */}
                <Card className="bg-muted/30 border border-border">
                  <CardHeader>
                    <div className="font-semibold text-primary">{plan.name || 'Plan'}</div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <div>Type: {plan.type}</div>
                      <div>Price: {plan.price ? `₹${plan.price}` : '-'}</div>
                      <div>Max Redemptions: {plan.max_redemptions ?? '-'}</div>
                      <div>Currency: {plan.currency || '-'}</div>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <Button size="sm" variant="outline" className="text-xs sm:text-sm flex-1 sm:flex-none" onClick={() => { setSelectedPurchase(customer); setShowViewModal(true); }}>
                    View
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs sm:text-sm flex-1 sm:flex-none" onClick={() => {
                    setSelectedPurchase(customer);
                    const c = customerDetailsMap[customer.customer_id] || {};
                    setEditCustomerDraft({ id: c.id, name: c.name || '', phone: c.phone || '', email: c.email || '', date_of_birth: c.date_of_birth || '' });
                    setShowEditModal(true);
                  }}>
                    Edit
                  </Button>
                  {String(plan.type || '').toLowerCase() === 'credit' && (
                    <Button size="sm" variant="outline" className="text-xs sm:text-sm flex-1 sm:flex-none" onClick={() => { setSelectedPurchase(customer); setTopupAmount(''); setTopupMethod('cash'); setTopupUpiId(''); setShowTopupModal(true); }}>
                      Top-up
                    </Button>
                  )}
                  {(String(plan.type || '').toLowerCase() === 'package' || String(plan.type || '').toLowerCase() === 'visit') && 
                   (customer.remaining_visits === 0 || customer.status === 'expired') && (
                    <Button size="sm" variant="outline" className="text-xs sm:text-sm flex-1 sm:flex-none" onClick={() => { 
                      setSelectedPurchase(customer); 
                      setRenewPaymentMethod('cash'); 
                      setRenewSelectedUpiAccountId(''); 
                      setShowRenewModal(true); 
                    }}>
                      Renew Plan
                    </Button>
                  )}
                  {/* Delete button for completed/expired plans */}
                  {(() => {
                    const currentCreditBalance = Number(creditAccountMap[customer.customer_id]?.balance ?? 0);
                    const planType = String(plan.type || '').toLowerCase();
                    const isExpiredByDate = customer.expiry_date && new Date(customer.expiry_date) < new Date();
                    const isExpiredByVisits = customer.remaining_visits !== null && customer.remaining_visits <= 0;
                    const isExpiredByCredit = planType === 'credit' && currentCreditBalance <= 0;
                    const isExpiredByStatus = customer.status === 'expired';
                    
                    // Only show delete if truly expired and no active value remaining
                    const shouldShowDelete = (isExpiredByStatus || isExpiredByDate || isExpiredByVisits || isExpiredByCredit) &&
                      // Additional safety checks
                      (planType !== 'credit' || currentCreditBalance <= 0) &&
                      (planType === 'credit' || customer.remaining_visits === 0 || customer.remaining_visits === null);
                    
                    return shouldShowDelete && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 border-red-300 hover:bg-red-50 text-xs sm:text-sm flex-1 sm:flex-none" 
                        onClick={() => {
                          setDeleteTargetPurchase(customer);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        Delete
                      </Button>
                    );
                  })()}
                  {(String(plan.type || '').toLowerCase() === 'package' || String(plan.type || '').toLowerCase() === 'visit') && 
                   customer.remaining_visits > 0 && 
                   customer.status === 'active' && (
                    <Button size="sm" variant="outline" className="text-xs sm:text-sm flex-1 sm:flex-none" onClick={() => { setSelectedPurchase(customer); setShowMarkVisit(true); setVisitNotes(''); setVisitService('full wash'); }}>
                      Mark Visit
                    </Button>
                  )}
                  {String(plan.type || '').toLowerCase() === 'credit' && 
                   Number(creditAccountMap[customer.customer_id]?.balance ?? 0) > 0 && 
                   customer.status === 'active' && (
                    <Button size="sm" variant="outline" className="text-xs sm:text-sm flex-1 sm:flex-none" onClick={() => { setSelectedPurchase(customer); setShowMarkEntry(true); setEntryAmount(''); setEntryService('full wash'); setEntryNotes(''); }}>
                      Mark Entry
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCustomers.length === 0 && (
        <Card className="p-12 text-center animate-fade-in">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No customers found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Start by adding your first customer'
            }
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </Card>
      )}

      {/* View Modal */}
      {showViewModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in p-4" onClick={() => setShowViewModal(false)}>
          <Card className="w-full max-w-xl max-h-[90vh] p-0 overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-lg sm:text-xl font-bold">Customer Details</h2>
            </div>
            <CardContent className="p-4 sm:p-6 space-y-4 overflow-auto max-h-[calc(90vh-120px)]">
              {(() => {
                const cust = customerDetailsMap[selectedPurchase.customer_id] || {};
                const plan = planDetailsMap[selectedPurchase.plan_id] || {};
                // Use the vehicle_id from the subscription purchase, fallback to customer's default vehicle
                const vehicle = vehicleInfoMap[selectedPurchase.vehicle_id] || vehicleInfoMap[cust.default_vehicle_id] || {};
                
                // Debug log to see vehicle data
                console.log('Vehicle data in view modal:', {
                  vehicleId: selectedPurchase.vehicle_id || cust.default_vehicle_id,
                  vehicle: vehicle,
                  originalModel: vehicle.originalModel,
                  joinedModel: vehicle.joinedModel,
                  lookupModel: vehicle.lookupModel,
                  finalModel: vehicle.Model
                });
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Name</div>
                        <div className="font-medium">{cust.name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Phone</div>
                        <div className="font-medium">{cust.phone || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Email</div>
                        <div className="font-medium">{cust.email || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Status</div>
                        <Badge 
                          variant="outline" 
                          className={
                            String(selectedPurchase.status || '').toLowerCase() === 'active' 
                              ? 'border-green-500 text-green-700 bg-green-50' 
                              : String(selectedPurchase.status || '').toLowerCase() === 'expired'
                              ? 'border-red-500 text-red-700 bg-red-50'
                              : 'border-gray-500 text-gray-700 bg-gray-50'
                          }
                        >
                          {String(selectedPurchase.status || '').charAt(0).toUpperCase() + String(selectedPurchase.status || '').slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <Card className="bg-muted/30 border border-border">
                      <CardHeader>
                        <div className="font-semibold text-primary">Plan Details</div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                          <div>Name: {plan.name || '-'}</div>
                          <div>Type: {plan.type || '-'}</div>
                          <div>Price: {plan.price ? `₹${plan.price}` : '-'}</div>
                          <div>Max Redemptions: {plan.max_redemptions ?? '-'}</div>
                          <div>Start Date: {selectedPurchase.start_date ? new Date(selectedPurchase.start_date).toLocaleDateString() : '-'}</div>
                          <div>Expiry: {selectedPurchase.expiry_date ? new Date(selectedPurchase.expiry_date).toLocaleDateString() : '-'}</div>
                          <div>Remaining Visits: {selectedPurchase.remaining_visits ?? '-'}</div>
                          <div>Total Value: {selectedPurchase.total_value ? `₹${selectedPurchase.total_value}` : '-'}</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30 border border-border">
                      <CardHeader>
                        <div className="font-semibold text-primary">Vehicle Details</div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                          <div>Number Plate: {vehicle.number_plate || '-'}</div>
                          <div>Model: {vehicle.Model || vehicle.lookupModel || vehicle.joinedModel || (vehicle.originalModel?.length === 36 ? 'Unknown Model' : vehicle.originalModel) || '-'}</div>
                          <div>Brand: {vehicle.Brand || '-'}</div>
                          <div>Type: {vehicle.type || '-'}</div>
                        </div>
                      </CardContent>
                    </Card>
                    {String(plan.type || '').toLowerCase() === 'credit' && (
                      <Card className="bg-muted/30 border border-border">
                        <CardHeader>
                          <div className="font-semibold text-primary">Credit Details</div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                            <div>Current Balance: {creditAccountMap[selectedPurchase.customer_id] ? `₹${Number(creditAccountMap[selectedPurchase.customer_id].balance || 0).toLocaleString()}` : '-'}</div>
                            <div>Total Deposited: {creditAccountMap[selectedPurchase.customer_id] ? `₹${Number(creditAccountMap[selectedPurchase.customer_id].total_deposited || 0).toLocaleString()}` : '-'}</div>
                            <div>Plan Multiplier: {plan.multiplier ? `${plan.multiplier}x` : '-'}</div>
                            <div>Plan Amount: {plan.plan_amount ? `₹${plan.plan_amount}` : '-'}</div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })()}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setShowViewModal(false)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in p-4" onClick={() => setShowEditModal(false)}>
          <Card className="w-full max-w-lg max-h-[90vh] p-0 overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold">Edit Customer</h2>
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
            </div>
            <CardContent className="p-4 sm:p-6 space-y-4 overflow-auto max-h-[calc(90vh-120px)]">
              <div>
                <label className="block mb-1 font-medium">Name</label>
                <Input value={editCustomerDraft.name || ''} onChange={e => setEditCustomerDraft({ ...editCustomerDraft, name: e.target.value })} />
              </div>
              <div>
                <label className="block mb-1 font-medium">Phone</label>
                <Input value={editCustomerDraft.phone || ''} onChange={e => setEditCustomerDraft({ ...editCustomerDraft, phone: e.target.value })} />
              </div>
              <div>
                <label className="block mb-1 font-medium">Email</label>
                <Input value={editCustomerDraft.email || ''} onChange={e => setEditCustomerDraft({ ...editCustomerDraft, email: e.target.value })} />
              </div>
              <div>
                <label className="block mb-1 font-medium">Date of Birth</label>
                <Input type="date" value={editCustomerDraft.date_of_birth || ''} onChange={e => setEditCustomerDraft({ ...editCustomerDraft, date_of_birth: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Close</Button>
                <Button onClick={async () => {
                  if (!editCustomerDraft.id) { setShowEditModal(false); return; }
                  await supabase.from('customers').update({
                    name: editCustomerDraft.name || null,
                    phone: editCustomerDraft.phone || null,
                    email: editCustomerDraft.email || null,
                    date_of_birth: editCustomerDraft.date_of_birth || null,
                  }).eq('id', editCustomerDraft.id);
                  const { data: cust } = await supabase
                    .from('customers')
                    .select('id, name, phone, email, date_of_birth')
                    .eq('id', editCustomerDraft.id)
                    .limit(1);
                  if (cust && cust[0]) {
                    setCustomerDetailsMap(prev => ({ ...prev, [cust[0].id]: cust[0] }));
                  }
                  setShowEditModal(false);
                }}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top-up Modal */}
      {showTopupModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in p-4" onClick={() => setShowTopupModal(false)}>
          <Card className="w-full max-w-md max-h-[90vh] p-0 overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold">Top-up Credit</h2>
              <Button variant="ghost" onClick={() => setShowTopupModal(false)}>Cancel</Button>
            </div>
            <CardContent className="p-4 sm:p-6 space-y-4 overflow-auto max-h-[calc(90vh-120px)]">
              <div>
                <label className="block mb-1 font-medium">Amount to Pay (INR)</label>
                <Input type="number" min="1" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="Enter amount you want to pay" />
                {(() => {
                  const plan = planDetailsMap[selectedPurchase?.plan_id];
                  const multiplier = Number(plan?.multiplier || 1);
                  const payAmount = Number(topupAmount || 0);
                  const creditAmount = payAmount * multiplier;
                  
                  if (payAmount > 0 && multiplier > 0) {
                    return (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm font-medium text-blue-900">Credit Calculation:</div>
                        <div className="text-sm text-blue-700">
                          <div>Amount you pay: ₹{payAmount.toLocaleString()}</div>
                          <div>Plan multiplier: {multiplier}x</div>
                          <div className="font-medium">Credit you'll receive: ₹{creditAmount.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div>
                <label className="block mb-1 font-medium">Payment Method</label>
                <select className="w-full border rounded px-2 py-1" value={topupMethod} onChange={(e) => setTopupMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="credit">Credit</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              {topupMethod === 'upi' && (
                <div className="space-y-2">
                  <div>
                    <label className="block mb-1 font-medium">UPI Account</label>
                    <select className="w-full border rounded px-2 py-1" value={topupSelectedUpiAccountId} onChange={(e) => setTopupSelectedUpiAccountId(e.target.value)}>
                      <option value="">Select UPI account</option>
                      {topupUpiAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.account_name} ({a.upi_id})</option>
                      ))}
                    </select>
                  </div>
                  {topupSelectedUpiAccountId && (
                    <button type="button" className="text-blue-600 underline" onClick={() => setTopupShowQr(true)}>
                      View QR code
                    </button>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowTopupModal(false)}>Close</Button>
                <Button onClick={async () => {
                  const payAmount = Number(topupAmount || '0');
                  if (!payAmount || payAmount <= 0) { toast({ title: 'Invalid amount', description: 'Enter a valid amount', variant: 'destructive' }); return; }
                  
                  // Calculate credit amount using multiplier
                  const plan = planDetailsMap[selectedPurchase?.plan_id];
                  const multiplier = Number(plan?.multiplier || 1);
                  const creditAmount = Math.round(payAmount * multiplier);
                  
                  try {
                    // Create payment row (record what customer actually paid)
                    const paymentMeta = (() => {
                      if (topupMethod !== 'upi') return null;
                      const sel = topupUpiAccounts.find(a => a.id === topupSelectedUpiAccountId);
                      return sel ? { upi_account_id: sel.id, upi_id: sel.upi_id, account_name: sel.account_name } : null;
                    })();
                    const { data: payIns, error: payErr } = await supabase
                      .from('subscription_payments')
                      .insert([
                        {
                          purchase_id: selectedPurchase.id,
                          customer_id: selectedPurchase.customer_id,
                          amount: payAmount, // Record actual payment amount
                          payment_method: topupMethod,
                          payment_meta: paymentMeta,
                          created_by: user?.id || null,
                        }
                      ])
                      .select('id')
                      .limit(1);
                    if (payErr) { toast({ title: 'Payment failed', description: 'Could not save payment', variant: 'destructive' }); return; }
                    const relatedPaymentId = payIns && payIns[0]?.id;
                    // Ensure/create credit account
                    const { data: creditAcc } = await supabase
                      .from('credit_accounts')
                      .select('id, total_deposited, balance')
                      .eq('customer_id', selectedPurchase.customer_id)
                      .maybeSingle();
                    if (creditAcc?.id) {
                      const { error: updErr } = await supabase
                        .from('credit_accounts')
                        .update({ 
                          total_deposited: Number(creditAcc.total_deposited || 0) + creditAmount, 
                          balance: Number(creditAcc.balance || 0) + creditAmount, 
                          last_topup_at: new Date().toISOString(), 
                          currency: 'INR' 
                        })
                        .eq('id', creditAcc.id);
                      if (updErr) { toast({ title: 'Update failed', description: 'Could not update credit account', variant: 'destructive' }); return; }
                    } else {
                      const { error: insErr } = await supabase
                        .from('credit_accounts')
                        .insert([{ 
                          customer_id: selectedPurchase.customer_id, 
                          total_deposited: creditAmount, 
                          balance: creditAmount, 
                          currency: 'INR', 
                          last_topup_at: new Date().toISOString() 
                        }]);
                      if (insErr) { toast({ title: 'Create failed', description: 'Could not create credit account', variant: 'destructive' }); return; }
                    }
                    // Insert credit transaction (record credit amount, not payment amount)
                    const { data: creditAcc2 } = await supabase
                      .from('credit_accounts')
                      .select('id')
                      .eq('customer_id', selectedPurchase.customer_id)
                      .maybeSingle();
                    if (creditAcc2?.id) {
                      const { error: txErr } = await supabase
                        .from('credit_transactions')
                        .insert([{ 
                          credit_account_id: creditAcc2.id, 
                          transaction_type: 'topup', 
                          amount: creditAmount, // Credit amount, not payment amount
                          related_payment_id: relatedPaymentId || null, 
                          created_by: user?.id || null 
                        }]);
                      if (txErr) { toast({ title: 'Transaction failed', description: 'Could not record credit transaction', variant: 'destructive' }); return; }
                    }
                    // Refresh credit account map for this customer
                    const { data: refreshed } = await supabase
                      .from('credit_accounts')
                      .select('id, customer_id, balance, total_deposited')
                      .eq('customer_id', selectedPurchase.customer_id)
                      .maybeSingle();
                    if (refreshed) {
                      setCreditAccountMap(prev => ({ ...prev, [selectedPurchase.customer_id]: { id: refreshed.id, balance: Number(refreshed.balance || 0), total_deposited: Number(refreshed.total_deposited || 0) } }));
                    }
                    
                    // If the plan was expired due to zero credit, reactivate it
                    if (selectedPurchase.status === 'expired' && creditAmount > 0) {
                      const { error: statusErr } = await supabase
                        .from('subscription_purchases')
                        .update({ status: 'active' })
                        .eq('id', selectedPurchase.id);
                      
                      if (!statusErr) {
                        // Update local state to reflect the status change
                        setSubscriptionCustomers(prev => 
                          prev.map(p => p.id === selectedPurchase.id ? { ...p, status: 'active' } : p)
                        );
                      }
                    }
                    
                    setShowTopupModal(false);
                    toast({ title: 'Top-up success', description: `Paid ₹${payAmount.toLocaleString()} • Credit +₹${creditAmount.toLocaleString()}` });
                  } catch (e) {
                    toast({ title: 'Top-up failed', variant: 'destructive' });
                  }
                }}>Top-up</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top-up UPI QR */}
      {topupShowQr && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setTopupShowQr(false)}>
          <div className="bg-white p-4 rounded shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">UPI QR</div>
              <button className="text-sm text-muted-foreground" onClick={() => setTopupShowQr(false)}>Close</button>
            </div>
            {(() => {
              const sel = topupUpiAccounts.find(a => a.id === topupSelectedUpiAccountId);
              if (!sel?.qr_code_url) return <div className="text-sm text-muted-foreground">No QR available</div>;
              return <img src={sel.qr_code_url} alt="UPI QR" className="w-full h-auto" />;
            })()}
          </div>
        </div>
      )}

      {/* Mark Visit Modal */}
      {showMarkVisit && selectedPurchase && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in" onClick={() => setShowMarkVisit(false)}>
          <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Mark Visit</h2>
              <Button variant="ghost" onClick={() => setShowMarkVisit(false)}>Cancel</Button>
            </div>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block mb-1 font-medium">Service Type</label>
                <Input value={visitService} onChange={(e) => setVisitService(e.target.value)} placeholder="e.g., Premium Wash" />
              </div>
              <div>
                <label className="block mb-1 font-medium">Notes</label>
                <Input value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} placeholder="Optional notes" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowMarkVisit(false)}>Close</Button>
                <Button onClick={async () => {
                  try {
                    const payload: any = {
                      purchase_id: selectedPurchase.id,
                      service_type: visitService || null,
                      service_value: null,
                      created_by: user?.id || null,
                      notes: visitNotes || null,
                    };
                    const { error: insErr } = await supabase
                      .from('package_usages')
                      .insert([payload]);
                    if (insErr) { toast({ title: 'Mark visit failed', variant: 'destructive' }); return; }
                    
                    // Also insert into loyalty_visits for audit log
                    const loyaltyVisitPayload = {
                      purchase_id: selectedPurchase.id,
                      vehicle_id: selectedPurchase.vehicle_id,
                      customer_id: selectedPurchase.customer_id,
                      location_id: selectedPurchase.location_id,
                      visit_type: 'redemption',
                      service_rendered: visitService || 'full wash',
                      amount_charged: 0, // Visit-based plans don't charge per visit
                      payment_method: 'subscription',
                      created_by: user?.id || null,
                    };
                    const { error: loyaltyErr } = await supabase
                      .from('loyalty_visits')
                      .insert([loyaltyVisitPayload]);
                    if (loyaltyErr) { /* silent */ }
                    // Decrement remaining_visits on the purchase
                    const current = subscriptionCustomers.find(p => p.id === selectedPurchase.id);
                    const newRemaining = Math.max(0, Number(current?.remaining_visits ?? 0) - 1);
                    
                    // Check if plan should be expired after this visit
                    const shouldExpire = newRemaining <= 0;
                    const updateData: any = { remaining_visits: newRemaining };
                    if (shouldExpire) {
                      updateData.status = 'expired';
                    }
                    
                    const { error: updErr } = await supabase
                      .from('subscription_purchases')
                      .update(updateData)
                      .eq('id', selectedPurchase.id);
                    if (updErr) { /* silent */ }
                    
                    // Update local state: usage history and remaining_visits
                    setUsageHistoryMap(prev => ({
                      ...prev,
                      [selectedPurchase.id]: [
                        { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), purchase_id: selectedPurchase.id, service_type: visitService || 'full wash', use_date: new Date().toISOString(), notes: visitNotes || null },
                        ...((prev[selectedPurchase.id] || []))
                      ]
                    }));
                    
                    // Update loyalty visits map
                    setLoyaltyVisitsMap(prev => ({
                      ...prev,
                      [selectedPurchase.id]: [
                        { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), purchase_id: selectedPurchase.id, visit_type: 'redemption', service_rendered: visitService || 'full wash', amount_charged: 0, visit_time: new Date().toISOString(), payment_method: 'subscription' },
                        ...((prev[selectedPurchase.id] || []))
                      ]
                    }));
                    
                    setSubscriptionCustomers(prev => prev.map(p => p.id === selectedPurchase.id ? { ...p, remaining_visits: newRemaining, status: shouldExpire ? 'expired' : p.status } : p));
                    setShowMarkVisit(false);
                  } catch (e) {
                    toast({ title: 'Mark visit failed', variant: 'destructive' });
                  }
                }}>Mark</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Renew Plan Modal */}
      {showRenewModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in" onClick={() => setShowRenewModal(false)}>
          <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Renew Plan</h2>
              <Button variant="ghost" onClick={() => setShowRenewModal(false)}>Cancel</Button>
            </div>
            <CardContent className="p-6 space-y-4">
              {(() => {
                const plan = planDetailsMap[selectedPurchase?.plan_id];
                const planAmount = Number(plan?.plan_amount || plan?.price || 0);
                
                return (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-2">Plan Details:</div>
                      <div className="text-sm text-blue-700">
                        <div>Plan Name: {plan?.name || 'N/A'}</div>
                        <div>Type: {plan?.type || 'N/A'}</div>
                        <div>Price: ₹{planAmount.toLocaleString()}</div>
                        <div>Max Visits: {plan?.max_redemptions || 'N/A'}</div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block mb-1 font-medium">Payment Method</label>
                      <select className="w-full border rounded px-2 py-1" value={renewPaymentMethod} onChange={(e) => setRenewPaymentMethod(e.target.value)}>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Pay later">Pay later</option>
                      </select>
                    </div>
                    
                    {renewPaymentMethod === 'UPI' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block mb-1 font-medium">UPI Account</label>
                          <select className="w-full border rounded px-2 py-1" value={renewSelectedUpiAccountId} onChange={(e) => setRenewSelectedUpiAccountId(e.target.value)}>
                            <option value="">Select UPI account</option>
                            {renewUpiAccounts.map(a => (
                              <option key={a.id} value={a.id}>{a.account_name} ({a.upi_id})</option>
                            ))}
                          </select>
                        </div>
                        {renewSelectedUpiAccountId && (
                          <button type="button" className="text-blue-600 underline" onClick={() => setRenewShowQr(true)}>
                            View QR code
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowRenewModal(false)}>Close</Button>
                <Button onClick={async () => {
                  try {
                    const plan = planDetailsMap[selectedPurchase?.plan_id];
                    const planAmount = Number(plan?.plan_amount || plan?.price || 0);
                    
                    if (!plan) {
                      toast({ title: 'Plan not found', variant: 'destructive' });
                      return;
                    }
                    
                    // Create new subscription purchase
                    const now = new Date();
                    const startDate = now.toISOString();
                    const expiryDate = plan?.duration_days ? new Date(now.getTime() + (Number(plan.duration_days) || 0) * 24 * 60 * 60 * 1000).toISOString() : null;
                    const totalValue = Number(plan?.price || 0);
                    const remainingVisits = plan?.max_redemptions != null ? Number(plan.max_redemptions) : null;
                    
                    // Build payment method string
                    let purchasePaymentMethod: string | null = null;
                    if (renewPaymentMethod === 'UPI') {
                      const sel = renewUpiAccounts.find(a => a.id === renewSelectedUpiAccountId);
                      purchasePaymentMethod = sel ? `UPI:${sel.account_name},${sel.upi_id}` : 'UPI';
                    } else {
                      purchasePaymentMethod = renewPaymentMethod === 'Pay later' ? 'paylater' : renewPaymentMethod;
                    }
                    
                    const { error: purchaseError } = await supabase
                      .from('subscription_purchases')
                      .insert([
                        {
                          plan_id: selectedPurchase.plan_id,
                          customer_id: selectedPurchase.customer_id,
                          vehicle_id: selectedPurchase.vehicle_id,
                          location_id: selectedPurchase.location_id,
                          status: 'active',
                          created_by: user?.id || null,
                          start_date: startDate,
                          expiry_date: expiryDate,
                          total_value: totalValue,
                          remaining_visits: remainingVisits,
                          source_payment_method: purchasePaymentMethod,
                        }
                      ]);
                    
                    if (purchaseError) {
                      toast({ title: 'Renew failed', variant: 'destructive' });
                      return;
                    }
                    
                    // Refresh the purchases list
                    await fetchPurchases();
                    setShowRenewModal(false);
                    toast({ title: 'Plan renewed' });
                  } catch (e) {
                    toast({ title: 'Renew failed', variant: 'destructive' });
                  }
                }}>Renew Plan</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Renew UPI QR Modal */}
      {renewShowQr && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setRenewShowQr(false)}>
          <div className="bg-white p-4 rounded shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">UPI QR</div>
              <button className="text-sm text-muted-foreground" onClick={() => setRenewShowQr(false)}>Close</button>
            </div>
            {(() => {
              const sel = renewUpiAccounts.find(a => a.id === renewSelectedUpiAccountId);
              if (!sel?.qr_code_url) return <div className="text-sm text-muted-foreground">No QR available</div>;
              return <img src={sel.qr_code_url} alt="UPI QR" className="w-full h-auto" />;
            })()}
          </div>
        </div>
      )}

      {/* Mark Entry Modal for Credit Plans */}
      {showMarkEntry && selectedPurchase && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in" onClick={() => setShowMarkEntry(false)}>
          <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Mark Entry (Credit)</h2>
              <Button variant="ghost" onClick={() => setShowMarkEntry(false)}>Cancel</Button>
            </div>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block mb-1 font-medium">Service Type</label>
                <Input value={entryService} onChange={(e) => setEntryService(e.target.value)} placeholder="e.g., Premium Wash" />
              </div>
              <div>
                <label className="block mb-1 font-medium">Amount to Deduct (₹)</label>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.01"
                  value={entryAmount} 
                  onChange={(e) => setEntryAmount(e.target.value)} 
                  placeholder="Enter amount to deduct from credit" 
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Notes</label>
                <Input value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="Optional notes" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowMarkEntry(false)}>Close</Button>
                <Button onClick={async () => {
                  const amount = Number(entryAmount || '0');
                  if (!amount || amount <= 0) { toast({ title: 'Invalid amount', description: 'Enter a valid amount', variant: 'destructive' }); return; }
                  
                  try {
                    // Check if customer has enough credit
                    const { data: creditAccount } = await supabase
                      .from('credit_accounts')
                      .select('id, balance, total_deposited')
                      .eq('customer_id', selectedPurchase.customer_id)
                      .maybeSingle();
                    
                    if (!creditAccount) { toast({ title: 'Credit account not found', variant: 'destructive' }); return; }
                    
                    const currentBalance = Number(creditAccount.balance || 0);
                    if (currentBalance < amount) { 
                      toast({ title: 'Insufficient credit', description: `Available ₹${currentBalance.toLocaleString()}`, variant: 'destructive' }); 
                      return; 
                    }
                    
                    // Deduct from credit account
                    const newBalance = currentBalance - amount;
                    const { error: creditErr } = await supabase
                      .from('credit_accounts')
                      .update({ balance: newBalance })
                      .eq('id', creditAccount.id);
                    
                    if (creditErr) { toast({ title: 'Deduction failed', description: 'Could not deduct credit', variant: 'destructive' }); return; }
                    
                    // Insert credit transaction
                    const { error: txErr } = await supabase
                      .from('credit_transactions')
                      .insert([{
                        credit_account_id: creditAccount.id,
                        transaction_type: 'deduction',
                        amount: amount,
                        created_by: user?.id || null,
                      }]);
                    
                    if (txErr) { /* silent */ }
                    
                    // Insert into loyalty_visits for audit log
                    const loyaltyVisitPayload = {
                      purchase_id: selectedPurchase.id,
                      vehicle_id: selectedPurchase.vehicle_id,
                      customer_id: selectedPurchase.customer_id,
                      location_id: selectedPurchase.location_id,
                      visit_type: 'payment',
                      service_rendered: entryService || 'full wash',
                      amount_charged: amount,
                      payment_method: 'credit',
                      created_by: user?.id || null,
                    };
                    const { error: loyaltyErr } = await supabase
                      .from('loyalty_visits')
                      .insert([loyaltyVisitPayload]);
                    
                    if (loyaltyErr) { /* silent */ }
                    
                    // Update local credit balance
                    setCreditAccountMap(prev => ({
                      ...prev,
                      [selectedPurchase.customer_id]: {
                        ...prev[selectedPurchase.customer_id],
                        balance: newBalance
                      }
                    }));
                    
                    // Update loyalty visits map
                    setLoyaltyVisitsMap(prev => ({
                      ...prev,
                      [selectedPurchase.id]: [
                        { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), purchase_id: selectedPurchase.id, visit_type: 'payment', service_rendered: entryService || 'full wash', amount_charged: amount, visit_time: new Date().toISOString(), payment_method: 'credit' },
                        ...((prev[selectedPurchase.id] || []))
                      ]
                    }));
                    
                    // Check if plan should be expired after this deduction
                    if (newBalance <= 0) {
                      const { error: expireErr } = await supabase
                        .from('subscription_purchases')
                        .update({ status: 'expired' })
                        .eq('id', selectedPurchase.id);
                      
                      if (!expireErr) {
                        setSubscriptionCustomers(prev => 
                          prev.map(p => p.id === selectedPurchase.id ? { ...p, status: 'expired' } : p)
                        );
                      }
                    }
                    
                    setShowMarkEntry(false);
                    toast({ title: 'Entry recorded', description: `Deducted ₹${amount.toLocaleString()}` });
                  } catch (e) {
                    toast({ title: 'Mark entry failed', variant: 'destructive' });
                  }
                }}>Mark Entry</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTargetPurchase && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in" onClick={() => setShowDeleteConfirm(false)}>
          <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-red-600">Confirm Removal</h2>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Are you sure?</h3>
                <p className="text-muted-foreground mb-4">
                  This will remove the customer from this plan and delete the subscription record. 
                  Customer and vehicle data will be preserved.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={async () => {
                    try {
                      const { error: delErr } = await supabase
                        .from('subscription_purchases')
                        .delete()
                        .eq('id', deleteTargetPurchase.id);
                      
                      if (delErr) { 
                        toast({ title: 'Delete failed', description: 'Could not remove from plan', variant: 'destructive' }); 
                        return; 
                      }
                      
                      setSubscriptionCustomers(prev => prev.filter(p => p.id !== deleteTargetPurchase.id));
                      setShowDeleteConfirm(false);
                      setDeleteTargetPurchase(null);
                      toast({ title: 'Removed from plan', description: 'Customer has been successfully removed from the plan' });
                    } catch (e) {
                      toast({ title: 'Delete failed', description: 'An error occurred while removing from plan', variant: 'destructive' });
                    }
                  }}
                >
                  Yes, Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in p-4" onClick={() => setShowExportModal(false)}>
          <Card className="w-full max-w-lg max-h-[90vh] p-0 overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold">Export Customer Data</h2>
              <Button variant="ghost" onClick={() => setShowExportModal(false)}>Cancel</Button>
            </div>
            <CardContent className="p-4 sm:p-6 space-y-4 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">Location Filter</label>
                  <select 
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={exportFilters.locationId}
                    onChange={(e) => setExportFilters({ ...exportFilters, locationId: e.target.value })}
                  >
                    <option value="">All Locations</option>
                    {permittedLocations.map(location => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Plan Type Filter</label>
                  <select 
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={exportFilters.planType}
                    onChange={(e) => setExportFilters({ ...exportFilters, planType: e.target.value })}
                  >
                    <option value="">All Plan Types</option>
                    <option value="credit">Credit</option>
                    <option value="visit">Visit</option>
                    <option value="package">Package</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Status Filter</label>
                  <select 
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={exportFilters.status}
                    onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value })}
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">Start Date</label>
                    <Input 
                      type="date" 
                      value={exportFilters.startDate}
                      onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">End Date</label>
                    <Input 
                      type="date" 
                      value={exportFilters.endDate}
                      onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Export Information</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Export will include customer details, plan information, and vehicle data</li>
                    <li>• Credit plans will include balance and deposit information</li>
                    <li>• File will be named based on selected filters and current date</li>
                    <li>• Maximum 1000 records per export</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowExportModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}