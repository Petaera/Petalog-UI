import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, Currency } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { useNavigate, useParams } from 'react-router-dom'; // Import useNavigate for navigation and useParams for edit mode
import { useAuth } from '@/contexts/AuthContext';

interface CreateSchemeWizardProps {
  onComplete: () => void;
}

const steps = [
  { id: 1, title: 'Basic Info', description: 'Name and type' },
  { id: 2, title: 'Payment Rules', description: 'Payment modes' },
  { id: 3, title: 'Expiry & Refund', description: 'Terms & conditions' },
  { id: 4, title: 'Locations', description: 'Applicable locations' },
  { id: 5, title: 'Rewards', description: 'Benefits & loyalty' },
  { id: 6, title: 'Review', description: 'Final confirmation' }
];
// Locations available to the owner will be fetched from location_owners

export function CreateSchemeWizard({ onComplete }: CreateSchemeWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const planId = params.id as string | undefined;
  const isEditMode = Boolean(planId);
  const [currentStep, setCurrentStep] = useState(1);
  const [permittedLocations, setPermittedLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    duration_days: '',
    price: '',
    description: '',
    paymentModes: [],
    allowMixed: '',
    mixedHandling: '',
    expiryRule: '',
    refundPolicy: '',
    locations: [],
    rewards: '',
    reward_description: '',
    multiple_locations: 'no',
    max_redemptions: '',
    enable_reminders: 'no',
    actual_amount: '',
  } as any);

  const progress = (currentStep / steps.length) * 100;

  // Load existing plan in edit mode
  React.useEffect(() => {
    const loadPlan = async () => {
      if (!isEditMode || !planId) return;
      const { data: plan, error } = await supabase
        .from('subscription_plans')
        .select('id, name, type, duration_days, price, plan_amount, short_description, currency, allow_multiple_locations, max_redemptions, allowed_payment_methods, allowed_locations, mixed_handling, allow_mixed_handling, expiry, refund_policy')
        .eq('id', planId)
        .maybeSingle();
      if (error || !plan) {
        toast({ title: 'Error', description: 'Failed to load scheme for editing', status: 'error' });
        return;
      }
      setFormData((prev: any) => ({
        ...prev,
        name: plan.name || '',
        type: plan.type || '',
        duration_days: plan.duration_days != null ? String(plan.duration_days) : '',
        price: plan.price != null ? String(plan.price) : '',
        actual_amount: plan.plan_amount != null ? String(plan.plan_amount) : '',
        description: plan.short_description || '',
        paymentModes: plan.allowed_payment_methods ? String(plan.allowed_payment_methods).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        allowMixed: plan.allow_mixed_handling ? 'yes' : 'no',
        mixedHandling: plan.mixed_handling || '',
        expiryRule: plan.expiry == null ? 'unlimited' : 'auto',
        refundPolicy: plan.refund_policy ? 'manual-override' : 'no-refund',
        locations: Array.isArray(plan.allowed_locations) ? plan.allowed_locations : [],
        reward_description: '',
        multiple_locations: plan.allow_multiple_locations ? 'yes' : 'no',
        max_redemptions: plan.max_redemptions != null ? String(plan.max_redemptions) : '',
      }));
    };
    loadPlan();
  }, [isEditMode, planId]);

  const handleNext = async () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      if (isCreating || isCooldown) return;
      setIsCreating(true);
      if (!user?.id) {
        toast({ title: 'Not authenticated', description: 'Please sign in again to save the scheme.', status: 'error' });
        setIsCreating(false);
        return;
      }
      if (isEditMode && planId) {
        // Update existing plan
        const updateObj: any = {
          name: formData.name.trim(),
          type: formData.type,
          duration_days: formData.duration_days ? Number(formData.duration_days) : null,
          max_redemptions:
            (formData.type === 'visit' || formData.type === 'package') && String(formData.max_redemptions || '').trim() !== ''
              ? Number(formData.max_redemptions)
              : null,
          price: String(formData.price || '').trim() !== '' ? Number(formData.price) : 0,
          plan_amount: String(formData.actual_amount || '').trim() !== '' ? Number(formData.actual_amount) : null,
          short_description: formData.description.trim() || null,
          allow_multiple_locations: formData.multiple_locations === 'yes',
          mixed_handling: formData.mixedHandling || null,
          allow_mixed_handling: formData.allowMixed === 'yes',
          expiry: formData.expiryRule === 'unlimited' ? null : (formData.duration_days ? Number(formData.duration_days) : null),
          refund_policy: formData.refundPolicy === 'manual-override',
          allowed_payment_methods: formData.paymentModes.length > 0 ? formData.paymentModes.join(',') : null,
          allowed_locations: formData.locations.length > 0 ? formData.locations.map(String) : null,
        };
        const { error: upErr } = await supabase
          .from('subscription_plans')
          .update(updateObj)
          .eq('id', planId);
        if (!upErr && updateObj.allow_multiple_locations) {
          // Sync subscription_plan_locations
          await supabase.from('subscription_plan_locations').delete().eq('plan_id', planId);
          if (formData.locations.length > 0) {
            await supabase.from('subscription_plan_locations').insert(
              formData.locations.map((locId: string) => ({ plan_id: planId, location_id: locId }))
            );
          }
        }
        if (!upErr) {
          setShowSuccess(true);
          setIsCooldown(true);
          setTimeout(() => setIsCooldown(false), 3000);
          setTimeout(() => {
            navigate('/loyalty/schemes');
          }, 1200);
        } else {
          toast({ title: 'Error', description: 'There was an error saving changes. Please try again.', status: 'error' });
          setIsCreating(false);
        }
        return;
      }
      // Create new plan (existing logic)
      const owner_id: string = user.id;

      const insertObj = {
        owner_id,
        name: formData.name.trim(),
        type: formData.type,
        duration_days: formData.duration_days ? Number(formData.duration_days) : null,
        max_redemptions:
          (formData.type === 'visit' || formData.type === 'package') && String(formData.max_redemptions || '').trim() !== ''
            ? Number(formData.max_redemptions)
            : null,
        price: String(formData.price || '').trim() !== '' ? Number(formData.price) : 0,
        plan_amount: String(formData.actual_amount || '').trim() !== '' ? Number(formData.actual_amount) : null,
        short_description: formData.description.trim() || null,
        currency: 'INR',
        allow_multiple_locations: formData.multiple_locations === 'yes',
        mixed_handling: formData.mixedHandling || null,
        allow_mixed_handling: formData.allowMixed === 'yes',
        created_by: user.id,
        expiry: formData.expiryRule === 'unlimited' ? null : (formData.duration_days ? Number(formData.duration_days) : null),
        refund_policy: formData.refundPolicy === 'manual-override',
        allowed_payment_methods: formData.paymentModes.length > 0 ? formData.paymentModes.join(',') : null,
        allowed_locations: formData.locations.length > 0
          ? formData.locations.map(String)
          : null,
        allowed_services: formData.reward_description
          ? formData.reward_description.split(',').map((desc) => desc.trim()).filter(Boolean)
          : null
      };

      const { data, error } = await supabase
        .from('subscription_plans')
        .insert([insertObj])
        .select();

      if (!error && insertObj.allow_multiple_locations && data && data[0]?.id && formData.locations.length > 0) {
        await supabase
          .from('subscription_plan_locations')
          .insert(
            formData.locations.map((locId: string) => ({
              plan_id: data[0].id,
              location_id: locId
            }))
          );
      }

      if (!error) {
        setShowSuccess(true);
        setIsCooldown(true);
        setTimeout(() => setIsCooldown(false), 5000);
        setTimeout(() => {
          navigate('/loyalty/schemes');
        }, 1500);
      } else {
        toast({
          title: 'Error',
          description: 'There was an error creating the scheme. Please try again.',
          status: 'error'
        });
        setIsCreating(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Save immediately in edit mode without progressing steps
  const handleQuickSave = async () => {
    if (!isEditMode || !planId) return;
    if (isCreating || isCooldown) return;
    setIsCreating(true);
    if (!user?.id) {
      toast({ title: 'Not authenticated', description: 'Please sign in again to save the scheme.', status: 'error' });
      setIsCreating(false);
      return;
    }
    const updateObj: any = {
      name: formData.name.trim(),
      type: formData.type,
      duration_days: formData.duration_days ? Number(formData.duration_days) : null,
      max_redemptions:
        (formData.type === 'visit' || formData.type === 'package') && String(formData.max_redemptions || '').trim() !== ''
          ? Number(formData.max_redemptions)
          : null,
      price: String(formData.price || '').trim() !== '' ? Number(formData.price) : 0,
      plan_amount: String(formData.actual_amount || '').trim() !== '' ? Number(formData.actual_amount) : null,
      short_description: formData.description.trim() || null,
      allow_multiple_locations: formData.multiple_locations === 'yes',
      mixed_handling: formData.mixedHandling || null,
      allow_mixed_handling: formData.allowMixed === 'yes',
      expiry: formData.expiryRule === 'unlimited' ? null : (formData.duration_days ? Number(formData.duration_days) : null),
      refund_policy: formData.refundPolicy === 'manual-override',
      allowed_payment_methods: formData.paymentModes.length > 0 ? formData.paymentModes.join(',') : null,
      allowed_locations: formData.locations.length > 0 ? formData.locations.map(String) : null,
    };
    const { error: upErr } = await supabase
      .from('subscription_plans')
      .update(updateObj)
      .eq('id', planId);
    if (!upErr && updateObj.allow_multiple_locations) {
      await supabase.from('subscription_plan_locations').delete().eq('plan_id', planId);
      if (formData.locations.length > 0) {
        await supabase.from('subscription_plan_locations').insert(
          formData.locations.map((locId: string) => ({ plan_id: planId, location_id: locId }))
        );
      }
    }
    if (!upErr) {
      setShowSuccess(true);
      setIsCooldown(true);
      setTimeout(() => setIsCooldown(false), 3000);
      setTimeout(() => {
        navigate('/loyalty/schemes');
      }, 1200);
    } else {
      toast({ title: 'Error', description: 'There was an error saving changes. Please try again.', status: 'error' });
      setIsCreating(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const paymentMethodOptions = ['cash', 'card', 'UPI', 'Pay later'];
  React.useEffect(() => {
    if (currentStep === 2 && formData.paymentModes.length === 0) {
      setFormData((prev: any) => ({
        ...prev,
        paymentModes: paymentMethodOptions.filter((m) => m !== 'Pay later')
      }));
    }
  }, [currentStep, (formData as any).paymentModes?.length]);

  // Fetch permitted locations for the logged-in owner when entering Step 4
  React.useEffect(() => {
    const fetchPermittedLocations = async () => {
      if (currentStep !== 4 || !user?.id) return;
      setIsLoadingLocations(true);
      try {
        const { data: ownerships } = await supabase
          .from('location_owners')
          .select('location_id')
          .eq('owner_id', user.id);
        const locationIds = (ownerships || []).map((o: any) => o.location_id).filter(Boolean);
        if (locationIds.length === 0) {
          setPermittedLocations([]);
          setIsLoadingLocations(false);
          return;
        }
        const { data: locations } = await supabase
          .from('locations')
          .select('id, name')
          .in('id', locationIds);
        setPermittedLocations((locations || []).map((l: any) => ({ id: l.id, name: l.name })));
      } catch (e) {
        setPermittedLocations([]);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchPermittedLocations();
  }, [currentStep, user?.id]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Basic Information</h3>
            <p className="text-muted-foreground">Define the identity of your scheme.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Scheme Name</label>
                <Input
                  placeholder="e.g. Gold Wash Plan"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleChange('type', value)}
                  required
                >
                  <SelectTrigger>
                    <span>
                      {formData.type
                        ? formData.type.charAt(0).toUpperCase() + formData.type.slice(1)
                        : 'Select type'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visit">Visit based(For each visit)</SelectItem>
                    <SelectItem value="package">Package based(Packages based on vehicle type)</SelectItem>
                    <SelectItem value="credit">Credit based(Amount based Credit system) </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration/Validity-days (Leave duration blank for unlimited validity.) <span className="text-muted-foreground">(optional)</span></label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 30"
                  value={formData.duration_days}
                  onChange={(e) => handleChange('duration_days', e.target.value)}
                />
              </div>
              {String(formData.type || '').toLowerCase() === 'credit' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Value <span className="text-muted-foreground">(in rupees)</span></label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 13000"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Actual Amount (customer pays) <span className="text-muted-foreground">(in rupees)</span></label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 10000"
                  value={formData.actual_amount || ''}
                  onChange={(e) => handleChange('actual_amount', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Short Description</label>
                <Input
                  placeholder="e.g. A premium plan for regular customers"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Payment Rules</h3>
            <p className="text-muted-foreground">Define how customers can pay for this scheme.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Allowed Payment Methods</label>
                <div className="flex gap-4 flex-wrap">
                  {['cash', 'card', 'UPI', 'Pay later'].map((method) => (
                    <label key={method} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.paymentModes.includes(method)}
                        onChange={(e) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            paymentModes: e.target.checked
                              ? [...prev.paymentModes, method]
                              : prev.paymentModes.filter((m: string) => m !== method)
                          }));
                        }}
                      />
                      <span className="capitalize">{method}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Allow Mixed Payment?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="allowMixed"
                      value="yes"
                      checked={formData.allowMixed === 'yes'}
                      onChange={() => setFormData((prev: any) => ({ ...prev, allowMixed: 'yes' }))}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="allowMixed"
                      value="no"
                      checked={formData.allowMixed === 'no'}
                      onChange={() => setFormData((prev: any) => ({ ...prev, allowMixed: 'no' }))}
                    />
                    No
                  </label>
                </div>
              </div>
              {formData.allowMixed === 'yes' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Mixed Payment Handling</label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={formData.mixedHandling || ''}
                    onChange={(e) =>
                      setFormData((prev: any) => ({ ...prev, mixedHandling: e.target.value }))
                    }
                  >
                    <option value="">Select handling</option>
                    <option value="credit-first">First consume credit, remainder via cash/upi/card</option>
                    <option value="cash-first">Prioritize cash/direct payment first</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Expiry & Refund</h3>
            <p className="text-muted-foreground">Set expiry and refund options for this scheme.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expiry Handling</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="expiryRule"
                      value="auto"
                      checked={formData.expiryRule === 'auto'}
                      onChange={() =>
                        setFormData((prev: any) => ({
                          ...prev,
                          expiryRule: 'auto'
                        }))
                      }
                    />
                    Auto-expire after <span className="font-semibold mx-1">{formData.duration_days || 'Valid'}</span> days
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="expiryRule"
                      value="unlimited"
                      checked={formData.expiryRule === 'unlimited'}
                      onChange={() =>
                        setFormData((prev: any) => ({
                          ...prev,
                          expiryRule: 'unlimited'
                        }))
                      }
                    />
                    Unlimited validity
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Refund Policy</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={formData.refundPolicy || ''}
                  onChange={(e) =>
                    setFormData((prev: any) => ({ ...prev, refundPolicy: e.target.value }))
                  }
                >
                  <option value="">Select refund policy</option>
                  <option value="no-refund">No refunds (default)</option>
                  <option value="manual-override">Allow refund under special conditions (manual override)</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Locations</h3>
            <p className="text-muted-foreground">Choose where the scheme applies.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Allow Multiple Locations?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="multiple_locations"
                      value="yes"
                      checked={formData.multiple_locations === 'yes'}
                      onChange={() => setFormData((prev: any) => ({ ...prev, multiple_locations: 'yes', locations: [] }))}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="multiple_locations"
                      value="no"
                      checked={formData.multiple_locations === 'no'}
                      onChange={() => setFormData((prev: any) => ({ ...prev, multiple_locations: 'no', locations: [] }))}
                    />
                    No
                  </label>
                </div>
              </div>
              {/* Location Picker (from location_owners -> locations) */}
              <div>
                <label className="block text-sm font-medium mb-1">Select Allowed Locations</label>
                {isLoadingLocations ? (
                  <div className="text-sm text-muted-foreground">Loading locations…</div>
                ) : permittedLocations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No permitted locations found for this owner.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {permittedLocations.map((loc) => (
                      <label key={loc.id} className="flex items-center gap-2">
                        <input
                          type={formData.multiple_locations === 'yes' ? 'checkbox' : 'radio'}
                          checked={formData.locations.includes(loc.id)}
                          onChange={(e) => {
                            if (formData.multiple_locations === 'yes') {
                              setFormData((prev: any) => ({
                                ...prev,
                                locations: e.target.checked
                                  ? [...prev.locations, loc.id]
                                  : prev.locations.filter((id: string) => id !== loc.id)
                              }));
                            } else {
                              setFormData((prev: any) => ({
                                ...prev,
                                locations: [loc.id]
                              }));
                            }
                          }}
                        />
                        <span>{loc.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                <strong>Disclaimer:</strong> If partnership branches exist, the scheme may not apply automatically unless partner agrees.
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Rewards & Perks</h3>
            <p className="text-muted-foreground">Attach loyalty perks to make your scheme attractive.</p>
            <div className="space-y-4">
              {(formData.type === 'visit' || formData.type === 'package') && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Max Redemptions <span className="text-muted-foreground">(number of visits or packages)</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 10"
                    value={formData.max_redemptions || ''}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        max_redemptions: e.target.value
                      }))
                    }
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Reward Description</label>
                <Input
                  placeholder={
                    formData.type === 'visit'
                      ? 'e.g. Free wash after 10 visits'
                      : formData.type === 'package'
                      ? 'e.g. Free service after package completion'
                      : 'e.g. Bonus credits, discounts, etc.'
                  }
                  value={formData.reward_description || ''}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      reward_description: e.target.value
                    }))
                  }
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                <strong>Note:</strong> For package plans, rewards can be a free wash or similar service from your service table. For credit plans, rewards are typically bonus credits or discounts.
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Review & Confirm</h3>
            <p className="text-muted-foreground">Please review your scheme details before {isEditMode ? 'saving' : 'creating'}.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Step 1: Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {formData.name || <span className="text-muted-foreground">Not set</span>}</div>
                    <div><strong>Type:</strong> {formData.type ? formData.type.charAt(0).toUpperCase() + formData.type.slice(1) : <span className="text-muted-foreground">Not set</span>}</div>
                    <div>
                      <strong>Duration:</strong>{' '}
                      {formData.expiryRule === 'unlimited' || !formData.duration_days
                        ? 'Unlimited'
                        : `${formData.duration_days} days`}
                    </div>
                    {String(formData.type || '').toLowerCase() === 'credit' && (
                      <div>
                        <strong>Value:</strong>{' '}
                        {formData.price ? `₹${formData.price}` : <span className="text-muted-foreground">Not set</span>}
                      </div>
                    )}
                    <div>
                      <strong>Actual Amount:</strong>{' '}
                      {formData.actual_amount ? `₹${formData.actual_amount}` : <span className="text-muted-foreground">Not set</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Step 2: Payment Rules */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Allowed Methods:</strong>{' '}
                      {formData.paymentModes.length > 0
                        ? formData.paymentModes.join(', ')
                        : <span className="text-muted-foreground">Not set</span>}
                    </div>
                    <div>
                      <strong>Allow Mixed Payment:</strong>{' '}
                      {formData.allowMixed === 'yes' ? 'Yes' : 'No'}
                    </div>
                    {formData.allowMixed === 'yes' && (
                      <div>
                        <strong>Mixed Handling:</strong>{' '}
                        {formData.mixedHandling === 'credit-first'
                          ? 'First consume credit, remainder via cash/upi/card'
                          : formData.mixedHandling === 'cash-first'
                          ? 'Prioritize cash/direct payment first'
                          : <span className="text-muted-foreground">Not set</span>}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Step 3: Expiry & Refund */}
              <Card>
                <CardHeader>
                  <CardTitle>Expiry & Refund</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Expiry:</strong>{' '}
                      {formData.expiryRule === 'unlimited' || !formData.duration_days
                        ? 'Unlimited validity'
                        : `Auto-expire after ${formData.duration_days} days`}
                    </div>
                    <div>
                      <strong>Refund Policy:</strong>{' '}
                      {formData.refundPolicy === 'manual-override'
                        ? 'Allow refund under special conditions'
                        : 'No refunds'}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Step 4: Locations */}
              <Card>
                <CardHeader>
                  <CardTitle>Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Multiple Locations:</strong>{' '}
                      {formData.multiple_locations === 'yes' ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <strong>Allowed Locations:</strong>{' '}
                      {formData.locations.length > 0
                        ? (permittedLocations.length > 0
                            ? permittedLocations
                                .filter((loc) => formData.locations.includes(loc.id))
                                .map((loc) => loc.name)
                                .join(', ')
                            : formData.locations.join(', '))
                        : <span className="text-muted-foreground">Not set</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Step 5: Rewards */}
              <Card>
                <CardHeader>
                  <CardTitle>Rewards & Perks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {(formData.type === 'visit' || formData.type === 'package') && (
                      <div>
                        <strong>Max Redemptions:</strong>{' '}
                        {formData.max_redemptions
                          ? formData.max_redemptions
                          : <span className="text-muted-foreground">Not set</span>}
                      </div>
                    )}
                    <div>
                      <strong>Reward Description:</strong>{' '}
                      {formData.reward_description
                        ? formData.reward_description
                        : <span className="text-muted-foreground">Not set</span>}
                    </div>
                    <div>
                      <strong>Enable Reminders:</strong>{' '}
                      {formData.enable_reminders === 'yes' ? 'Yes' : 'No'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="bg-success/10 p-6 rounded-lg border border-success/20 mt-6">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-success" />
                <span className="font-medium text-success">Ready to {isEditMode ? 'Save' : 'Create'}</span>
              </div>
              <p className="text-sm text-foreground">Your scheme configuration looks good!</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">{steps[currentStep - 1].title}</h3>
            <p className="text-muted-foreground">{steps[currentStep - 1].description}</p>
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Step {currentStep} form will be implemented here
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">{isEditMode ? 'Edit Scheme' : 'Create New Scheme'}</h1>
        <Button
          variant="outline"
          onClick={() => navigate('/loyalty/schemes')}
        >
          Back
        </Button>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Step {currentStep} of {steps.length}
              </span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2 [&>div]:bg-green-500" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mb-8">
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex flex-col items-center cursor-pointer focus:outline-none ${step.id <= currentStep ? 'opacity-100' : 'opacity-60'} hover:opacity-100`}
                aria-label={`Go to step ${step.id}: ${step.title}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${step.id < currentStep
                    ? 'bg-success text-white'
                    : step.id === currentStep
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                  {step.id < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-medium">{step.id}</span>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground hidden sm:block">{step.description}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="p-8">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleQuickSave}
            disabled={isCreating || isCooldown}
          >
            Make changes
          </Button>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={isCreating || isCooldown}
          >
            {currentStep === steps.length ? (isCreating || isCooldown ? (isEditMode ? 'Saving…' : 'Creating…') : (isEditMode ? 'Save Changes' : 'Create Scheme')) : 'Next'}
            {currentStep < steps.length && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>

      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-white rounded-xl p-8 shadow-2xl text-center animate-scale-in">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 border border-green-200 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600 animate-fade-in" />
            </div>
            <div className="text-lg font-semibold text-foreground mb-1">{isEditMode ? 'Changes Saved' : 'Scheme Created'}</div>
            <div className="text-sm text-muted-foreground">Redirecting to schemes…</div>
          </div>
        </div>
      )}
    </div>
  );
}

function useToast(): { toast: (options: { title?: string; description?: string; status?: 'success' | 'error' | 'info'; }) => void } {
  return {
    toast: ({ title, description, status }) => {
      // Simple fallback: use alert for demonstration
      alert(`${status ? `[${status.toUpperCase()}] ` : ''}${title ? title + ': ' : ''}${description || ''}`);
    }
  };
}

