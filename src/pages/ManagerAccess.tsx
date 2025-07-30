import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Users, Plus, Edit, Trash2, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const managers = [
  { id: 1, name: "Raj Patel", email: "raj@carwash.com", location: "Main Branch", status: "Active", lastLogin: "2 hours ago" },
  { id: 2, name: "Priya Sharma", email: "priya@carwash.com", location: "North Branch", status: "Active", lastLogin: "1 day ago" },
  { id: 3, name: "Amit Kumar", email: "amit@carwash.com", location: "West Side Center", status: "Inactive", lastLogin: "3 days ago" },
];

export default function ManagerAccess() {
  const { signup } = useAuth();
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  
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
      const { data, error } = await supabase.from('locations').select('id, name');
      if (!error && data) {
        setLocations(data);
      }
    };
    fetchLocations();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
    <Layout>
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
                  <TableHead>Actions</TableHead>
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
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
    </Layout>
  );
}