import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DebugPanelProps {
  user: any;
  locations: any[];
  filteredLocations: any[];
  isLoading: boolean;
  error: any;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  user,
  locations,
  filteredLocations,
  isLoading,
  error
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [environmentInfo, setEnvironmentInfo] = useState<any>({});
  const [databaseTest, setDatabaseTest] = useState<any>({});

  useEffect(() => {
    // Collect environment information
    setEnvironmentInfo({
      nodeEnv: import.meta.env.MODE,
      viteMode: import.meta.env.MODE,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      isVercel: window.location.hostname.includes('vercel.app')
    });
  }, []);

  const testDatabaseConnection = async () => {
    try {
      setDatabaseTest({ status: 'testing', message: 'Testing database connection...' });
      
      // Test basic Supabase connection
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
      );
      
      // Test simple query
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, own_id, assigned_location')
        .limit(1);
      
      if (error) {
        setDatabaseTest({ 
          status: 'error', 
          message: `Database connection failed: ${error.message}`,
          details: error
        });
      } else {
        setDatabaseTest({ 
          status: 'success', 
          message: 'Database connection successful',
          data: data
        });
      }
    } catch (err: any) {
      setDatabaseTest({ 
        status: 'error', 
        message: `Connection test failed: ${err.message}`,
        details: err
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'testing': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Debug Panel - Location Issue Investigation
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Environment Information */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">🌍 Environment Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div><strong>Mode:</strong> {environmentInfo.viteMode}</div>
            <div><strong>Node Env:</strong> {environmentInfo.nodeEnv}</div>
            <div><strong>Host:</strong> {environmentInfo.isLocalhost ? 'Localhost' : environmentInfo.isVercel ? 'Vercel' : 'Other'}</div>
            <div><strong>Supabase URL:</strong> {environmentInfo.supabaseUrl}</div>
            <div><strong>Supabase Key:</strong> {environmentInfo.supabaseKey}</div>
            <div><strong>Timestamp:</strong> {environmentInfo.timestamp}</div>
          </div>
        </div>

        <Separator />

        {/* User Information */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">👤 User Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div><strong>User ID:</strong> {user?.id || '❌ Not loaded'}</div>
            <div><strong>Email:</strong> {user?.email || '❌ Not loaded'}</div>
            <div><strong>Role:</strong> {user?.role || '❌ Not loaded'}</div>
            <div><strong>Own ID:</strong> {user?.own_id || '❌ Not loaded'}</div>
            <div><strong>Assigned Location:</strong> {user?.assigned_location || '❌ Not loaded'}</div>
            <div><strong>User Loaded:</strong> {user ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>

        <Separator />

        {/* Location Information */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">📍 Location Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div><strong>Total Locations:</strong> {locations?.length || 0}</div>
            <div><strong>Filtered Locations:</strong> {filteredLocations?.length || 0}</div>
            <div><strong>Loading:</strong> {isLoading ? '🔄 Yes' : '✅ No'}</div>
            <div><strong>Error:</strong> {error ? '❌ Yes' : '✅ No'}</div>
            <div><strong>User Role:</strong> {user?.role || 'Unknown'}</div>
            <div><strong>Filter Applied:</strong> {user?.role === 'owner' ? 'own_id' : user?.role === 'manager' ? 'assigned_location' : 'None'}</div>
          </div>
        </div>

        {isExpanded && (
          <>
            <Separator />
            
            {/* Detailed Location Data */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">📊 Detailed Location Data</h3>
              <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                <pre className="text-xs">
                  {JSON.stringify({ locations, filteredLocations }, null, 2)}
                </pre>
              </div>
            </div>

            <Separator />

            {/* Database Connection Test */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">🔌 Database Connection Test</h3>
              <Button 
                onClick={testDatabaseConnection}
                disabled={databaseTest.status === 'testing'}
                size="sm"
              >
                Test Database Connection
              </Button>
              
              {databaseTest.status && (
                <Alert className={getStatusColor(databaseTest.status)}>
                  {getStatusIcon(databaseTest.status)}
                  <AlertDescription className="text-xs">
                    {databaseTest.message}
                    {databaseTest.details && (
                      <div className="mt-2">
                        <details>
                          <summary className="cursor-pointer">View Details</summary>
                          <pre className="mt-2 text-xs overflow-x-auto">
                            {JSON.stringify(databaseTest.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Troubleshooting Steps */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">🔧 Troubleshooting Steps</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Badge variant="outline">1</Badge>
                  <span>Check Vercel environment variables match production Supabase</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline">2</Badge>
                  <span>Verify Supabase RLS policies allow owner access to locations</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline">3</Badge>
                  <span>Ensure production database has same schema as local</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline">4</Badge>
                  <span>Check if user.own_id exists and matches locations.own_id</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
