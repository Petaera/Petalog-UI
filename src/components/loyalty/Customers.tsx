import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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

  const fetchPurchases = async () => {
    const { data } = await supabase
      .from('subscription_purchases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    setSubscriptionCustomers(data || []);
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  // Fetch available subscription plans
  useEffect(() => {
    async function fetchPlans() {
      const { data, error } = await supabase.from('subscription_plans').select('id, name, type, price, active, duration_days, max_redemptions');
      if (!error) setSchemes(data || []);
    }
    fetchPlans();
  }, []);

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
      // Get all unique customer_ids and plan_ids from purchases
      const customerIds = Array.from(new Set(subscriptionCustomers.map(c => c.customer_id).filter(Boolean)));
      const planIds = Array.from(new Set(subscriptionCustomers.map(c => c.plan_id).filter(Boolean)));

      // Fetch customer details
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .in('id', customerIds);
        const map: Record<string, any> = {};
        (customers || []).forEach(c => { map[c.id] = c; });
        setCustomerDetailsMap(map);
      }

      // Fetch plan details
      if (planIds.length > 0) {
        const { data: plans } = await supabase
          .from('subscription_plans')
          .select('id, name, type, price, max_redemptions, currency')
          .in('id', planIds);
        const map: Record<string, any> = {};
        (plans || []).forEach(p => { map[p.id] = p; });
        setPlanDetailsMap(map);
      }
    }
    if (subscriptionCustomers.length > 0) {
      fetchDetails();
    }
  }, [subscriptionCustomers]);

  useEffect(() => {
    async function fetchVehicleInfo() {
      // Only for package/visit type plans
      const relevantCustomers = subscriptionCustomers.filter(c => {
        const plan = planDetailsMap[c.plan_id];
        return plan && (plan.type === 'package' || plan.type === 'visit');
      });

      const vehicleNumbers = Array.from(new Set(
        relevantCustomers.map(c => customerDetailsMap[c.customer_id]?.default_vehicle_id).filter(Boolean)
      ));

      if (vehicleNumbers.length > 0) {
        // Fix: Use "D.O.B" (with dots) in select, and wrap in double quotes
        const { data: logs } = await supabase
          .from('logs_man')
          .select('vehicle_number,vehicle_model,vehicle_brand,"D.O.B"')
          .in('vehicle_number', vehicleNumbers);

        const map: Record<string, any> = {};
        (logs || []).forEach(l => { map[l.vehicle_number] = l; });
        setVehicleInfoMap(map);
      }
    }
    // Only fetch if planDetailsMap and customerDetailsMap are loaded
    if (
      subscriptionCustomers.length > 0 &&
      Object.keys(planDetailsMap).length > 0 &&
      Object.keys(customerDetailsMap).length > 0
    ) {
      fetchVehicleInfo();
    }
  }, [subscriptionCustomers, planDetailsMap, customerDetailsMap]);

  const filteredCustomers = subscriptionCustomers.filter(customer => {
    const name = customer.customers?.name || '';
    const phone = customer.customers?.phone || '';
    const scheme = customer.subscription_plans?.name || '';
    const vehicleNumber = customer.customers?.default_vehicle_id || '';
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scheme.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || customer.status === filterStatus;
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
    // Prefill only entered keys
    const baseCustomer = { name: '', phone: planType === 'credit' ? phoneInput.trim() : '', email: '', dob: '' };
    const baseVehicle = { number_plate: planType !== 'credit' ? vehicleNumberInput.trim().toUpperCase() : '', type: '', vehicle_brand: '', vehicle_model: '' };
    setCustomerDetails(baseCustomer);
    setVehicleDetails(baseVehicle);
    setAddStep('form');
  };

  // Reusable prefill function (removed)
  // const prefillFromInputs = async () => {};

  // Debounced fetch during identify step as user types (removed)
  // useEffect(() => {}, []);

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
        alert('Please select a plan');
        setIsLoading(false);
        return;
      }
      if (!customerDetails?.phone) {
        alert('Phone number is required');
        setIsLoading(false);
        return;
      }

      // 1) Upsert subscription vehicle first (collect everything)
      let vehicleId: string | null = null;
      const locationArray = selectedLocationId ? [selectedLocationId] : null;
      if (vehicleDetails.number_plate) {
        const numberPlate = vehicleDetails.number_plate.toUpperCase();
        const { data: existingVehicle } = await supabase
          .from('subscription_vehicles')
          .select('id, type')
          .eq('number_plate', numberPlate)
          .limit(1);

        if (existingVehicle && existingVehicle.length > 0) {
          vehicleId = existingVehicle[0].id;
          const existingType = existingVehicle[0].type || null;
          const finalType = existingType || vehicleDetails.type || null;
          await supabase
            .from('subscription_vehicles')
            .update({
              type: finalType,
              owner_id: user?.id || null,
              "Model": vehicleDetails.vehicle_model || null,
              "Brand": vehicleDetails.vehicle_brand || null,
              "Location_id": locationArray,
            })
            .eq('id', vehicleId);
          if (!vehicleDetails.type && existingType) {
            setVehicleDetails((prev: any) => ({ ...prev, type: existingType }));
          }
        } else {
          const finalType = vehicleDetails.type || null;
          const { data: insertedVehicle, error: vehicleErr } = await supabase
            .from('subscription_vehicles')
            .insert([
              {
                number_plate: numberPlate,
                type: finalType,
                owner_id: user?.id || null,
                "Model": vehicleDetails.vehicle_model || null,
                "Brand": vehicleDetails.vehicle_brand || null,
                "Location_id": locationArray,
              }
            ])
            .select('id');
          if (vehicleErr || !insertedVehicle || !insertedVehicle[0]?.id) {
            throw new Error('Error adding vehicle');
          }
          vehicleId = insertedVehicle[0].id;
        }
      }

      // 2) Upsert customer (by phone). Include date_of_birth and Location.
      const phoneKey = customerDetails.phone;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phoneKey)
        .limit(1);

      let customerId: string | null = null;
      const customerPayload: any = {
        name: customerDetails.name || null,
        phone: phoneKey,
        email: customerDetails.email || null,
        owner_id: user?.id || null,
      };
      if (customerDetails.dob) customerPayload.date_of_birth = customerDetails.dob;
      // Removed writing customers.Location per schema issue

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

      // 3) Set default_vehicle_id if we created/selected a subscription vehicle
      if (vehicleId && customerId) {
        await supabase.from('customers').update({ default_vehicle_id: vehicleId }).eq('id', customerId);
      }

      // 4) Create subscription purchase using returned ids and plan attributes
      const selPlan = (schemes || []).find((p: any) => p.id === (selectedPlanId || selectedScheme)) || {};
      const now = new Date();
      const startDate = now.toISOString();
      const expiryDate = selPlan?.duration_days ? new Date(now.getTime() + (Number(selPlan.duration_days) || 0) * 24 * 60 * 60 * 1000).toISOString() : null;
      const totalValue = Number(selPlan?.price || 0);
      const isCredit = String(selPlan?.type || '').toLowerCase() === 'credit';
      const remainingValue = isCredit ? totalValue : null;
      const remainingVisits = !isCredit && selPlan?.max_redemptions != null ? Number(selPlan.max_redemptions) : null;

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

      const { error: purchaseError } = await supabase
        .from('subscription_purchases')
        .insert([
          {
            plan_id: selectedPlanId || selectedScheme,
            customer_id: customerId,
            vehicle_id: vehicleId,
            location_id: selectedLocationId || null,
            status: 'active',
            created_by: user?.id || null,
            start_date: startDate,
            expiry_date: expiryDate,
            total_value: totalValue,
            remaining_value: remainingValue,
            remaining_visits: remainingVisits,
            source_payment_method: purchasePaymentMethod,
          }
        ]);

      if (purchaseError) {
        throw new Error('Error creating subscription purchase');
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
      alert(e?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Customers</h1>
          <p className="text-muted-foreground">Manage your subscription and loyalty members</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            Export Data
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg" onClick={handleAddCustomerClick}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in">
          <Card className="w-full max-w-2xl p-0 overflow-hidden shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <Button variant="ghost" onClick={handleDiscard}>
                Discard
              </Button>
              <h2 className="text-xl font-bold">Add Customer</h2>
              <div style={{ width: 60 }}></div>
            </div>
            <CardContent className="max-h-[78vh] overflow-auto p-6">
              {addStep === 'selectPlan' && (
                <div className="space-y-6">
                  <div className="font-medium mb-2">Select Plan</div>
                  <div className="space-y-2 max-h-64 overflow-auto pr-2">
                    {schemes.filter((p) => p.active !== false).map((p) => {
                      const type = String(p.type || '').toLowerCase();
                      const typeColor = type === 'credit' ? 'bg-green-100 text-green-700 border-green-200' : type === 'visit' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200';
                      return (
                        <Button
                          key={p.id}
                          className={`w-full justify-between border transition-colors ${selectedPlanId === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-foreground hover:bg-muted border-border'}`}
                          onClick={() => handlePlanSelect(p.id)}
                        >
                          <span>{p.name}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs border ${selectedPlanId === p.id ? 'bg-white/10 text-white border-white/20' : typeColor}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              {addStep === 'identify' && (
                <div className="space-y-6">
                  {planType === 'credit' ? (
                    <div>
                      <label className="block mb-2 font-medium">Phone Number</label>
                      <Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="Enter phone number" />
                    </div>
                  ) : (
                    <div>
                      <label className="block mb-2 font-medium">Vehicle Number</label>
                      <Input value={vehicleNumberInput} onChange={(e) => setVehicleNumberInput(e.target.value.toUpperCase())} placeholder="Enter vehicle number" />
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
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-card rounded-xl border border-border">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, vehicle number, or scheme..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Active', 'Expiring Soon', 'Expired'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className={filterStatus === status ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md' : 'hover:bg-primary/10'}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: subscriptionCustomers.length, color: 'primary' },
          { label: 'Active', value: subscriptionCustomers.filter(c => c.status === 'Active').length, color: 'success' },
          { label: 'Expiring Soon', value: subscriptionCustomers.filter(c => c.status === 'Expiring Soon').length, color: 'warning' },
          { label: 'This Month', value: 12, color: 'accent' }
        ].map((stat, index) => (
          <Card key={stat.label} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold text-${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {subscriptionCustomers.map((customer, index) => {
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
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{cust.name || 'Customer'}</h3>
                    <p className="text-sm text-muted-foreground">{cust.phone ? `Phone: ${cust.phone}` : ''}</p>
                    <p className="text-sm text-muted-foreground">{cust.email ? `Email: ${cust.email}` : ''}</p>
                    {showVehicleInfo && (
                      <>
                        <p className="text-sm text-muted-foreground">{vehicleInfo.vehicle_model ? `Model: ${vehicleInfo.vehicle_model}` : ''}</p>
                        <p className="text-sm text-muted-foreground">{vehicleInfo.vehicle_brand ? `Brand: ${vehicleInfo.vehicle_brand}` : ''}</p>
                      </>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Status:</span>
                    <Badge variant="outline">{customer.status}</Badge>
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
                      <span className="text-success font-medium">{customer.remaining_visits}</span>
                    </div>
                  )}
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
                <Button size="sm" variant="outline">
                  View
                </Button>
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
    </div>
  );
}