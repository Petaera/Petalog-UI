import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Database, Gauge, Gift, Download, Zap, Eye, BarChart3, Car, Truck, Building, Warehouse, Shield, Users, Timer, FileText } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from '@/contexts/AuthContext';

// Accept selectedLocation as a prop
const Dashboard = ({ selectedLocation }: { selectedLocation?: string }) => {
  const { user } = useAuth();
  const [manualLogs, setManualLogs] = useState<any[]>([]);
  const [autoLogs, setAutoLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVehiclesToday: 0,
    activeSessions: 0,
    revenueToday: 0,
    averageDuration: 0,
    loading: true
  });

  useEffect(() => {
    const fetchLogs = async () => {
      let manQuery = supabase
        .from('logs-man')
        .select('id, entry_time, location_id, vehicle_id, vehicles(number_plate)')
        .eq('approval_status', 'approved') // Only show approved manual logs
        .order('entry_time', { ascending: false })
        .limit(3);
      let autoQuery = supabase
        .from('logs-auto')
        .select('id, entry_time, location_id, vehicle_id, vehicles(number_plate)')
        .order('entry_time', { ascending: false })
        .limit(3);
      if (user?.role === 'manager' && user?.assigned_location) {
        manQuery = manQuery.eq('location_id', user.assigned_location);
        autoQuery = autoQuery.eq('location_id', user.assigned_location);
      } else if (user?.role === 'owner' && selectedLocation) {
        manQuery = manQuery.eq('location_id', selectedLocation);
        autoQuery = autoQuery.eq('location_id', selectedLocation);
      }
      const { data: manData } = await manQuery;
      setManualLogs(manData || []);
      const { data: autoData } = await autoQuery;
      setAutoLogs(autoData || []);
    };

    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true }));
        
        // Get today's date range
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        let locationFilter = '';
        if (user?.role === 'manager' && user?.assigned_location) {
          locationFilter = user.assigned_location;
        } else if (user?.role === 'owner' && selectedLocation) {
          locationFilter = selectedLocation;
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
          console.log('📍 Applying location filter:', locationFilter);
          todayQuery = todayQuery.eq('location_id', locationFilter);
        } else {
          console.log('📍 No location filter applied - showing all locations');
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
        let activeQuery = supabase
          .from('logs-man')
          .select('id, location_id')
          .eq('approval_status', 'pending');
        
        if (locationFilter) {
          console.log('📍 Applying location filter to active sessions:', locationFilter);
          activeQuery = activeQuery.eq('location_id', locationFilter);
        }
        
        const { data: activeData, error: activeError } = await activeQuery;
        const activeSessions = activeData?.length || 0;
        
        console.log('🔄 Active sessions query result:');
        console.log('- Error:', activeError);
        console.log('- Active sessions count:', activeSessions);
        console.log('- Sample active data:', activeData?.slice(0, 3));
        
        setStats({
          totalVehiclesToday,
          activeSessions,
          revenueToday,
          averageDuration: 25, // Placeholder for now
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

  return (
    <Layout>
      <div className="p-4 lg:p-6">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome to your vehicle logging dashboard</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card>
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
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.loading ? "..." : stats.activeSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.loading ? "..." : `${stats.averageDuration}m`}
              </div>
              <p className="text-xs text-muted-foreground">
                Per vehicle session
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Logged Entries</CardTitle>
              <CardDescription>
                Vehicles entered manually by staff
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {manualLogs.length === 0 && <div className="text-muted-foreground text-sm">No manual entries found.</div>}
                {manualLogs.map((entry, idx) => (
                  <div key={idx} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Car className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.vehicles?.number_plate || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{new Date(entry.entry_time).toLocaleString()}</p>
                      {/* Optionally show location name here if needed */}
                    </div>
                    <Badge variant="secondary">Entry</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto Logged Entries</CardTitle>
              <CardDescription>
                Vehicles automatically logged by the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {autoLogs.length === 0 && <div className="text-muted-foreground text-sm">No auto entries found.</div>}
                {autoLogs.map((entry, idx) => (
                  <div key={idx} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Car className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.vehicles?.number_plate || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{new Date(entry.entry_time).toLocaleString()}</p>
                    </div>
                    <Badge variant="secondary">Entry</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;