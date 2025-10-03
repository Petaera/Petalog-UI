import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  User, 
  Phone,
  Calendar,
  IndianRupee,
  CheckCircle,
  XCircle,
  CreditCard,
  Upload,
  Camera,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useUpiAccounts } from '@/hooks/useUpiAccounts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';

interface Staff {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  monthlySalary: number;
  contact: string;
  dateOfJoining: string;
  paymentMode: string;
  dp_url: string | null;
  doc_url: string[] | null;
}

const StaffPage: React.FC = () => {
  const { user } = useAuth();
  
  // State for staff management
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Location state
  const selectedLocationId = useSelectedLocation();

  // Add Staff form state
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [contact, setContact] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState<string>(new Date().toISOString().split('T')[0]);
  const [monthlySalary, setMonthlySalary] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | ''>('');
  const [selectedUpiAccountId, setSelectedUpiAccountId] = useState<string>('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [documentPreviews, setDocumentPreviews] = useState<string[]>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  
  // Payments state
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [paymentStaffId, setPaymentStaffId] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'Advance' | 'Salary' | 'Salary_Carryforward'>('Advance');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentModeSel, setPaymentModeSel] = useState<'Cash' | 'UPI' | ''>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState(false);

  const { accounts: upiAccounts } = useUpiAccounts(selectedLocationId);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [useCustomRole, setUseCustomRole] = useState(false);

  const toggleActive = async (memberId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .rpc('update_staff', {
          staff_id_param: memberId,
          is_active_param: !current
        });
      if (error) throw error;
      toast({ title: current ? 'Staff deactivated' : 'Staff activated' });
      await refreshStaff();
    } catch (e: any) {
      toast({ title: 'Failed to update status', description: e?.message, variant: 'destructive' });
    }
  };

  const deleteStaff = async (memberId: string) => {
    try {
      // Delete staff using RPC function
      const { error } = await supabase.rpc('delete_staff', { staff_id_param: memberId });
      if (error) throw error;
      toast({ title: 'Staff deleted' });
      await refreshStaff();
    } catch (e: any) {
      toast({ title: 'Failed to delete staff', description: e?.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    const loadStaff = async () => {
      try {
        setLoading(true);
        if (!user?.id) {
          setStaff([]);
          return;
        }

        // Only load staff if we have a selected location
        if (!selectedLocationId) {
          setStaff([]);
          return;
        }

        // Use RPC function to get staff by branch
        const { data: staffData, error: staffError } = await supabase
          .rpc('get_staff_by_branch', { branch_id_param: selectedLocationId });
        if (staffError) throw staffError;
        
        // Debug log to check raw data
        console.log('Raw staff data from RPC (loadStaff):', staffData);
        console.log('dp_url values:', staffData?.map(s => ({ name: s.name, dp_url: s.dp_url })));

        const mapped: Staff[] = (staffData || []).map((row: any): Staff => ({
          id: row.id,
          name: row.name,
          role: row.role_title || row.role || '',
          isActive: typeof row.is_active === 'boolean' ? row.is_active : row.isActive,
          monthlySalary: Number((row.monthly_salary ?? row.monthlySalary) || 0),
          contact: row.contact || '',
          dateOfJoining: row.date_of_joining || row.dateOfJoining,
          paymentMode: row.default_payment_mode || row.payment_mode || row.paymentMode || '',
          dp_url: row.dp_url || null,
          doc_url: row.doc_url || null
        }));
        
        setStaff(mapped);
      } catch (error) {
        console.error('Error loading staff:', error);
        toast({
          title: "Error",
          description: "Failed to load staff data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, [selectedLocationId, user?.id]);

  const refreshStaff = async () => {
    if (!user?.id || !selectedLocationId) return;
    setLoading(true);
    try {
      // Use RPC function to get staff by branch
      const { data: staffData, error: staffError } = await supabase
        .rpc('get_staff_by_branch', { branch_id_param: selectedLocationId });
      if (staffError) throw staffError;
      
      const mapped: Staff[] = (staffData || []).map((row: any): Staff => ({
        id: row.id,
        name: row.name,
        role: row.role_title || row.role || '',
        isActive: typeof row.is_active === 'boolean' ? row.is_active : row.isActive,
        monthlySalary: Number((row.monthly_salary ?? row.monthlySalary) || 0),
        contact: row.contact || '',
        dateOfJoining: row.date_of_joining || row.dateOfJoining,
        paymentMode: row.default_payment_mode || row.payment_mode || row.paymentMode || '',
        dp_url: row.dp_url || null,
        doc_url: row.doc_url || null
      }));
      
      setStaff(mapped);
    } finally {
      setLoading(false);
    }
  };

  // Image upload functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Please select an image smaller than 5MB', variant: 'destructive' });
        return;
      }
      
      setProfileImage(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setProfileImagePreview(previewUrl);
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
    }
    setProfileImagePreview(null);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      // Allow common document types
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({ title: 'Invalid file type', description: `${file.name} is not a supported document type`, variant: 'destructive' });
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: 'File too large', description: `${file.name} is larger than 10MB`, variant: 'destructive' });
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      setDocuments(prev => [...prev, ...validFiles]);
      
      // Create preview URLs
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setDocumentPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
    if (documentPreviews[index]) {
      URL.revokeObjectURL(documentPreviews[index]);
    }
    setDocumentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImageToSupabase = async (file: File, staffId: string): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${staffId}_${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profile')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('profile')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: 'Upload failed', description: 'Failed to upload profile image', variant: 'destructive' });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadDocumentsToSupabase = async (files: File[], staffId: string): Promise<string[]> => {
    try {
      setUploadingDocuments(true);
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        // Create a unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${staffId}_doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        // Upload to Supabase Storage documents bucket
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast({ title: 'Upload failed', description: 'Failed to upload documents', variant: 'destructive' });
      return [];
    } finally {
      setUploadingDocuments(false);
    }
  };

  const handleAddStaff = async () => {
    if (!user?.id) return;
    if (!name.trim() || !roleTitle.trim() || !dateOfJoining || !monthlySalary || !paymentMode) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    if (!selectedLocationId) {
      toast({ title: 'No location selected', description: 'Select a location from the top bar', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const contactToSave = (contact || '').trim();
      
      // Insert staff record using RPC function
      const { data: insertedStaffId, error: insertError } = await supabase
        .rpc('insert_staff', {
          branch_id_param: selectedLocationId,
          name_param: name,
          role_title_param: roleTitle,
          contact_param: contact,
          date_of_joining_param: dateOfJoining,
          monthly_salary_param: Number(monthlySalary),
          default_payment_mode_param: paymentMode,
          dp_url_param: null
        });
        
      if (insertError) throw insertError;
      
      // Upload profile image if provided
      let imageUrl = null;
      if (profileImage && insertedStaffId) {
        imageUrl = await uploadImageToSupabase(profileImage, insertedStaffId);
        
        // Update staff record with image URL
        if (imageUrl) {
          const { error: updateError } = await supabase
            .rpc('update_staff', {
              staff_id_param: insertedStaffId,
              dp_url_param: imageUrl
            });
            
          if (updateError) {
            console.warn('Failed to update image URL:', updateError);
          }
        }
      }

      // Upload documents if provided
      let documentUrls: string[] = [];
      if (documents.length > 0 && insertedStaffId) {
        documentUrls = await uploadDocumentsToSupabase(documents, insertedStaffId);
        
        // Update staff record with document URLs
        if (documentUrls.length > 0) {
          const { error: updateError } = await supabase
            .rpc('update_staff_doc_url', {
              staff_id_param: insertedStaffId,
              doc_url_param: documentUrls
            });
            
          if (updateError) {
            console.warn('Failed to update document URLs:', updateError);
          }
        }
      }
      
      toast({ title: 'Staff added', description: 'New staff member has been created' });
      setShowAddForm(false);
      setName('');
      setRoleTitle('');
      setContact('');
      setDateOfJoining(new Date().toISOString().split('T')[0]);
      setMonthlySalary('');
      setPaymentMode('');
      setSelectedUpiAccountId('');
      setProfileImage(null);
      setProfileImagePreview(null);
      setDocuments([]);
      setDocumentPreviews([]);
      await refreshStaff();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to add staff', description: e?.message || 'Insert blocked by policy or invalid data', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(staff.map(s => s.role)));

  const formatCurrency = (amount: number) => 
    `₹${amount.toLocaleString('en-IN')}`;

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-IN');

  const sanitizeContact = (raw: string) => {
    if (!raw) return '';
    // Remove any embedded upi:account tags
    return raw.replace(/\s*\|\s*?upi:[^|]+/gi, '').replace(/upi:[^|]+/i, '').trim();
  };

  const formatTelHref = (raw: string) => {
    const clean = (raw || '').replace(/\s+/g, '');
    // allow leading + and digits only
    const matched = clean.match(/^\+?[0-9]+$/) ? clean : clean.replace(/[^0-9+]/g, '');
    return `tel:${matched}`;
  };

  const renderPaymentMethod = (member: Staff) => {
    const mode = (member.paymentMode || '').trim();
    if (mode.toUpperCase() === 'UPI') {
      const match = (member.contact || '').match(/upi:([^|]+)/i);
      const account = match && match[1] ? match[1].trim() : '';
      return account ? `UPI: ${account}` : 'UPI';
    }
    return mode || '—';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage your team members and their information
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowPaymentPanel((v) => !v)} variant="outline" className="hover:bg-muted">
            <CreditCard className="h-4 w-4 mr-2" />
            {showPaymentPanel ? 'Close Payments' : 'Make Payment'}
          </Button>
          {user?.role === 'owner' && (
            <Button onClick={() => setShowAddForm((v) => !v)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              {showAddForm ? 'Close' : 'Add Staff Member'}
            </Button>
          )}
        </div>
      </div>

      {showAddForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add Staff Member</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Ramesh Kumar" />
            </div>
            <div className="grid gap-2">
              <Label>Role/Title</Label>
              <div className="grid gap-2">
                <Select
                  value={useCustomRole ? '__custom__' : (roleTitle || '')}
                  onValueChange={(val) => {
                    if (val === '__custom__') {
                      setUseCustomRole(true);
                      setRoleTitle('');
                    } else {
                      setUseCustomRole(false);
                      setRoleTitle(val);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={uniqueRoles.length ? 'Choose existing role' : 'Enter new role'} />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueRoles.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Add new role…</SelectItem>
                  </SelectContent>
                </Select>
                {useCustomRole && (
                  <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Type new role" />
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact">Contact</Label>
              <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="grid gap-2">
              <Label>Date of Joining</Label>
              <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salary">Monthly Salary (INR)</Label>
              <Input id="salary" type="number" min="0" step="1" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} placeholder="e.g., 15000" />
            </div>
            <div className="grid gap-2">
              <Label>Default Payment Mode</Label>
              <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMode === 'UPI' && (
              <div className="grid gap-2 sm:col-span-2">
                <Label>Select UPI Account (Location)</Label>
                <Select value={selectedUpiAccountId} onValueChange={setSelectedUpiAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={upiAccounts.length ? 'Choose UPI account' : 'No UPI accounts found'} />
                  </SelectTrigger>
                  <SelectContent>
                    {upiAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.location_name || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Will be saved as upi:account in contact</p>
              </div>
            )}
            
            {/* Profile Image Upload */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Profile Picture (Optional)</Label>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {profileImagePreview ? (
                    <div className="relative">
                      <img
                        src={profileImagePreview}
                        alt="Profile preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('profileImage')?.click()}
                    disabled={uploadingImage}
                    className="w-full"
                  >
                    {uploadingImage ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Uploading...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        {profileImagePreview ? 'Change Photo' : 'Upload Photo'}
                      </div>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Documents (Optional)</Label>
              <div className="space-y-4">
                {/* Document Preview Grid */}
                {documentPreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {documentPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                          {preview.startsWith('blob:') ? (
                            <img
                              src={preview}
                              alt={`Document ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-2">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500 truncate">
                                {documents[index]?.name || `Document ${index + 1}`}
                              </p>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <div>
                  <input
                    type="file"
                    id="documents"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('documents')?.click()}
                    disabled={uploadingDocuments}
                    className="w-full"
                  >
                    {uploadingDocuments ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Uploading...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {documentPreviews.length > 0 ? 'Add More Documents' : 'Upload Documents'}
                      </div>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. Max size 10MB per file.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAddStaff} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? 'Saving...' : 'Add Staff'}
            </Button>
          </div>
        </Card>
      )}

      {showPaymentPanel && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Make Payment</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Staff</Label>
              <Select 
                value={paymentStaffId} 
                onValueChange={(value) => {
                  setPaymentStaffId(value);
                }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select 
                value={paymentType} 
                onValueChange={(v: 'Advance' | 'Salary' | 'Salary_Carryforward') => {
                  setPaymentType(v);
                  setPaymentAmount('');
                }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Salary_Carryforward">Salary Carryforward</SelectItem>
                  <SelectItem value="Advance">Advance</SelectItem>
                  {user?.role === 'owner' && (
                    <SelectItem value="Salary">Salary</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input 
                type="number" 
                min="0" 
                step="1" 
                value={paymentAmount} 
                onChange={(e) => setPaymentAmount(e.target.value)} 
              />
            </div>
            <div className="grid gap-2">
              <Label>Payment Mode</Label>
              <Select value={paymentModeSel} onValueChange={(v: any) => setPaymentModeSel(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentModeSel === 'UPI' && (
              <div className="grid gap-2 sm:col-span-2">
                <Label>Select UPI Account (Location)</Label>
                <Select value={selectedUpiAccountId} onValueChange={setSelectedUpiAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={upiAccounts.length ? 'Choose UPI account' : 'No UPI accounts found'} />
                  </SelectTrigger>
                  <SelectContent>
                    {upiAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.location_name || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPaymentPanel(false)}>Close</Button>
            <Button disabled={savingPayment} onClick={async () => {
              if (!paymentStaffId || !paymentAmount || !paymentModeSel) {
                toast({ title: 'Missing fields', description: 'Select staff, amount and mode', variant: 'destructive' });
                return;
              }
              try {
                setSavingPayment(true);
                // Payment logic will be implemented by your friend
                toast({ title: 'Payment feature', description: 'Payment logic to be implemented', variant: 'default' });
                setShowPaymentPanel(false);
                setPaymentStaffId('');
                setPaymentType('Advance');
                setPaymentAmount('');
                setPaymentModeSel('');
                setPaymentNotes('');
                setSelectedUpiAccountId('');
              } catch (e: any) {
                toast({ title: 'Failed to record payment', description: e?.message, variant: 'destructive' });
              } finally {
                setSavingPayment(false);
              }
            }} className="bg-primary text-primary-foreground hover:bg-primary/90">{savingPayment ? 'Saving…' : 'Record Payment'}</Button>
          </div>
        </Card>
      )}

      {editMemberId && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Staff</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Role/Title</Label>
              <div className="grid gap-2">
                <Select
                  value={useCustomRole ? '__custom__' : (roleTitle || '')}
                  onValueChange={(val) => {
                    if (val === '__custom__') {
                      setUseCustomRole(true);
                      setRoleTitle('');
                    } else {
                      setUseCustomRole(false);
                      setRoleTitle(val);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={uniqueRoles.length ? 'Choose existing role' : 'Enter new role'} />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueRoles.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Add new role…</SelectItem>
                  </SelectContent>
                </Select>
                {useCustomRole && (
                  <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Type new role" />
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Contact</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Date of Joining</Label>
              <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Monthly Salary (INR)</Label>
              <Input type="number" min="0" step="1" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Default Payment Mode</Label>
              <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMode === 'UPI' && (
              <div className="grid gap-2 sm:col-span-2">
                <Label>Select UPI Account (Location)</Label>
                <Select value={selectedUpiAccountId} onValueChange={setSelectedUpiAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={upiAccounts.length ? 'Choose UPI account' : 'No UPI accounts found'} />
                  </SelectTrigger>
                  <SelectContent>
                    {upiAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.location_name || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Profile Image Upload */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {profileImagePreview ? (
                    <div className="relative">
                      <img
                        src={profileImagePreview}
                        alt="Profile preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="editProfileImage"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('editProfileImage')?.click()}
                    disabled={uploadingImage}
                    className="w-full"
                  >
                    {uploadingImage ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Uploading...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        {profileImagePreview ? 'Change Photo' : 'Upload Photo'}
                      </div>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Documents</Label>
              <div className="space-y-4">
                {/* Document Preview Grid */}
                {documentPreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {documentPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                          {preview.startsWith('blob:') ? (
                            <img
                              src={preview}
                              alt={`Document ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-2">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500 truncate">
                                {documents[index]?.name || `Document ${index + 1}`}
                              </p>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <div>
                  <input
                    type="file"
                    id="editDocuments"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('editDocuments')?.click()}
                    disabled={uploadingDocuments}
                    className="w-full"
                  >
                    {uploadingDocuments ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Uploading...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {documentPreviews.length > 0 ? 'Add More Documents' : 'Upload Documents'}
                      </div>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. Max size 10MB per file.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditMemberId(null); }}>Cancel</Button>
            <Button onClick={async () => {
              if (!editMemberId) return;
              setEditSaving(true);
              try {
                // build update payload
                const updates: any = {
                  name: name.trim(),
                  role_title: roleTitle.trim(),
                  contact: (contact || '').trim() || null,
                  date_of_joining: dateOfJoining,
                  monthly_salary: Number(monthlySalary),
                  default_payment_mode: paymentMode,
                };
                
                // Upload new profile image if provided
                if (profileImage) {
                  const imageUrl = await uploadImageToSupabase(profileImage, editMemberId);
                  if (imageUrl) {
                    updates.dp_url = imageUrl;
                  }
                }

                // Upload new documents if provided
                if (documents.length > 0) {
                  const documentUrls = await uploadDocumentsToSupabase(documents, editMemberId);
                  if (documentUrls.length > 0) {
                    // Get existing documents and append new ones
                    const existingDocs = documentPreviews.filter(url => !url.startsWith('blob:'));
                    const allDocUrls = [...existingDocs, ...documentUrls];
                    
                    // Update document URLs separately
                    const { error: docError } = await supabase.rpc('update_staff_doc_url', {
                      staff_id_param: editMemberId,
                      doc_url_param: allDocUrls
                    });
                    
                    if (docError) {
                      console.warn('Failed to update document URLs:', docError);
                    }
                  }
                }
                
                const { error } = await supabase.rpc('update_staff', {
                  staff_id_param: editMemberId,
                  name_param: updates.name,
                  role_title_param: updates.role_title,
                  contact_param: updates.contact,
                  date_of_joining_param: updates.date_of_joining,
                  monthly_salary_param: updates.monthly_salary,
                  default_payment_mode_param: updates.default_payment_mode,
                  dp_url_param: updates.dp_url
                });
                if (error) throw error;
                toast({ title: 'Staff updated' });
                setEditMemberId(null);
                setProfileImage(null);
                setProfileImagePreview(null);
                setDocuments([]);
                setDocumentPreviews([]);
                await refreshStaff();
              } catch (e: any) {
                toast({ title: 'Failed to update staff', description: e?.message, variant: 'destructive' });
              } finally {
                setEditSaving(false);
              }
            }} disabled={editSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">{editSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="form-select pl-10 pr-8 min-w-[160px]"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Staff Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Staff</p>
              <p className="text-2xl font-bold text-foreground">{staff.length}</p>
            </div>
            <User className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {staff.filter(s => s.isActive).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        
        {user?.role === 'owner' && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Salaries</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(staff.reduce((sum, s) => sum + (s.monthlySalary || 0), 0))}
                </p>
              </div>
              <IndianRupee className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
        )}
      </div>

      {/* Staff Table */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Staff Members</h3>
          <p className="text-sm text-muted-foreground">
            {filteredStaff.length} of {staff.length} staff members
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-foreground">Name</th>
                <th className="text-left p-4 font-medium text-foreground">Role</th>
                <th className="text-left p-4 font-medium text-foreground">Contact</th>
                <th className="text-left p-4 font-medium text-foreground">Joining Date</th>
                <th className="text-left p-4 font-medium text-foreground">Payment Method</th>
                {user?.role === 'owner' && (
                  <th className="text-right p-4 font-medium text-foreground">Salary</th>
                )}
                <th className="text-center p-4 font-medium text-foreground">Status</th>
                <th className="text-center p-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => (
                <tr key={member.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                          {member.dp_url ? (
                            <img
                              src={member.dp_url}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary rounded-full flex items-center justify-center">
                              <span className="text-primary-foreground text-sm font-medium">
                                {member.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Document indicator */}
                        {member.doc_url && member.doc_url.length > 0 && (
                          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                            <Upload className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-foreground">{member.role}</td>
                  <td className="p-4">
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      {sanitizeContact(member.contact) ? (
                        <a
                          href={formatTelHref(sanitizeContact(member.contact))}
                          className="hover:underline"
                        >
                          {sanitizeContact(member.contact)}
                        </a>
                      ) : 'N/A'}
                    </div>
                  </td>
                  <td className="p-4 text-foreground">{formatDate(member.dateOfJoining)}</td>
                  <td className="p-4 text-foreground">{renderPaymentMethod(member)}</td>
                  {user?.role === 'owner' && (
                    <td className="p-4 text-right font-medium text-foreground">
                      {formatCurrency(member.monthlySalary || 0)}
                    </td>
                  )}
                  <td className="p-4 text-center">
                    {member.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Deactive
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary"
                        title="Edit Staff"
                        onClick={() => {
                          setEditMemberId(member.id);
                          setName(member.name);
                          setRoleTitle(member.role);
                          setUseCustomRole(false);
                          setContact(sanitizeContact(member.contact || ''));
                          setDateOfJoining(member.dateOfJoining);
                          setMonthlySalary(String(member.monthlySalary || ''));
                          setPaymentMode((member.paymentMode as any) || '');
                          setSelectedUpiAccountId('');
                          // Load existing profile image
                          setProfileImage(null);
                          setProfileImagePreview(member.dp_url || null);
                          // Load existing documents
                          setDocuments([]);
                          setDocumentPreviews(member.doc_url || []);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(member.id, member.isActive)}
                        className={member.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}
                        title={member.isActive ? 'Deactivate Staff' : 'Activate Staff'}
                      >
                        {member.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      {user?.role === 'owner' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete Staff"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete staff member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {member.name} from your staff list. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteStaff(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredStaff.length === 0 && (
          <div className="p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No staff members found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterRole ? 'Try adjusting your search or filter criteria.' : 'Get started by adding your first staff member.'}
            </p>
            {user?.role === 'owner' && (
              <Button onClick={() => setShowAddForm((v) => !v)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                {showAddForm ? 'Close' : 'Add Staff Member'}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default StaffPage;