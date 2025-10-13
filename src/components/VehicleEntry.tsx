import { useState, useEffect } from 'react';
import { ArrowLeft, Car, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useUpiAccounts } from '@/hooks/useUpiAccounts';
import { useVehicleData } from '@/hooks/useVehicleData';
import { useFormData } from '@/hooks/useFormData';
import { useFormSubmission } from '@/hooks/useFormSubmission';
import { useLoyaltyRedemption } from '@/hooks/useLoyaltyRedemption';
import { useVisitHistory } from '@/hooks/useVisitHistory';
import { useVehicleAutoFill } from '@/hooks/useVehicleAutoFill';
import { useEditMode } from '@/hooks/useEditMode';
import { todayYMD, yesterdayYMD, parseYMD, toYMD, getDisplayDate } from '@/utils/dateUtils';
import { mapTypeToWheelCategory, mapWheelCategoryToTypeCode, doesTypeMatchWheelCategory } from '@/utils/vehicleUtils';
import { sortServicesWithPriority, sortVehicleTypesWithPriority } from '@/constants/vehicleConfig';
import { EntryTypeSelector } from '@/components/forms/EntryTypeSelector';
import { DateSelector } from '@/components/forms/DateSelector';
import { VehicleDetails } from '@/components/forms/VehicleDetails';
import { ServiceSelection } from '@/components/forms/ServiceSelection';
import { supabase } from '@/lib/supabaseClient';

