import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { 
  CreditCard, 
  Users, 
  MapPin,
  Edit,
  Archive,
  BarChart3,
  Crown,
  Circle,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'; // Import Select for filters
import { Input } from '@/components/ui/input'; // Import Input for search
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function SubscriptionSchemes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [schemes, setSchemes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Check if user is manager and get their role
  const isManager = user?.role?.toLowerCase() === 'manager';
  const userAssignedLocation = user?.assigned_location;

  useEffect(() => {
    async function fetchSchemes() {
      if (!user?.id) return;
      
      try {
        let query = supabase.from('subscription_plans').select('*, plan_amount');
        
        // Filter plans based on user role and permissions
        if (isManager && userAssignedLocation) {
          // For managers: fetch plans that are either available for their location or have no location restrictions
          // Since we can't do complex JSON array filtering in the query, we'll fetch all plans by owner and filter client-side
          const { data: ownerIds } = await supabase
            .from('location_owners')
            .select('owner_id')
            .eq('location_id', userAssignedLocation);
          
          const validOwnerIds = (ownerIds || []).map(o => o.owner_id).filter(Boolean);
          
          if (validOwnerIds.length > 0) {
            query = query.in('owner_id', validOwnerIds);
          } else {
            // No valid owners found for this location, return empty
            setSchemes([]);
            return;
          }
        } else {
          // For owners: only fetch their own plans
          query = query.eq('owner_id', user.id);
        }
        
        const { data, error } = await query;
        if (error) {
          console.error('Error fetching subscription plans:', error);
          toast({ title: 'Failed to load plans', description: 'Please refresh and try again.', variant: 'destructive' });
        } else {
          setSchemes(data || []);
        }
      } catch (error) {
        console.error('Unexpected error in fetchSchemes:', error);
        toast({ title: 'Error', description: 'An unexpected error occurred while loading plans', variant: 'destructive' });
      }
    }
    fetchSchemes();
  }, [user?.id, isManager, userAssignedLocation]);

  const handleDelete = async (id: string) => {
    // Check if there are any members (active or historical purchases) for this plan
    const { count, error: countErr } = await supabase
      .from('subscription_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', id);

    if (countErr) {
      toast({ title: 'Check failed', description: 'Unable to verify plan membership.', variant: 'destructive' });
      return;
    }

    if ((count || 0) > 0) {
      toast({ title: "Can't delete", description: 'There are members in this plan.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: 'Could not delete this plan.', variant: 'destructive' });
    } else {
      setSchemes((prev) => prev.filter((scheme) => scheme.id !== id));
      toast({ title: 'Plan deleted' });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'subscription':
      case 'package': // Treat 'package' as 'subscription'
        return Crown;
      case 'credit':
        return CreditCard;
      case 'visit':
        return Circle;
      default:
        return Circle;
    }
  };

  const getDisplayType = (type: string) => {
    if (type === 'package') return 'Subscription'; // Display 'package' as 'Subscription'
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const filteredSchemes = schemes.filter((scheme) => {
    const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (scheme.short_description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'subscription' && (scheme.type === 'subscription' || scheme.type === 'package')) || // Include 'package' as 'subscription'
      scheme.type === filterType;
    
    // For managers, only show schemes available for their assigned location
    const matchesLocation = !isManager || !userAssignedLocation || 
      !scheme.locations || 
      !Array.isArray(scheme.locations) || 
      scheme.locations.length === 0 || // No location restriction
      scheme.locations.includes(userAssignedLocation);
    
    return matchesSearch && matchesFilter && matchesLocation;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Subscription Schemes</h1>
          <p className="text-muted-foreground">
            {isManager 
              ? 'View available subscription schemes for your location'
              : 'Manage your loyalty and subscription programs'
            }
          </p>
        </div>
        {!isManager && (
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
            onClick={() => navigate('/loyalty/create')}
          >
            Create New Scheme
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-card rounded-xl border border-border">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search schemes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={(value) => setFilterType(value)}>
            <SelectTrigger className="w-40">
              <span>{filterType === 'all' ? 'All Types' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="visit">Visit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSchemes.map((scheme) => {
          const TypeIcon = getTypeIcon(scheme.type);
          return (
            <Card 
              key={scheme.id} 
              className="hover:shadow-card transition-all duration-300 bg-gradient-card animate-slide-up"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TypeIcon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge 
                    variant={scheme.active ? 'default' : 'secondary'}
                    className={scheme.active ? 'bg-success text-white' : ''}
                  >
                    {scheme.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{scheme.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{scheme.short_description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Type and Price */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-primary border-primary">
                    {getDisplayType(scheme.type)} {/* Display 'package' as 'Subscription' */}
                  </Badge>
                  <div className="text-right">
                    {scheme.type === 'credit' ? (
                      <div className="text-sm">
                        <div className="font-medium text-foreground">₹{scheme.price} credit</div>
                        {scheme.plan_amount && (
                          <div className="text-xs text-muted-foreground">₹{scheme.plan_amount} pays</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-foreground">₹{scheme.price}</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 py-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {scheme.user_count !== undefined ? scheme.user_count : 'N/A'} users
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {scheme.allowed_locations?.length || 0} location{scheme.allowed_locations?.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div><span className="font-medium">Payment Methods:</span> {scheme.allowed_payment_methods || 'N/A'}</div>
                  <div><span className="font-medium">Expiry:</span> {scheme.expiry || 'Unlimited'}</div>
                  <div><span className="font-medium">Rewards:</span> {scheme.allowed_services?.join(', ') || 'None'}</div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border">
                  {!isManager && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/loyalty/edit/${scheme.id}`)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {!isManager && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/loyalty/analytics?plan=${scheme.id}`)}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics
                    </Button>
                  )}
                  {!isManager && (
                    <Button size="sm" variant="outline" onClick={() => handleDelete(scheme.id)}>
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                  {isManager && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/loyalty/customers?scheme=${scheme.id}`)}>
                      <Users className="w-4 h-4 mr-2" />
                      View Members
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredSchemes.length === 0 && (
        <Card className="p-12 text-center animate-fade-in">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No schemes found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first subscription scheme to get started.
          </p>
          {!isManager && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg" onClick={() => navigate('/loyalty/create')}>
              Create New Scheme
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}