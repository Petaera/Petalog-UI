import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Users, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const managers = [
  { id: 1, name: "Raj Patel", email: "raj@carwash.com", location: "Main Branch", status: "Active", lastLogin: "2 hours ago" },
  { id: 2, name: "Priya Sharma", email: "priya@carwash.com", location: "North Branch", status: "Active", lastLogin: "1 day ago" },
  { id: 3, name: "Amit Kumar", email: "amit@carwash.com", location: "West Side Center", status: "Inactive", lastLogin: "3 days ago" },
];

export default function ManagerAccess() {
  return (
    <Layout>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Manager Access Settings</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Manager
            </Button>
            
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.map((manager) => (
                  <TableRow key={manager.id}>
                    <TableCell className="font-medium">{manager.name}</TableCell>
                    <TableCell>{manager.email}</TableCell>
                    <TableCell>{manager.location}</TableCell>
                    <TableCell>
                      <Badge variant={manager.status === "Active" ? "default" : "secondary"}>
                        {manager.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{manager.lastLogin}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Manager Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Manager Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">ALLOWED ACTIONS</h4>
                {[
                  "Manual vehicle entry",
                  "View current day entries", 
                  "Scratch marking on vehicles",
                  "Basic statistics (non-financial)",
                  "Vehicle history search",
                ].map((permission) => (
                  <div key={permission} className="flex items-center gap-2 p-2 bg-success-light rounded">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span className="text-sm">{permission}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">RESTRICTED ACTIONS</h4>
                {[
                  "Financial data access",
                  "Multi-location management",
                  "Manager account creation",
                  "Price settings modification",
                  "System configuration",
                ].map((restriction) => (
                  <div key={restriction} className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                    <div className="w-2 h-2 bg-destructive rounded-full"></div>
                    <span className="text-sm">{restriction}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}