interface VehicleEntryProps {
  selectedLocation?: string;
  accessType?: 'owner' | 'manager';
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export default function VehicleEntry({ 
  selectedLocation, 
  accessType = 'owner',
  showBackButton = false,
  onBackClick
}: VehicleEntryProps) {
  // Form state
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [service, setService] = useState<string[]>([]);
  const [amount, setAmount] = useState('500');
  const [discount, setDiscount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [entryType, setEntryType] = useState('customer');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'credit'>('cash');
  const [selectedUpiAccount, setSelectedUpiAccount] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [wheelCategory, setWheelCategory] = useState('4');
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  
  // Vehicle details
  const [selectedVehicleBrand, setSelectedVehicleBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  
  // Date/time
  const [selectedDateOption, setSelectedDateOption] = useState('today');
  const [customEntryDate, setCustomEntryDate] = useState(() => todayYMD());
  const [customEntryTime, setCustomEntryTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  const [useCustomDateTime, setUseCustomDateTime] = useState(false);
  
  // Custom workshop name
  const [customWorkshopName, setCustomWorkshopName] = useState('');
  
  // Visits expanded state
  const [visitsExpanded, setVisitsExpanded] = useState(false);
  
  // Applying edit data flag
  const [isApplyingEditData, setIsApplyingEditData] = useState(false);
  
  // Hooks
  const { user } = useAuth();
  const { vehicleData, loading: vehicleDataLoading } = useVehicleData();
  const { 
    vehicleTypes, 
    serviceOptions, 
    priceMatrix, 
    workshopOptions, 
    workshopPriceMatrix 
  } = useFormData();
  const { accounts: upiAccounts, loading: upiAccountsLoading } = useUpiAccounts(selectedLocation);
  const { isSubmitDisabled, submitForm } = useFormSubmission();
  const {
    usableSubscriptions,
    selectedSubscription,
    useSubscriptionForRedemption,
    processRedemption,
    resetSubscriptionState,
    fetchUsableSubscriptions,
    setSelectedSubscription,
    setUseSubscriptionForRedemption,
    setUsableSubscriptions,
  } = useLoyaltyRedemption();
  
  // Edit mode hook
  const {
    pendingEditData,
    isEditing,
    editLogId,
    setIsEditing,
    setEditLogId,
    setPendingEditData,
    resetEditMode
  } = useEditMode();

  // Visit history hook
  const { visitCount, latestVisitSummary, latestVisits } = useVisitHistory(vehicleNumber, selectedLocation);
  
  // Vehicle auto-fill hook
  const {
    isLoading: isLoadingVehicleData,
    customerName: autoFillCustomerName,
    phoneNumber: autoFillPhoneNumber,
    dateOfBirth: autoFillDateOfBirth,
    customerLocation: autoFillCustomerLocation,
    selectedVehicleBrand: autoFillVehicleBrand,
    selectedModel: autoFillModel,
    selectedModelId: autoFillModelId,
    wheelCategory: autoFillWheelCategory,
    vehicleType: autoFillVehicleType,
    lastServiceData
  } = useVehicleAutoFill(vehicleNumber, vehicleData, selectedLocation, isEditing, isApplyingEditData);

  // Available brands and models
  const [availableVehicleBrands, setAvailableVehicleBrands] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<{ name: string, id: string, brand: string, type?: string }[]>([]);

  // Sync auto-fill data to form state
  useEffect(() => {
    if (!isEditing && !isApplyingEditData && autoFillCustomerName) {
      setCustomerName(autoFillCustomerName);
    }
  }, [autoFillCustomerName, isEditing, isApplyingEditData]);

  useEffect(() => {
    if (!isEditing && !isApplyingEditData && autoFillPhoneNumber) {
      setPhoneNumber(autoFillPhoneNumber);
    }
  }, [autoFillPhoneNumber, isEditing, isApplyingEditData]);

  useEffect(() => {
    if (!isEditing && !isApplyingEditData && autoFillDateOfBirth) {
      setDateOfBirth(autoFillDateOfBirth);
    }
  }, [autoFillDateOfBirth, isEditing, isApplyingEditData]);

  useEffect(() => {
    if (!isEditing && !isApplyingEditData && autoFillCustomerLocation) {
      setCustomerLocation(autoFillCustomerLocation);
    }
  }, [autoFillCustomerLocation, isEditing, isApplyingEditData]);

  useEffect(() => {
    if (!isEditing && !isApplyingEditData && autoFillVehicleBrand) {
      setSelectedVehicleBrand(autoFillVehicleBrand);
    }
  }, [autoFillVehicleBrand, isEditing, isApplyingEditData]);

  useEffect(() => {
    if (!isEditing && !isApplyingEditData) {
      if (autoFillModel) setSelectedModel(autoFillModel);
      if (autoFillModelId) setSelectedModelId(autoFillModelId);
    }
  }, [autoFillModel, autoFillModelId, isEditing, isApplyingEditData]);

  useEffect(() => {
    if (!isEditing && !isApplyingEditData && autoFillWheelCategory) {
      setWheelCategory(autoFillWheelCategory);
    }
  }, [autoFillWheelCategory, isEditing, isApplyingEditData]);

  useEffect(() => {
    if (!isEditing && !isApplyingEditData && autoFillVehicleType) {
      setVehicleType(autoFillVehicleType);
    }
  }, [autoFillVehicleType, isEditing, isApplyingEditData]);

  // Update available brands
  useEffect(() => {
    if (vehicleData.length === 0) {
      setAvailableVehicleBrands([]);
      return;
    }

    const allBrands = vehicleData
      .map(item => item['Vehicle Brands'])
      .filter(Boolean);
    const uniqueBrands = [...new Set(allBrands)] as string[];
    setAvailableVehicleBrands(uniqueBrands);
  }, [vehicleData]);

  // Update available models
  useEffect(() => {
    if (vehicleData.length === 0) {
      setAvailableModels([]);
      return;
    }

    const allModels = vehicleData
      .map(item => ({
        name: item['Models'],
        id: item.id,
        brand: item['Vehicle Brands'],
        type: item.type
      }))
      .filter(item => item.name);

    const uniqueModels = allModels.filter((model, index, arr) =>
      arr.findIndex(m => m.name === model.name) === index
    );

    setAvailableModels(uniqueModels);
  }, [vehicleData]);

  // Auto-select category and brand when model is selected
  useEffect(() => {
    if (selectedModel && availableModels.length > 0) {
      const selectedModelData = availableModels.find(model => model.name === selectedModel);
      if (selectedModelData) {
        if (selectedModelData.type) {
          const categoryFromType = mapTypeToWheelCategory(selectedModelData.type);
          if (categoryFromType) {
            setWheelCategory(categoryFromType);
          }
        }
        if (selectedModelData.brand) {
          setSelectedVehicleBrand(selectedModelData.brand);
        }
      }
    }
  }, [selectedModel, availableModels]);

  // Calculate amount based on selected services
  useEffect(() => {
    if (wheelCategory === 'other') return;
    
    if (vehicleType && service.length > 0) {
      let total = 0;
      for (const s of service) {
        const row = priceMatrix.find(row =>
          (row.VEHICLE && row.VEHICLE.trim()) === vehicleType.trim() &&
          (row.SERVICE && row.SERVICE.trim()) === s.trim()
        );
        if (row && row.PRICE !== undefined) {
          total += Number(row.PRICE);
        }
      }
      setAmount(total.toString());
    } else {
      setAmount('');
    }
  }, [vehicleType, service, priceMatrix, wheelCategory]);

  // Reset UPI account selection when payment mode changes
  useEffect(() => {
    if (paymentMode !== 'upi') {
      setSelectedUpiAccount('');
    }
  }, [paymentMode]);

  // Update customEntryDate and useCustomDateTime when selectedDateOption changes
  useEffect(() => {
    switch (selectedDateOption) {
      case 'today':
        setCustomEntryDate(todayYMD());
        setUseCustomDateTime(false);
        break;
      case 'yesterday':
        setCustomEntryDate(yesterdayYMD());
        setUseCustomDateTime(true);
        break;
      case 'custom':
        setUseCustomDateTime(true);
        break;
      default:
        setCustomEntryDate(todayYMD());
        setUseCustomDateTime(false);
    }
  }, [selectedDateOption]);

  // Auto-assign discount for workshop based on workshop and vehicle type from workshop_prices
  useEffect(() => {
    if (entryType !== 'workshop') return;
    if (!workshop || !vehicleType) return;

    const targetWorkshop = workshop.trim().toUpperCase();
    const targetVehicle = vehicleType.trim().toUpperCase();
    const row = workshopPriceMatrix.find((r: any) => {
      const w = String((r && (r.WORKSHOP ?? r.workshop)) ?? '').trim().toUpperCase();
      const v = String((r && (r.VEHICLE ?? r.vehicle ?? r.vehicle_type)) ?? '').trim().toUpperCase();
      return w === targetWorkshop && v === targetVehicle;
    });
    const raw = row ? ((row as any).DISCOUNT ?? (row as any).discount ?? (row as any).Discount) : null;
    const d = raw != null && !isNaN(Number(raw)) ? Number(raw) : 0;
    setDiscount(String(d));
  }, [entryType, workshop, vehicleType, workshopPriceMatrix]);

  // Auto-fetch subscriptions when phone number is entered
  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!phoneNumber || !phoneNumber.trim() || !selectedLocation) {
        setUsableSubscriptions([]);
        setSelectedSubscription(null);
        setUseSubscriptionForRedemption(false);
        return;
      }

      try {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', phoneNumber.trim())
          .eq('owner_id', (user as any)?.own_id)
          .eq('location_id', selectedLocation)
          .maybeSingle();

        if (existingCustomer) {
          const subscriptions = await fetchUsableSubscriptions(existingCustomer.id);
          setUsableSubscriptions(subscriptions);
        } else {
          setUsableSubscriptions([]);
          setSelectedSubscription(null);
          setUseSubscriptionForRedemption(false);
        }
      } catch (error) {
        console.warn('Error fetching subscriptions:', error);
        setUsableSubscriptions([]);
        setSelectedSubscription(null);
        setUseSubscriptionForRedemption(false);
      }
    };

    fetchSubscriptions();
  }, [phoneNumber, selectedLocation, user]);

