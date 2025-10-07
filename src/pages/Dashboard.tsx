import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Database, Gauge, Gift, Download, Zap, Eye, BarChart3, Car, Truck, Building, Warehouse, Shield, Users, Timer, FileText, MapPin, RefreshCw, PenTool, Settings } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from '@/contexts/AuthContext';
import { applyLocationFilter, getLocationFilterDescription } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useLogsQuery } from "@/hooks/useSupabaseQuery";

// Accept selectedLocation as a prop
const Dashboard = ({ selectedLocation }: { selectedLocation?: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalVehiclesToday: 0,
    activeSessions: 0,
    revenueToday: 0,
    loading: true
  });
  const [locationFilterApplied, setLocationFilterApplied] = useState(false);

  // Use the new hook for better error handling
  const { 
    data: manualLogs, 
    error: manualLogsError, 
    loading: manualLogsLoading,
    refetch: refetchManualLogs 
  } = useLogsQuery('logs-man', { 
    retries: 3, 
    retryDelay: 2000, 
    timeout: 45000 
  });

  const { 
    data: autoLogs, 
    error: autoLogsError, 
    loading: autoLogsLoading,
    refetch: refetchAutoLogs 
  } = useLogsQuery('logs-auto', { 
    retries: 3, 
    retryDelay: 2000, 
    timeout: 45000 
  });



  // Handle errors and show retry options
  useEffect(() => {
    if (manualLogsError) {
      console.error('❌ Manual logs error:', manualLogsError);
    }
    if (autoLogsError) {
      console.error('❌ Auto logs error:', autoLogsError);
    }
  }, [manualLogsError, autoLogsError]);

  // Apply location filtering to the fetched data
  useEffect(() => {
    if (manualLogs && autoLogs) {
      let filteredManualLogs = manualLogs;
      let filteredAutoLogs = autoLogs;
      let isFiltered = false;

      // Apply location filtering
      if (user?.role === 'manager' && user?.assigned_location) {
        filteredManualLogs = manualLogs.filter(log => log.location_id === user.assigned_location);
        filteredAutoLogs = autoLogs.filter(log => log.location_id === user.assigned_location);
        isFiltered = true;
      } else if (user?.role === 'owner' && selectedLocation && selectedLocation.trim() !== '') {
        filteredManualLogs = manualLogs.filter(log => log.location_id === selectedLocation);
        filteredAutoLogs = autoLogs.filter(log => log.location_id === selectedLocation);
        isFiltered = true;
      }

      setLocationFilterApplied(isFiltered);


    }
  }, [manualLogs, autoLogs, user?.role, user?.assigned_location, selectedLocation]);

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



      // Build queries with location filter if needed
      // Only count approved/closed tickets for today's income (excluding Pay Later/credit)
      let todayQuery = supabase
        .from('logs-man')
        .select('Amount, created_at, location_id, approval_status, payment_mode')
        .eq('approval_status', 'approved') // Only count approved/closed tickets
        .neq('payment_mode', 'credit') // Exclude Pay Later/credit tickets
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());
      
      if (locationFilter) {
        todayQuery = todayQuery.eq('location_id', locationFilter);
      }

      const { data: todayData, error: todayError } = await todayQuery;
      
      
      
      // Calculate stats - only for approved/closed tickets
      const totalVehiclesToday = todayData?.length || 0;
      const revenueToday = todayData?.reduce((sum, log) => sum + (log.Amount || 0), 0) || 0;
      
      
      
      // For active sessions, we'll use pending approval status as a proxy
      // Only count pending tickets from today
      let activeQuery = supabase
        .from('logs-man')
        .select('id, location_id, entry_time, created_at')
        .eq('approval_status', 'pending')
        .gte('entry_time', startOfDay.toISOString())
        .lt('entry_time', endOfDay.toISOString());
      
             if (locationFilter) {
         activeQuery = activeQuery.eq('location_id', locationFilter);
       }
      
      const { data: activeData, error: activeError } = await activeQuery;
      let activeSessions = activeData?.length || 0;
      
      
      
      setStats({
        totalVehiclesToday,
        activeSessions,
        revenueToday,
        loading: false
      });
      
      setLocationFilterApplied(isLocationFiltered);
      
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    // Only fetch stats when we have the necessary data
    if (user?.id && (user?.role === 'manager' ? user?.assigned_location : selectedLocation)) {
      fetchStats();
    }
  }, [user?.id, user?.role, user?.assigned_location, selectedLocation]); // Removed fetchStats from dependencies

     // Retry function for failed queries
   const handleRetry = () => {
     refetchManualLogs();
     refetchAutoLogs();
     fetchStats();
   };

  // Show error state with retry option
  if (manualLogsError && autoLogsError) {
    return (
      <Layout selectedLocation={selectedLocation || ""} onLocationChange={() => {}}>
        <div className="p-4 lg:p-6">
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connection Error</h2>
            <p className="text-gray-600 mb-6">
              Unable to connect to the database. This might be a temporary network issue.
            </p>
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Retry Connection
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
          {(manualLogsError || autoLogsError) && (
            <button
              onClick={handleRetry}
              className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 lg:mb-8">
        {/* Manual Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Recent Manual Logs
              {manualLogsLoading && <span className="text-sm text-gray-500">(Loading...)</span>}
            </CardTitle>
            <CardDescription>
              Latest manual vehicle entries
              {locationFilterApplied && (
                <span className="ml-1 text-blue-600">📍 Location filtered</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {manualLogsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading logs...</p>
              </div>
            ) : manualLogsError ? (
              <div className="text-center py-8">
                <div className="text-red-500 text-4xl mb-2">⚠️</div>
                <p className="text-red-600 mb-2">Failed to load manual logs</p>
                <button
                  onClick={() => refetchManualLogs()}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Click to retry
                </button>
              </div>
            ) : manualLogs && manualLogs.length > 0 ? (
              <div className="space-y-3">
                {manualLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-sm">
                          {log.vehicles?.number_plate || 'Unknown Vehicle'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.entry_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Manual
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No manual logs found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Automatic Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Recent Automatic Logs
              {autoLogsLoading && <span className="text-sm text-gray-500">(Loading...)</span>}
            </CardTitle>
            <CardDescription>
              Latest automatic vehicle entries
              {locationFilterApplied && (
                <span className="ml-1 text-blue-600">📍 Location filtered</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {autoLogsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading logs...</p>
              </div>
            ) : autoLogsError ? (
              <div className="text-center py-8">
                <div className="text-red-500 text-4xl mb-2">⚠️</div>
                <p className="text-red-600 mb-2">Failed to load automatic logs</p>
                <button
                  onClick={() => refetchAutoLogs()}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Click to retry
                </button>
              </div>
            ) : autoLogs && autoLogs.length > 0 ? (
              <div className="space-y-3">
                {autoLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-sm">
                          {log.vehicles?.number_plate || 'Unknown Vehicle'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.entry_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Auto
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No automatic logs found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/manual-logs')}
        >
          <CardContent className="p-4 text-center">
            <PenTool className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium">Manual Entry</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/automatic-logs')}
        >
          <CardContent className="p-4 text-center">
            <Database className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="font-medium">View Auto Logs</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/reports')}
        >
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="font-medium">Reports</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => navigate('/price-settings')}
        >
          <CardContent className="p-4 text-center">
            <Settings className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <p className="font-medium">Settings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;