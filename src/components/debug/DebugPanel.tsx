import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Alert, AlertDescription } from '@/ui/alert';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getEnvironmentStatus } from '@/lib/supabaseClient';

export const DebugPanel: React.FC = () => {
  const { user } = useAuth();
  const envStatus = getEnvironmentStatus();
  
  const checkLocalStorage = () => {
    if (!user?.id) return 'No user ID';
    
    const storedLocation = localStorage.getItem(`selectedLocation_${user.id}`);
    return storedLocation || 'No stored location';
  };
  
  const checkEnvironmentVariables = () => {
    return {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      mode: import.meta.env.MODE,
      isProduction: import.meta.env.PROD ? 'Yes' : 'No'
    };
  };
  
  const clearLocalStorage = () => {
    if (user?.id) {
      localStorage.removeItem(`selectedLocation_${user.id}`);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Environment Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Environment Mode:</div>
            <Badge variant={import.meta.env.MODE === 'production' ? 'default' : 'secondary'}>
              {import.meta.env.MODE}
            </Badge>
            
            <div>Production Build:</div>
            <Badge variant={import.meta.env.PROD ? 'default' : 'secondary'}>
              {import.meta.env.PROD ? 'Yes' : 'No'}
            </Badge>
            
            <div>Supabase URL:</div>
            <Badge variant={envStatus.isValid ? 'default' : 'destructive'}>
              {envStatus.isValid ? '✅ Set' : '❌ Missing'}
            </Badge>
            
            <div>Supabase Key:</div>
            <Badge variant={envStatus.isValid ? 'default' : 'destructive'}>
              {envStatus.isValid ? '✅ Set' : '❌ Missing'}
            </Badge>
          </div>
          
          {!envStatus.isValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Critical Issue:</strong> Environment variables are missing. 
                This will cause authentication and database issues on Vercel.
                <br />
                Missing: {envStatus.missingVars.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            User & Location Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>User ID:</div>
            <Badge variant="outline">{user?.id || 'Not logged in'}</Badge>
            
            <div>User Role:</div>
            <Badge variant="outline">{user?.role || 'Unknown'}</Badge>
            
            <div>Own ID:</div>
            <Badge variant="outline">{user?.own_id || 'Not set'}</Badge>
            
            <div>Assigned Location:</div>
            <Badge variant="outline">{user?.assigned_location || 'Not set'}</Badge>
          </div>
          
          <div className="pt-2">
            <div className="text-sm font-medium mb-2">Local Storage:</div>
            <div className="text-xs font-mono bg-gray-100 p-2 rounded">
              {checkLocalStorage()}
            </div>
          </div>
          
          <Button 
            onClick={clearLocalStorage} 
            variant="outline" 
            size="sm"
            disabled={!user?.id}
          >
            Clear Stored Location
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Vercel Deployment Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Common Vercel Issues:</strong>
              <br />
              • Missing environment variables
              <br />
              • Database permission issues
              <br />
              • RLS policy blocking access
              <br />
              • User data not loading properly
            </AlertDescription>
          </Alert>
          
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Check Vercel environment variables</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Verify Supabase RLS policies</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Clear browser cache and localStorage</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Check browser console for errors</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
