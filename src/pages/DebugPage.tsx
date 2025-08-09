import React, { useEffect, useState } from 'react';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, Database, Globe, User, MapPin } from 'lucide-react';

// Mock data for testing - replace with your actual data fetching logic
const useMockData = () => {
  const [user, setUser] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  useEffect(() => {
    // Simulate data loading
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Mock user data
        const mockUser = {
          id: 'test-user-123',
          email: 'owner@example.com',
          role: 'owner',
          own_id: 'owner-123'
        };
        
        // Mock locations data
        const mockLocations = [
          {
            id: 1,
            name: 'Test Location 1',
            own_id: 'owner-123',
            assigned_location: null,
            address: '123 Test St'
          },
          {
            id: 2,
            name: 'Test Location 2',
            own_id: 'owner-123',
            assigned_location: null,
            address: '456 Test Ave'
          }
        ];
        
        setUser(mockUser);
        setLocations(mockLocations);
        
        // Filter locations based on user role
        if (mockUser.role === 'owner') {
          const filtered = mockLocations.filter(loc => loc.own_id === mockUser.own_id);
          setFilteredLocations(filtered);
          if (filtered.length > 0) {
            setSelectedLocation(filtered[0]);
          }
        } else if (mockUser.role === 'manager') {
          const filtered = mockLocations.filter(loc => loc.assigned_location === mockUser.id);
          setFilteredLocations(filtered);
          if (filtered.length > 0) {
            setSelectedLocation(filtered[0]);
          }
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  return {
    user,
    locations,
    filteredLocations,
    isLoading,
    error,
    selectedLocation,
    setSelectedLocation
  };
};

export const DebugPage: React.FC = () => {
  const { user, locations, filteredLocations, isLoading, error, selectedLocation, setSelectedLocation } = useMockData();
  const [activeTab, setActiveTab] = useState<'debug' | 'analysis' | 'solutions'>('debug');

  const renderAnalysis = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="w-5 h-5" />
            Issue Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Problem:</strong> Owner users see "no location selected" on Vercel while managers work correctly.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">What Works Locally:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Both owner and manager roles function correctly</li>
                <li>• Location filtering works as expected</li>
                <li>• State propagation between components works</li>
                <li>• Database connections are successful</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">What Fails on Vercel:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Owner role cannot see locations</li>
                <li>• Manager role works correctly</li>
                <li>• State propagation may be broken</li>
                <li>• Possible environment variable issues</li>
              </ul>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Key Differences to Investigate:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-yellow-600" />
                <span>Environment Variables</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-yellow-600" />
                <span>Database Permissions</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-yellow-600" />
                <span>User Role Logic</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSolutions = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Info className="w-5 h-5" />
            Solutions & Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">1. Environment Variables Check</h4>
              <p className="text-sm text-blue-700 mb-2">
                Verify that your Vercel environment variables match your local .env file:
              </p>
              <div className="text-xs font-mono bg-blue-100 p-2 rounded">
                VITE_SUPABASE_URL<br/>
                VITE_SUPABASE_ANON_KEY<br/>
                VITE_BASE_URL<br/>
                VITE_API_URL
              </div>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">2. Database Permissions</h4>
              <p className="text-sm text-green-700 mb-2">
                Check your Supabase Row Level Security (RLS) policies:
              </p>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Verify owner users can access locations table</li>
                <li>• Check if own_id filtering works in production</li>
                <li>• Ensure RLS policies are enabled and correct</li>
              </ul>
            </div>
            
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">3. Build & Runtime Differences</h4>
              <p className="text-sm text-purple-700 mb-2">
                Investigate potential build or runtime issues:
              </p>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Compare build output between local and Vercel</li>
                <li>• Check for any CORS or network restrictions</li>
                <li>• Verify component rendering order</li>
              </ul>
            </div>
            
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">4. Immediate Actions</h4>
              <div className="space-y-2 text-sm text-orange-700">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">1</Badge>
                  <span>Use the debug panel above to gather information</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">2</Badge>
                  <span>Check Vercel deployment logs for errors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">3</Badge>
                  <span>Compare environment variables between local and Vercel</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">4</Badge>
                  <span>Test database connection from Vercel environment</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Debug Dashboard</h1>
        <p className="text-gray-600">
          Investigate the Vercel deployment issue with owner location access
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Debug Panel
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Issue Analysis
          </TabsTrigger>
          <TabsTrigger value="solutions" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Solutions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="debug" className="space-y-4">
          <DebugPanel
            user={user}
            locations={locations}
            filteredLocations={filteredLocations}
            isLoading={isLoading}
            error={error}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
          />
        </TabsContent>

        <TabsContent value="analysis">
          {renderAnalysis()}
        </TabsContent>

        <TabsContent value="solutions">
          {renderSolutions()}
        </TabsContent>
      </Tabs>
    </div>
  );
};
