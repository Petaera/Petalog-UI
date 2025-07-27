import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ManagerAutomaticLogs() {
  return (
    <Layout>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Automatic Logs</h1>
            </div>
          </div>
          

        </div>

        <div className="metric-card">
          <div className="text-center py-12">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Automatic Logs</h3>
            <p className="text-muted-foreground">
              ANPR system integration and automatic vehicle entry/exit logs for managers will be displayed here.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
} 