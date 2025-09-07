import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, Currency } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation

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
const mockLocations = [
  { id: 'loc1', name: 'Main Branch' },
  { id: 'loc2', name: 'Downtown Branch' },
  { id: 'loc3', name: 'Partner Branch' }
];

export function CreateSchemeWizard({ onComplete }: CreateSchemeWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
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
  });

  const progress = (currentStep / steps.length) * 100;

  const handleNext = async () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      const owner_id = '4d7d1198-5780-4901-9f1b-a55fc190b4fb';

      const insertObj = {
        owner_id,
        name: formData.name.trim(),
        type: formData.type,
        duration_days: formData.duration_days ? Number(formData.duration_days) : null,
        max_redemptions: formData.max_redemptions ? Number(formData.max_redemptions) : null,
        price: formData.price ? Number(formData.price) : 0,
        short_description: formData.description.trim() || null,
        currency: 'INR',
        allow_multiple_locations: formData.multiple_locations === 'yes',
        mixed_handling: formData.mixedHandling || null,
        allow_mixed_handling: formData.allowMixed === 'yes',
        expiry: formData.expiryRule === 'unlimited' ? null : (formData.duration_days ? Number(formData.duration_days) : null),
        refund_policy: formData.refundPolicy === 'manual-override',
        allowed_payment_methods: formData.paymentModes.length > 0 ? formData.paymentModes.join(',') : null,
        allowed_locations: formData.locations.length > 0
          ? formData.locations.map(String) // <-- send as array for text[] column
          : null,
        allowed_services: formData.reward_description
          ? formData.reward_description.split(',').map((desc) => desc.trim()).filter(Boolean)
          : null
      };

      const { data, error } = await supabase
        .from('subscription_plans')
        .insert([insertObj])
        .select();

      // If multiple locations, insert into plan_locations link table
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
        toast({
          title: 'Scheme Created',
          description: 'Your subscription scheme has been successfully created.',
          status: 'success'
        });
        navigate('/loyalty/schemes');
      } else {
        toast({
          title: 'Error',
          description: 'There was an error creating the scheme. Please try again.',
          status: 'error'
        });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const paymentMethodOptions = ['cash', 'card', 'UPI', 'Pay later'];
  React.useEffect(() => {
    if (currentStep === 2 && formData.paymentModes.length === 0) {
      setFormData((prev) => ({
        ...prev,
        paymentModes: paymentMethodOptions.filter((m) => m !== 'Pay later')
      }));
    }
  }, [currentStep, formData.paymentModes.length]);

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
              <div>
                <label className="block text-sm font-medium mb-1">Price <span className="text-muted-foreground">(in rupees)</span></label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 999"
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
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
                          setFormData((prev) => ({
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
                      onChange={() => setFormData((prev) => ({ ...prev, allowMixed: 'yes' }))}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="allowMixed"
                      value="no"
                      checked={formData.allowMixed === 'no'}
                      onChange={() => setFormData((prev) => ({ ...prev, allowMixed: 'no' }))}
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
                      setFormData((prev) => ({ ...prev, mixedHandling: e.target.value }))
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
                        setFormData((prev) => ({
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
                        setFormData((prev) => ({
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
                    setFormData((prev) => ({ ...prev, refundPolicy: e.target.value }))
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
                      onChange={() => setFormData((prev) => ({ ...prev, multiple_locations: 'yes', locations: [] }))}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="multiple_locations"
                      value="no"
                      checked={formData.multiple_locations === 'no'}
                      onChange={() => setFormData((prev) => ({ ...prev, multiple_locations: 'no', locations: [] }))}
                    />
                    No
                  </label>
                </div>
              </div>
              {/* Location Picker */}
              <div>
                <label className="block text-sm font-medium mb-1">Select Allowed Locations</label>
                {/* Replace this with your actual locations fetch from PetaLog locations table */}
                <div className="flex flex-wrap gap-2">
                  {mockLocations.map((loc) => (
                    <label key={loc.id} className="flex items-center gap-2">
                      <input
                        type={formData.multiple_locations === 'yes' ? 'checkbox' : 'radio'}
                        checked={formData.locations.includes(loc.id)}
                        onChange={(e) => {
                          if (formData.multiple_locations === 'yes') {
                            setFormData((prev) => ({
                              ...prev,
                              locations: e.target.checked
                                ? [...prev.locations, loc.id]
                                : prev.locations.filter((id: string) => id !== loc.id)
                            }));
                          } else {
                            setFormData((prev) => ({
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
                      setFormData((prev) => ({
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
                      setFormData((prev) => ({
                        ...prev,
                        reward_description: e.target.value
                      }))
                    }
                  />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Enable Reward Reminders?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="enable_reminders"
                      value="yes"
                      checked={formData.enable_reminders === 'yes'}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          enable_reminders: 'yes'
                        }))
                      }
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="enable_reminders"
                      value="no"
                      checked={formData.enable_reminders === 'no'}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          enable_reminders: 'no'
                        }))
                      }
                    />
                    No
                  </label>
                </div>
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
            <p className="text-muted-foreground">Please review your scheme details before creating.</p>
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
                      <strong>Duration:</strong>{" "}
                      {formData.expiryRule === "unlimited" || !formData.duration_days
                        ? "Unlimited"
                        : `${formData.duration_days} days`}
                    </div>
                    <div>
                      <strong>Price:</strong>{" "}
                      {formData.price ? `₹${formData.price}` : <span className="text-muted-foreground">Not set</span>}
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
                      <strong>Allowed Methods:</strong>{" "}
                      {formData.paymentModes.length > 0
                        ? formData.paymentModes.join(", ")
                        : <span className="text-muted-foreground">Not set</span>}
                    </div>
                    <div>
                      <strong>Allow Mixed Payment:</strong>{" "}
                      {formData.allowMixed === "yes" ? "Yes" : "No"}
                    </div>
                    {formData.allowMixed === "yes" && (
                      <div>
                        <strong>Mixed Handling:</strong>{" "}
                        {formData.mixedHandling === "credit-first"
                          ? "First consume credit, remainder via cash/upi/card"
                          : formData.mixedHandling === "cash-first"
                          ? "Prioritize cash/direct payment first"
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
                      <strong>Expiry:</strong>{" "}
                      {formData.expiryRule === "unlimited" || !formData.duration_days
                        ? "Unlimited validity"
                        : `Auto-expire after ${formData.duration_days} days`}
                    </div>
                    <div>
                      <strong>Refund Policy:</strong>{" "}
                      {formData.refundPolicy === "manual-override"
                        ? "Allow refund under special conditions"
                        : "No refunds"}
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
                      <strong>Multiple Locations:</strong>{" "}
                      {formData.multiple_locations === "yes" ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Allowed Locations:</strong>{" "}
                      {formData.locations.length > 0
                        ? mockLocations
                            .filter((loc) => formData.locations.includes(loc.id))
                            .map((loc) => loc.name)
                            .join(", ")
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
                    {(formData.type === "visit" || formData.type === "package") && (
                      <div>
                        <strong>Max Redemptions:</strong>{" "}
                        {formData.max_redemptions
                          ? formData.max_redemptions
                          : <span className="text-muted-foreground">Not set</span>}
                      </div>
                    )}
                    <div>
                      <strong>Reward Description:</strong>{" "}
                      {formData.reward_description
                        ? formData.reward_description
                        : <span className="text-muted-foreground">Not set</span>}
                    </div>
                    <div>
                      <strong>Enable Reminders:</strong>{" "}
                      {formData.enable_reminders === "yes" ? "Yes" : "No"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="bg-success/10 p-6 rounded-lg border border-success/20 mt-6">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-success" />
                <span className="font-medium text-success">Ready to Create</span>
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Create New Scheme</h1>
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
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mb-8">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${step.id <= currentStep ? 'opacity-100' : 'opacity-40'
                  }`}
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
              </div>
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
        <Button
          onClick={handleNext}
          className="bg-gradient-primary text-white"
        >
          {currentStep === steps.length ? 'Create Scheme' : 'Next'}
          {currentStep < steps.length && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
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

