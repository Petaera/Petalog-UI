import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Database, Gauge, Gift, Download, Zap, Eye, BarChart3, Car, Truck, Building, Warehouse, Shield, Users, Timer, FileText } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from '@/contexts/AuthContext';

const DashboardManager = () => {
  const { user } = useAuth();
  const [manualLogs, setManualLogs] = useState<any[]>([]);
  const [autoLogs, setAutoLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      let manQuery = supabase
        .from('logs-man')
        .select('id, entry_time, location_id, vehicle_id, vehicles(number_plate)')
        .eq('approval_status', 'approved') // Only show approved manual logs
        .order('entry_time', { ascending: false });
      let autoQuery = supabase
        .from('logs-auto')
        .select('id, entry_time, location_id, vehicle_id, vehicles(number_plate)')
        .order('entry_time', { ascending: false });
      if (user?.assigned_location) {
        manQuery = manQuery.eq('location_id', user.assigned_location);
        autoQuery = autoQuery.eq('location_id', user.assigned_location);
      }
      const { data: manData } = await manQuery;
      setManualLogs(manData || []);
      const { data: autoData } = await autoQuery;
      setAutoLogs(autoData || []);
    };
    fetchLogs();
  }, [user?.assigned_location]);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome to your vehicle logging dashboard</p>
        </div>

        {/* Quick Stats */}
        {/*
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles Today</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-muted-foreground">
                Currently in facility
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,345</div>
              <p className="text-xs text-muted-foreground">
                +15.3% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23m</div>
              <p className="text-xs text-muted-foreground">
                Per vehicle session
              </p>
            </CardContent>
          </Card>
        </div>
        */}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Logged Entries</CardTitle>
              <CardDescription>
                Vehicles entered by staff
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
                    </div>
                    <Badge variant="secondary">Entry</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/*
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
          */}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardManager; 