  // Apply edit data after all required data is loaded
  useEffect(() => {
    if (pendingEditData && priceMatrix.length > 0 && vehicleData.length > 0) {
      const logData = pendingEditData;
      console.log('Applying edit data after data loaded:', logData);

      // Set flag to prevent race conditions
      setIsApplyingEditData(true);

      // Use setTimeout to ensure all data is properly loaded
      setTimeout(() => {
        // Pre-fill form fields with edit data
        setVehicleNumber(logData.vehicleNumber || '');
        setEntryType(logData.entryType || 'customer');
        setDiscount(logData.discount || '');
        setRemarks(logData.remarks || '');
        
        // Payment mode from edit data or default to cash
        const paymentModeValue = logData.payment_mode || logData.paymentMode || 'cash';
        const validPaymentModes = ['cash', 'upi', 'credit'];
        const normalizedPaymentMode = validPaymentModes.includes(paymentModeValue) ? paymentModeValue : 'cash';
        setPaymentMode(normalizedPaymentMode);
        setSelectedUpiAccount(logData.upi_account_id || '');
        setCustomerName(logData.customerName || '');
        setPhoneNumber(logData.phoneNumber || '');
        setDateOfBirth(logData.dateOfBirth || '');
        setCustomerLocation(logData.customerLocation || '');
        setWorkshop(logData.workshop || '');

        // Handle custom entry date and time
        if (logData.entry_time) {
          const entryDateTime = new Date(logData.entry_time);
          const entryDateYMD = entryDateTime.toISOString().split('T')[0];
          setCustomEntryDate(entryDateYMD);
          setCustomEntryTime(entryDateTime.toTimeString().slice(0, 5));
          setUseCustomDateTime(true);
          
          // Determine the correct date option based on the entry date
          const todayStr = todayYMD();
          const yesterdayStr = yesterdayYMD();
          
          if (entryDateYMD === todayStr) {
            setSelectedDateOption('today');
          } else if (entryDateYMD === yesterdayStr) {
            setSelectedDateOption('yesterday');
          } else {
            setSelectedDateOption('custom');
          }
        } else {
          // If no custom entry time, use current date/time
          const now = new Date();
          setCustomEntryDate(now.toISOString().split('T')[0]);
          setCustomEntryTime(now.toTimeString().slice(0, 5));
          setUseCustomDateTime(false);
          setSelectedDateOption('today');
        }

        // If incoming edit data contains wheel_type, apply it first
        if (logData.wheel_type) {
          const derived = mapTypeToWheelCategory(logData.wheel_type);
          if (derived) setWheelCategory(derived);
        }

        // Derive wheeler from Vehicles_in_india type if possible
        try {
          const matching = vehicleData.find(item =>
            item['Vehicle Brands'] === (logData.selectedVehicleBrand || '') &&
            item['Models'] === (logData.selectedModel || '')
          );
          if (matching && (matching as any).type != null) {
            const derived = mapTypeToWheelCategory((matching as any).type);
            if (derived) setWheelCategory(derived);
          }
        } catch (e) {
          console.warn('Failed to derive wheeler from vehicle data:', e);
        }

        // Set vehicle type first, then service after it's processed
        setTimeout(() => {
          console.log('Setting vehicle type:', logData.vehicleType);
          setVehicleType(logData.vehicleType || '');

          // Set service and amount after vehicle type is processed
          setTimeout(() => {
            console.log('Setting service:', logData.service);
            console.log('Setting amount:', logData.amount);
            setService(logData.service || []);
            setAmount(logData.amount || '');
          }, 200);
        }, 100);

        // Set brand and model selections after a delay to ensure wheel category and available options are populated
        setTimeout(() => {
          setSelectedVehicleBrand(logData.selectedVehicleBrand || '');
          setSelectedModel(logData.selectedModel || '');
          setSelectedModelId(logData.selectedModelId || '');

          // Clear the flag after all data is applied
          setIsApplyingEditData(false);
        }, 300);

        // Set edit mode
        setIsEditing(true);
        setEditLogId(logData.id);

        // Clear pending edit data
        setPendingEditData(null);

        toast.success('Edit mode activated. Please review and update the entry.');
      }, 200);
    }
  }, [pendingEditData, priceMatrix.length, vehicleData.length]);

