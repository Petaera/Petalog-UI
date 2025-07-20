import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Settings, Plus, Edit, IndianRupee } from "lucide-react";
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

const services = [
  { id: 1, name: "Basic Wash", car: 200, bike: 100, suv: 250, truck: 300, workshop: "50% off" },
  { id: 2, name: "Premium Wash", car: 500, bike: 300, suv: 600, truck: 700, workshop: "40% off" },
  { id: 3, name: "Full Service", car: 800, bike: 500, suv: 1000, truck: 1200, workshop: "30% off" },
  { id: 4, name: "Quick Wash", car: 150, bike: 80, suv: 180, truck: 220, workshop: "60% off" },
];

export default function PriceSettings() {
  return (
    <Layout>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Price Settings</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Service Pricing Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Bike</TableHead>
                  <TableHead>SUV</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Workshop Discount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>₹{service.car}</TableCell>
                    <TableCell>₹{service.bike}</TableCell>
                    <TableCell>₹{service.suv}</TableCell>
                    <TableCell>₹{service.truck}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-financial border-financial">
                        {service.workshop}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Entry Type Modifiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Entry Type Modifiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <div>
                  <p className="font-medium">Normal Entry</p>
                  <p className="text-sm text-muted-foreground">Standard pricing</p>
                </div>
                <Badge variant="default">100%</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <div>
                  <p className="font-medium">Workshop Entry</p>
                  <p className="text-sm text-muted-foreground">Discounted rates</p>
                </div>
                <Badge variant="outline" className="text-financial border-financial">Variable</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location-Specific Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { location: "Main Branch", multiplier: "1.0x", status: "Standard" },
                { location: "North Branch", multiplier: "0.9x", status: "Discount Zone" },
                { location: "West Side Center", multiplier: "1.1x", status: "Premium Zone" },
              ].map((loc) => (
                <div key={loc.location} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div>
                    <p className="font-medium">{loc.location}</p>
                    <p className="text-sm text-muted-foreground">{loc.status}</p>
                  </div>
                  <Badge variant="secondary">{loc.multiplier}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}