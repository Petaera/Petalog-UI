import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Coins,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Package,
  TrendingUp,
  Calendar,
  AlertCircle,
  Save,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PointsPolicy {
  id: string;
  location_id: string | null;
  service: string | null;
  points_per_currency: number;
  min_eligible_amount: number;
  start_at: string;
  end_at: string | null;
  active: boolean;
  location_name?: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
}

export function PointsPolicies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [policies, setPolicies] = useState<PointsPolicy[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PointsPolicy | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    location_id: 'all',
    service: 'all',
    points_per_currency: '1',
    min_eligible_amount: '0',
    start_at: new Date().toISOString().split('T')[0],
    end_at: '',
    active: true,
  });

  // Common services list
  const serviceOptions = [
    { value: 'all', label: 'All Services' },
    { value: 'Washing', label: 'Washing' },
    { value: 'Parking', label: 'Parking' },
    { value: 'Full Service', label: 'Full Service' },
    { value: 'Basic Wash', label: 'Basic Wash' },
    { value: 'Premium Wash', label: 'Premium Wash' },
    { value: 'Detailing', label: 'Detailing' },
  ];

  useEffect(() => {
    fetchLocations();
    fetchPolicies();
  }, [user?.id]);

  const fetchLocations = async () => {
    if (!user?.id) return;
    
    try {
      const { data: locationOwners } = await supabase
        .from('location_owners')
        .select('location_id')
        .eq('owner_id', user.id);

      if (!locationOwners || locationOwners.length === 0) {
        setLocations([]);
        return;
      }

      const locationIds = locationOwners.map(lo => lo.location_id);
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address')
        .in('id', locationIds);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load locations',
        variant: 'destructive',
      });
    }
  };

  const fetchPolicies = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Get user's locations
      const { data: locationOwners } = await supabase
        .from('location_owners')
        .select('location_id')
        .eq('owner_id', user.id);

      const locationIds = (locationOwners || []).map(lo => lo.location_id);
      
      // Fetch policies for user's locations
      let query = supabase
        .from('loyalty_point_policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (locationIds.length > 0) {
        query = query.or(`location_id.in.(${locationIds.join(',')}),location_id.is.null`);
      } else {
        query = query.is('location_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with location names
      const enriched = await Promise.all((data || []).map(async (policy) => {
        if (policy.location_id) {
          const location = locations.find(l => l.id === policy.location_id);
          return { ...policy, location_name: location?.name || 'Unknown Location' };
        }
        return { ...policy, location_name: 'All Locations' };
      }));

      setPolicies(enriched);
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load points policies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (policy?: PointsPolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        location_id: policy.location_id || 'all',
        service: policy.service || 'all',
        points_per_currency: policy.points_per_currency.toString(),
        min_eligible_amount: policy.min_eligible_amount.toString(),
        start_at: policy.start_at ? new Date(policy.start_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        end_at: policy.end_at ? new Date(policy.end_at).toISOString().split('T')[0] : '',
        active: policy.active,
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        location_id: 'all',
        service: 'all',
        points_per_currency: '1',
        min_eligible_amount: '0',
        start_at: new Date().toISOString().split('T')[0],
        end_at: '',
        active: true,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      const policyData = {
        location_id: formData.location_id === 'all' ? null : formData.location_id,
        service: formData.service === 'all' ? null : formData.service,
        points_per_currency: parseFloat(formData.points_per_currency),
        min_eligible_amount: parseFloat(formData.min_eligible_amount),
        start_at: new Date(formData.start_at).toISOString(),
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        active: formData.active,
      };

      if (editingPolicy) {
        const { error } = await supabase
          .from('loyalty_point_policies')
          .update(policyData)
          .eq('id', editingPolicy.id);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Points policy updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('loyalty_point_policies')
          .insert([policyData]);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Points policy created successfully',
        });
      }

      setShowDialog(false);
      fetchPolicies();
    } catch (error) {
      console.error('Error saving policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to save points policy',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('loyalty_point_policies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Points policy deleted successfully',
      });

      fetchPolicies();
    } catch (error) {
      console.error('Error deleting policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete points policy',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No end date';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2 flex items-center gap-3">
            <Coins className="w-8 h-8 text-blue-600" />
            Points Management
          </h1>
          <p className="text-blue-600">Configure how customers earn loyalty points</p>
        </div>
        <Button 
          onClick={() => handleOpenDialog()} 
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Policy
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">How Points Work</h3>
              <p className="text-sm text-blue-700 mb-3">
                Points are automatically awarded to customers when they make payments. Define policies to control how many points are earned per rupee spent.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>Set points per ₹1 spent</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <MapPin className="w-4 h-4" />
                  <span>Configure by location</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <Package className="w-4 h-4" />
                  <span>Filter by service type</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policies List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-blue-600 mt-4">Loading policies...</p>
        </div>
      ) : policies.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Coins className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-blue-900 mb-2">No Points Policies</h3>
            <p className="text-blue-600 mb-6">Create your first policy to start rewarding customers</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {policies.map((policy) => (
            <Card key={policy.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">
                        {policy.location_name}
                      </CardTitle>
                      <Badge variant={policy.active ? 'default' : 'secondary'}>
                        {policy.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {policy.service && (
                      <Badge variant="outline" className="text-xs">
                        {policy.service}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(policy)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(policy.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">Points per ₹1</span>
                  <span className="font-bold text-blue-900 text-lg">
                    {policy.points_per_currency}
                  </span>
                </div>
                
                {policy.min_eligible_amount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600">Minimum Amount</span>
                    <span className="font-medium text-blue-900">
                      ₹{policy.min_eligible_amount}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-blue-600 pt-2 border-t">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {formatDate(policy.start_at)} - {formatDate(policy.end_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? 'Edit Points Policy' : 'Create Points Policy'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Location Selection */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location (or leave empty for all)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <Label htmlFor="service">Service Type</Label>
              <Select
                value={formData.service}
                onValueChange={(value) => setFormData({ ...formData, service: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Points per Currency */}
            <div className="space-y-2">
              <Label htmlFor="points_per_currency">Points per ₹1</Label>
              <Input
                id="points_per_currency"
                type="number"
                step="0.1"
                min="0"
                value={formData.points_per_currency}
                onChange={(e) => setFormData({ ...formData, points_per_currency: e.target.value })}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                e.g., 1.0 means customers earn 1 point for every ₹1 spent
              </p>
            </div>

            {/* Minimum Eligible Amount */}
            <div className="space-y-2">
              <Label htmlFor="min_eligible_amount">Minimum Bill Amount (₹)</Label>
              <Input
                id="min_eligible_amount"
                type="number"
                min="0"
                value={formData.min_eligible_amount}
                onChange={(e) => setFormData({ ...formData, min_eligible_amount: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Minimum transaction amount to be eligible for points
              </p>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_at">Start Date</Label>
                <Input
                  id="start_at"
                  type="date"
                  value={formData.start_at}
                  onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_at">End Date (Optional)</Label>
                <Input
                  id="end_at"
                  type="date"
                  value={formData.end_at}
                  onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <Label htmlFor="active">Active Policy</Label>
                <p className="text-xs text-muted-foreground">
                  Only active policies will award points
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {editingPolicy ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Points Policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this points policy. This action cannot be undone.
              Existing points awarded under this policy will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

