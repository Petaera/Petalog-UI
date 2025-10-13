import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { generateUUID, mapWheelCategoryToTypeCode } from '@/utils/vehicleUtils';
import { toast } from 'sonner';

interface FormData {
  vehicleNumber: string;
  vehicleType: string;
  service: string[];
  amount: string;
  discount: string;
  remarks: string;
  paymentMode: string;
  selectedUpiAccount: string;
  customerName: string;
  phoneNumber: string;
  dateOfBirth: string;
  customerLocation: string;
  selectedVehicleBrand: string;
  selectedModel: string;
  selectedModelId: string;
  wheelCategory: string;
  entryType: string;
  workshop: string;
  customEntryDate: string;
  customEntryTime: string;
  useCustomDateTime: boolean;
}

interface RedemptionData {
  isRedemption: boolean;
  subscriptionName?: string;
  remainingVisits?: number;
}

export const useFormSubmission = () => {
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const { user } = useAuth();

  const findOrCreateCustomer = async (formData: FormData, selectedLocation: string) => {
    const ownerId = (user as any)?.own_id || null;
    
    // Try to find by phone first
    if (formData.phoneNumber !== '') {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, date_of_birth, location_id')
        .eq('phone', formData.phoneNumber)
        .eq('owner_id', ownerId)
        .eq('location_id', selectedLocation);
      
      if (data && data[0]) {
        const existing = data[0];
        const updates: any = {};
        if (formData.customerName && formData.customerName !== existing.name) updates.name = formData.customerName;
        if (formData.phoneNumber && formData.phoneNumber !== existing.phone) updates.phone = formData.phoneNumber;
        if (formData.dateOfBirth && formData.dateOfBirth !== existing.date_of_birth) updates.date_of_birth = formData.dateOfBirth;
        if (selectedLocation && selectedLocation !== existing.location_id) updates.location_id = selectedLocation;
        
        if (Object.keys(updates).length > 0) {
          await supabase.from('customers').update(updates).eq('id', existing.id);
        }
        return existing.id as string;
      }
    }

    // Try to find by name
    if (formData.customerName && formData.customerName.trim() !== '') {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, date_of_birth, location_id')
        .eq('name', formData.customerName)
        .eq('owner_id', ownerId)
        .eq('location_id', selectedLocation);
      
      if (data && data[0]) {
        const existing = data[0];
        const updates: any = {};
        if (formData.customerName && formData.customerName !== existing.name) updates.name = formData.customerName;
        if (formData.phoneNumber && formData.phoneNumber !== existing.phone) updates.phone = formData.phoneNumber;
        if (formData.dateOfBirth && formData.dateOfBirth !== existing.date_of_birth) updates.date_of_birth = formData.dateOfBirth;
        if (selectedLocation && selectedLocation !== existing.location_id) updates.location_id = selectedLocation;
        
        if (Object.keys(updates).length > 0) {
          await supabase.from('customers').update(updates).eq('id', existing.id);
        }
        return existing.id as string;
      }
    }

    // Create new customer
    const insertPayload: any = {
      name: formData.customerName || null,
      phone: formData.phoneNumber || null,
      date_of_birth: formData.dateOfBirth || null,
      location_id: selectedLocation,
      owner_id: ownerId,
      vehicles: [],
      default_vehicle_id: null,
    };

    const { data: created, error: custErr } = await supabase
      .from('customers')
      .insert([insertPayload])
      .select('id')
      .single();
    
    if (custErr) throw custErr;
    return created!.id as string;
  };

  const findOrCreateVehicle = async (customerId: string, formData: FormData, selectedLocation: string) => {
    const normalizePlate = (plate: string) => plate.toUpperCase().replace(/\s|-/g, '');
    const plate = normalizePlate(formData.vehicleNumber);

    const { data: existing } = await supabase
      .from('vehicles')
      .select('id, Brand, model, location_id')
      .eq('number_plate', plate)
      .maybeSingle();

    if (existing && existing.id) {
      const updates: any = { owner_id: customerId };
      if (formData.selectedVehicleBrand && formData.selectedVehicleBrand !== (existing as any).Brand) {
        updates.Brand = formData.selectedVehicleBrand;
      }
      if (formData.selectedModelId && formData.selectedModelId !== (existing as any).model) {
        updates.model = formData.selectedModelId;
      }
      const locs: string[] = Array.isArray((existing as any).location_id) ? (existing as any).location_id : [];
      if (selectedLocation && !locs.includes(selectedLocation)) {
        updates.location_id = [...locs, selectedLocation];
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('vehicles').update(updates).eq('id', existing.id);
      }
      return existing.id as string;
    }

    // Create new vehicle
    const insertVeh: any = {
      id: generateUUID(),
      number_plate: plate,
      type: formData.vehicleType || null,
      owner_id: customerId,
      Brand: formData.selectedVehicleBrand || null,
      model: formData.selectedModelId || null,
      location_id: selectedLocation ? [selectedLocation] : [],
    };

    const { data: newVeh, error: vehErr } = await supabase
      .from('vehicles')
      .insert([insertVeh])
      .select('id')
      .single();
    
    if (vehErr) throw vehErr;
    return newVeh!.id as string;
  };

  const updateCustomerVehicles = async (customerId: string, vehicleId: string) => {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('vehicles, default_vehicle_id')
      .eq('id', customerId)
      .single();
    
    if (customerError) {
      console.warn('Error fetching customer data:', customerError);
      return;
    }
    
    const currentVehicles = customer.vehicles || [];
    const updatedVehicles = currentVehicles.includes(vehicleId) 
      ? currentVehicles 
      : [...currentVehicles, vehicleId];
    
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        vehicles: updatedVehicles,
        default_vehicle_id: vehicleId
      })
      .eq('id', customerId);
    
    if (updateError) {
      console.warn('Error updating customer vehicles:', updateError);
    }
  };

  const submitForm = async (
    formData: FormData, 
    selectedLocation: string, 
    isEditing: boolean, 
    editLogId: string | null,
    redemptionData?: RedemptionData
  ): Promise<boolean> => {
    setIsSubmitDisabled(true);

    try {
      const customerId = await findOrCreateCustomer(formData, selectedLocation);
      const vehicleId = await findOrCreateVehicle(customerId, formData, selectedLocation);
      
      await updateCustomerVehicles(customerId, vehicleId);

      // Calculate final amount
      const priceNum = parseFloat(formData.amount) || 0;
      const discountNum = formData.discount === '' ? 0 : parseFloat(formData.discount) || 0;
      const finalAmount = priceNum - discountNum;

      // Prepare entry time data
      const entryTimeData = formData.useCustomDateTime
        ? { entry_time: new Date(`${formData.customEntryDate}T${formData.customEntryTime}:00`).toISOString() }
        : {};

      // Prepare created_at data
      const createdAtData = formData.useCustomDateTime
        ? { created_at: new Date(`${formData.customEntryDate}T${formData.customEntryTime}:00`).toISOString() }
        : { created_at: new Date().toISOString() };

      // Prepare exit time and approval data for custom date tickets
      const exitTimeData = formData.useCustomDateTime
        ? {
            exit_time: new Date(`${formData.customEntryDate}T${formData.customEntryTime}:00`).toISOString(),
            approved_at: new Date(`${formData.customEntryDate}T${formData.customEntryTime}:00`).toISOString()
          }
        : {};

      const approvalStatus = formData.useCustomDateTime ? 'approved' : 'pending';

      if (isEditing && editLogId) {
        // Update existing log
        const { error: updateError } = await supabase
          .from('logs-man')
          .update({
            vehicle_id: vehicleId,
            customer_id: customerId,
            vehicle_number: formData.vehicleNumber,
            location_id: selectedLocation,
            entry_type: formData.entryType,
            Amount: finalAmount,
            discount: discountNum,
            remarks: formData.remarks,
            payment_mode: formData.paymentMode,
            upi_account_id: formData.paymentMode === 'upi' ? formData.selectedUpiAccount : null,
            service: formData.service.join(','),
            vehicle_type: formData.vehicleType,
            workshop: formData.entryType === 'workshop' ? formData.workshop : null,
            wheel_type: mapWheelCategoryToTypeCode(formData.wheelCategory),
            Name: formData.customerName.trim() || null,
            Phone_no: formData.phoneNumber || null,
            'D.O.B': formData.dateOfBirth || null,
            Location: formData.customerLocation || null,
            vehicle_brand: formData.selectedVehicleBrand || null,
            vehicle_model: formData.selectedModel || null,
            Brand_id: formData.selectedModelId || null,
            updated_at: new Date().toISOString(),
            own_id: (user as any)?.own_id || null,
            ...entryTimeData,
            ...createdAtData,
            ...exitTimeData,
          })
          .eq('id', editLogId);

        if (updateError) throw updateError;
        toast.success('Entry updated successfully!');
        return true;
      } else {
        // Insert new log
        const logData: any = {
          vehicle_id: vehicleId,
          customer_id: customerId,
          vehicle_number: formData.vehicleNumber,
          location_id: selectedLocation,
          entry_type: formData.entryType,
          created_by: user?.id,
          Amount: redemptionData?.isRedemption ? 0 : finalAmount,
          discount: redemptionData?.isRedemption ? 0 : discountNum,
          remarks: redemptionData?.isRedemption 
            ? `Package redemption from ${redemptionData.subscriptionName} (${redemptionData.remainingVisits} visits remaining)`
            : formData.remarks,
          payment_mode: redemptionData?.isRedemption ? 'subscription' : formData.paymentMode,
          upi_account_id: formData.paymentMode === 'upi' ? formData.selectedUpiAccount : null,
          service: formData.service.join(','),
          vehicle_type: formData.vehicleType,
          workshop: formData.entryType === 'workshop' ? formData.workshop : null,
          wheel_type: mapWheelCategoryToTypeCode(formData.wheelCategory),
          Name: formData.customerName.trim() || null,
          Phone_no: formData.phoneNumber || null,
          'D.O.B': formData.dateOfBirth || null,
          Location: formData.customerLocation || null,
          vehicle_brand: formData.selectedVehicleBrand || null,
          vehicle_model: formData.selectedModel || null,
          Brand_id: formData.selectedModelId || null,
          own_id: (user as any)?.own_id || null,
          ...createdAtData,
          ...entryTimeData,
          approval_status: approvalStatus,
          ...exitTimeData,
        };

        const { error: insertError } = await supabase.from('logs-man').insert([logData]);
        if (insertError) throw insertError;

        let statusMessage = formData.useCustomDateTime
          ? 'Owner entry submitted successfully! Ticket is now closed.'
          : 'Owner entry submitted successfully!';
        
        if (redemptionData?.isRedemption) {
          statusMessage += ` Package redemption processed from ${redemptionData.subscriptionName} (${redemptionData.remainingVisits} visits remaining).`;
        }
        
        toast.success(statusMessage);
        return true;
      }

    } catch (error: any) {
      console.error('Error processing form submission:', error);
      toast.error('Failed to submit entry: ' + error.message);
      return false;
    } finally {
      setIsSubmitDisabled(false);
    }
  };

  return {
    isSubmitDisabled,
    submitForm
  };
};
