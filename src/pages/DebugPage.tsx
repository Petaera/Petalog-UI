import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Database, User, MapPin, Settings, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getEnvironmentStatus } from "@/lib/supabaseClient";
import { RequestMonitor } from "@/components/debug/RequestMonitor";

export default function DebugPage() {
  const { user } = useAuth();
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [localStorageContent, setLocalStorageContent] = useState<string>("");

  const refreshData = () => {
    setEnvStatus(getEnvironmentStatus());
    if (user?.id) {
      const storedLocation = localStorage.getItem(`selectedLocation_${user.id}`);
      setLocalStorageContent(storedLocation || "None");
    }
  };

  const clearStoredLocation = () => {
    if (user?.id) {
      localStorage.removeItem(`selectedLocation_${user.id}`);
      setLocalStorageContent("None");
    }
  };

  useEffect(() => {
    refreshData();
  }, [user?.id]);

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Debug Panel</h1>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Environment Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Environment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Supabase URL:</span>
                <Badge variant={envStatus?.hasSupabaseUrl ? "default" : "destructive"}>
                  {envStatus?.hasSupabaseUrl ? "Set" : "Missing"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Supabase Key:</span>
                <Badge variant={envStatus?.hasSupabaseAnonKey ? "default" : "destructive"}>
                  {envStatus?.hasSupabaseAnonKey ? "Set" : "Missing"}
                </Badge>
              </div>
              {envStatus && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date(envStatus.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Monitor */}
          <RequestMonitor />

          {/* User Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">User ID:</span>
                <span className="text-sm font-mono">{user?.id || "Not logged in"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Role:</span>
                <Badge variant="outline">{user?.role || "Unknown"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Email:</span>
                <span className="text-sm">{user?.email || "N/A"}</span>
              </div>
              {user?.role === 'manager' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Assigned Location:</span>
                  <span className="text-sm font-mono">{user?.assigned_location || "None"}</span>
                </div>
              )}
              {user?.role === 'owner' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Own ID:</span>
                  <span className="text-sm font-mono">{user?.own_id || "None"}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Selected Location:</span>
                <span className="text-sm font-mono">
                  {localStorageContent}
                </span>
              </div>
              <Button 
                onClick={clearStoredLocation} 
                variant="outline" 
                size="sm"
                className="w-full"
              >
                Clear Stored Location
              </Button>
            </CardContent>
          </Card>

          {/* Vercel Troubleshooting */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Vercel Troubleshooting Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Environment Variables</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Set VITE_SUPABASE_URL in Vercel</li>
                    <li>• Set VITE_SUPABASE_ANON_KEY in Vercel</li>
                    <li>• Redeploy after setting variables</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Common Issues</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Clear browser cache after redeploy</li>
                    <li>• Check browser console for errors</li>
                    <li>• Verify Supabase RLS policies</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm font-medium text-blue-800 mb-2">
                  Current Environment Variables:
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>VITE_SUPABASE_URL: {envStatus?.hasSupabaseUrl ? "✅ Set" : "❌ Missing"}</div>
                  <div>VITE_SUPABASE_ANON_KEY: {envStatus?.hasSupabaseAnonKey ? "✅ Set" : "❌ Missing"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
