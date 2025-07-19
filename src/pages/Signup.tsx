
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'manager' | ''>('');
  const [assignedLocation, setAssignedLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'manager') {
      const fetchLocations = async () => {
        const { data, error } = await supabase.from('locations').select('id, name');
        if (!error && data) {
          setLocations(data);
        } else {
          setLocations([]);
        }
      };
      fetchLocations();
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword || !role) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (role === 'manager' && !assignedLocation) {
      toast.error('Please select an assigned location for manager role');
      return;
    }

    try {
      setLoading(true);
      await signup(email, password, role as 'owner' | 'manager', assignedLocation);
      
      // Role-based redirection
      if (role === 'owner') {
        navigate('/');
      } else if (role === 'manager') {
        navigate('/manager-portal');
      }
      
      toast.success('Account created successfully!');
    } catch (error) {
      toast.error('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground">
              <Car className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join Car Wash Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: 'owner' | 'manager') => setRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === 'manager' && (
              <div className="space-y-2">
                <Label htmlFor="location">Assigned Location</Label>
                <Select value={assignedLocation} onValueChange={setAssignedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assigned location" />
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
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
