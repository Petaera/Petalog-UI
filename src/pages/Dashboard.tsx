import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Database, Gauge, Gift, Download, Zap, Eye, BarChart3, Car, Truck, Building, Warehouse, Shield, Users, Timer, FileText, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from '@/contexts/AuthContext';
import { applyLocationFilter, getLocationFilterDescription, debugLocationFiltering, debugVehicleData } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Accept selectedLocation as a prop
const Dashboard = ({ selectedLocation }: { selectedLocation?: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [manualLogs, setManualLogs] = useState<any[]>([]);
  const [autoLogs, setAutoLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVehiclesToday: 0,
    activeSessions: 0,
    revenueToday: 0,
    loading: true
  });
  const [locationFilterApplied, setLocationFilterApplied] = useState(false);

  // Debug logging
  console.log('🎯 Dashboard component rendered with:', {
    user: user ? { id: user.id, role: user.role, assignedLocation: user.assigned_location } : null,
    selectedLocation,
    hasUser: !!user,
    userRole: user?.role,
    assignedLocation: user?.assigned_location
  });

  useEffect(() => {
    const fetchLogs = async () => {
      console.log('🔍 Fetching logs with params:', {
        userRole: user?.role,
        assignedLocation: user?.assigned_location,
        selectedLocation,
        userId: user?.id
      });

      // First, let's test the vehicles table and relationships
      console.log('🔍 Testing vehicles table and relationships...');
      const { data: vehiclesTest, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, number_plate')
        .limit(5);
      
      console.log('🚗 Vehicles table test:', {
        data: vehiclesTest,
        error: vehiclesError,
        count: vehiclesTest?.length || 0
      });

      // If vehicles table is empty, let's add some sample data
      if (!vehiclesTest || vehiclesTest.length === 0) {
        console.log('⚠️ Vehicles table is empty, adding sample data...');
        const sampleVehicles = [
          { id: 'vehicle-001', number_plate: 'KL07AT0342' },
          { id: 'vehicle-002', number_plate: 'KL87TT0053' },
          { id: 'vehicle-003', number_plate: 'KL01AB1234' },
          { id: 'vehicle-004', number_plate: 'KL02CD5678' },
          { id: 'vehicle-005', number_plate: 'KL03EF9012' }
        ];
        
        const { error: insertError } = await supabase
          .from('vehicles')
          .insert(sampleVehicles);
        
        if (insertError) {
          console.error('❌ Error inserting sample vehicles:', insertError);
        } else {
          console.log('✅ Added sample vehicles to database');
        }
      }

      // Test a simple log query to see the structure
      const { data: logTest, error: logTestError } = await supabase
        .from('logs-auto')
        .select('id, vehicle_id, entry_time')
        .limit(3);
      
      console.log('📝 Log structure test:', {
        data: logTest,
        error: logTestError,
        count: logTest?.length || 0
      });

      // Build queries with proper location filtering
      let manQuery = supabase
        .from('logs-man')
        .select(`
          id, 
          entry_time, 
          location_id, 
          vehicle_id,
          vehicles(number_plate)
        `)
        .order('entry_time', { ascending: false })
        .limit(10);
      
      let autoQuery = supabase
        .from('logs-auto')
        .select(`
          id, 
          entry_time, 
          location_id, 
          vehicle_id,
          vehicles(number_plate)
        `)
        .order('entry_time', { ascending: false })
        .limit(10);
      
      // Apply location filtering based on user role and permissions
      let isLocationFiltered = false;
      let appliedLocationId = '';
      
      console.log('🔍 Location filtering debug:', {
        userRole: user?.role,
        assignedLocation: user?.assigned_location,
        selectedLocation: selectedLocation,
        selectedLocationType: typeof selectedLocation,
        selectedLocationLength: selectedLocation?.length
      });
      
      if (user?.role === 'manager' && user?.assigned_location) {
        console.log('👨‍💼 Manager filtering by assigned location:', user.assigned_location);
        manQuery = manQuery.eq('location_id', user.assigned_location);
        autoQuery = autoQuery.eq('location_id', user.assigned_location);
        isLocationFiltered = true;
        appliedLocationId = user.assigned_location;
      } else if (user?.role === 'owner' && selectedLocation && selectedLocation.trim() !== '') {
        console.log('👑 Owner filtering by selected location:', selectedLocation);
        manQuery = manQuery.eq('location_id', selectedLocation);
        autoQuery = autoQuery.eq('location_id', selectedLocation);
        isLocationFiltered = true;
        appliedLocationId = selectedLocation;
      } else {
        console.log('⚠️ No location filter applied - showing all data');
        console.log('   Reason:', {
          isManager: user?.role === 'manager',
          hasAssignedLocation: !!user?.assigned_location,
          isOwner: user?.role === 'owner',
          hasSelectedLocation: !!selectedLocation,
          selectedLocationTrimmed: selectedLocation?.trim(),
          isEmpty: selectedLocation?.trim() === ''
        });
        isLocationFiltered = false;
      }
      
      // Add location filter status to debug logs
      console.log('📍 Location filter status:', {
        applied: isLocationFiltered,
        userRole: user?.role,
        assignedLocation: user?.assigned_location,
        selectedLocation: selectedLocation,
        filterType: user?.role === 'manager' ? 'assigned' : 'selected'
      });
      
      // Update the location filter state for UI
      setLocationFilterApplied(isLocationFiltered);

      // Execute queries
      const { data: manData, error: manError } = await manQuery;
      const { data: autoData, error: autoError } = await autoQuery;

      // If the inner join fails, let's try a left join to see what data we have
      if (manError || autoError) {
        console.log('⚠️ Inner join failed, trying left join...');
        
        const { data: manDataLeft, error: manErrorLeft } = await supabase
          .from('logs-man')
          .select(`
            id, 
            entry_time, 
            location_id, 
            vehicle_id,
            vehicles(number_plate)
          `)
          .order('entry_time', { ascending: false })
          .limit(10);
        
        const { data: autoDataLeft, error: autoErrorLeft } = await supabase
          .from('logs-auto')
          .select(`
            id, 
            entry_time, 
            location_id, 
            vehicle_id,
            vehicles(number_plate)
          `)
          .order('entry_time', { ascending: false })
          .limit(10);
        
        console.log('📊 Left join results:', {
          manual: { data: manDataLeft, error: manErrorLeft },
          auto: { data: autoDataLeft, error: autoErrorLeft }
        });
      }
      
      console.log('📊 Manual logs result:', { 
        data: manData, 
        error: manError, 
        count: manData?.length,
        sample: manData?.slice(0, 2),
        vehicleData: manData?.map(log => ({
          vehicle_id: log.vehicle_id,
          vehicle_plate: (log.vehicles as any)?.number_plate || (log.vehicles as any)?.[0]?.number_plate,
          has_vehicle_data: !!((log.vehicles as any)?.number_plate || (log.vehicles as any)?.[0]?.number_plate),
          entry_time: log.entry_time,
          entry_time_parsed: new Date(log.entry_time).toLocaleString()
        }))
      });
      console.log('📊 Auto logs result:', { 
        data: autoData, 
        error: autoError, 
        count: autoData?.length,
        sample: autoData?.slice(0, 2),
        vehicleData: autoData?.map(log => ({
          vehicle_id: log.vehicle_id,
          vehicle_plate: (log.vehicles as any)?.number_plate || (log.vehicles as any)?.[0]?.number_plate,
          has_vehicle_data: !!((log.vehicles as any)?.number_plate || (log.vehicles as any)?.[0]?.number_plate),
          entry_time: log.entry_time,
          entry_time_parsed: new Date(log.entry_time).toLocaleString()
        }))
      });
      
      // Debug: Show location IDs in the returned data
      if (manData && manData.length > 0) {
        console.log('📍 Manual logs location IDs:', manData.map(log => ({
          location_id: log.location_id,
          entry_time: log.entry_time,
          vehicle_plate: (log.vehicles as any)?.number_plate || (log.vehicles as any)?.[0]?.number_plate
        })));
      }
      if (autoData && autoData.length > 0) {
        console.log('📍 Auto logs location IDs:', autoData.map(log => ({
          location_id: log.location_id,
          entry_time: log.entry_time,
          vehicle_plate: (log.vehicles as any)?.number_plate || (log.vehicles as any)?.[0]?.number_plate
        })));
      }
      
      // Debug: Check if filtering worked
      if (isLocationFiltered && appliedLocationId) {
        const manualFiltered = manData?.every(log => log.location_id === appliedLocationId);
        const autoFiltered = autoData?.every(log => log.location_id === appliedLocationId);
        console.log('✅ Location filtering verification:', {
          manualFiltered,
          autoFiltered,
          expectedLocation: appliedLocationId,
          manualCount: manData?.length || 0,
          autoCount: autoData?.length || 0
        });
      }

      setManualLogs(manData || []);
      setAutoLogs(autoData || []);
      
      // Debug location filtering
      debugLocationFiltering(user, selectedLocation || '', manData || [], 'Manual Logs');
      debugLocationFiltering(user, selectedLocation || '', autoData || [], 'Auto Logs');
      
      // Debug vehicle data fetching
      debugVehicleData(manData || [], 'Manual Logs');
      debugVehicleData(autoData || [], 'Auto Logs');
    };

    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true }));
        
        // Get today's date range
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        let locationFilter = '';
        let isLocationFiltered = false;
        
        // Apply the same location filtering logic as fetchLogs
        if (user?.role === 'manager' && user?.assigned_location) {
          locationFilter = user.assigned_location;
          isLocationFiltered = true;
        } else if (user?.role === 'owner' && selectedLocation && selectedLocation.trim() !== '') {
          locationFilter = selectedLocation;
          isLocationFiltered = true;
        }

        console.log('🏢 Dashboard Stats Debug:');
        console.log('- User role:', user?.role);
        console.log('- User assigned_location:', user?.assigned_location);
        console.log('- Selected location prop:', selectedLocation);
        console.log('- Final location filter:', locationFilter);
        console.log('- Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

        // Build queries with location filter if needed
        let todayQuery = supabase
          .from('logs-man')
          .select('Amount, created_at, location_id')
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString());
        
        if (locationFilter) {
          console.log('📍 Applying location filter to stats:', locationFilter);
          todayQuery = todayQuery.eq('location_id', locationFilter);
        } else {
          console.log('📍 No location filter applied to stats - showing all locations');
        }

        const { data: todayData, error: todayError } = await todayQuery;
        
        console.log('📊 Today\'s data query result:');
        console.log('- Error:', todayError);
        console.log('- Data count:', todayData?.length || 0);
        console.log('- Sample data:', todayData?.slice(0, 3));
        
        // Calculate stats
        const totalVehiclesToday = todayData?.length || 0;
        const revenueToday = todayData?.reduce((sum, log) => sum + (log.Amount || 0), 0) || 0;
        
        console.log('💰 Calculated stats:');
        console.log('- Total vehicles today:', totalVehiclesToday);
        console.log('- Revenue today:', revenueToday);
        
        // For active sessions, we'll use pending approval status as a proxy
        // Only count pending tickets from today
        let activeQuery = supabase
          .from('logs-man')
          .select('id, location_id, entry_time, created_at')
          .eq('approval_status', 'pending')
          .gte('entry_time', startOfDay.toISOString())
          .lt('entry_time', endOfDay.toISOString());
        
        if (locationFilter) {
          console.log('📍 Applying location filter to active sessions:', locationFilter);
          activeQuery = activeQuery.eq('location_id', locationFilter);
        }
        
        const { data: activeData, error: activeError } = await activeQuery;
        let activeSessions = activeData?.length || 0;
        
        // If no results with entry_time filter, try created_at as fallback
        if (activeSessions === 0) {
          console.log('🔄 No pending tickets found with entry_time filter, trying created_at fallback...');
          let fallbackQuery = supabase
            .from('logs-man')
            .select('id, location_id')
            .eq('approval_status', 'pending')
            .gte('created_at', startOfDay.toISOString())
            .lt('created_at', endOfDay.toISOString());
          
          if (locationFilter) {
            fallbackQuery = fallbackQuery.eq('location_id', locationFilter);
          }
          
          const { data: fallbackData, error: fallbackError } = await fallbackQuery;
          activeSessions = fallbackData?.length || 0;
          
          console.log('🔄 Fallback query result:', {
            error: fallbackError,
            count: activeSessions,
            sample: fallbackData?.slice(0, 3)
          });
        }
        
        console.log('🔄 Active sessions query result:');
        console.log('- Error:', activeError);
        console.log('- Active sessions count:', activeSessions);
        console.log('- Sample active data:', activeData?.slice(0, 3));
        console.log('- Date range for pending tickets:', startOfDay.toISOString(), 'to', endOfDay.toISOString());
        console.log('- Filter method used:', activeSessions > 0 ? 'entry_time' : 'created_at (fallback)');
        
        setStats({
          totalVehiclesToday,
          activeSessions,
          revenueToday,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchLogs();
    fetchStats();
  }, [user?.assigned_location, user?.role, selectedLocation]);

  // Get current location name for display
  const getCurrentLocationName = () => {
    if (user?.role === 'manager' && user?.assigned_location) {
      return `Manager Location (${user.assigned_location})`;
    } else if (selectedLocation) {
      return `Selected Location (${selectedLocation})`;
    }
    return 'All Locations';
  };

  // Helper function to format dates properly
  const formatEntryTime = (entryTime: string) => {
    try {
      const date = new Date(entryTime);
      // Check if the date is valid (not NaN)
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      // Check if it's a Unix epoch date (1970-01-01)
      if (date.getFullYear() === 1970) {
        return 'No Entry Time';
      }
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error, entryTime);
      return 'Invalid Date';
    }
  };

  // Check if owner has no location selected
  const isOwner = user?.role === 'owner';
  const hasNoLocation = isOwner && (!selectedLocation || selectedLocation.trim() === '');
  
  if (hasNoLocation) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Location Selected</h2>
          <p className="text-gray-600 mb-4 max-w-md">
            Please select a location from the dropdown above to view dashboard data.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> As an owner, you need to select a specific location to view its data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <p className="text-gray-600">Welcome to your vehicle logging dashboard</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/manual-logs')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles Today</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.loading ? "..." : stats.totalVehiclesToday.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Vehicles processed today
              {locationFilterApplied && (
                <span className="ml-1 text-blue-600">📍 Filtered</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/manual-logs')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tickets Today</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.loading ? "..." : stats.activeSessions}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval today
              {locationFilterApplied && (
                <span className="ml-1 text-blue-600">📍 Filtered</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/reports')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.loading ? "..." : `₹${stats.revenueToday.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total earnings today
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/manual-logs')}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Manual Logged Entries
              <Badge variant="outline" className="text-xs">Click to view</Badge>
            </CardTitle>
            <CardDescription>
              Vehicles entered manually by staff
              {locationFilterApplied && (
                <span className="ml-2 text-blue-600">📍 Location filtered</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {manualLogs.length === 0 && (
                <div className="text-muted-foreground text-sm">
                  No manual entries found for this location.
                </div>
              )}
              {manualLogs.map((entry, idx) => (
                <div key={idx} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {(entry.vehicles as any)?.number_plate || (entry.vehicles as any)?.[0]?.number_plate || 'Unknown Vehicle'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatEntryTime(entry.entry_time)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Location ID: {entry.location_id?.slice(0, 8)}...
                    </p>
                  </div>
                  <Badge variant="secondary">Entry</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/automatic-logs')}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Auto Logged Entries
              <Badge variant="outline" className="text-xs">Click to view</Badge>
            </CardTitle>
            <CardDescription>
              Vehicles automatically logged by the system
              {locationFilterApplied && (
                <span className="ml-2 text-blue-600">📍 Location filtered</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {autoLogs.length === 0 && (
                <div className="text-muted-foreground text-sm">
                  No auto entries found for this location.
                </div>
              )}
              {autoLogs.map((entry, idx) => (
                <div key={idx} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {(entry.vehicles as any)?.number_plate || (entry.vehicles as any)?.[0]?.number_plate || 'Unknown Vehicle'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatEntryTime(entry.entry_time)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Location ID: {entry.location_id?.slice(0, 8)}...
                    </p>
                  </div>
                  <Badge variant="secondary">Entry</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;