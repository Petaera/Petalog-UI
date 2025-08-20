import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface LocationOwner {
  id: string;
  owner_id: string;
  ownership_percentage: number;
  is_primary_owner: boolean;
  owner_email: string;
}

interface LocationPartnershipsProps {
  locationId: string;
  locationName: string;
}

export default function LocationPartnerships({ locationId, locationName }: LocationPartnershipsProps) {
  const { user } = useAuth();
  const [owners, setOwners] = useState<LocationOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingPartner, setAddingPartner] = useState(false);
  const [removingPartner, setRemovingPartner] = useState(false);
  const [newPartnerEmail, setNewPartnerEmail] = useState('');
  const [newPartnerPercentage, setNewPartnerPercentage] = useState('50');
  const [availablePercentages, setAvailablePercentages] = useState<string[]>([]);

  useEffect(() => {
    fetchLocationOwners();
  }, [locationId]);

  useEffect(() => {
    // Calculate available ownership percentages
    const totalOwned = owners.reduce((sum, owner) => sum + owner.ownership_percentage, 0);
    const available = 100 - totalOwned;
    
    if (available > 0) {
      const percentages = [];
      for (let i = 1; i <= Math.min(available, 50); i++) {
        percentages.push(i.toString());
      }
      setAvailablePercentages(percentages);
    } else {
      setAvailablePercentages([]);
    }
  }, [owners]);

  const fetchLocationOwners = async () => {
    try {
      setLoading(true);
      
      // For now, show the current owner from the existing database structure
      // This will work until we set up the full partnership system
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('own_id')
        .eq('id', locationId)
        .single();

      if (locationError) {
        console.error('Error fetching location:', locationError);
        return;
      }

      if (locationData?.own_id) {
        // Get the current owner's details
        const { data: ownerData, error: ownerError } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('id', locationData.own_id)
          .single();

        if (!ownerError && ownerData) {
          setOwners([{
            id: 'current',
            owner_id: ownerData.id,
            owner_email: ownerData.email,
            ownership_percentage: 100,
            is_primary_owner: true
          }]);
        }
      }
    } catch (error) {
      console.error('Error in fetchLocationOwners:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPartner = async () => {
    if (!newPartnerEmail || !newPartnerPercentage) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setAddingPartner(true);

      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', newPartnerEmail)
        .maybeSingle();

      if (userError || !userData) {
        toast.error('User not found with this email');
        return;
      }

      if (userData.role !== 'owner') {
        toast.error('Only users with owner role can be added as partners');
        return;
      }

      // Check if user is already a partner
      const isAlreadyPartner = owners.some(owner => owner.owner_id === userData.id);
      if (isAlreadyPartner) {
        toast.error('This user is already a partner in this location');
        return;
      }

      // For now, show a message that partnerships need to be set up
      toast.info('Partnership system is being set up. Please run the database migration first.');
      return;
      
      // TODO: Uncomment this after running the database migration
      // const { error: insertError } = await supabase
      //   .from('location_owners')
      //   .insert([{
      //     location_id: locationId,
      //     owner_id: userData.id,
      //     ownership_percentage: parseFloat(newPartnerPercentage),
      //     is_primary_owner: false
      //   }]);

      // if (insertError) {
      //   console.error('Error adding partner:', insertError);
      //   toast.error('Failed to add partner');
      //   return;
      // }

      toast.success('Partner added successfully!');
      setNewPartnerEmail('');
      setNewPartnerPercentage('50');
      fetchLocationOwners();
    } catch (error) {
      console.error('Error adding partner:', error);
      toast.error('Failed to add partner');
    } finally {
      setAddingPartner(false);
    }
  };

  const removePartner = async (ownerId: string) => {
    if (!confirm('Are you sure you want to remove this partner?')) {
      return;
    }

    try {
      setRemovingPartner(true);
      
      // For now, show a message that partnerships need to be set up
      toast.info('Partnership system is being set up. Please run the database migration first.');
      return;
      
      // TODO: Uncomment this after running the database migration
      // const { error } = await supabase
      //   .from('location_owners')
      //   .delete()
      //   .eq('location_id', locationId)
      //   .eq('owner_id', ownerId);

      // if (error) {
      //   console.error('Error removing partner:', error);
      //   toast.error('Failed to remove partner');
      //   return;
      // }

      // toast.success('Partner removed successfully!');
      // fetchLocationOwners();
    } catch (error) {
      console.error('Error removing partner:', error);
      toast.error('Failed to remove partner');
    } finally {
      setRemovingPartner(false);
    }
  };

  const updateOwnershipPercentage = async (ownerId: string, newPercentage: number) => {
    try {
      // For now, show a message that partnerships need to be set up
      toast.info('Partnership system is being set up. Please run the database migration first.');
      return;
      
      // TODO: Uncomment this after running the database migration
      // const { error } = await supabase
      //   .from('location_owners')
      //   .update({ ownership_percentage: newPercentage })
      //   .eq('location_id', locationId)
      //   .eq('owner_id', ownerId);

      // if (error) {
      //   console.error('Error updating ownership percentage:', error);
      //   toast.error('Failed to update ownership percentage');
      //   return;
      // }

      // toast.success('Ownership percentage updated!');
      // fetchLocationOwners();
    } catch (error) {
      console.error('Error updating ownership percentage:', error);
      toast.error('Failed to update ownership percentage');
    }
  };

  const canManagePartnerships = owners.some(owner => 
    owner.owner_id === user?.id && owner.is_primary_owner
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Location Partnerships</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location Partnerships</CardTitle>
        <CardDescription>
          Manage ownership and partnerships for {locationName}
        </CardDescription>
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The partnership system is currently being set up. 
            You can view the current owner, but adding/removing partners requires the database migration to be completed first.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Owners */}
        <div>
          <h4 className="font-medium mb-2">Current Owners</h4>
          <div className="space-y-2">
            {owners.map((owner) => (
              <div key={owner.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{owner.owner_email}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant={owner.is_primary_owner ? "default" : "secondary"}>
                        {owner.is_primary_owner ? "Primary Owner" : "Partner"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {owner.ownership_percentage}% ownership
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!owner.is_primary_owner && (
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={owner.ownership_percentage}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0 && value <= 100) {
                          updateOwnershipPercentage(owner.owner_id, value);
                        }
                      }}
                      className="w-20"
                    />
                  )}
                  
                  {!owner.is_primary_owner && canManagePartnerships && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePartner(owner.owner_id)}
                      disabled={removingPartner}
                    >
                      {removingPartner ? 'Removing...' : 'Remove'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Add New Partner */}
        {canManagePartnerships && (
          <div>
            <h4 className="font-medium mb-2">Add New Partner</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Partner's email"
                value={newPartnerEmail}
                onChange={(e) => setNewPartnerEmail(e.target.value)}
              />
              
              <Select value={newPartnerPercentage} onValueChange={setNewPartnerPercentage}>
                <SelectTrigger>
                  <SelectValue placeholder="Ownership %" />
                </SelectTrigger>
                <SelectContent>
                  {availablePercentages.map((percentage) => (
                    <SelectItem key={percentage} value={percentage}>
                      {percentage}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={addPartner} 
                disabled={addingPartner || !newPartnerEmail || !newPartnerPercentage}
              >
                {addingPartner ? 'Adding...' : 'Add Partner'}
              </Button>
            </div>
            
            {availablePercentages.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No ownership percentage available. Total ownership must not exceed 100%.
              </p>
            )}
          </div>
        )}

        {/* Partnership Summary */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Partnership Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Owners:</span>
              <span className="ml-2 font-medium">{owners.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Ownership:</span>
              <span className="ml-2 font-medium">
                {owners.reduce((sum, owner) => sum + owner.ownership_percentage, 0)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
