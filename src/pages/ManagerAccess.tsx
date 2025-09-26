import { Users, Plus, Trash2, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

// Fallback demo data removed; data will be fetched from Supabase

export default function ManagerAccess({ selectedLocation }: { selectedLocation?: string }) {
  const { signup, user } = useAuth();
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState<boolean>(false);
  const [statusUpdating, setStatusUpdating] = useState<{ [id: string]: boolean }>({});
   
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    assignedLocation: selectedLocation || '',
    role: 'manager',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // If Layout provided a selectedLocation and form has none, adopt it
    if (selectedLocation && !formData.assignedLocation) {
      setFormData(prev => ({ ...prev, assignedLocation: selectedLocation }));
    }
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
          // Prefer currently selectedLocation from Layout if available
          if (!formData.assignedLocation) {
            const defaultLoc = (selectedLocation && uniqueLocations.find(l => l.id === selectedLocation)?.id) || uniqueLocations[0].id;
            setFormData(prev => ({ ...prev, assignedLocation: defaultLoc }));
          }
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
  }, [user, selectedLocation]);

  useEffect(() => {
    const fetchStaff = async () => {
      if (!user) return;
      setListLoading(true);
      try {
        // Build base query scoped by location if provided/selected
        const locationId = selectedLocation || formData.assignedLocation || undefined;

        let query = supabase
          .from('users')
          .select('id, email, role, assigned_location, status');

        if (locationId) {
          query = query.eq('assigned_location', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const normalized = (data || []).map((u: any) => ({
          id: u.id,
          email: u.email,
          role: typeof u.role === 'string' ? u.role.trim() : u.role,
          assigned_location: u.assigned_location,
          // Map actual status from database
          name: u.email?.split('@')[0] || '—',
          status: u.status === true ? 'Active' : 'Inactive',
          lastLogin: '—',
        }));

        setManagers(normalized.filter((u: any) => u.role === 'manager'));
        setWorkers(normalized.filter((u: any) => u.role === 'worker'));
      } catch (err) {
        console.error('Failed to fetch staff:', err);
        toast.error('Failed to load managers/workers');
        setManagers([]);
        setWorkers([]);
      } finally {
        setListLoading(false);
      }
    };

    fetchStaff();
    // Re-fetch when selected location changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedLocation, formData.assignedLocation]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToggleStatus = async (userId: string, nextActive: boolean) => {
    try {
      setStatusUpdating(prev => ({ ...prev, [userId]: true }));

      // Optimistically update UI
      const toLabel = nextActive ? 'Active' : 'Inactive';
      setManagers(prev => prev.map(u => u.id === userId ? { ...u, status: toLabel } : u));
      setWorkers(prev => prev.map(u => u.id === userId ? { ...u, status: toLabel } : u));

      const { error } = await supabase
        .from('users')
        .update({ status: nextActive })
        .eq('id', userId);
      if (error) throw error;

      toast.success(`Status updated to ${toLabel}`);
    } catch (err: any) {
      // Revert on failure by refetching list
      toast.error(err?.message || 'Failed to update status');
      try {
        // Best-effort refresh of staff lists
        setListLoading(true);
        let query = supabase
          .from('users')
          .select('id, email, role, assigned_location, status');
        const locationId = selectedLocation || formData.assignedLocation || undefined;
        if (locationId) {
          query = query.eq('assigned_location', locationId);
        }
        const { data } = await query;
        const normalized = (data || []).map((u: any) => ({
          id: u.id,
          email: u.email,
          role: typeof u.role === 'string' ? u.role.trim() : u.role,
          assigned_location: u.assigned_location,
          name: u.email?.split('@')[0] || '—',
          status: u.status === true ? 'Active' : 'Inactive',
          lastLogin: '—',
        }));
        setManagers(normalized.filter((u: any) => u.role === 'manager'));
        setWorkers(normalized.filter((u: any) => u.role === 'worker'));
      } finally {
        setListLoading(false);
      }
    } finally {
      setStatusUpdating(prev => ({ ...prev, [userId]: false }));
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
        formData.role, 
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
        role: 'manager',
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
              <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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
                    <Label htmlFor="role">Role</Label>
                    <Select 
                      value={formData.role}
                      onValueChange={(value) => handleInputChange('role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                      </SelectContent>
                    </Select>
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

        <Card>
          <CardHeader>
            <CardTitle>Active Managers</CardTitle>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading managers...
              </div>
            ) : (
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
                {managers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">No managers found</TableCell>
                  </TableRow>
                ) : managers.map((manager) => (
                  <TableRow key={manager.id}>
                    <TableCell className="font-medium">{manager.name}</TableCell>
                    <TableCell>{manager.email}</TableCell>
                    <TableCell>{manager.assigned_location || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Badge variant={manager.status === "Active" ? "default" : "secondary"}>
                          {manager.status}
                        </Badge>
                        <Switch
                          checked={manager.status === 'Active'}
                          disabled={!!statusUpdating[manager.id]}
                          onCheckedChange={(checked) => handleToggleStatus(manager.id, checked)}
                          aria-label={`Toggle status for ${manager.email}`}
                        />
                      </div>
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Workers</CardTitle>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading workers...
              </div>
            ) : (
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
                {workers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">No workers found</TableCell>
                  </TableRow>
                ) : workers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell>{worker.email}</TableCell>
                    <TableCell>{worker.assigned_location || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Badge variant={worker.status === "Active" ? "default" : "secondary"}>
                          {worker.status}
                        </Badge>
                        <Switch
                          checked={worker.status === 'Active'}
                          disabled={!!statusUpdating[worker.id]}
                          onCheckedChange={(checked) => handleToggleStatus(worker.id, checked)}
                          aria-label={`Toggle status for ${worker.email}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{worker.lastLogin}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
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