  const handleVehicleNumberChange = (value: string) => {
    setVehicleNumber(value.toUpperCase());
  };

  const handleServiceChange = (services: string[]) => {
    setService(services);
  };

  const handleSubmit = async () => {
    if (!selectedLocation) {
      toast.error('Please select a location from the toolbar');
      return;
    }

    if (!vehicleNumber || !vehicleType || (entryType === 'customer' && service.length === 0)) {
      toast.error('Please fill in all required fields (Vehicle Number, Vehicle Type, and Service)');
      return;
    }

    if (paymentMode === 'upi' && !selectedUpiAccount) {
      toast.error('Please select a UPI account when using UPI payment mode');
      return;
    }

    if (paymentMode === 'upi' && upiAccounts.length === 0) {
      toast.error('No UPI accounts found. Please add UPI accounts in the settings first.');
      return;
    }

    if (useCustomDateTime) {
      const selectedDateTime = new Date(`${customEntryDate}T${customEntryTime}`);
      const now = new Date();

      if (selectedDateTime > now) {
        toast.error('Entry date and time cannot be in the future');
        return;
      }
    }

    // If editing, skip subscription check
    if (isEditing) {
      const formData = {
        vehicleNumber,
        vehicleType,
        service,
        amount,
        discount,
        remarks,
        paymentMode,
        selectedUpiAccount,
        customerName,
        phoneNumber,
        dateOfBirth,
        customerLocation,
        selectedVehicleBrand,
        selectedModel,
        selectedModelId,
        wheelCategory,
        entryType,
        workshop,
        customEntryDate,
        customEntryTime,
        useCustomDateTime
      };

      await submitForm(formData, selectedLocation as string, isEditing, editLogId);
      return;
    }

    // Proceed with submission (subscription selection is now handled in the UI)
    await continueSubmission();
  };

