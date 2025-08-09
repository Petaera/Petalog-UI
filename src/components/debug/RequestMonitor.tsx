import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, X, RefreshCw, Activity } from 'lucide-react';
import { getActiveRequestCount, cancelAllRequests, getEnvironmentStatus } from '@/lib/supabaseClient';

export function RequestMonitor() {
  const [activeRequests, setActiveRequests] = useState(0);
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        setActiveRequests(getActiveRequestCount());
        setEnvStatus(getEnvironmentStatus());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const handleCancelAll = () => {
    cancelAllRequests();
    setActiveRequests(0);
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      setActiveRequests(getActiveRequestCount());
      setEnvStatus(getEnvironmentStatus());
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Request Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Active Requests:</span>
          <Badge variant={activeRequests > 10 ? "destructive" : activeRequests > 5 ? "secondary" : "default"}>
            {activeRequests}
          </Badge>
        </div>

        {activeRequests > 10 && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              High number of active requests detected!
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMonitoring}
            className="flex-1"
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancelAll}
            disabled={activeRequests === 0}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel All
          </Button>
        </div>

        {envStatus && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Environment:</span>
              <Badge variant={envStatus.hasSupabaseUrl && envStatus.hasSupabaseAnonKey ? "default" : "destructive"}>
                {envStatus.hasSupabaseUrl && envStatus.hasSupabaseAnonKey ? "Configured" : "Missing Variables"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Last Update:</span>
              <span>{new Date(envStatus.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          This monitor helps identify excessive API calls that may cause performance issues.
        </div>
      </CardContent>
    </Card>
  );
}
