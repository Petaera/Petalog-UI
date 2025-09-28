import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { useUpiAccounts } from '@/hooks/useUpiAccounts';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Label 
} from '@/components/ui/label';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Textarea 
} from '@/components/ui/textarea';
import { 
  Clock, 
  Calendar, 
  Edit, 
  Check 
} from 'lucide-react';

interface PayLaterProps {
  selectedLocation?: string;
}

export default function PayLater({ selectedLocation: propSelectedLocation }: PayLaterProps) {
  const { user } = useAuth();
  const { selectedLocation: contextSelectedLocation } = useSelectedLocation();
  const selectedLocation = propSelectedLocation || contextSelectedLocation;
  
  const [payLaterLogs, setPayLaterLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Set default date to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Settle Pay Later modal state
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleLog, setSettleLog] = useState<any | null>(null);
  const [settlePaymentMode, setSettlePaymentMode] = useState<'cash' | 'upi'>('cash');

  // UPI accounts state
  const [selectedUpiAccount, setSelectedUpiAccount] = useState<string>('');
  const { accounts: upiAccounts, loading: upiAccountsLoading } = useUpiAccounts(selectedLocation);

  // Reset UPI account selection when selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      setSelectedUpiAccount('');
      console.log('📍 Location changed, resetting UPI account selection');
    }
  }, [selectedLocation]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const getDuration = (entryTime: string, exitTime: string) => {
    if (!entryTime || !exitTime) return '-';
    
    const entry = new Date(entryTime);
    const exit = new Date(exitTime);
    const diffMs = exit.getTime() - entry.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const fetchPayLaterLogs = async () => {
    if (!selectedLocation) {
      console.log('No location selected');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Fetching pay later logs for location:', selectedLocation);
      console.log('📅 Selected date:', selectedDate);

      // Fetch Pay Later logs with date filter
      let payLaterQuery = supabase
        .from("logs-man")
        .select("*, vehicles(number_plate)")
        .eq("location_id", selectedLocation)
        .eq("approval_status", "approved")
        .eq("payment_mode", "credit")
        .order("created_at", { ascending: false });

      // Add date filter if selected
      if (selectedDate) {
        // Create proper date objects with timezone handling
        const selectedDateObj = new Date(selectedDate);
        const payLaterStartOfDay = selectedDateObj.toISOString().split('T')[0] + 'T00:00:00.000Z';
        const payLaterEndOfDay = selectedDateObj.toISOString().split('T')[0] + 'T23:59:59.999Z';
        
        payLaterQuery = payLaterQuery
          .gte("entry_time", payLaterStartOfDay)
          .lte("entry_time", payLaterEndOfDay);
      }

      const { data: payLaterData, error: payLaterError } = await payLaterQuery;

      let finalPayLater: any[] = [];
      // If no results with entry_time filter, try created_at
      if (selectedDate && payLaterData?.length === 0) {
        let payLaterFallbackQuery = supabase
          .from("logs-man")
          .select("*, vehicles(number_plate)")
          .eq("location_id", selectedLocation)
          .eq("approval_status", "approved")
          .eq("payment_mode", "credit")
          .order("created_at", { ascending: false });
        
        const selectedDateObj = new Date(selectedDate);
        const payLaterFallbackStartOfDay = selectedDateObj.toISOString().split('T')[0] + 'T00:00:00.000Z';
        const payLaterFallbackEndOfDay = selectedDateObj.toISOString().split('T')[0] + 'T23:59:59.999Z';
        
        const { data: payLaterFallbackData, error: payLaterFallbackError } = await payLaterFallbackQuery
          .gte("created_at", payLaterFallbackStartOfDay)
          .lte("created_at", payLaterFallbackEndOfDay);
        
        if (payLaterFallbackData && payLaterFallbackData.length > 0) {
          finalPayLater = payLaterFallbackData;
        } else {
          finalPayLater = payLaterData || [];
        }
      } else {
        finalPayLater = payLaterData || [];
      }

      if (payLaterError) {
        console.error('Error fetching pay later logs:', payLaterError);
        toast.error('Error fetching pay later logs: ' + payLaterError.message);
      }

      console.log('✅ Pay Later logs fetched:', finalPayLater.length, 'records');
      setPayLaterLogs(finalPayLater);

    } catch (error) {
      console.error('Error fetching pay later logs:', error);
      toast.error('Error fetching pay later logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openSettle = (log: any) => {
    setSettleLog(log);
    // default to cash when settling
    setSettlePaymentMode('cash');
    setSelectedUpiAccount(''); // Reset UPI account selection
    setSettleOpen(true);
  };

  const confirmSettle = async () => {
    if (!settleLog) return;
    
    // Validate UPI account selection if UPI is selected
    if (settlePaymentMode === 'upi' && !selectedUpiAccount) {
      toast.error('Please select a UPI account');
      return;
    }
    
    try {
      // Find the selected UPI account details
      const selectedAccount = upiAccounts.find(acc => acc.id === selectedUpiAccount);
      
      const updateData: any = {
        payment_mode: settlePaymentMode,
        payment_date: new Date().toISOString(),
      };
      
      // Add UPI account information if UPI is selected
      if (settlePaymentMode === 'upi' && selectedAccount) {
        updateData.upi_account_id = selectedUpiAccount;
        updateData.upi_account_name = selectedAccount.account_name;
        updateData.upi_id = selectedAccount.upi_id;
      }
      
      const { error } = await supabase
        .from('logs-man')
        .update(updateData)
        .eq('id', settleLog.id);
      if (error) throw error;
      
      toast.success('Payment settled');
      setSettleOpen(false);
      setSettleLog(null);
      setSelectedUpiAccount(''); // Reset UPI account selection
      fetchPayLaterLogs();
    } catch (err: any) {
      toast.error(`Settle failed: ${err?.message || err}`);
    }
  };

  const handleEdit = (log: any) => {
    // Navigate to edit page or open edit modal
    console.log('Edit log:', log);
    // For now, just show a toast
    toast.info('Edit functionality will be implemented');
  };

  // Fetch logs when component mounts or selectedLocation/selectedDate changes
  useEffect(() => {
    if (selectedLocation) {
      fetchPayLaterLogs();
    }
  }, [selectedLocation, selectedDate]);

  if (!selectedLocation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">No Location Selected</h3>
          <p className="text-sm text-muted-foreground">Please select a location to view pay later logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="date-filter" className="text-sm font-medium">
                Filter by Date:
              </Label>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-48"
              />
              <Button
                variant="outline"
                onClick={() => setSelectedDate('')}
                className="w-full sm:w-auto"
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pay Later Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <span>Pay Later</span>
              <Badge variant="secondary">{payLaterLogs.length}</Badge>
            </div>
            {selectedDate && (
              <Badge variant="outline" className="sm:ml-2">
                {new Date(selectedDate).toLocaleDateString()}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Service</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Entry Time</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Exit Time</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={11} className="text-center py-4">Loading...</td></tr>
                    ) : payLaterLogs.length === 0 ? (
                      <tr><td colSpan={11} className="text-center py-4 text-muted-foreground">
                        {selectedDate ? `No pay later tickets for ${new Date(selectedDate).toLocaleDateString()}` : 'No pay later tickets'}
                      </td></tr>
                    ) : (
                      payLaterLogs.map((log: any, idx: number) => (
                        <tr key={log.id || idx} className="hover:bg-muted/30">
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.vehicle_number || log.vehicles?.number_plate || "-"}</td>
                          <td className="p-2">
                            <Badge variant="outline">{log.vehicle_model || 'N/A'}</Badge>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{log.Name || "-"}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.Phone_no ? (
                              <a
                                href={`tel:${log.Phone_no}`}
                                className="text-blue-600 hover:underline"
                                title={`Call ${log.Phone_no}`}
                              >
                                {log.Phone_no}
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {(() => {
                              const currentAmount = log.Amount || 0;
                              const discountAmount = log.discount || 0;
                              const originalAmount = currentAmount - discountAmount;
                              return originalAmount > 0 ? formatCurrency(originalAmount) : "-";
                            })()}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{log.service || "-"}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                            {log.entry_time ? new Date(log.entry_time).toLocaleString() :
                              log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                            {log.exit_time ? new Date(log.exit_time).toLocaleString() :
                              log.approved_at ? new Date(log.approved_at).toLocaleString() : "-"}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.payment_date ? new Date(log.payment_date).toLocaleString() : '-'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs">Pay Later</Badge>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-col sm:flex-row gap-1">
                              <Button size="sm" variant="default" className="text-xs" onClick={() => openSettle(log)}>
                                <Check className="h-3 w-3 mr-1" />
                                Settle
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => handleEdit(log)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settle Pay Later Dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Settle Payment</DialogTitle>
            <DialogDescription>Choose payment mode to close this Pay Later ticket.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle No</Label>
                <div className="mt-1 text-sm font-medium">{settleLog?.vehicle_number || '-'}</div>
              </div>
              <div>
                <Label>Amount</Label>
                <div className="mt-1 text-sm font-medium">
                  {settleLog?.Amount && settleLog?.discount != null ? 
                    formatCurrency(settleLog?.Amount - settleLog?.discount) : 
                    settleLog?.Amount ? formatCurrency(settleLog?.Amount) : '-'
                  }
                </div>
              </div>
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={settlePaymentMode} onValueChange={(v: any) => setSettlePaymentMode(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* UPI Account Selection for Settle */}
            {settlePaymentMode === 'upi' && (
              <div>
                <Label>Select UPI Account</Label>
                <Select value={selectedUpiAccount} onValueChange={setSelectedUpiAccount}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={upiAccountsLoading ? "Loading accounts..." : "Select UPI account"} />
                  </SelectTrigger>
                  <SelectContent>
                    {upiAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} - {account.upi_id} ({account.location_name || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {upiAccounts.length === 0 && !upiAccountsLoading && (
                  <p className="text-sm text-muted-foreground mt-1">
                    No UPI accounts found. Please add UPI accounts in the settings.
                  </p>
                )}
                
                {/* QR Code Display for Settle */}
                {selectedUpiAccount && (
                  <div className="mt-4 space-y-2">
                    <Label>QR Code</Label>
                    {(() => {
                      const selectedAccount = upiAccounts.find(acc => acc.id === selectedUpiAccount);
                      if (selectedAccount?.qr_code_url) {
                        return (
                          <div className="flex justify-center p-2">
                            <img 
                              src={selectedAccount.qr_code_url} 
                              alt={`QR Code for ${selectedAccount.account_name}`}
                              className="w-32 h-32 object-contain border rounded-lg shadow-sm"
                            />
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg bg-muted/20">
                            No QR code available for this account
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleOpen(false)}>Cancel</Button>
            <Button onClick={confirmSettle}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
