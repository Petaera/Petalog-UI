import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import LocationPartnerships from '../components/LocationPartnerships';
import { Car, Users, Settings, LogOut, Home } from 'lucide-react';
import { toast } from 'sonner';
import { getLocationFilter, applyLocationFilter } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Location {
  id: string;
  name: string;
  address: string;
}

export default function LocationPartnershipsPage() {
  console.log('🚀 LocationPartnershipsPage component mounted');
  const { user, logout } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  useEffect(() => {
    console.log('🔄 useEffect triggered, user:', user);
    if (user) {
      console.log('✅ User found, fetching locations...');
      fetchUserLocations();
    } else {
      console.log('❌ No user found in useEffect');
    }
  }, [user]);

  // Add a separate effect to monitor user changes
  useEffect(() => {
    console.log('👤 User state changed:', {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      userOwnId: user?.own_id,
      userAssignedLocation: user?.assigned_location
    });
  }, [user]);

  const fetchUserLocations = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.log('❌ No user found, returning early');
        return;
      }

      console.log('🔍 Fetching locations for user:', {
        userId: user.id,
        userRole: user.role,
        userOwnId: user.own_id,
        userAssignedLocation: user.assigned_location
      });
      
      console.log('🔍 User object:', user);
      console.log('🔍 User object keys:', Object.keys(user || {}));
      console.log('🔍 User own_id type:', typeof user?.own_id);
      console.log('🔍 User own_id value:', user?.own_id);
      console.log('🔍 User assigned_location type:', typeof user?.assigned_location);
      console.log('🔍 User assigned_location value:', user?.assigned_location);
      console.log('🔍 Full user object (JSON):', JSON.stringify(user, null, 2));

      // Test database connection first
      console.log('🔍 Testing database connection...');
      const { data: testData, error: testError } = await supabase
        .from('locations')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('❌ Database connection test failed:', testError);
        toast.error('Database connection failed');
        return;
      }
      console.log('✅ Database connection test passed');

      // Test user authentication
      console.log('🔍 Testing user authentication...');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ User authentication test failed:', authError);
        toast.error('User authentication failed');
        return;
      }
      console.log('✅ User authentication test passed');
      console.log('🔍 Auth user ID:', authUser?.id);
      console.log('🔍 Context user ID:', user?.id);
      console.log('🔍 IDs match:', authUser?.id === user?.id);

      // Test basic locations query
      console.log('🔍 Testing basic locations query...');
      const { data: basicLocations, error: basicError } = await supabase
        .from('locations')
        .select('id, name, address')
        .limit(5);
      
      if (basicError) {
        console.error('❌ Basic locations query failed:', basicError);
        toast.error('Basic locations query failed');
        return;
      }
      console.log('✅ Basic locations query passed, found:', basicLocations?.length || 0, 'locations');
      console.log('📍 Sample locations:', basicLocations);

      // Test if we can see all locations (for debugging)
      console.log('🔍 Testing total locations count...');
      const { count: totalLocations, error: countError } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('❌ Count query failed:', countError);
      } else {
        console.log('📍 Total locations in database:', totalLocations);
      }

      // Test database schema
      console.log('🔍 Testing database schema...');
      const { data: schemaTest, error: schemaError } = await supabase
        .from('locations')
        .select('*')
        .limit(1);
      
      if (schemaError) {
        console.error('❌ Schema test failed:', schemaError);
      } else if (schemaTest && schemaTest.length > 0) {
        console.log('📍 Locations table schema (sample row):', Object.keys(schemaTest[0]));
        console.log('📍 Sample row data:', schemaTest[0]);
      }

      // Test RLS policies
      console.log('🔍 Testing RLS policies...');
      try {
        // Try to get a specific location by ID to test RLS
        if (user.own_id) {
          const { data: rlsTest, error: rlsError } = await supabase
            .from('locations')
            .select('id, name, address')
            .eq('own_id', user.own_id)
            .limit(1);
          
          if (rlsError) {
            console.error('❌ RLS test failed:', rlsError);
          } else {
            console.log('✅ RLS test passed, found:', rlsTest?.length || 0, 'locations');
          }
        }
      } catch (rlsTestError) {
        console.error('❌ RLS test error:', rlsTestError);
      }

      // Check if location_owners table exists
      console.log('🔍 Checking if location_owners table exists...');
      try {
        const { data: ownersTest, error: ownersError } = await supabase
          .from('location_owners')
          .select('count')
          .limit(1);
        
        if (ownersError) {
          console.log('🔄 location_owners table does not exist or is not accessible:', ownersError.message);
        } else {
          console.log('✅ location_owners table exists and is accessible');
        }
      } catch (error) {
        console.log('🔄 Error checking location_owners table:', error);
      }

      // Check what locations the user should have access to
      console.log('🔍 Checking user access permissions...');
      if (user.role === 'owner' && user.own_id) {
        console.log('🔍 User is owner with own_id:', user.own_id);
        const { data: ownerLocations, error: ownerError } = await supabase
          .from('locations')
          .select('id, name, address, own_id')
          .eq('own_id', user.own_id);
        
        if (ownerError) {
          console.error('❌ Error checking owner locations:', ownerError);
        } else {
          console.log('📍 Owner locations found:', ownerLocations?.length || 0);
          console.log('📍 Owner locations:', ownerLocations);
        }
      } else if (user.role === 'manager' && user.assigned_location) {
        console.log('🔍 User is manager with assigned_location:', user.assigned_location);
        const { data: managerLocation, error: managerError } = await supabase
          .from('locations')
          .select('id, name, address')
          .eq('id', user.assigned_location);
        
        if (managerError) {
          console.error('❌ Error checking manager location:', managerError);
        } else {
          console.log('📍 Manager location found:', managerLocation);
        }
      } else {
        console.log('⚠️ User has no clear location access:', {
          role: user.role,
          own_id: user.own_id,
          assigned_location: user.assigned_location
        });
      }

      // Test if user can access their own data
      console.log('🔍 Testing user data access...');
      try {
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('id, email, role, own_id, assigned_location')
          .eq('id', user.id)
          .single();
        
        if (userDataError) {
          console.error('❌ Error accessing user data:', userDataError);
        } else {
          console.log('✅ User data access successful:', userData);
          console.log('🔍 Database user data vs context user data:', {
            dbRole: userData.role,
            contextRole: user.role,
            dbOwnId: userData.own_id,
            contextOwnId: user.own_id,
            dbAssignedLocation: userData.assigned_location,
            contextAssignedLocation: user.assigned_location
          });
        }
      } catch (userDataTestError) {
        console.error('❌ User data test error:', userDataTestError);
      }

      // Final simple test - try to get any location
      console.log('🔍 Final test - trying to get any location...');
      try {
        const { data: anyLocation, error: anyLocationError } = await supabase
          .from('locations')
          .select('id, name, address')
          .limit(1);
        
        if (anyLocationError) {
          console.error('❌ Final test failed:', anyLocationError);
        } else {
          console.log('✅ Final test passed, found:', anyLocation?.length || 0, 'locations');
        }
      } catch (finalTestError) {
        console.error('❌ Final test error:', finalTestError);
      }

      // Use the location filter utility
      let locationQuery = supabase
        .from('locations')
        .select('id, name, address');

      // Apply location filter based on user role and permissions
      const filter = getLocationFilter(user);
      console.log('🔍 Location filter:', filter);
      console.log('🔍 Filter query function type:', typeof filter.query);
      console.log('🔍 Filter isFiltered:', filter.isFiltered);

      // Test the filter function directly
      console.log('🔍 Testing filter function directly...');
      try {
        const testQuery = supabase.from('locations').select('id, name, address');
        console.log('🔍 Test query before filter:', testQuery);
        const filteredQuery = filter.query ? filter.query(testQuery) : testQuery;
        console.log('🔍 Test query after filter:', filteredQuery);
        console.log('🔍 Filter function test passed');
        
        // Test if the filtered query is actually different
        if (filteredQuery !== testQuery) {
          console.log('✅ Filter function modified the query');
        } else {
          console.log('⚠️ Filter function did not modify the query');
        }
      } catch (filterTestError) {
        console.error('❌ Filter function test failed:', filterTestError);
      }

      // Test the filter function with actual data
      console.log('🔍 Testing filter function with actual data...');
      try {
        const testQuery2 = supabase.from('locations').select('id, name, address');
        const filteredQuery2 = filter.query ? filter.query(testQuery2) : testQuery2;
        
        // Execute both queries to see the difference
        const { data: originalData, error: originalError } = await testQuery2;
        const { data: filteredData, error: filteredError } = await filteredQuery2;
        
        console.log('🔍 Original query result:', { data: originalData, error: originalError });
        console.log('🔍 Filtered query result:', { data: filteredData, error: filteredError });
        
        if (originalError) {
          console.error('❌ Original query failed:', originalError);
        }
        if (filteredError) {
          console.error('❌ Filtered query failed:', filteredError);
        }
        
        if (originalData && filteredData) {
          console.log('🔍 Data comparison:', {
            originalCount: originalData.length,
            filteredCount: filteredData.length,
            isFiltered: originalData.length !== filteredData.length
          });
        }
      } catch (filterDataTestError) {
        console.error('❌ Filter data test error:', filterDataTestError);
      }

      if (filter.isFiltered && filter.query) {
        try {
          console.log('🔍 About to apply filter query...');
          console.log('🔍 Original query object:', locationQuery);
          locationQuery = filter.query(locationQuery);
          console.log('🔍 Applied location filter:', filter.filterType);
          console.log('🔍 Modified query object:', locationQuery);
        } catch (filterError) {
          console.error('❌ Error applying location filter:', filterError);
          // Fallback to basic query if filter fails
          console.log('🔄 Falling back to basic location query...');
          if (user.role === 'owner' && user.own_id) {
            locationQuery = locationQuery.eq('own_id', user.own_id);
            console.log('🔄 Applied own_id fallback filter:', user.own_id);
          } else if (user.role === 'manager' && user.assigned_location) {
            locationQuery = locationQuery.eq('id', user.assigned_location);
            console.log('🔄 Applied assigned_location fallback filter:', user.assigned_location);
          }
        }
      } else {
        console.log('🔍 No location filter applied, using base query');
        console.log('🔍 Filter details:', {
          isFiltered: filter.isFiltered,
          hasQuery: !!filter.query,
          filterType: filter.filterType
        });
        
        // Apply comprehensive filtering for owners
        if (user.role === 'owner') {
          console.log('🔄 Applying comprehensive owner filtering...');
          
          // For owners, we need to get locations from both systems
          // First, get locations from the old own_id system
          let ownIdLocations: any[] = [];
          if (user.own_id) {
            const { data: ownIdData, error: ownIdError } = await supabase
              .from('locations')
              .select('id, name, address')
              .eq('own_id', user.own_id);
            
            if (!ownIdError && ownIdData) {
              ownIdLocations = ownIdData;
              console.log('🔄 Found locations from own_id system:', ownIdLocations.length);
            }
          }
          
          // Then, get locations from the new location_owners system
          let partnershipLocations: any[] = [];
          try {
            const { data: partnershipData, error: partnershipError } = await supabase
              .from('location_owners')
              .select('location_id')
              .eq('owner_id', user.id);
            
            if (!partnershipError && partnershipData && partnershipData.length > 0) {
              const locationIds = partnershipData.map(lo => lo.location_id);
              console.log('🔄 Found location IDs from partnership system:', locationIds);
              
              // Get the actual location data
              const { data: partnershipLocData, error: partnershipLocError } = await supabase
                .from('locations')
                .select('id, name, address')
                .in('id', locationIds);
              
              if (!partnershipLocError && partnershipLocData) {
                partnershipLocations = partnershipLocData;
                console.log('🔄 Found locations from partnership system:', partnershipLocations.length);
              }
            }
          } catch (partnershipError) {
            console.log('🔄 Partnership system not accessible, skipping:', partnershipError);
          }
          
          // Combine both sets of locations, removing duplicates
          const allLocationIds = new Set([
            ...ownIdLocations.map(loc => loc.id),
            ...partnershipLocations.map(loc => loc.id)
          ]);
          
          console.log('🔄 Total unique locations found:', allLocationIds.size);
          console.log('🔄 Location IDs:', Array.from(allLocationIds));
          
          if (allLocationIds.size > 0) {
            // Use the IN clause to get all locations
            locationQuery = locationQuery.in('id', Array.from(allLocationIds));
            console.log('🔄 Applied comprehensive filter for', allLocationIds.size, 'locations');
          } else if (user.own_id) {
            // Fallback to own_id if no locations found
            locationQuery = locationQuery.eq('own_id', user.own_id);
            console.log('🔄 Applied own_id fallback filter:', user.own_id);
          } else {
            // No associations: explicitly return no results
            locationQuery = locationQuery.eq('id', 'no-access');
            console.log('🔒 Owner has no associated locations yet; hiding all');
          }
        } else if (user.role === 'manager' && user.assigned_location) {
          locationQuery = locationQuery.eq('id', user.assigned_location);
          console.log('🔄 Applied assigned_location fallback filter:', user.assigned_location);
        } else {
          console.log('⚠️ No fallback filter available, user has no location access');
        }
      }

      console.log('🔍 Final location query before execution:', locationQuery);
      console.log('🔍 Query type:', typeof locationQuery);
      console.log('🔍 Query methods:', Object.getOwnPropertyNames(locationQuery));
      
      let locationData: any = null;
      let locationError: any = null;
      
      try {
        const result = await locationQuery;
        locationData = result.data;
        locationError = result.error;
        console.log('🔍 Location query result:', { data: locationData, error: locationError });

        if (locationError) {
          console.error('❌ Error fetching locations:', locationError);
          console.error('❌ Error details:', {
            message: locationError.message,
            details: locationError.details,
            hint: locationError.hint,
            code: locationError.code
          });
          toast.error('Failed to fetch locations');
          return;
        }

        console.log('📍 Fetched locations:', locationData);
        console.log('📍 Number of locations found:', locationData?.length || 0);
        
        setLocations(locationData || []);
        console.log('📍 Locations state set to:', locationData || []);
        
        if (locationData && locationData.length > 0) {
          setSelectedLocation(locationData[0].id);
          console.log('📍 Selected location set to:', locationData[0].id);
        } else {
          console.log('⚠️ No locations found for user');
        }
      } catch (queryError) {
        console.error('❌ Query execution error:', queryError);
        console.error('❌ Query error details:', {
          name: queryError.name,
          message: queryError.message,
          stack: queryError.stack
        });
        toast.error('Query execution failed');
        return;
      }
    } catch (error) {
      console.error('❌ Error in fetchUserLocations:', error);
      toast.error('Failed to fetch locations');
    } finally {
      setLoading(false);
      console.log('🏁 fetchUserLocations completed, loading set to false');
    }
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading locations...</p>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    console.log('⚠️ No locations found, showing "No Locations Found" page');
    console.log('📍 Current locations state:', locations);
    console.log('📍 Current loading state:', loading);
    console.log('📍 Current user:', user);
    
    return (
      <div className="min-h-screen bg-background">
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex h-full items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Location Partnerships</h1>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                {user?.role === 'owner' ? 'Owner Access' : 'Manager Access'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.history.back()}
              >
                <Home className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="locationName">{user?.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.role === 'owner' ? 'Owner' : 'Manager'} Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Locations Found</CardTitle>
              <CardDescription>
                You don't have access to any locations yet. Please contact your administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.history.back()}>
                <Home className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const selectedLocationData = locations.find(loc => loc.id === selectedLocation);
  
  console.log('🎯 Main render section:');
  console.log('📍 Locations:', locations);
  console.log('📍 Selected location:', selectedLocation);
  console.log('📍 Selected location data:', selectedLocationData);
  console.log('📍 Loading state:', loading);

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Location Partnerships</h1>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
              {user?.role === 'owner' ? 'Owner Access' : 'Manager Access'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.history.back()}
            >
              <Home className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.role === 'owner' ? 'Owner' : 'Manager'} Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Location Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Location</CardTitle>
            <CardDescription>
              Choose a location to manage its partnerships and ownership
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((location) => (
                <Button
                  key={location.id}
                  variant={selectedLocation === location.id ? "default" : "outline"}
                  className="h-auto p-4 flex flex-col items-start text-left"
                  onClick={() => handleLocationChange(location.id)}
                >
                  <div className="font-medium">{location.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {location.address}
                  </div>
                  {selectedLocation === location.id && (
                    <Badge variant="secondary" className="mt-2">
                      Selected
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Partnerships Management */}
        {selectedLocation && selectedLocationData && (
          <LocationPartnerships
            locationId={selectedLocation}
            locationName={selectedLocationData.name}
          />
        )}

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Location Partnerships</CardTitle>
            <CardDescription>
              Learn how partnerships work in the parking management system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Primary Owner</h4>
                <p className="text-sm text-muted-foreground">
                  The primary owner has full control over the location and can add/remove partners.
                  They can also manage ownership percentages and partnership agreements.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Partners</h4>
                <p className="text-sm text-muted-foreground">
                  Partners share ownership of the location with defined percentages. 
                  They can view location data and manage their own ownership stake.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Ownership Percentage</h4>
                <p className="text-sm text-muted-foreground">
                  Total ownership across all partners must equal 100%. 
                  This determines profit sharing and decision-making authority.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Access Control</h4>
                <p className="text-sm text-muted-foreground">
                  All partners can access location data, reports, and management features
                  based on their ownership percentage and role.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
