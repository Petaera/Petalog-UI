import { useState } from "react";
import { ArrowLeft, Home, IndianRupee, Car, TrendingUp, Calendar } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentEntriesCard } from "@/components/dashboard/RecentEntriesCard";
import { Button } from "@/components/ui/button";

// Sample data - in real app this would come from API
const sampleAutomaticEntries = [
  {
    id: "1",
    vehicleNumber: "MH12AB1234",
    entryTime: "09:15 AM",
    vehicleType: "Car",
    imageUrl: "/placeholder-car.jpg"
  },
  {
    id: "2", 
    vehicleNumber: "MH14CD5678",
    entryTime: "08:45 AM",
    vehicleType: "Bike",
    imageUrl: "/placeholder-bike.jpg"
  },
  {
    id: "3",
    vehicleNumber: "MH01EF9012",
    entryTime: "08:30 AM", 
    vehicleType: "Car",
    imageUrl: "/placeholder-car.jpg"
  }
];

const sampleManualEntries = [
  {
    id: "1",
    vehicleNumber: "GJ09GH3456",
    entryTime: "10:30 AM",
    service: "Premium Wash",
    amount: 500,
    entryType: "Normal" as const
  },
  {
    id: "2",
    vehicleNumber: "KA05IJ7890", 
    entryTime: "09:45 AM",
    service: "Basic Wash",
    amount: 200,
    entryType: "Workshop" as const
  },
  {
    id: "3",
    vehicleNumber: "TN33KL2345",
    entryTime: "09:15 AM",
    service: "Full Service",
    amount: 800,
    entryType: "Normal" as const
  }
];

export default function Dashboard() {
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);

  const handleViewAllAutomatic = () => {
    // Navigate to automatic logs page
    console.log("Navigate to automatic logs");
  };

  const handleViewAllManual = () => {
    // Navigate to manual logs page  
    console.log("Navigate to manual logs");
  };

  const todaysCollection = sampleManualEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const vehiclesEntered = sampleAutomaticEntries.length + sampleManualEntries.length;

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-xs sm:text-sm">{new Date().toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="self-start sm:self-auto">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Today's Collection"
          value={`₹${todaysCollection.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          variant="financial"
          subtitle="Total revenue today"
          trend={{ value: 12.5, isPositive: true }}
        />
        
        <MetricCard
          title="Vehicles Entered Today"
          value={vehiclesEntered.toString()}
          icon={Car}
          variant="success"
          subtitle="Total entries"
          trend={{ value: 8.2, isPositive: true }}
        />
        
        <MetricCard
          title="Average Service Value"
          value={`₹${Math.round(todaysCollection / sampleManualEntries.length)}`}
          icon={TrendingUp}
          variant="default"
          subtitle="Per vehicle"
        />
        
        <MetricCard
          title="Manual Entries"
          value={sampleManualEntries.length.toString()}
          icon={Calendar}
          variant="default"
          subtitle="Staff processed"
        />
      </div>

      {/* Recent Entries */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <RecentEntriesCard
          title="Recent Automatic Entries"
          type="automatic"
          entries={sampleAutomaticEntries}
          onViewAll={handleViewAllAutomatic}
        />
        
        <RecentEntriesCard
          title="Recent Manual Entries"
          type="manual"
          entries={sampleManualEntries}
          onViewAll={handleViewAllManual}
        />
      </div>
    </div>
  );
}