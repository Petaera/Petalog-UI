
import { useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabaseClient';

export default function OwnerEntry() {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [priceMatrix, setPriceMatrix] = useState<any[]>([]);
  const [vehicleType, setVehicleType] = useState('');
  const [service, setService] = useState('');
  const [amount, setAmount] = useState('');
  const [entryType, setEntryType] = useState('normal');
  const [discount, setDiscount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [scratchImage, setScratchImage] = useState<string>('');
  const [workshop, setWorkshop] = useState('');
  const [workshopOptions, setWorkshopOptions] = useState<string[]>([]);
  const [workshopPriceMatrix, setWorkshopPriceMatrix] = useState<any[]>([]);

  useEffect(() => {
    const fetchServicePrices = async () => {
      const { data, error } = await supabase.from('Service_prices').select('*');
      console.log('Fetched Service_prices:', data, error);
      if (data && data.length > 0) {
        // Unique VEHICLE and SERVICE values, trimmed
        const uniqueVehicles = [...new Set(data.map(row => row.VEHICLE && row.VEHICLE.trim()).filter(Boolean))];
        const uniqueServices = [...new Set(data.map(row => row.SERVICE && row.SERVICE.trim()).filter(Boolean))];
        console.log('Unique vehicles:', uniqueVehicles);
        console.log('Unique services:', uniqueServices);
        setVehicleTypes(uniqueVehicles);
        setServiceOptions(uniqueServices);
        setPriceMatrix(data);
      }
    };
    const fetchWorkshopPrices = async () => {
      const { data, error } = await supabase.from('workshop_prices').select('*');
      console.log('Fetched workshop_prices:', data, error);
      if (data) {
        setWorkshopPriceMatrix(data);
        const uniqueWorkshops = [...new Set(data.map(row => row.WORKSHOP && row.WORKSHOP.trim()).filter(Boolean))];
        console.log('Unique workshops:', uniqueWorkshops);
        setWorkshopOptions(uniqueWorkshops);
      }
    };
    fetchServicePrices();
    fetchWorkshopPrices();
  }, []);

  // Reset and repopulate dropdowns when entryType changes
  useEffect(() => {
    setWorkshop('');
    setVehicleType('');
    setService('');
    setAmount('');

    if (entryType === 'normal') {
      const uniqueVehicles = [...new Set(priceMatrix.map(row => row.VEHICLE && row.VEHICLE.trim()).filter(Boolean))];
      const uniqueServices = [...new Set(priceMatrix.map(row => row.SERVICE && row.SERVICE.trim()).filter(Boolean))];
      setVehicleTypes(uniqueVehicles);
      setServiceOptions(uniqueServices);
    } else { 
      setVehicleTypes([]);
      setServiceOptions([]);
    }
  }, [entryType, priceMatrix]);

  // When workshop changes, update vehicle types
  useEffect(() => {
    if (entryType === 'workshop' && workshop) {
      const filtered = workshopPriceMatrix.filter(row => row.WORKSHOP === workshop);
      const uniqueVehicles = [...new Set(filtered.map(row => row.VEHICLE && row.VEHICLE.trim()).filter(Boolean))];
      setVehicleTypes(uniqueVehicles);
      setVehicleType('');
      setService('');
      setAmount('');
      setServiceOptions([]);
    }
  }, [workshop, entryType, workshopPriceMatrix]);
  
  // Calculate amount based on entry type and selections
  useEffect(() => {
    if (entryType === 'normal' && vehicleType && service) {
      const row = priceMatrix.find(row => row.VEHICLE === vehicleType && row.SERVICE === service);
      if (row && row.PRICE !== undefined) {
        setAmount(row.PRICE);
      } else {
        setAmount('');
      }
    } else if (entryType === 'workshop' && workshop && vehicleType) {
      const row = workshopPriceMatrix.find(
        row => row.WORKSHOP === workshop && row.VEHICLE === vehicleType
      );
      if (row && row.PRICE !== undefined) {
        setAmount(row.PRICE);
      } else {
        setAmount('');
      }
    }
  }, [entryType, vehicleType, service, workshop, priceMatrix, workshopPriceMatrix]);

  // Mock data for previous visits
  const previousVisits = vehicleNumber ? Math.floor(Math.random() * 5) + 1 : 0;

  const handleVehicleNumberChange = (value: string) => {
    setVehicleNumber(value.toUpperCase());
  };

  const handleServiceChange = (value: string) => {
    setService(value);
    // Update amount based on service
    const prices: { [key: string]: string } = {
      'basic': '200',
      'premium': '500',
      'full': '800',
      'quick': '150'
    };
    setAmount(prices[value] || '200');
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
    setService('');
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
              <h1 className="text-2xl font-bold">Manual Entry</h1>
            </div>
            {/*
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
              Owner Access
            </Badge>
            */}
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
                  placeholder="Enter vehicle number (KL07AB0001)" 
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
                {entryType === 'normal' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">Vehicle Type</Label>
                      <Select value={vehicleType} onValueChange={setVehicleType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service">Service Chosen</Label>
                      <Select value={service} onValueChange={setService}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {entryType === 'workshop' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="workshop">Workshop</Label>
                      <Select value={workshop} onValueChange={setWorkshop}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select workshop" />
                        </SelectTrigger>
                        <SelectContent>
                          {workshopOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">Vehicle Type</Label>
                      <Select value={vehicleType} onValueChange={setVehicleType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    value={amount ? `₹${amount}` : ''} 
                    className="font-semibold text-financial"
                    readOnly
                    onChange={(e) => setAmount(e.target.value.replace('₹', ''))}
                  />
                </div>
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
