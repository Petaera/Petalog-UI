import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Search, Calendar, Car, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const vehicleHistory = [
  {
    id: 1,
    date: "2024-01-15",
    time: "10:30 AM",
    service: "Premium Wash",
    amount: 500,
    location: "Main Branch",
    entryType: "Normal",
    manager: "Raj Patel"
  },
  {
    id: 2,
    date: "2024-01-08",
    time: "02:15 PM",
    service: "Basic Wash",
    amount: 200,
    location: "North Branch",
    entryType: "Workshop",
    manager: "Priya Sharma"
  },
  {
    id: 3,
    date: "2024-01-03",
    time: "11:45 AM",
    service: "Full Service",
    amount: 800,
    location: "Main Branch",
    entryType: "Normal",
    manager: "Raj Patel"
  },
];

export default function VehicleHistory() {
  return (
    <Layout>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Vehicle History Search</h1>
            </div>
          </div>
          

        </div>

        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle>Search Vehicle History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input 
                  placeholder="Enter vehicle number (e.g., MH12AB1234)" 
                  className="text-center font-mono text-lg"
                  defaultValue="MH12AB1234"
                />
              </div>
              <Button variant="default">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">7</p>
                <p className="text-sm text-muted-foreground">Total Visits</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-financial">₹3,200</p>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-success">₹457</p>
                <p className="text-sm text-muted-foreground">Average Service</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Days Since Last</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Visit History - MH12AB1234
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Entry Type</TableHead>
                  <TableHead>Manager</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleHistory.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {visit.date}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {visit.time}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{visit.service}</TableCell>
                    <TableCell className="font-semibold text-financial">₹{visit.amount}</TableCell>
                    <TableCell>{visit.location}</TableCell>
                    <TableCell>
                      <Badge variant={visit.entryType === "Workshop" ? "default" : "secondary"}>
                        {visit.entryType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{visit.manager}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}