  const continueSubmission = async () => {
    const formData = {
      vehicleNumber,
      vehicleType,
      service,
      amount,
      discount,
      remarks,
      paymentMode,
      selectedUpiAccount,
      customerName,
      phoneNumber,
      dateOfBirth,
      customerLocation,
      selectedVehicleBrand,
      selectedModel,
      selectedModelId,
      wheelCategory,
      entryType,
      workshop,
      customEntryDate,
      customEntryTime,
      useCustomDateTime
    };

    // Process redemption if subscription is selected
    let redemptionData = undefined;
    if (useSubscriptionForRedemption && selectedSubscription && phoneNumber) {
      try {
        // Get customer and vehicle IDs
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', phoneNumber.trim())
          .eq('owner_id', (user as any)?.own_id)
          .eq('location_id', selectedLocation)
          .maybeSingle();

        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('number_plate', vehicleNumber.toUpperCase().replace(/\s|-/g, ''))
          .maybeSingle();

        if (customer && vehicle) {
          const result = await processRedemption(
            customer.id,
            vehicle.id,
            service,
            selectedLocation as string,
            selectedSubscription.id
          );
          
          if (result.isRedemption) {
            redemptionData = result;
          }
        }
      } catch (error) {
        console.warn('Error processing redemption:', error);
      }
    }

    const success = await submitForm(formData, selectedLocation as string, isEditing, editLogId, redemptionData);
    
    // Reset form after successful submission (only for new entries, not edits)
    if (success && !isEditing) {
      resetForm();
    }
  };

  const handleCheckout = async () => {
    if (!selectedLocation) {
      toast.error('Please select a location from the toolbar');
      return;
    }

    if (!vehicleNumber || !vehicleType || (entryType === 'customer' && service.length === 0)) {
      toast.error('Please fill in all required fields (Vehicle Number, Vehicle Type, and Service)');
      return;
    }

    if (paymentMode === 'upi' && !selectedUpiAccount) {
      toast.error('Please select a UPI account when using UPI payment mode');
      return;
    }

    if (paymentMode === 'upi' && upiAccounts.length === 0) {
      toast.error('No UPI accounts found. Please add UPI accounts in the settings first.');
      return;
    }

    try {
      const { getOrCreateVehicleId } = await import('@/lib/utils');
      const vehicleId = await getOrCreateVehicleId(vehicleNumber, vehicleType);
      
      const priceNum = parseFloat(amount) || 0;
      const discountNum = discount === '' ? 0 : parseFloat(discount) || 0;
      const finalAmount = priceNum - discountNum;
      const currentTime = new Date().toISOString();

      const { error: insertError } = await supabase.from('logs-man').insert([
        {
          vehicle_id: vehicleId,
          vehicle_number: vehicleNumber,
          location_id: selectedLocation,
          entry_type: entryType,
          image_url: null,
          created_by: user?.id,
          Amount: finalAmount,
          discount: discountNum,
          remarks: remarks,
          payment_mode: paymentMode,
          upi_account_id: paymentMode === 'upi' ? selectedUpiAccount : null,
          service: service.join(','),
          vehicle_type: vehicleType,
          workshop: entryType === 'workshop' ? workshop : null,
          wheel_type: mapWheelCategoryToTypeCode(wheelCategory),
          Name: customerName.trim() || null,
          Phone_no: phoneNumber || null,
          'D.O.B': dateOfBirth || null,
          Location: customerLocation || null,
          vehicle_brand: selectedVehicleBrand || null,
          vehicle_model: selectedModel || null,
          Brand_id: selectedModelId || null,
          approval_status: 'approved',
          entry_time: currentTime,
          exit_time: currentTime,
          approved_at: currentTime,
          payment_date: currentTime,
        },
      ]);

      if (insertError) throw insertError;
      toast.success('Entry checked out successfully! Ticket is now closed.');
      resetForm();
    } catch (error) {
      console.error('Error checking out entry:', error);
      toast.error('Failed to checkout entry: ' + (error as any)?.message);
    }
  };

