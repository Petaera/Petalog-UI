import { useEffect, useState } from "react";
import { ArrowLeft, PenTool, Check, X, Clock, CheckCircle, Calendar, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useUpiAccounts } from '@/hooks/useUpiAccounts';

interface ManualLogsProps {
  selectedLocation?: string;
}

export default function ManualLogs({ selectedLocation }: ManualLogsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingLogs, setPendingLogs] = useState([]);
  const [approvedLogs, setApprovedLogs] = useState([]);
  const [payLaterLogs, setPayLaterLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Set default date to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Checkout modal state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLog, setCheckoutLog] = useState<any | null>(null);
  const [checkoutPaymentMode, setCheckoutPaymentMode] = useState<'cash' | 'upi' | 'credit'>('cash');
  const [checkoutDiscount, setCheckoutDiscount] = useState<string>('');
  const [checkoutServices, setCheckoutServices] = useState<string[]>([]);
  const [checkoutAmount, setCheckoutAmount] = useState<string>('');

  // Settle Pay Later modal state
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleLog, setSettleLog] = useState<any | null>(null);
  const [settlePaymentMode, setSettlePaymentMode] = useState<'cash' | 'upi'>('cash');



  // State for tracking deleted logs
  const [isDeleting, setIsDeleting] = useState<Set<string>>(new Set());

  // UPI accounts state
  const [selectedUpiAccount, setSelectedUpiAccount] = useState<string>('');
  const { accounts: upiAccounts, loading: upiAccountsLoading } = useUpiAccounts(selectedLocation);

  // Checkout remarks state
  const [checkoutRemarks, setCheckoutRemarks] = useState<string>('');

  // Reset UPI account selection when selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      setSelectedUpiAccount('');
      console.log('📍 Location changed, resetting UPI account selection');
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedLocation) {
      fetchLogs();
    }
  }, [selectedLocation, selectedDate]);

  useEffect(() => {
    if (selectedLocation) {
      fetchLogs();
    }
  }, [selectedLocation]);

  const openCheckout = (log: any) => {
    setCheckoutLog(log);
    setCheckoutPaymentMode((log?.payment_mode as any) || 'cash');
    setCheckoutDiscount(log?.discount != null ? String(log.discount) : '');
    setCheckoutServices(log?.service ? String(log.service).split(',').map((s:string)=>s.trim()).filter(Boolean) : []);
    
    // Calculate original amount by adding discount back to the current amount
    const currentAmount = log?.Amount+log?.discount != null ? Number(log.Amount+log?.discount) : 0;
    const discountAmount = log?.discount != null ? Number(log.discount) : 0;
    const originalAmount = currentAmount - discountAmount;
    setCheckoutAmount(currentAmount > 0 ? String(currentAmount) : '');
    
    setSelectedUpiAccount(''); // Reset UPI account selection
    setCheckoutRemarks(''); // Reset remarks


    setCheckoutOpen(true);
  };

  const confirmCheckout = async () => {
    if (!checkoutLog) return;
    
    // Validate UPI account selection if UPI is selected
    if (checkoutPaymentMode === 'upi' && !selectedUpiAccount) {
      toast.error('Please select a UPI account');
      return;
    }
    
    try {
      const discountNum = checkoutDiscount === '' ? null : Number(checkoutDiscount) || 0;
      const amountNum = checkoutAmount === '' ? null : Number(checkoutAmount) || 0;
      
      // Find the selected UPI account details
      const selectedAccount = upiAccounts.find(acc => acc.id === selectedUpiAccount);
      
      const updateData: any = {
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        exit_time: new Date().toISOString(),
        payment_mode: checkoutPaymentMode,
        discount: discountNum,
        service: checkoutServices.join(','),
        Amount: amountNum,
        remarks: checkoutRemarks || null,
      };
      
      // Add UPI account information if UPI is selected
      if (checkoutPaymentMode === 'upi' && selectedAccount) {
        updateData.upi_account_id = selectedUpiAccount;
        updateData.upi_account_name = selectedAccount.account_name;
        updateData.upi_id = selectedAccount.upi_id;
      }
      
      if (String(checkoutPaymentMode).toLowerCase() !== 'credit') {
        updateData.payment_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('logs-man')
        .update(updateData)
        .eq('id', checkoutLog.id);
      if (error) throw error;
      
      toast.success('Checkout completed');
      setCheckoutOpen(false);
      setCheckoutLog(null);
      setSelectedUpiAccount(''); // Reset UPI account selection
      setCheckoutRemarks(''); // Reset remarks
      fetchLogs();
    } catch (err: any) {
      toast.error(`Checkout failed: ${err?.message || err}`);
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
      fetchLogs();
    } catch (err: any) {
      toast.error(`Settle failed: ${err?.message || err}`);
    }
  };

  const clearDateFilter = () => {
    // Reset to today's date instead of clearing
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const handleEdit = (log: any) => {
    // Navigate to owner entry with log data for editing
    const logData = {
      id: log.id,
      vehicleNumber: log.vehicle_number || '',
      vehicleType: log.vehicle_type || '',
      service: log.service ? log.service.split(',') : [],
      amount: log.Amount?.toString() || '',
      entryType: log.entry_type || 'normal',
      discount: log.discount?.toString() || '',
      remarks: log.remarks || '',
      paymentMode: log.payment_mode || 'cash',
      customerName: log.Name || '',
      phoneNumber: log.Phone_no || '',
      dateOfBirth: log['D.O.B'] || '',
      customerLocation: log.Location || '',
      selectedVehicleBrand: log.vehicle_brand || '',
      selectedModel: log.vehicle_model || '',
      selectedModelId: log.Brand_id || '',
      workshop: log.workshop || '',
        wheel_type: log.wheel_type || '',
      isEditing: true
    };
    
    // Store the log data in sessionStorage for the entry form to access
    sessionStorage.setItem('editLogData', JSON.stringify(logData));
    navigate('/owner-entry');
  };





  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch pending logs (not approved yet)
      let pendingQuery = supabase
        .from("logs-man")
        .select("*, vehicles(number_plate)")
        .eq("location_id", selectedLocation)
        .in("approval_status", ["pending", null])
        .order("created_at", { ascending: false });

      // Add date filter if selected
      if (selectedDate) {
        // Create proper date objects with timezone handling
        const selectedDateObj = new Date(selectedDate);
        const startOfDay = selectedDateObj.toISOString().split('T')[0] + 'T00:00:00.000Z';
        const endOfDay = selectedDateObj.toISOString().split('T')[0] + 'T23:59:59.999Z';
        
        // Try filtering by entry_time first, then fallback to created_at
        pendingQuery = pendingQuery
          .gte("entry_time", startOfDay)
          .lte("entry_time", endOfDay);
      }

      const { data: pendingData, error: pendingError } = await pendingQuery;
      
      let finalPending: any[] = [];
      // If no results with entry_time filter, try created_at
      if (selectedDate && pendingData?.length === 0) {
        let fallbackQuery = supabase
          .from("logs-man")
          .select("*, vehicles(number_plate)")
          .eq("location_id", selectedLocation)
          .in("approval_status", ["pending", null])
          .order("created_at", { ascending: false });
        
        const selectedDateObj = new Date(selectedDate);
        const startOfDay = selectedDateObj.toISOString().split('T')[0] + 'T00:00:00.000Z';
        const endOfDay = selectedDateObj.toISOString().split('T')[0] + 'T23:59:59.999Z';
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay);
        
        if (fallbackData && fallbackData.length > 0) {
          finalPending = fallbackData;
        } else {
          finalPending = pendingData || [];
        }
      } else {
        finalPending = pendingData || [];
      }

      // Fetch approved (closed) logs
      let approvedQuery = supabase
        .from("logs-man")
        .select("*, vehicles(number_plate)")
        .eq("location_id", selectedLocation)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      // Add date filter if selected
      if (selectedDate) {
        const selectedDateObj = new Date(selectedDate);
        const approvedStartOfDay = selectedDateObj.toISOString().split('T')[0] + 'T00:00:00.000Z';
        const approvedEndOfDay = selectedDateObj.toISOString().split('T')[0] + 'T23:59:59.999Z';
        
        approvedQuery = approvedQuery
          .gte("entry_time", approvedStartOfDay)
          .lte("entry_time", approvedEndOfDay);
      }

      const { data: approvedData, error: approvedError } = await approvedQuery;

      let finalApproved: any[] = [];
      if (selectedDate && approvedData?.length === 0) {
        let approvedFallbackQuery = supabase
          .from("logs-man")
          .select("*, vehicles(number_plate)")
          .eq("location_id", selectedLocation)
          .eq("approval_status", "approved")
          .order("created_at", { ascending: false });

        const selectedDateObj = new Date(selectedDate);
        const approvedFallbackStartOfDay = selectedDateObj.toISOString().split('T')[0] + 'T00:00:00.000Z';
        const approvedFallbackEndOfDay = selectedDateObj.toISOString().split('T')[0] + 'T23:59:59.999Z';

        const { data: approvedFallbackData, error: approvedFallbackError } = await approvedFallbackQuery
          .gte("created_at", approvedFallbackStartOfDay)
          .lte("created_at", approvedFallbackEndOfDay);
        finalApproved = approvedFallbackData && approvedFallbackData.length > 0 ? approvedFallbackData : (approvedData || []);
      } else {
        finalApproved = approvedData || [];
      }

      // Closed = approved but not Pay Later
      const closed = (finalApproved || []).filter((log: any) => String(log.payment_mode).toLowerCase() !== 'credit');
      setApprovedLogs(closed);
      setPendingLogs(finalPending);

      // Fetch Pay Later separately WITH date filter
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
      setPayLaterLogs(finalPayLater);

      if (pendingError) {
        console.error('Error fetching pending logs:', pendingError);
        toast.error('Error fetching pending logs: ' + pendingError.message);
      }

      if (approvedError) {
        console.error('Error fetching approved logs:', approvedError);
        toast.error('Error fetching approved logs: ' + approvedError.message);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Error fetching logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (logId: string, action: 'approve' | 'reject') => {
    console.log(`Attempting to ${action} log with ID:`, logId);
    
    try {
      // Simple update without complex verification
      const updateData = { 
        approval_status: action === 'approve' ? 'approved' : 'rejected',
        approved_at: action === 'approve' ? new Date().toISOString() : null,
        exit_time: action === 'approve' ? new Date().toISOString() : null
      };
      
      console.log('Update data:', updateData);
      
      const { data, error } = await supabase
        .from("logs-man")
        .update(updateData)
        .eq("id", logId)
        .select("id, approval_status");

      console.log('Update result:', { data, error });

      if (error) {
        console.error(`Error ${action}ing log:`, error);
        toast.error(`Failed to ${action} entry: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        console.log('Successfully updated log:', data[0]);
        toast.success(`Entry ${action}d successfully!`);
        
        // Refresh the data
        setTimeout(() => {
          fetchLogs();
        }, 1000);
      } else {
        console.error('No data returned from update');
        toast.error('Update failed - no data returned');
      }
      
    } catch (error) {
      console.error(`Error ${action}ing log:`, error);
      toast.error(`Failed to ${action} entry: ${error.message}`);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!logId) {
      toast.error('Invalid log ID');
      return;
    }

    try {
      setIsDeleting(prev => { const newSet = new Set(prev); newSet.add(logId); return newSet; });

      const { error } = await supabase
        .from('logs-man')
        .delete()
        .eq('id', logId);

      if (error) {
        console.error('Error deleting log:', error);
        toast.error('Error deleting log: ' + error.message);
        setIsDeleting(prev => { const newSet = new Set(prev); newSet.delete(logId); return newSet; });
        return;
      }

      // Update local state immediately for instant UI feedback
      setPendingLogs(prev => prev.filter(log => log.id !== logId));
      setApprovedLogs(prev => prev.filter(log => log.id !== logId));
      setPayLaterLogs(prev => prev.filter(log => log.id !== logId));

      toast.success('Log deleted successfully');
      
      // Refresh from database after a short delay for consistency
      setTimeout(() => {
        fetchLogs();
      }, 100);

    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Error deleting log: ' + error.message);
      setIsDeleting(prev => { const newSet = new Set(prev); newSet.delete(logId); return newSet; });
    }
  };


  function getDuration(entry, exit) {
    if (!entry || !exit) return "-";
    const ms = Number(new Date(exit)) - Number(new Date(entry));
    if (isNaN(ms) || ms < 0) return "-";
    const min = Math.floor(ms / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-2">
            <PenTool className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            <h1 className="text-xl lg:text-2xl font-bold">Manual Logs</h1>
          </div>
        </div>
      </div>

      {/* Date Filter */}
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
                  size="sm"
                  onClick={clearDateFilter}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Today
                </Button>
            </div>
            {/* Debug info */}
            {selectedDate && (
              <div className="text-xs text-muted-foreground">
                Filtering: {new Date(selectedDate).toLocaleDateString()} | 
                Pending: {pendingLogs.length} | 
                Approved: {approvedLogs.length} | 
                Pay Later: {payLaterLogs.length}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

        {/* Pending Approvals Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <span>Pending Tickets</span>
                <Badge variant="secondary">{pendingLogs.length}</Badge>
              </div>
              {/* Date filter intentionally not shown for Pay Later */}
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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Model</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Customer Name</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Amount</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Service</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Entry Time</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr><td colSpan={8} className="text-center py-4">Loading...</td></tr>
                      ) : pendingLogs.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-4 text-muted-foreground">
                          {selectedDate ? `No pending tickets found for ${new Date(selectedDate).toLocaleDateString()}` : 'No pending tickets'}
                        </td></tr>
                      ) : (
                        pendingLogs.map((log, idx) => {
                          return (
                            <tr key={log.id || idx} className="hover:bg-muted/30">
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.vehicle_number || log.vehicles?.number_plate || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{log.vehicle_model || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{log.Name || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{log.Phone_no || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600 hidden md:table-cell">
                                {log.Amount ? formatCurrency(log.Amount) : "-"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{log.service || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                {log.entry_time ? new Date(log.entry_time).toLocaleString() : 
                                 log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex flex-col sm:flex-row gap-1">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700 text-xs"
                                    onClick={() => openCheckout(log)}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Checkout
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
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="text-xs"
                                    onClick={() => {
                                      console.log('🚨 DELETE BUTTON CLICKED!');
                                      console.log('Log object:', log);
                                      console.log('Log ID:', log.id);
                                      console.log('Log ID type:', typeof log.id);
                                      console.log('Log ID length:', log.id?.length);
                                      
                                      if (!log.id) {
                                        console.error('❌ Log ID is missing or undefined!');
                                        toast.error('Cannot delete: Log ID is missing');
                                        return;
                                      }
                                      
                                      handleDelete(log.id);
                                    }}
                                    title="Delete log"
                                    disabled={isDeleting.has(log.id)}
                                  >
                                    {isDeleting.has(log.id) ? (
                                      <X className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Model</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Customer Name</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Phone</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Amount</th>
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
                        <tr><td colSpan={10} className="text-center py-4">Loading...</td></tr>
                      ) : payLaterLogs.length === 0 ? (
                        <tr><td colSpan={10} className="text-center py-4 text-muted-foreground">
                          {selectedDate ? `No pay later tickets for ${new Date(selectedDate).toLocaleDateString()}` : 'No pay later tickets'}
                        </td></tr>
                      ) : (
                        payLaterLogs.map((log: any, idx: number) => {
                          return (
                            <tr key={log.id || idx} className="hover:bg-muted/30">
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.vehicle_number || log.vehicles?.number_plate || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{log.vehicle_model || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{log.Name || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">{log.Phone_no || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600 hidden md:table-cell">
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
                                <Button size="sm" variant="default" className="text-xs" onClick={() => openSettle(log)}>Settle</Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approved Logs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Ticket Closed</span>
                <Badge variant="default">{approvedLogs.length}</Badge>
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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Model</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Customer Name</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Phone</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Amount</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Service</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Entry Time</th>
                         <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Exit Time</th>
                         <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Duration</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr><td colSpan={11} className="text-center py-4">Loading...</td></tr>
                      ) : approvedLogs.length === 0 ? (
                        <tr><td colSpan={11} className="text-center py-4 text-muted-foreground">
                          {selectedDate ? `No approved tickets found for ${new Date(selectedDate).toLocaleDateString()}` : 'No approved tickets'}
                        </td></tr>
                      ) : (
                        approvedLogs.map((log, idx) => {
                          return (
                            <tr key={log.id || idx} className="hover:bg-muted/30">
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.vehicle_number || log.vehicles?.number_plate || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{log.vehicle_model || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{log.Name || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">{log.Phone_no || "-"}</td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600 hidden md:table-cell">
                                 {(() => {
                                  const currentAmount = log.Amount || 0;
                                  const discountAmount = log.discount || 0;
                                  const originalAmount = currentAmount - discountAmount;
                                  return currentAmount > 0 ? formatCurrency(currentAmount) : "-";
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
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                {(() => {
                                  const entryTime = log.entry_time || log.created_at;
                                  const exitTime = log.exit_time || log.approved_at;
                                  return getDuration(entryTime, exitTime);
                                })()}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                                  Approved
                                </Badge>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    console.log('🚨 APPROVED LOG DELETE BUTTON CLICKED!');
                                    console.log('Log object:', log);
                                    console.log('Log ID:', log.id);
                                    console.log('Log ID type:', typeof log.id);
                                    console.log('Log ID length:', log.id?.length);
                                    
                                    if (!log.id) {
                                      console.error('❌ Log ID is missing or undefined!');
                                      toast.error('Cannot delete: Log ID is missing');
                                      return;
                                    }
                                    
                                    handleDelete(log.id);
                                  }}
                                  className="text-xs"
                                  title="Delete log"
                                  disabled={isDeleting.has(log.id)}
                                >
                                  {isDeleting.has(log.id) ? (
                                    <X className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Dialog */}
        <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
          <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
              <DialogDescription>Confirm details before completing checkout.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vehicle No</Label>
                  <div className="mt-1 text-sm font-medium">{checkoutLog?.vehicle_number || '-'}</div>
                </div>
                <div>
                  <Label>Vehicle Model</Label>
                  <div className="mt-1 text-sm">{checkoutLog?.vehicle_model || '-'}</div>
                </div>
                <div>
                  <Label>Customer Name</Label>
                  <div className="mt-1 text-sm">{checkoutLog?.Name || '-'}</div>
                </div>
              </div>
              <div>
                <Label>Service Chosen</Label>
                <div className="mt-1 text-sm">
                  {checkoutServices.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {checkoutServices.map((service, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No services selected</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" value={checkoutAmount} onChange={(e) => setCheckoutAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label htmlFor="discount">Discount</Label>
                  <Input id="discount" type="number" value={checkoutDiscount} onChange={(e) => setCheckoutDiscount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>Final</Label>
                  <div className="mt-1 text-sm font-semibold">
                    {(() => {
                      const amt = Number(checkoutAmount || 0);
                      const disc = checkoutDiscount === '' ? 0 : Number(checkoutDiscount) || 0;
                      const finalAmt = Math.max(amt - disc, 0);
                      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(finalAmt);
                    })()}
                  </div>
                </div>
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select value={checkoutPaymentMode} onValueChange={(v: any) => setCheckoutPaymentMode(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="credit">Pay Later</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* UPI Account Selection */}
              {checkoutPaymentMode === 'upi' && (
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
                  
                  {/* QR Code Display */}
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

              {/* Remarks Field */}
              <div>
                <Label htmlFor="checkout-remarks">Remarks (Optional)</Label>
                <Textarea 
                  id="checkout-remarks"
                  placeholder="Any additional notes for this checkout..."
                  value={checkoutRemarks}
                  onChange={(e) => setCheckoutRemarks(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
              <Button onClick={confirmCheckout}>Confirm Checkout</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                  <div className="mt-1 text-sm font-medium">{settleLog?.Amount-settleLog?.discount!= null ? formatCurrency(settleLog?.Amount-settleLog?.discount) : '-'}</div>
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