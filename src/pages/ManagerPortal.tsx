import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScratchMarking } from '@/components/ScratchMarking';
import { Car, BarChart3, LogOut, Home, User, CreditCard, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from '@/components/ui/checkbox';
import React from 'react';

export default function ManagerPortal() {
  const { user, logout } = useAuth();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  // Change service to array for multi-select
  const [service, setService] = useState<string[]>([]);
  const [entryType, setEntryType] = useState('normal');
  const [amount, setAmount] = useState('500');
  const [discount, setDiscount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [scratchImage, setScratchImage] = useState<Blob | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Button disable state for 5 seconds after submit
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);

  // Service price map
  const SERVICE_PRICES: { [key: string]: number } = {
    'basic': 200,
    'premium': 500,
    'full': 800,
    'quick': 150
  };
  const SERVICE_LABELS: { [key: string]: string } = {
    'basic': 'Basic Wash',
    'premium': 'Premium Wash',
    'full': 'Full Service',
    'quick': 'Quick Wash',
  };

  // Priority services that should appear first in the list
  const PRIORITY_SERVICES = [
    'Full wash',
    'Body Wash',
    'VACCUM ONLY',
    'Vaccum Only',
    'Premium Wash'
  ];

  // Function to sort services with priority services first
  const sortServicesWithPriority = (services: string[]) => {
    return services.sort((a, b) => {
      const aIndex = PRIORITY_SERVICES.findIndex(priority => 
        a.toLowerCase().includes(priority.toLowerCase()) || 
        priority.toLowerCase().includes(a.toLowerCase())
      );
      const bIndex = PRIORITY_SERVICES.findIndex(priority => 
        b.toLowerCase().includes(priority.toLowerCase()) || 
        priority.toLowerCase().includes(b.toLowerCase())
      );
      
      // If both are priority services, maintain their original order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only a is priority, a comes first
      if (aIndex !== -1) return -1;
      // If only b is priority, b comes first
      if (bIndex !== -1) return 1;
      // If neither is priority, sort alphabetically
      return a.localeCompare(b);
    });
  };

  // Mock data for previous visits and today's stats
  const previousVisits = vehicleNumber ? Math.floor(Math.random() * 5) + 1 : 0;
  const todayEntries = [
    { vehicleNumber: 'MH12AB1234', time: '09:15 AM', service: 'Basic Wash', amount: 200 },
    { vehicleNumber: 'MH14CD5678', time: '08:45 AM', service: 'Premium Wash', amount: 500 },
  ];

  // Update amount when service or entryType changes
  React.useEffect(() => {
    if (entryType === 'normal') {
      const total = service.reduce((sum, s) => sum + (SERVICE_PRICES[s] || 0), 0);
      setAmount(total.toString());
    }
  }, [service, entryType]);

  // Timer effect to re-enable submit button after 5 seconds
  React.useEffect(() => {
    if (isSubmitDisabled) {
      const timer = setTimeout(() => {
        setIsSubmitDisabled(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitDisabled]);

  const handleVehicleNumberChange = (value: string) => {
    setVehicleNumber(value.toUpperCase());
  };

  // Handle service change for multi-select
  const handleServiceCheckbox = (value: string, checked: boolean | "indeterminate") => {
    const trimmedValue = value.trim();
    setService((prev) =>
      checked ? [...prev, trimmedValue] : prev.filter((v) => v !== trimmedValue)
    );
  };
  // Handle single-select for workshop
  const handleServiceChange = (value: string) => {
    const trimmedValue = value.trim();
    setService([trimmedValue]);
    setAmount(SERVICE_PRICES[trimmedValue]?.toString() || '200');
  };

  const handleSubmit = () => {
    // Disable submit button for 5 seconds
    setIsSubmitDisabled(true);
    
    const trimmedVehicleType = vehicleType.trim();
    const trimmedServices = service.map(s => s.trim());
    if (!vehicleNumber || !trimmedVehicleType || trimmedServices.length === 0) {
      toast.error('Please fill in all required fields');
      setIsSubmitDisabled(false); // Re-enable button on validation error
      return;
    }

    // Mock submission
    toast.success('Vehicle entry submitted successfully!');
    
    // Reset form
    setVehicleNumber('');
    setVehicleType('');
    setService([]);
    setAmount('500');
    setDiscount('');
    setRemarks('');
    setPaymentMode('cash');
    setScratchImage(null);
  };

  const handleScratchSave = (imageBlob: Blob) => {
    setScratchImage(imageBlob);
  };

  if (showStats) {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex h-full items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setShowStats(false)}>
                <Car className="h-4 w-4 mr-2" />
                Back to Entry
              </Button>
              <h1 className="text-xl font-semibold">Today's Statistics</h1>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Manager Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{todayEntries.length}</div>
                <p className="text-sm text-muted-foreground">Vehicles processed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">₹350</div>
                <p className="text-sm text-muted-foreground">Per vehicle</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Popular</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Premium Wash</div>
                <p className="text-sm text-muted-foreground">Top service today</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Today's Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayEntries.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <div className="font-medium">{entry.vehicleNumber}</div>
                      <div className="text-sm text-muted-foreground">{entry.time} • {entry.service}</div>
                    </div>
                    <div className="font-semibold text-financial">₹{entry.amount}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Manager Portal</h1>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success">
              Manager Access
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowStats(true)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Today's Stats
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Manager Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Entry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input 
                  id="vehicleNumber"
                  placeholder="Enter vehicle number" 
                  className="text-center font-mono text-lg uppercase"
                  value={vehicleNumber}
                  onChange={(e) => handleVehicleNumberChange(e.target.value)}
                />
                {vehicleNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${previousVisits > 0 ? 'bg-success' : 'bg-warning'}`}></div>
                    <span className="text-muted-foreground">
                      {previousVisits > 0 ? `Previous Visits: ${previousVisits} times` : 'New Customer'}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">Service Chosen</Label>
                  {entryType === 'normal' ? (
                    <div className="flex flex-col gap-2">
                      {sortServicesWithPriority(Object.keys(SERVICE_PRICES)).map((key) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={service.includes(key)}
                            onCheckedChange={(checked) => handleServiceCheckbox(key, checked)}
                            id={`service-${key}`}
                          />
                          <span>{SERVICE_LABELS[key]} - ₹{SERVICE_PRICES[key]}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Select value={service[0] || ''} onValueChange={handleServiceChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortServicesWithPriority(Object.keys(SERVICE_PRICES)).map((key) => (
                          <SelectItem key={key} value={key}>
                            {SERVICE_LABELS[key]} - ₹{SERVICE_PRICES[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entry Type</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant={entryType === 'normal' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => setEntryType('normal')}
                    >
                      Normal
                    </Button>
                    <Button 
                      variant={entryType === 'workshop' ? 'default' : 'outline'} 
                      size="sm" 
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => setEntryType('workshop')}
                    >
                      Workshop
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    value={`₹${amount}`} 
                    className="font-semibold text-financial"
                    onChange={(e) => setAmount(e.target.value.replace('₹', ''))}
                    readOnly={entryType === 'normal'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="flex gap-2">
                  <Button 
                    variant={paymentMode === 'cash' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPaymentMode('cash')}
                  >
                    <Banknote className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Cash</span>
                  </Button>
                  <Button 
                    variant={paymentMode === 'upi' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setPaymentMode('upi')}
                  >
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">UPI</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (Optional)</Label>
                  <Input 
                    id="discount" 
                    placeholder="Enter discount amount" 
                    type="number" 
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea 
                  id="remarks" 
                  placeholder="Any additional notes..." 
                  rows={3} 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Scratch Marking Section */}
          <ScratchMarking onSave={handleScratchSave} />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button 
            variant="default" 
            size="lg" 
            className="px-8"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            Submit Entry
          </Button>
        </div>
      </main>
    </div>
  );
}
