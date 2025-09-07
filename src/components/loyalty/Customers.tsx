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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState<'selectType' | 'enterDetails' | 'form'>('selectType');
  const [schemeType, setSchemeType] = useState('');
  const [vehicleNumberInput, setVehicleNumberInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [selectedScheme, setSelectedScheme] = useState('');
  const [schemes, setSchemes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionCustomers, setSubscriptionCustomers] = useState<any[]>([]);
  const [customerDetailsMap, setCustomerDetailsMap] = useState<Record<string, any>>({});
  const [planDetailsMap, setPlanDetailsMap] = useState<Record<string, any>>({});
  const [vehicleInfoMap, setVehicleInfoMap] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchPurchases() {
      const { data } = await supabase
        .from('subscription_purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      setSubscriptionCustomers(data || []);
    }
    fetchPurchases();
  }, []);

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
    setAddStep('selectType');
    setSchemeType('');
    setCustomerDetails(null);
    setVehicleNumberInput('');
    setPhoneInput('');
    setSelectedScheme('');
  };

  // Handler for discarding the add customer form
  const handleDiscard = () => {
    setShowAddModal(false);
    setAddStep('selectType');
    setSchemeType('');
    setCustomerDetails(null);
    setVehicleNumberInput('');
    setPhoneInput('');
    setSelectedScheme('');
  };

  // Handler for scheme type selection
  const handleSchemeTypeSelect = (type: string) => {
    setSchemeType(type);
    setAddStep('enterDetails');
  };

  // Handler for details submission (fetch from logs_man by either vehicle number or phone)
  const handleDetailsSubmit = async () => {
    setIsLoading(true);
    let details = null;
    let logsData = null;

    // Always use uppercase for vehicle number
    const vehicleNumber = vehicleNumberInput.trim().toUpperCase();

    // Step 1: Try to fetch vehicle from vehicles table
    let vehicleRecord = null;
    if (vehicleNumber) {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('id, number_plate, own_id')
        .eq('number_plate', vehicleNumber)
        .limit(1);

      vehicleRecord = vehicleData && vehicleData.length > 0 ? vehicleData[0] : null;
    }

    // Step 2: If vehicle found, get owner details from logs_man using vehicle_id
    if (vehicleRecord) {
      const { data: logs } = await supabase
        .from('logs_man')
        .select('vehicle_number,name,phone_no,"D.O.B"')
        .eq('vehicle_id', vehicleRecord.id)
        .order('created_at', { ascending: false })
        .limit(1);

      logsData = logs && logs.length > 0 ? logs[0] : null;
    }

    // Step 3: If not found in vehicles, fallback to logs_man by vehicle_number
    if (!logsData && vehicleNumber) {
      const { data: logs } = await supabase
        .from('logs_man')
        .select('vehicle_number,name,phone_no,"D.O.B"')
        .eq('vehicle_number', vehicleNumber)
        .order('created_at', { ascending: false })
        .limit(1);

      logsData = logs && logs.length > 0 ? logs[0] : null;
    }

    // Step 4: If not found and phone is present, fallback to logs_man by phone_no
    if (!logsData && phoneInput.trim()) {
      const { data: logs } = await supabase
        .from('logs_man')
        .select('vehicle_number,name,phone_no,"D.O.B"')
        .eq('phone_no', phoneInput.trim())
        .order('created_at', { ascending: false })
        .limit(1);

      logsData = logs && logs.length > 0 ? logs[0] : null;
    }

    // Step 5: Prepare details object
    if (logsData) {
      details = {
        vehicleNumber: logsData.vehicle_number || vehicleNumber,
        name: logsData.name || '',
        phone: logsData.phone_no ? String(logsData.phone_no) : phoneInput.trim(),
        dob: logsData["D.O.B"] || ''
      };
    } else {
      details = {
        vehicleNumber,
        name: '',
        phone: phoneInput.trim(),
        dob: ''
      };
    }

    setCustomerDetails(details);
    setAddStep('form');
    setIsLoading(false);
  };

  // Handler for saving customer and purchase
  const handleSaveCustomer = async () => {
    setIsLoading(true);

    // Check if customer with this phone already exists
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerDetails.phone)
      .limit(1);

    let customerId: string | null = null;

    if (existingCustomer && existingCustomer.length > 0) {
      // Customer exists, use existing id
      customerId = existingCustomer[0].id;
    } else {
      // Make sure linked_user_id is a valid UUID from the users table
      const linked_user_id = null; // <-- Use actual user id or null

      const customerPayload: any = {
        name: customerDetails.name,
        phone: customerDetails.phone,
        default_vehicle_id: null,
        linked_user_id,
        email: '',
        notes: '',
        own_id: linked_user_id
      };

      if (!linked_user_id) {
        delete customerPayload.linked_user_id;
        delete customerPayload.own_id;
      }

      const { data: customerInsert, error: customerError } = await supabase
        .from('customers')
        .insert([customerPayload])
        .select();

      if (customerError || !customerInsert || !customerInsert[0]?.id) {
        setIsLoading(false);
        alert('Error adding customer');
        return;
      }
      customerId = customerInsert[0].id;
    }

    // Insert purchase
    const { error: purchaseError } = await supabase
      .from('subscription_purchases')
      .insert([{
        plan_id: selectedScheme,
        customer_id: customerId,
        status: 'active'
      }]);
    setIsLoading(false);
    setShowAddModal(false);
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
          <Button className="bg-gradient-primary text-white shadow-loyalty" onClick={handleAddCustomerClick}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all duration-300 animate-fade-in">
          <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <Button variant="ghost" onClick={handleDiscard}>
                Discard
              </Button>
              <h2 className="text-xl font-bold">Add Customer</h2>
              <div style={{ width: 60 }}></div>
            </div>
            <CardContent>
              {addStep === 'selectType' && (
                <div className="space-y-6 py-6">
                  <div className="font-medium mb-2">Select Scheme Type</div>
                  <div className="flex gap-4">
                    {['package', 'visit', 'credit'].map(type => (
                      <Button
                        key={type}
                        className={`flex-1 ${schemeType === type ? 'bg-gradient-primary text-white' : ''}`}
                        onClick={() => handleSchemeTypeSelect(type)}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {addStep === 'enterDetails' && (
                <div className="space-y-6 py-6">
                  {schemeType === 'credit' ? (
                    <>
                      <label className="block mb-2 font-medium">Phone Number</label>
                      <Input
                        value={phoneInput}
                        onChange={e => setPhoneInput(e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block mb-2 font-medium">Vehicle Number</label>
                      <Input
                        value={vehicleNumberInput}
                        onChange={e => setVehicleNumberInput(e.target.value.toUpperCase())}
                        placeholder="Enter vehicle number"
                      />
                    </>
                  )}
                  <Button className="mt-4" onClick={handleDetailsSubmit} disabled={isLoading || (!phoneInput && schemeType === 'credit') || (!vehicleNumberInput && schemeType !== 'credit')}>
                    {isLoading ? 'Searching...' : 'Next'}
                  </Button>
                </div>
              )}
              {addStep === 'form' && customerDetails && (
                <div className="space-y-4 py-6">
                  <div>
                    <label className="block mb-1 font-medium">Name</label>
                    <Input
                      value={customerDetails.name}
                      onChange={e => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                      placeholder="Customer Name"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Phone</label>
                    <Input
                      value={customerDetails.phone}
                      onChange={e => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                      placeholder="Phone Number"
                    />
                  </div>
                  {schemeType !== 'credit' && (
                    <div>
                      <label className="block mb-1 font-medium">Date of Birth</label>
                      <Input
                        type="date"
                        value={customerDetails.dob}
                        onChange={e => setCustomerDetails({ ...customerDetails, dob: e.target.value })}
                        placeholder="DOB"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block mb-1 font-medium">Scheme</label>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={selectedScheme}
                      onChange={e => setSelectedScheme(e.target.value)}
                    >
                      <option value="">Select Scheme</option>
                      {schemes
                        .filter(s => s.type === schemeType)
                        .map(scheme => (
                          <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
                        ))}
                    </select>
                  </div>
                  <Button className="mt-4" onClick={handleSaveCustomer} disabled={isLoading || !selectedScheme}>
                    {isLoading ? 'Saving...' : 'Save & Add to Scheme'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
              className={filterStatus === status ? 'bg-gradient-primary text-white' : ''}
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
          <Button className="bg-gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </Card>
      )}
    </div>
  );
}