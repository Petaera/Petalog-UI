
import { useState } from 'react';
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Car, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScratchMarking } from "@/components/ScratchMarking";
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import React from 'react';

export default function OwnerEntry() {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [service, setService] = useState<string[]>([]);
  const [entryType, setEntryType] = useState('normal');
  const [amount, setAmount] = useState('500');
  const [discount, setDiscount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [scratchImage, setScratchImage] = useState<string>('');

  // Mock data for previous visits
  const previousVisits = vehicleNumber ? Math.floor(Math.random() * 5) + 1 : 0;

  // Service price map
  const SERVICE_PRICES: { [key: string]: number } = {
    'basic': 200,
    'premium': 500,
    'full': 800,
    'quick': 150
  };

  // Update amount when service or entryType changes
  React.useEffect(() => {
    if (entryType === 'normal') {
      const total = service.reduce((sum, s) => sum + (SERVICE_PRICES[s] || 0), 0);
      setAmount(total.toString());
    }
  }, [service, entryType]);

  const handleVehicleNumberChange = (value: string) => {
    setVehicleNumber(value.toUpperCase());
  };

  // Handle service change for multi-select
  const handleServiceCheckbox = (value: string, checked: boolean | "indeterminate") => {
    setService((prev) =>
      checked ? [...prev, value] : prev.filter((v) => v !== value)
    );
  };
  // Handle single-select for workshop
  const handleServiceChange = (value: string) => {
    setService([value]);
    setAmount(SERVICE_PRICES[value]?.toString() || '200');
  };

  const handleSubmit = () => {
    if (!vehicleNumber || !vehicleType || !service) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Mock submission
    toast.success('Owner entry submitted successfully!');
    
    // Reset form
    setVehicleNumber('');
    setVehicleType('');
    setService(['basic']); // Reset to default for normal entry
    setAmount('500');
    setDiscount('');
    setRemarks('');
    setPaymentMode('cash');
    setScratchImage('');
  };

  const handleScratchSave = (imageData: string) => {
    setScratchImage(imageData);
  };

  return (
    <Layout>
      <div className="flex-1 p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Owner Manual Entry</h1>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
              Owner Access
            </Badge>
          </div>
          
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Entry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Entry Type - move this section above Vehicle Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entry Type</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant={entryType === 'normal' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => setEntryType('normal')}
                    >
                      Normal
                    </Button>
                    <Button 
                      variant={entryType === 'workshop' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => setEntryType('workshop')}
                    >
                      Workshop
                    </Button>
                  </div>
                </div>
              </div>
              {/* Vehicle Number */}
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input 
                  id="vehicleNumber"
                  placeholder="Enter vehicle number" 
                  className="text-center font-mono text-lg uppercase"
                  value={vehicleNumber}
                  onChange={(e) => handleVehicleNumberChange(e.target.value)}
                />
                {vehicleNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${previousVisits > 0 ? 'bg-success' : 'bg-warning'}`}></div>
                    <span className="text-muted-foreground">
                      {previousVisits > 0 ? `Previous Visits: ${previousVisits} times` : 'New Customer'}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">Service Chosen</Label>
                  {entryType === 'normal' ? (
                    <div className="flex flex-col gap-2">
                      {Object.keys(SERVICE_PRICES).map((key) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={service.includes(key)}
                            onCheckedChange={(checked) => handleServiceCheckbox(key, checked)}
                            id={`service-${key}`}
                          />
                          <span>{key.charAt(0).toUpperCase() + key.slice(1)} - ₹{SERVICE_PRICES[key]}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Select value={service[0] || ''} onValueChange={handleServiceChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic Wash - ₹200</SelectItem>
                        <SelectItem value="premium">Premium Wash - ₹500</SelectItem>
                        <SelectItem value="full">Full Service - ₹800</SelectItem>
                        <SelectItem value="quick">Quick Wash - ₹150</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    value={`₹${amount}`} 
                    className="font-semibold text-financial"
                    onChange={(e) => setAmount(e.target.value.replace('₹', ''))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="flex gap-2">
                  <Button 
                    variant={paymentMode === 'cash' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPaymentMode('cash')}
                  >
                    <Banknote className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Cash</span>
                  </Button>
                  <Button 
                    variant={paymentMode === 'upi' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPaymentMode('upi')}
                  >
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">UPI</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (Optional)</Label>
                  <Input 
                    id="discount" 
                    placeholder="Enter discount amount" 
                    type="number" 
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea 
                  id="remarks" 
                  placeholder="Any additional notes..." 
                  rows={3} 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Scratch Marking Section */}
          <ScratchMarking onSave={handleScratchSave} />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button 
            variant="default" 
            size="lg" 
            className="px-8"
            onClick={handleSubmit}
          >
            Submit Entry
          </Button>
        </div>
      </div>
    </Layout>
  );
}
