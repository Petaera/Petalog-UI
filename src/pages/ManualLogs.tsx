import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ManualLogs() {
  return (
    <Layout>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <PenTool className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Manual Logs</h1>
            </div>
          </div>
          
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="metric-card">
          <div className="text-center py-12">
            <PenTool className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Manual Entry Logs</h3>
            <p className="text-muted-foreground">
              All manual vehicle entries made by managers and owners will be listed here.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}