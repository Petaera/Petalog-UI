import React, { useEffect, useState } from 'react';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Database, Users, MapPin } from 'lucide-react';

// Mock data for testing - replace with your actual data fetching logic
const useMockData = () => {
  const [user, setUser] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // Simulate data loading
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Simulate user data
        const mockUser = {
          id: 'mock-user-id',
          email: 'owner@example.com',
          role: 'owner',
          own_id: 'mock-own-id',
          assigned_location: null
        };
        
        // Simulate locations data
        const mockLocations = [
          { id: 'loc-1', name: 'Location 1', own_id: 'mock-own-id', address: '123 Main St' },
          { id: 'loc-2', name: 'Location 2', own_id: 'mock-own-id', address: '456 Oak Ave' },
          { id: 'loc-3', name: 'Location 3', own_id: 'different-own-id', address: '789 Pine St' }
        ];
        
        setUser(mockUser);
        setLocations(mockLocations);
        
        // Apply filtering logic (same as your actual app)
        const filtered = mockLocations.filter(loc => {
          if (mockUser.role === 'owner') {
            return loc.own_id === mockUser.own_id;
          } else if (mockUser.role === 'manager') {
            return loc.id === mockUser.assigned_location;
          }
          return false;
        });
        
        setFilteredLocations(filtered);
        setError(null);
      } catch (err: any) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return { user, locations, filteredLocations, isLoading, error };
};

export const DebugPage: React.FC = () => {
  const { user, locations, filteredLocations, isLoading, error } = useMockData();
  const [activeTab, setActiveTab] = useState<'debug' | 'analysis' | 'solutions'>('debug');

  const tabs = [
    { id: 'debug', label: 'Debug Panel', icon: Info },
    { id: 'analysis', label: 'Issue Analysis', icon: Database },
    { id: 'solutions', label: 'Solutions', icon: MapPin }
  ];

  const renderAnalysis = () => (
    <Card className="w-full max-w-4xl mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Issue Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">🔍 Problem Identification</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Critical</Badge>
                <span>Owners see "no location selected" on Vercel</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Info</Badge>
                <span>Managers work perfectly on Vercel</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Info</Badge>
                <span>Both work perfectly on localhost</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">🎯 Root Cause Candidates</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                <span>Environment variables mismatch</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                <span>Database permissions/RLS issues</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                <span>Production vs local database schema</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">4</Badge>
                <span>Timezone/database connection issues</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="font-semibold text-sm">📊 Data Flow Analysis</h3>
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">Owner Flow:</h4>
                <div className="space-y-1 text-xs">
                  <div>1. User logs in → role = 'owner'</div>
                  <div>2. Fetch locations where own_id = user.own_id</div>
                  <div>3. Filter locations by ownership</div>
                  <div>4. Display in dropdown</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Manager Flow:</h4>
                <div className="space-y-1 text-xs">
                  <div>1. User logs in → role = 'manager'</div>
                  <div>2. Fetch location where id = user.assigned_location</div>
                  <div>3. Single location assignment</div>
                  <div>4. Display in dropdown</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Failure Point:</h4>
                <div className="space-y-1 text-xs">
                  <div>❌ Owner: locations.own_id ≠ user.own_id</div>
                  <div>❌ Owner: user.own_id is null/undefined</div>
                  <div>❌ Owner: RLS policy blocks access</div>
                  <div>❌ Owner: Database connection fails</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSolutions = () => (
    <Card className="w-full max-w-4xl mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Solutions & Next Steps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">🚀 Immediate Actions</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="default">1</Badge>
                <div>
                  <strong>Check Vercel Environment Variables</strong>
                  <p className="text-sm text-gray-600 mt-1">
                    Go to Vercel Dashboard → Project Settings → Environment Variables
                    Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY match your production Supabase
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="default">2</Badge>
                <div>
                  <strong>Verify Supabase RLS Policies</strong>
                  <p className="text-sm text-gray-600 mt-1">
                    Check if your locations table has proper RLS policies that allow owners to see their locations
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="default">3</Badge>
                <div>
                  <strong>Test Database Connection</strong>
                  <p className="text-sm text-gray-600 mt-1">
                    Use the debug panel to test if the database connection works on Vercel
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">🔧 Code Fixes</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="outline">A</Badge>
                <div>
                  <strong>Add Error Boundaries</strong>
                  <p className="text-sm text-gray-600 mt-1">
                    Wrap location fetching in try-catch blocks to see specific error messages
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline">B</Badge>
                <div>
                  <strong>Add Fallback Logic</strong>
                  <p className="text-sm text-gray-600 mt-1">
                    If owner locations fail, fall back to showing assigned location or error message
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline">C</Badge>
                <div>
                  <strong>Add Debug Logging</strong>
                  <p className="text-sm text-gray-600 mt-1">
                    Log all location fetching attempts to identify where the failure occurs
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">📋 Checklist</h3>
            <div className="space-y-2">
              {[
                'Environment variables set correctly in Vercel',
                'Supabase project is the same for local and production',
                'Database schema matches between environments',
                'RLS policies allow owner access to locations',
                'User.own_id is properly set in production database',
                'Locations.own_id matches user.own_id values'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Debug Dashboard</h1>
        <p className="text-gray-600">
          Investigating the "no location selected" issue for owners on Vercel
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'debug' && (
        <DebugPanel
          user={user}
          locations={locations}
          filteredLocations={filteredLocations}
          isLoading={isLoading}
          error={error}
        />
      )}
      
      {activeTab === 'analysis' && renderAnalysis()}
      {activeTab === 'solutions' && renderSolutions()}

      {/* Quick Actions */}
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            Copy Debug Info
          </Button>
          <Button variant="outline" size="sm">
            Export Logs
          </Button>
          <Button variant="outline" size="sm">
            Test Production DB
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
