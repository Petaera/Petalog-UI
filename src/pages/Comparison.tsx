import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Comparison() {
  return (
    <Layout>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Comparison</h1>
            </div>
          </div>
          

        </div>

        <div className="metric-card">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Data Comparison</h3>
            <p className="text-muted-foreground">
              Discrepancies between automatic ANPR logs and manual entries will be highlighted here.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}