  const resetForm = () => {
    setVehicleNumber('');
    setVehicleType('');
    setService([]);
    setAmount('500');
    setDiscount('');
    setRemarks('');
    setPaymentMode('cash');
    setSelectedUpiAccount('');
    setCustomerName('');
    setPhoneNumber('');
    setDateOfBirth('');
    setCustomerLocation('');
    setSelectedVehicleBrand('');
    setSelectedModel('');
    setSelectedModelId('');
    setWheelCategory('4');
    setWorkshop('');
    setUseCustomDateTime(false);
    setCustomEntryDate(todayYMD());
    setCustomEntryTime(new Date().toTimeString().slice(0, 5));
    setSelectedDateOption('today');
    resetSubscriptionState();
  };

  const getAccessTypeLabel = () => {
    return accessType === 'manager' ? 'Manager Access' : 'Owner Access';
  };

  return (
    <div className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 lg:gap-4">
          {showBackButton && onBackClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackClick}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            <h1 className="text-xl lg:text-2xl font-bold">
              {isEditing ? 'Edit Entry' : 'Manual Entry'}
            </h1>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
            {isEditing ? 'Edit Mode' : getAccessTypeLabel()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Entry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Entry Type + Entry Date */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EntryTypeSelector
                entryType={entryType}
                onEntryTypeChange={setEntryType}
              />
              
              <DateSelector
                selectedDateOption={selectedDateOption}
                customEntryDate={customEntryDate}
                customEntryTime={customEntryTime}
                onDateOptionChange={setSelectedDateOption}
                onCustomDateChange={setCustomEntryDate}
                onCustomTimeChange={setCustomEntryTime}
              />
            </div>

            {/* Vehicle Number */}
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber" className="text-base font-medium">Vehicle Number</Label>
              <div className="relative">
                <Input
                  id="vehicleNumber"
                  placeholder="Enter vehicle number (KL07AB0001)"
                  className="text-center font-mono text-lg uppercase tracking-wider h-12 border-2 focus:border-primary/50 shadow-sm"
                  value={vehicleNumber}
                  onChange={(e) => handleVehicleNumberChange(e.target.value)}
                />
                {isLoadingVehicleData && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              {vehicleNumber && (
                <div className="flex items-center gap-2 text-sm bg-muted/30 px-3 py-2 rounded-md">
                  <div className={`w-2 h-2 rounded-full ${visitCount > 0 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                  <span className="text-muted-foreground font-medium">
                    {visitCount > 0 ? `Previous Visits: ${visitCount} ${visitCount === 1 ? 'time' : 'times'}` : 'New Customer'}
                  </span>
                </div>
              )}
              {/* Latest visit summary and expandable list */}
              {vehicleNumber && (
                <div className="mt-2">
                  {latestVisitSummary ? (
                    <div className="p-3 bg-background border rounded-md shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-sm text-muted-foreground">Latest visit</div>
                          <div className="text-sm font-medium text-foreground">
                            {new Date(latestVisitSummary.created_at).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Service: <span className="text-foreground font-medium">{latestVisitSummary.service || '—'}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm text-muted-foreground">Amount</div>
                          <div className="text-lg font-semibold">{typeof latestVisitSummary.Amount === 'number' ? `₹${latestVisitSummary.Amount}` : (latestVisitSummary.Amount ? `₹${latestVisitSummary.Amount}` : '—')}</div>
                          {latestVisitSummary.payment_mode === 'subscription' && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Subscription
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">No recent visit details available</div>
                  )}

                  {/* Expand button and list */}
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setVisitsExpanded(v => !v)}
                      className="text-sm text-primary underline"
                    >
                      {visitsExpanded ? 'Hide recent visits' : `View latest ${latestVisits.length > 0 ? Math.min(5, latestVisits.length) : 5} visits`}
                    </button>

                    {visitsExpanded && latestVisits.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {latestVisits.map((v) => (
                          <div key={v.id} className="p-2 bg-muted/10 border rounded-md flex items-center justify-between">
                            <div className="text-sm">
                              <div className="font-medium text-foreground">{new Date(v.created_at).toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">{v.service || 'Service not recorded'}</div>
                              {v.Location && <div className="text-xs text-muted-foreground">Location: {v.Location}</div>}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">{typeof v.Amount === 'number' ? `₹${v.Amount}` : (v.Amount ? `₹${v.Amount}` : '—')}</div>
                              <div className="text-xs text-muted-foreground">{v.payment_mode ? v.payment_mode : ''}</div>
                              {v.payment_mode === 'subscription' && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  Subscription
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle Details */}
            <VehicleDetails
              selectedVehicleBrand={selectedVehicleBrand}
              selectedModel={selectedModel}
              selectedModelId={selectedModelId}
              availableVehicleBrands={availableVehicleBrands}
              availableModels={availableModels}
              onBrandChange={setSelectedVehicleBrand}
              onModelChange={(model, modelId) => {
                setSelectedModel(model);
                setSelectedModelId(modelId);
              }}
            />


            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="wheelCategory">Category</Label>
              <Select value={wheelCategory} onValueChange={setWheelCategory}>
                <SelectTrigger id="wheelCategory">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Wheeler</SelectItem>
                  <SelectItem value="4">4 Wheeler</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Service Selection */}
            <ServiceSelection
              entryType={entryType}
              vehicleType={vehicleType}
              service={service}
              wheelCategory={wheelCategory}
              vehicleTypes={vehicleTypes}
              priceMatrix={priceMatrix}
              onVehicleTypeChange={setVehicleType}
              onServiceChange={handleServiceChange}
            />

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
                {/* Show textbox when "OTHER WORKSHOPS" is selected */}
                {workshop === "OTHER WORKSHOPS" && (
                  <div className="space-y-2">
                    <Label htmlFor="customWorkshop">Enter Workshop Name</Label>
                    <Input
                      type="text"
                      id="customWorkshop"
                      className="w-full"
                      placeholder="Type workshop name"
                      value={customWorkshopName}
                      onChange={(e) => setCustomWorkshopName(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select
                    value={vehicleType}
                    onValueChange={setVehicleType}
                    disabled={!wheelCategory && workshop !== "OTHER WORKSHOPS"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        (!wheelCategory && workshop !== "OTHER WORKSHOPS")
                          ? "Select category first"
                          : "Select vehicle type"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {sortVehicleTypesWithPriority(vehicleTypes).map(type => (
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
                    readOnly={wheelCategory !== 'other'}
                    placeholder={wheelCategory === 'other' ? 'Enter amount' : ''}
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

              {/* Customer Details */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <Label className="text-base font-semibold">Customer Details</Label>
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name (Optional)</Label>
                  <Input
                    id="customerName"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => {
                      const formattedName = e.target.value
                        .replace(/\s+/g, ' ')
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                      setCustomerName(formattedName);
                    }}
                  />
                </div>
                <div>
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

              {/* Subscription Selection Section */}
              {phoneNumber && phoneNumber.trim() && usableSubscriptions.length > 0 && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <Label className="text-base font-semibold text-blue-700 dark:text-blue-300">Available Subscription Packages</Label>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    This customer has active subscription packages. Choose one to use for this visit:
                  </p>
                  
                  <div className="space-y-3">
                    {usableSubscriptions.map((subscription) => {
                      const plan = subscription.subscription_plans;
                      const isSelected = selectedSubscription?.id === subscription.id;
                      return (
                        <div
                          key={subscription.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              // Deselect if already selected
                              setSelectedSubscription(null);
                              setUseSubscriptionForRedemption(false);
                            } else {
                              // Select this subscription
                              setSelectedSubscription(subscription);
                              setUseSubscriptionForRedemption(true);
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{plan.name}</h4>
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {subscription.remaining_visits} visits remaining
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                Original: {plan.max_redemptions} visits • ₹{plan.price}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                {subscription.remaining_visits} left
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSubscription(null);
                        setUseSubscriptionForRedemption(false);
                      }}
                      className="text-xs"
                    >
                      Use Normal Payment
                    </Button>
                  </div>
                </div>
              )}

              {/* Selected Subscription Indicator */}
              {selectedSubscription && useSubscriptionForRedemption && (
                <div className="space-y-2 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <Label className="text-sm font-medium text-green-700 dark:text-green-300">Using Subscription Package</Label>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    <strong>{selectedSubscription.subscription_plans.name}</strong> - {selectedSubscription.remaining_visits} visits remaining
                  </div>
                  <div className="text-xs text-green-500 dark:text-green-400">
                    This visit will be processed as a package redemption (no payment required)
                  </div>
                </div>
              )}

              {/* Payment Mode Selection */}
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                {selectedSubscription && useSubscriptionForRedemption ? (
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled
                    >
                      <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Subscription</span>
                    </Button>
                    <div className="flex-1"></div>
                    <div className="flex-1"></div>
                  </div>
                ) : (
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
                    <Button
                      variant={paymentMode === 'credit' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setPaymentMode('credit')}
                    >
                      <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Pay Later</span>
                    </Button>
                  </div>
                )}
                {!selectedSubscription || !useSubscriptionForRedemption ? (
                  <>
                    {paymentMode === 'upi' && (
                      <p className="text-xs text-muted-foreground">
                        Select a UPI account below to display the QR code for payment
                      </p>
                    )}
                    {paymentMode === 'credit' && (
                      <p className="text-xs text-muted-foreground">
                        Customer will pay later. Ticket will be marked as pending payment.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    This visit will be processed using the selected subscription package (no payment required)
                  </p>
                )}
              </div>

              {/* UPI Account Selection */}
              {paymentMode === 'upi' && (!selectedSubscription || !useSubscriptionForRedemption) && (
                <div className="space-y-2">
                  <Label>Select UPI Account</Label>
                  {upiAccountsLoading ? (
                    <div className="text-sm text-muted-foreground">Loading UPI accounts...</div>
                  ) : upiAccounts.length === 0 ? (
                    <div className="p-3 border rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground text-center">
                        No UPI accounts found. Please add UPI accounts in the settings first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/10">
                      <RadioGroup value={selectedUpiAccount} onValueChange={setSelectedUpiAccount}>
                        {upiAccounts.map((account) => (
                          <div key={account.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/40">
                            <RadioGroupItem value={account.id} id={`upi-${account.id}`} />
                            <label htmlFor={`upi-${account.id}`} className="flex-1 cursor-pointer">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{account.account_name}</span>
                                <span className="text-xs text-muted-foreground">{account.upi_id} {account.location_name ? `• ${account.location_name}` : ''}</span>
                              </div>
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  {/* QR Code Display */}
                  {selectedUpiAccount && (
                    <div className="mt-4 space-y-2">
                      <Label>QR Code</Label>
                      {(() => {
                        const selectedAccount = upiAccounts.find(acc => acc.id === selectedUpiAccount);
                        if (selectedAccount?.qr_code_url) {
                          return (
                            <div className="flex justify-center p-2">
                              <img
                                src={selectedAccount.qr_code_url}
                                alt={`QR Code for ${selectedAccount.account_name}`}
                                className="w-32 h-32 object-contain border rounded-lg shadow-sm"
                              />
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg bg-muted/20">
                              No QR code available for this account
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              )}

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
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          variant="default"
          size="lg"
          className="px-8"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {isEditing ? 'Update Entry' : 'Submit Entry'}
        </Button>

        {/* Checkout Button - only show when not using custom date and not editing */}
        {!useCustomDateTime && !isEditing && (
          <Button
            variant="outline"
            size="lg"
            className="px-8"
            onClick={handleCheckout}
            disabled={isSubmitDisabled}
          >
            Checkout
          </Button>
        )}
      </div>

    </div>
  );
}
