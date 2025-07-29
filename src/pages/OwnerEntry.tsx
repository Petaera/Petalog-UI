import { useState, useEffect } from 'react';
import { ArrowLeft, Car, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScratchMarking } from "@/components/ScratchMarking";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import ReactSelect from 'react-select';
import { getOrCreateVehicleId } from "@/lib/utils";

// Add SERVICE_PRICES fallback at the top-level
const SERVICE_PRICES: { [key: string]: number } = {
  'basic': 200,
  'premium': 500,
  'full': 800,
  'quick': 150
};

interface OwnerEntryProps {
  selectedLocation?: string;
}

export default function OwnerEntry({ selectedLocation }: OwnerEntryProps) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [priceMatrix, setPriceMatrix] = useState<any[]>([]);
  const [vehicleType, setVehicleType] = useState('');
  // Change service to array for multi-select
  const [service, setService] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [entryType, setEntryType] = useState('normal');
  const [discount, setDiscount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [scratchImage, setScratchImage] = useState<Blob | null>(null);
  const [workshop, setWorkshop] = useState('');
  const [workshopOptions, setWorkshopOptions] = useState<string[]>([]);
  const [workshopPriceMatrix, setWorkshopPriceMatrix] = useState<any[]>([]);
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  
  // Vehicle brand and model
  const [selectedVehicleBrand, setSelectedVehicleBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [availableVehicleBrands, setAvailableVehicleBrands] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<{name: string, id: string}[]>([]);
  const [vehicleData, setVehicleData] = useState<any[]>([]);

  const { user } = useAuth();

  // Fetch vehicle brands and models from Vehicles_in_india table
  useEffect(() => {
    const fetchVehicleData = async () => {
      console.log('Fetching from Vehicles_in_india table...');
      
      // Fetch all fields including id for Brand_id mapping
      let result = await supabase
        .from('Vehicles_in_india')
        .select('id, "Vehicle Brands", "Models"');
      
      console.log('Vehicles_in_india result:', result);
      
      // If that fails, try selecting all fields
      if (result.error) {
        console.log('Trying to select all fields...');
        result = await supabase
          .from('Vehicles_in_india')
          .select('*');
        console.log('Select all result:', result);
      }
      
      const { data, error } = result;
      
      if (!error && data && data.length > 0) {
        setVehicleData(data);
        console.log('Vehicle brands and models data:', data);
        console.log('Available fields:', Object.keys(data[0]));
        
        // Use the correct field names from Vehicles_in_india table
        if (data[0].hasOwnProperty('Vehicle Brands')) {
          const uniqueBrands = [...new Set(data.map(item => item['Vehicle Brands']))].filter(Boolean) as string[];
          console.log('Unique vehicle brands found:', uniqueBrands);
          setAvailableVehicleBrands(uniqueBrands);
        } else {
          console.warn('Vehicle Brands field not found in data');
        }
      } else {
        console.log('No data found or error occurred');
      }
    };
    fetchVehicleData();
  }, []);

  // Update available models when vehicle brand changes
  useEffect(() => {
    if (selectedVehicleBrand && vehicleData.length > 0) {
      console.log('Filtering models for vehicle brand:', selectedVehicleBrand);
      
      // Use the correct field names from Vehicles_in_india table
      if (vehicleData[0]?.hasOwnProperty('Vehicle Brands') && vehicleData[0]?.hasOwnProperty('Models')) {
        const modelsForBrand = vehicleData
          .filter(item => item['Vehicle Brands'] === selectedVehicleBrand)
          .map(item => ({
            name: item['Models'],
            id: item.id
          }))
          .filter(item => item.name); // Filter out empty models
        
        // Remove duplicates based on model name but keep the id
        const uniqueModels = modelsForBrand.filter((model, index, arr) => 
          arr.findIndex(m => m.name === model.name) === index
        );
        
        console.log('Models found for brand:', uniqueModels);
        setAvailableModels(uniqueModels);
      } else {
        console.warn('Vehicle Brands or Models field not found in data');
        setAvailableModels([]);
      }
      setSelectedModel(''); // Reset model when brand changes
      setSelectedModelId(''); // Reset model ID when brand changes
    } else {
      setAvailableModels([]);
      setSelectedModel('');
      setSelectedModelId('');
    }
  }, [selectedVehicleBrand, vehicleData]);

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
    setService([]); // Reset service to empty array
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
      setService([]); // Reset service to empty array for workshop
      setAmount('');
      setServiceOptions([]);
    }
  }, [workshop, entryType, workshopPriceMatrix]);
  
  // Calculate amount based on entry type and selections
  useEffect(() => {
    if (entryType === 'normal' && vehicleType && service.length > 0) {
      // Try to use priceMatrix if available, else fallback
      let total = 0;
      for (const s of service) {
        // Trim both the database values and the service name for comparison
        const row = priceMatrix.find(row => 
          (row.VEHICLE && row.VEHICLE.trim()) === vehicleType.trim() && 
          (row.SERVICE && row.SERVICE.trim()) === s.trim()
        );
        if (row && row.PRICE !== undefined) {
          total += Number(row.PRICE);
        } else {
          total += SERVICE_PRICES[s] || 0;
        }
      }
      setAmount(total.toString());
    } else if (entryType === 'workshop' && workshop && vehicleType) {
      const row = workshopPriceMatrix.find(
        row => (row.WORKSHOP && row.WORKSHOP.trim()) === workshop.trim() && 
               (row.VEHICLE && row.VEHICLE.trim()) === vehicleType.trim()
      );
      if (row && row.PRICE !== undefined) {
        setAmount(row.PRICE);
      } else {
        setAmount('');
      }
    } else {
      setAmount('');
    }
  }, [entryType, vehicleType, service, workshop, priceMatrix, workshopPriceMatrix]);

  // Mock data for previous visits
  const previousVisits = vehicleNumber ? Math.floor(Math.random() * 5) + 1 : 0;

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
  };

  const handleScratchSave = (imageBlob: Blob) => {
    setScratchImage(imageBlob);
  };

  // Polyfill for uuid if needed
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // fallback (not cryptographically secure)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  const handleSubmit = async () => {
    const trimmedCustomerName = customerName.trim();
    
    if (!selectedLocation) {
      toast.error('Please select a location from the toolbar');
      return;
    }
    
    if (!vehicleNumber || !vehicleType || (entryType === 'normal' && service.length === 0)) {
      toast.error('Please fill in all required fields (Vehicle Number, Vehicle Type, and Service)');
      return;
    }
    if (!scratchImage) {
      toast.error('Please save the scratch marking before submitting.');
      return;
    }
    try {
      // Use the utility function to get or create vehicle ID
      const vehicleId = await getOrCreateVehicleId(vehicleNumber, vehicleType);
      
      // 1. Upload image to Supabase Storage
      const safeVehicleNumber = vehicleNumber.replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `${safeVehicleNumber}_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('man-images')
        .upload(fileName, scratchImage, { contentType: 'image/png' });
      if (uploadError) throw uploadError;
      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage.from('man-images').getPublicUrl(fileName);
      const imageUrl = publicUrlData?.publicUrl;
      // Calculate final amount
      const priceNum = parseFloat(amount) || 0;
      const discountNum = discount === '' ? 0 : parseFloat(discount) || 0;
      const finalAmount = priceNum - discountNum;
      // 3. Insert into logs-man
      const { error: insertError } = await supabase.from('logs-man').insert([
        {
          vehicle_id: vehicleId,
          vehicle_number: vehicleNumber,
          location_id: selectedLocation,
          entry_type: entryType,
          image_url: imageUrl,
          created_by: user?.id,
          Amount: finalAmount,
          discount: discountNum,
          remarks: remarks,
          payment_mode: paymentMode,
          service: service.join(','), // Store as comma-separated string
          vehicle_type: vehicleType,
          workshop: entryType === 'workshop' ? workshop : null,
          // Customer details
          Name: trimmedCustomerName || null,
          Phone_no: phoneNumber || null,
          'D.O.B': dateOfBirth || null,
          Location: customerLocation || null,
          // Vehicle details
          vehicle_brand: selectedVehicleBrand || null,
          vehicle_model: selectedModel || null,
          Brand_id: selectedModelId || null,
          created_at: new Date().toISOString(),
          // Approval status
          approval_status: 'pending',
        },
      ]);
      if (insertError) throw insertError;
    toast.success('Owner entry submitted successfully!');
    // Reset form
    setVehicleNumber('');
    setVehicleType('');
      setService([]); // Reset service to empty array
    setAmount('500');
    setDiscount('');
    setRemarks('');
    setPaymentMode('cash');
      setScratchImage(null);
      setCustomerName('');
      setPhoneNumber('');
      setDateOfBirth('');
      setCustomerLocation('');
      setSelectedVehicleBrand('');
      setSelectedModel('');
      setSelectedModelId('');
    } catch (err: any) {
      toast.error('Submission failed: ' + (err?.message || err));
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            <h1 className="text-xl lg:text-2xl font-bold">Manual Entry</h1>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
            Owner Access
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Entry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Entry Type */}
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

            {/* Customer Details */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <Label className="text-base font-semibold">Customer Details</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name (Optional)</Label>
                  <Input 
                    id="customerName"
                    placeholder="Enter customer name" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                  <Input 
                    id="phoneNumber"
                    placeholder="Enter phone number" 
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
                  <Input 
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <LocationAutocomplete
                    value={customerLocation}
                    onChange={setCustomerLocation}
                    placeholder="Type to search location..."
                    label="Location (Optional)"
                    id="customerLocation"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Brand and Model */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <Label className="text-base font-semibold">Vehicle Details</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="selectedVehicleBrand">Vehicle Brand</Label>
                  <ReactSelect
                    isClearable
                    isSearchable
                    placeholder="Type to search vehicle brand..."
                    options={availableVehicleBrands.map(brand => ({ value: brand, label: brand }))}
                    value={selectedVehicleBrand ? { value: selectedVehicleBrand, label: selectedVehicleBrand } : null}
                    onChange={(selected) => setSelectedVehicleBrand(selected?.value || '')}
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "No brands found"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selectedModel">Vehicle Model</Label>
                  <Select 
                    value={selectedModel} 
                    onValueChange={(value) => {
                      setSelectedModel(value);
                      // Find and set the corresponding model ID
                      const modelObj = availableModels.find(m => m.name === value);
                      setSelectedModelId(modelObj?.id || '');
                    }}
                    disabled={!selectedVehicleBrand}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedVehicleBrand ? "Select model" : "Select vehicle brand first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model.id} value={model.name}>{model.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Service Selection */}
            {entryType === 'normal' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <Label className="text-base font-semibold">Service Selection</Label>
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
                  <ReactSelect
                    isMulti
                    options={
                      vehicleType
                        ? priceMatrix
                            .filter(row => row.VEHICLE && row.VEHICLE.trim() === vehicleType.trim())
                            .map(row => row.SERVICE)
                            .filter((v, i, arr) => v && arr.indexOf(v) === i)
                            .map(option => ({ value: option, label: option }))
                        : []
                    }
                    value={service.map(option => ({
                      value: option,
                      label: option
                    }))}
                    onChange={(selected) => setService(Array.isArray(selected) ? selected.map((s: any) => s.value) : [])}
                    placeholder={vehicleType ? "Select services" : "Select vehicle type first"}
                    classNamePrefix="react-select"
                    isDisabled={!vehicleType}
                  />
                </div>
              </div>
            )}

            {/* Workshop Selection */}
            {entryType === 'workshop' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <Label className="text-base font-semibold">Workshop Details</Label>
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
              </div>
            )}

            {/* Amount and Payment */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <Label className="text-base font-semibold">Payment Details</Label>
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
            </div>
          </CardContent>
        </Card>

        {/* Scratch Marking Section */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Scratch Marking</CardTitle>
          </CardHeader>
          <CardContent>
            <ScratchMarking onSave={handleScratchSave} />
          </CardContent>
        </Card>
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
  );
}
