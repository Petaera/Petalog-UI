import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Users, Plus, Trash2, X, UserPlus, CreditCard, Upload, QrCode, Save, Loader2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const managers = [
  { id: 1, name: "Raj Patel", email: "raj@carwash.com", location: "Main Branch", status: "Active", lastLogin: "2 hours ago" },
  { id: 2, name: "Priya Sharma", email: "priya@carwash.com", location: "North Branch", status: "Active", lastLogin: "1 day ago" },
  { id: 3, name: "Amit Kumar", email: "amit@carwash.com", location: "West Side Center", status: "Inactive", lastLogin: "3 days ago" },
];

export default function ManagerAccess() {
  const { signup, user } = useAuth();
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  
  // Payment details state
  const [paymentDetails, setPaymentDetails] = useState({
    payment_method: '',
    account_name: '',
    account_number: '',
    ifsc_code: '',
    bank_name: '',
    upi_id: '',
    additional_notes: '',
    location_id: '' // Add location_id field
  });
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState(false);

    const [allPaymentDetails, setAllPaymentDetails] = useState<any[]>([]);
  const [editingPaymentDetail, setEditingPaymentDetail] = useState<any>(null);
   
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    assignedLocation: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        let allLocations: { id: string; name: string }[] = [];
        
        // First, get locations from the old own_id system
        if (user?.role === 'owner' && user?.own_id) {
          console.log('👑 Owner fetching locations by own_id:', user.own_id);
          const { data: ownIdData, error: ownIdError } = await supabase
            .from('locations')
            .select('id, name')
            .eq('own_id', user.own_id);
          
          if (!ownIdError && ownIdData) {
            allLocations.push(...ownIdData);
            console.log('✅ Found locations from own_id system:', ownIdData.length);
          }
        } else if (user?.role === 'manager' && user?.assigned_location) {
          console.log('👨‍💼 Manager fetching assigned location:', user.assigned_location);
          const { data: assignedData, error: assignedError } = await supabase
            .from('locations')
            .select('id, name')
            .eq('id', user.assigned_location);
          
          if (!assignedError && assignedData) {
            allLocations.push(...assignedData);
            console.log('✅ Found assigned location:', assignedData.length);
          }
        }
        
        // Then, get locations from the partnership system
        try {
          const { data: partnershipData, error: partnershipError } = await supabase
            .from('location_owners')
            .select('location_id')
            .eq('owner_id', user?.id);
          
          if (!partnershipError && partnershipData && partnershipData.length > 0) {
            const locationIds = partnershipData.map(lo => lo.location_id);
            console.log('🔄 Found location IDs from partnership system:', locationIds);
            
            // Get the actual location data for partnerships
            const { data: partnershipLocData, error: partnershipLocError } = await supabase
              .from('locations')
              .select('id, name')
              .in('id', locationIds);
            
            if (!partnershipLocError && partnershipLocData) {
              // Add partnership locations, avoiding duplicates
              for (const partnershipLoc of partnershipLocData) {
                if (!allLocations.find(loc => loc.id === partnershipLoc.id)) {
                  allLocations.push(partnershipLoc);
                }
              }
              console.log('✅ Added partnership locations:', partnershipLocData.length);
            }
          }
        } catch (partnershipError) {
          console.log('🔄 Partnership system not accessible, skipping:', partnershipError);
        }
        
        // Remove duplicates and set locations
        const uniqueLocations = allLocations.filter((location, index, self) => 
          index === self.findIndex(loc => loc.id === location.id)
        );
        
        if (uniqueLocations.length > 0) {
          console.log('✅ Total unique locations found:', uniqueLocations.length);
          setLocations(uniqueLocations);
        } else {
          console.log('ℹ️ No locations found for current user');
          setLocations([]);
        }
      } catch (error) {
        console.error('💥 Error in fetchLocations:', error);
        toast.error('Failed to fetch locations');
      }
    };
    
    fetchLocations();
  }, [user]);

    // Fetch all payment details for owners when component loads
  useEffect(() => {
    if (user?.role === 'owner') {
      refreshAllPaymentDetails();
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePaymentInputChange = (field: string, value: string) => {
    setPaymentDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQrCodeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setQrCodeFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setQrCodePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadQrCode = async (): Promise<string | null> => {
    if (!qrCodeFile) return null;

    try {
      const fileExt = qrCodeFile.name.split('.').pop();
      const fileName = `${user?.id}-qr-${Date.now()}.${fileExt}`;
      const filePath = `qr-codes/${fileName}`; // Use a subfolder for organization

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, qrCodeFile);

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading QR code:', error);
      toast.error('Failed to upload QR code');
      return null;
    }
  };

  const refreshAllPaymentDetails = async () => {
    if (user?.role === 'owner' && user?.id) {
      try {
        console.log('🔄 Refreshing owner payment details...');
        
        let allPaymentDetails: any[] = [];
        
        // First, get payment details from locations owned via own_id
        if (user?.own_id) {
          const { data: ownIdData, error: ownIdError } = await supabase
            .from('owner_payment_details')
            .select(`
              *,
              locations:location_id (
                id,
                name
              )
            `)
            .eq('owner_id', user.id);

          if (!ownIdError && ownIdData) {
            allPaymentDetails.push(...ownIdData);
            console.log('✅ Found payment details from own_id locations:', ownIdData.length);
          }
        }
        
        // Then, get payment details from partnership locations
        try {
          const { data: partnershipData, error: partnershipError } = await supabase
            .from('location_owners')
            .select('location_id')
            .eq('owner_id', user.id);
          
          if (!partnershipError && partnershipData && partnershipData.length > 0) {
            const locationIds = partnershipData.map(lo => lo.location_id);
            console.log('🔄 Fetching payment details from partnership locations:', locationIds);
            
            // Get payment details for partnership locations
            const { data: partnershipPaymentData, error: partnershipPaymentError } = await supabase
              .from('owner_payment_details')
              .select(`
                *,
                locations:location_id (
                  id,
                  name
                )
              `)
              .in('location_id', locationIds);

            if (!partnershipPaymentError && partnershipPaymentData) {
              // Add partnership payment details, avoiding duplicates
              for (const partnershipPayment of partnershipPaymentData) {
                if (!allPaymentDetails.find(payment => payment.id === partnershipPayment.id)) {
                  allPaymentDetails.push(partnershipPayment);
                }
              }
              console.log('✅ Added payment details from partnership locations:', partnershipPaymentData.length);
            }
          }
        } catch (partnershipError) {
          console.log('🔄 Partnership system not accessible for payment details, skipping:', partnershipError);
        }
        
        // Remove duplicates and set payment details
        const uniquePaymentDetails = allPaymentDetails.filter((payment, index, self) => 
          index === self.findIndex(p => p.id === payment.id)
        );
        
        console.log('✅ Total unique payment details found:', uniquePaymentDetails.length);
        setAllPaymentDetails(uniquePaymentDetails);
        
      } catch (error) {
        console.error('💥 Error refreshing owner payment details:', error);
        toast.error('Failed to refresh payment details');
      }
    }
  };





  const handleEditPaymentDetail = (detail: any) => {
    setEditingPaymentDetail(detail);
    setPaymentDetails({
      payment_method: detail.payment_method || '',
      account_name: detail.account_name || '',
      account_number: detail.account_number || '',
      ifsc_code: detail.ifsc_code || '',
      bank_name: detail.bank_name || '',
      upi_id: detail.upi_id || '',
      additional_notes: detail.additional_notes || '',
      location_id: detail.location_id || '' // Set location_id for editing
    });
    setQrCodePreview(detail.qr_code_url || '');
    setQrCodeFile(null);
  };

  const handleCancelEdit = () => {
    setEditingPaymentDetail(null);
    setPaymentDetails({
      payment_method: '',
      account_name: '',
      account_number: '',
      ifsc_code: '',
      bank_name: '',
      upi_id: '',
      additional_notes: '',
      location_id: '' // Reset location_id
    });
    setQrCodePreview('');
    setQrCodeFile(null);
  };

  const handleDeletePaymentDetail = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment detail?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('owner_payment_details')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Payment detail deleted successfully!');
      
             // Refresh the payment details list
       refreshAllPaymentDetails();
    } catch (error: any) {
      console.error('Error deleting payment detail:', error);
      toast.error(error.message || 'Failed to delete payment detail');
    }
  };

  const handleSavePaymentDetails = async () => {
    if (!user?.id || (user?.role !== 'owner' && user?.role !== 'manager')) {
      toast.error('Only owners and managers can save payment details');
      return;
    }

    if (!paymentDetails.payment_method) {
      toast.error('Please select a payment method');
      return;
    }

    // For UPI payments, location is required
    if (paymentDetails.payment_method === 'upi' && !paymentDetails.location_id) {
      toast.error('Please select a location for UPI payment method');
      return;
    }

    setSavingPayment(true);

    try {
      let qrCodeUrl = null;
      if (qrCodeFile) {
        qrCodeUrl = await uploadQrCode();
        if (!qrCodeUrl) {
          setSavingPayment(false);
          return;
        }
      }

      // For owners: always create new payment details (multiple allowed)
      // For managers: they can only view the owner's payment details, not create their own
      const paymentData = {
        owner_id: user.role === 'owner' ? user.id : user.own_id, // Always use the owner's ID
        user_role: 'owner', // Always set as owner since managers can't create payment details
        payment_method: paymentDetails.payment_method,
        account_name: paymentDetails.account_name || null,
        account_number: paymentDetails.account_number || null,
        ifsc_code: paymentDetails.ifsc_code || null,
        bank_name: paymentDetails.bank_name || null,
        upi_id: paymentDetails.upi_id || null,
        qr_code_url: qrCodeUrl || null,
        additional_notes: paymentDetails.additional_notes || null,
        is_active: true,
        location_id: paymentDetails.location_id || null // Add location_id to payment data
      };

             let data, error;
       
       if (editingPaymentDetail) {
         // Update existing record
         const { data: updateData, error: updateError } = await supabase
           .from('owner_payment_details')
           .update(paymentData)
           .eq('id', editingPaymentDetail.id)
           .select();
         data = updateData;
         error = updateError;
       } else {
         // Insert new record
         const { data: insertData, error: insertError } = await supabase
           .from('owner_payment_details')
           .insert(paymentData)
           .select();
         data = insertData;
         error = insertError;
       }

             if (error) throw error;
       
       if (editingPaymentDetail) {
         console.log('✅ Updated payment details:', data);
         toast.success('Payment details updated successfully!');
       } else {
         console.log('✅ Created new payment details:', data);
         toast.success('Payment details added successfully!');
       }
       
       // Clear the form and editing state
       setEditingPaymentDetail(null);
       setPaymentDetails({
         payment_method: '',
         account_name: '',
         account_number: '',
         ifsc_code: '',
         bank_name: '',
         upi_id: '',
         additional_notes: '',
         location_id: '' // Clear location_id
       });
       setQrCodePreview('');
       setQrCodeFile(null);
       
       // Refresh the payment details list
       refreshAllPaymentDetails();
      
    } catch (error: any) {
      console.error('Error saving payment details:', error);
      toast.error(error.message || 'Failed to save payment details');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.phone || !formData.assignedLocation || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      
      // Use the AuthContext signup function to create the manager account
      await signup(
        formData.email, 
        formData.password, 
        'manager', 
        formData.assignedLocation,
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
        },
        false // Don't auto-login the created manager
      );

      toast.success('Manager account created successfully!');
      setShowSignupDialog(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        assignedLocation: '',
        password: '',
        confirmPassword: '',
      });
      
    } catch (error: any) {
      console.error('Error creating manager:', error);
      
      // Handle specific error messages
      if (error.message) {
        if (error.message.includes('Invalid email format')) {
          toast.error('Please enter a valid email address');
        } else if (error.message.includes('Password must be at least 6 characters')) {
          toast.error('Password must be at least 6 characters long');
        } else if (error.message.includes('User already registered')) {
          toast.error('An account with this email already exists');
        } else {
          toast.error(error.message || 'Failed to create manager account. Please try again.');
        }
      } else {
        toast.error('Failed to create manager account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Manager Access Settings</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showSignupDialog} onOpenChange={setShowSignupDialog}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Manager
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Manager Account</DialogTitle>
                <DialogDescription>
                  Create a new manager account with access to assigned location.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateManager} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="First name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="manager@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignedLocation">Assigned Location</Label>
                  <Select 
                    value={formData.assignedLocation} 
                    onValueChange={(value) => handleInputChange('assignedLocation', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Create password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm password"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowSignupDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={loading}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : 'Create Manager'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

             {/* Payment Details Section - Visible to owners and managers */}
       {(user?.role === 'owner' || user?.role === 'manager') && (
         <div id="payment-details-form">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {editingPaymentDetail 
                  ? `Edit Payment Details - ${editingPaymentDetail.payment_method?.replace('_', ' ')}`
                  : (user?.role === 'owner' ? 'Add New Payment Details (Location-Specific for UPI, Including Partnerships)' : 'View Owner Payment Details')
                }
              </div>
              <div className="flex gap-2">
                
                
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select 
                    value={paymentDetails.payment_method} 
                    onValueChange={(value) => handlePaymentInputChange('payment_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_name">Account Name</Label>
                  <Input
                    id="account_name"
                    value={paymentDetails.account_name}
                    onChange={(e) => handlePaymentInputChange('account_name', e.target.value)}
                    placeholder="Account holder name"
                  />
                </div>
              </div>

              {/* Bank Transfer Fields */}
              {paymentDetails.payment_method === 'bank_transfer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input
                      id="account_number"
                      value={paymentDetails.account_number}
                      onChange={(e) => handlePaymentInputChange('account_number', e.target.value)}
                      placeholder="Account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code">IFSC Code</Label>
                    <Input
                      id="ifsc_code"
                      value={paymentDetails.ifsc_code}
                      onChange={(e) => handlePaymentInputChange('ifsc_code', e.target.value)}
                      placeholder="IFSC code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={paymentDetails.bank_name}
                      onChange={(e) => handlePaymentInputChange('bank_name', e.target.value)}
                      placeholder="Bank name"
                    />
                  </div>
                </div>
              )}

              {/* UPI Fields */}
              {paymentDetails.payment_method === 'upi' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="upi_id">UPI ID</Label>
                    <Input
                      id="upi_id"
                      value={paymentDetails.upi_id}
                      onChange={(e) => handlePaymentInputChange('upi_id', e.target.value)}
                      placeholder="example@upi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_id">Assigned Location</Label>
                    <Select 
                      value={paymentDetails.location_id} 
                      onValueChange={(value) => handlePaymentInputChange('location_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* QR Code Upload */}
              <div className="space-y-4">
                <Label>QR Code (Optional)</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleQrCodeUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload QR code image (PNG, JPG, max 5MB)
                    </p>
                  </div>
                  {qrCodePreview && (
                    <div className="relative">
                      <img 
                        src={qrCodePreview} 
                        alt="QR Code Preview" 
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0"
                        onClick={() => {
                          setQrCodeFile(null);
                          setQrCodePreview('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="additional_notes">Additional Notes</Label>
                <Textarea
                  id="additional_notes"
                  value={paymentDetails.additional_notes}
                  onChange={(e) => handlePaymentInputChange('additional_notes', e.target.value)}
                  placeholder="Any additional payment information..."
                  rows={3}
                />
              </div>

              

                             {/* Save/Cancel Buttons */}
               <div className="flex justify-end gap-2">
                 {editingPaymentDetail && (
                   <Button 
                     type="button"
                     variant="outline"
                     onClick={handleCancelEdit}
                     disabled={savingPayment}
                   >
                     Cancel Edit
                   </Button>
                 )}
                 <Button 
                   onClick={handleSavePaymentDetails}
                   disabled={savingPayment || !paymentDetails.payment_method}
                   className="min-w-[120px]"
                 >
                   {savingPayment ? (
                     <>
                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                       Saving...
                     </>
                   ) : (
                     <>
                       <Save className="h-4 w-4 mr-2" />
                       {editingPaymentDetail ? 'Update Details' : 'Add New Details'}
                     </>
                   )}
                 </Button>
               </div>
            </div>
                     </CardContent>
         </Card>
         </div>
       )}

      {/* All Payment Details Section - Only visible to owners */}
      {user?.role === 'owner' && (
        <Card>
          <CardHeader>
                         <CardTitle className="flex items-center gap-2">
               <CreditCard className="h-5 w-5" />
               Owner Payment Details (Location-Specific UPI Accounts)
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               <p className="text-sm text-muted-foreground">
                 You can add multiple payment methods. UPI accounts are now location-specific - each UPI account will be assigned to a specific location. Bank transfer and other payment methods remain shared across all locations. The location dropdown includes both your owned locations and partnership locations. Managers at your locations can view these details.
               </p>
              
              {/* Payment Details Table */}
              <div className="space-y-4">
                                 <div className="flex justify-between items-center">
                   <h4 className="font-medium">All Your Payment Methods ({allPaymentDetails.length})</h4>
                  
                </div>
                
                {allPaymentDetails.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Account Details</TableHead>
                        <TableHead>QR Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPaymentDetails.map((detail) => (
                        <TableRow key={detail.id}>
                          <TableCell className="font-medium">
                            {detail.account_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={detail.user_role === 'owner' ? 'default' : 'secondary'}>
                              {detail.user_role}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {detail.payment_method?.replace('_', ' ')}
                          </TableCell>
                          <TableCell>
                            {detail.locations?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {detail.payment_method === 'bank_transfer' && (
                              <div className="text-sm">
                                <p>Acc: {detail.account_number || 'N/A'}</p>
                                <p>Bank: {detail.bank_name || 'N/A'}</p>
                                <p>IFSC: {detail.ifsc_code || 'N/A'}</p>
                              </div>
                            )}
                            {detail.payment_method === 'upi' && (
                              <div className="text-sm">
                                <p>UPI ID: {detail.upi_id || 'N/A'}</p>
                              </div>
                            )}
                            {detail.payment_method === 'cash' && (
                              <div className="text-sm text-muted-foreground">
                                Cash payment
                              </div>
                            )}
                            {detail.payment_method === 'check' && (
                              <div className="text-sm text-muted-foreground">
                                Check payment
                              </div>
                            )}
                            {detail.payment_method === 'other' && (
                              <div className="text-sm text-muted-foreground">
                                Other method
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {detail.qr_code_url ? (
                              <img 
                                src={detail.qr_code_url} 
                                alt="QR Code" 
                                className="w-12 h-12 object-cover rounded border"
                              />
                            ) : (
                              <span className="text-muted-foreground text-sm">No QR</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={detail.is_active ? 'default' : 'secondary'}>
                              {detail.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                                                     <TableCell>
                             <div className="flex items-center gap-2">
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleEditPaymentDetail(detail)}
                                 className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                 title="Edit payment details"
                               >
                                 <Edit className="h-4 w-4" />
                               </Button>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleDeletePaymentDetail(detail.id)}
                                 className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                 title="Delete payment details"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </div>
                           </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                                     <div className="text-center py-8 text-muted-foreground">
                     <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                     <p>No payment methods added yet</p>
                     <p className="text-xs">Add your first payment method above to get started</p>
                   </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Managers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                                         <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map((manager) => (
                <TableRow key={manager.id}>
                  <TableCell className="font-medium">{manager.name}</TableCell>
                  <TableCell>{manager.email}</TableCell>
                  <TableCell>{manager.location}</TableCell>
                  <TableCell>
                    <Badge variant={manager.status === "Active" ? "default" : "secondary"}>
                      {manager.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{manager.lastLogin}</TableCell>
                                     <TableCell>
                     <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manager Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Manager Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">ALLOWED ACTIONS</h4>
              {[
                "Manual vehicle entry",
                "View current day entries", 
                "Scratch marking on vehicles",
                "Basic statistics (non-financial)",
                "Vehicle history search",
              ].map((permission) => (
                <div key={permission} className="flex items-center gap-2 p-2 bg-success-light rounded">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-sm">{permission}</span>
                </div>
              ))}
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">RESTRICTED ACTIONS</h4>
              {[
                "Financial data access",
                "Multi-location management",
                "Manager account creation",
                "Price settings modification",
                "System configuration",
              ].map((restriction) => (
                <div key={restriction} className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                  <div className="w-2 h-2 bg-destructive rounded-full"></div>
                  <span className="text-sm">{restriction}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}