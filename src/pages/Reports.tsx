
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, BarChart3, Download, FileSpreadsheet, Calendar, Filter, MapPin, Car, Wrench, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function Reports() {
  const [dateRange, setDateRange] = useState("today");
  const [location, setLocation] = useState("all");
  const [vehicleType, setVehicleType] = useState("all");
  const [service, setService] = useState("all");
  const [entryType, setEntryType] = useState("all");
  const [manager, setManager] = useState("all");
  const [customFromDate, setCustomFromDate] = useState<Date>();
  const [customToDate, setCustomToDate] = useState<Date>();

  // Filter data based on current selections
  const getFilteredData = () => {
    // This would filter the actual data based on selected filters
    // For now, showing static data that would change based on filters
    const baseData = {
      totalRevenue: 15420,
      totalVehicles: 47,
      avgService: 328,
      serviceBreakdown: [
        { service: "Premium Wash", count: 15, revenue: 7500, price: 500 },
        { service: "Basic Wash", count: 20, revenue: 4000, price: 200 },
        { service: "Full Service", count: 8, revenue: 6400, price: 800 },
        { service: "Quick Wash", count: 12, revenue: 1800, price: 150 },
      ],
      vehicleDistribution: [
        { type: "Cars", count: 28, percentage: 59.6 },
        { type: "Bikes", count: 12, percentage: 25.5 },
        { type: "SUVs", count: 5, percentage: 10.6 },
        { type: "Trucks", count: 2, percentage: 4.3 },
      ]
    };

    // Apply filters (in real implementation, this would filter actual data)
    return baseData;
  };

  const filteredData = getFilteredData();

  const clearFilters = () => {
    setDateRange("today");
    setLocation("all");
    setVehicleType("all");
    setService("all");
    setEntryType("all");
    setManager("all");
    setCustomFromDate(undefined);
    setCustomToDate(undefined);
  };

  return (
    <Layout>
      <div className="flex-1 p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Reports & Statistics</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Enhanced Filter Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                
                {dateRange === "custom" && (
                  <div className="space-y-2 pt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          {customFromDate ? format(customFromDate, "PPP") : "From Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={customFromDate}
                          onSelect={setCustomFromDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          {customToDate ? format(customToDate, "PPP") : "To Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={customToDate}
                          onSelect={setCustomToDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="branch1">Main Branch</SelectItem>
                    <SelectItem value="branch2">Downtown Branch</SelectItem>
                    <SelectItem value="branch3">Mall Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle Type Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle Type
                </Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="car">Cars</SelectItem>
                    <SelectItem value="bike">Bikes</SelectItem>
                    <SelectItem value="suv">SUVs</SelectItem>
                    <SelectItem value="truck">Trucks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Service Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Service
                </Label>
                <Select value={service} onValueChange={setService}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="basic">Basic Wash</SelectItem>
                    <SelectItem value="premium">Premium Wash</SelectItem>
                    <SelectItem value="full">Full Service</SelectItem>
                    <SelectItem value="quick">Quick Wash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Entry Type Filter */}
              <div className="space-y-2">
                <Label>Entry Type</Label>
                <Select value={entryType} onValueChange={setEntryType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entries</SelectItem>
                    <SelectItem value="automatic">Automatic Entry</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Manager Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manager
                </Label>
                <Select value={manager} onValueChange={setManager}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    <SelectItem value="manager1">John Doe</SelectItem>
                    <SelectItem value="manager2">Jane Smith</SelectItem>
                    <SelectItem value="manager3">Mike Johnson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="metric-card-financial">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Badge variant="outline" className="text-financial border-financial">
                {dateRange === "today" ? "Today" : "Filtered Period"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-financial">₹{filteredData.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12.5% from previous period</p>
            </CardContent>
          </Card>

          <Card className="metric-card-success">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Badge variant="outline" className="text-success border-success">
                {dateRange === "today" ? "Today" : "Filtered Period"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{filteredData.totalVehicles}</div>
              <p className="text-xs text-muted-foreground">+8.2% from previous period</p>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Service Value</CardTitle>
              <Badge variant="secondary">
                {dateRange === "today" ? "Today" : "Filtered Period"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{filteredData.avgService}</div>
              <p className="text-xs text-muted-foreground">Per vehicle</p>
            </CardContent>
          </Card>
        </div>

        {/* Service Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Service Breakdown - Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredData.serviceBreakdown.map((item) => (
                <div key={item.service} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.service}</p>
                    <p className="text-sm text-muted-foreground">{item.count} vehicles • ₹{item.price} each</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-financial">₹{item.revenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {((item.revenue / filteredData.totalRevenue) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredData.vehicleDistribution.map((item) => (
                <div key={item.type} className="text-center p-4 bg-accent/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{item.count}</p>
                  <p className="font-medium">{item.type}</p>
                  <p className="text-sm text-muted-foreground">{item.percentage}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
