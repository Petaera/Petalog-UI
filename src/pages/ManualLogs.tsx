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


  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editLog, setEditLog] = useState<any | null>(null);
  const [editVehicleNumber, setEditVehicleNumber] = useState<string>('');
  const [editVehicleType, setEditVehicleType] = useState<string>('');
  const [editServices, setEditServices] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDiscount, setEditDiscount] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [editPaymentMode, setEditPaymentMode] = useState<'cash' | 'upi' | 'credit'>('cash');
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editPhoneNumber, setEditPhoneNumber] = useState<string>('');
  const [editVehicleBrand, setEditVehicleBrand] = useState<string>('');
  const [editVehicleModel, setEditVehicleModel] = useState<string>('');
  const [editWorkshop, setEditWorkshop] = useState<string>('');
  const [editWheelType, setEditWheelType] = useState<string>('');
  const [editSelectedUpiAccount, setEditSelectedUpiAccount] = useState<string>('');



  // State for tracking deleted logs
  const [isDeleting, setIsDeleting] = useState<Set<string>>(new Set());

  // UPI accounts state
  const [selectedUpiAccount, setSelectedUpiAccount] = useState<string>('');
  const { accounts: upiAccounts, loading: upiAccountsLoading } = useUpiAccounts(selectedLocation);

  // Checkout remarks state
  const [checkoutRemarks, setCheckoutRemarks] = useState<string>('');
  const [checkoutLoyaltyAmount, setCheckoutLoyaltyAmount] = useState<number | null>(null);

  // Loyalty add flow state
  const [addLoyaltyOpen, setAddLoyaltyOpen] = useState(false);
  const [loyaltyLog, setLoyaltyLog] = useState<any | null>(null);
  const [loyaltyPlans, setLoyaltyPlans] = useState<any[]>([]);
  const [selectedLoyaltyPlanId, setSelectedLoyaltyPlanId] = useState<string>('');
  const [addingToLoyalty, setAddingToLoyalty] = useState(false);

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

  // Load active loyalty plans (owner's or manager's permitted)
  useEffect(() => {
    const loadPlans = async () => {
      if (!user?.id) return;
      try {
        const isManager = String(user.role || '').toLowerCase().includes('manager');
        let permittedOwnerIds: string[] = [];
        if (isManager && user.assigned_location) {
          const { data: ownerMap } = await supabase
            .from('location_owners')
            .select('owner_id')
            .eq('location_id', user.assigned_location);
          permittedOwnerIds = (ownerMap || []).map((o: any) => o.owner_id).filter(Boolean);
        }
        let q = supabase
          .from('subscription_plans')
          .select('id, name, type, price, active, duration_days, max_redemptions, plan_amount, multiplier, owner_id')
          .eq('active', true);
        if (isManager) {
          if (permittedOwnerIds.length === 0) { setLoyaltyPlans([]); return; }
          q = q.in('owner_id', permittedOwnerIds);
        } else {
          q = q.eq('owner_id', user.id);
        }
        const { data } = await q;
        setLoyaltyPlans(data || []);
      } catch (e) {
        setLoyaltyPlans([]);
      }
    };
    loadPlans();
  }, [user?.id, user?.role, user?.assigned_location]);

  const openCheckout = (log: any, opts?: { loyaltyAmount?: number }) => {
    setCheckoutLog(log);
    setCheckoutPaymentMode((log?.payment_mode as any) || 'cash');
    setCheckoutDiscount(log?.discount != null ? String(log.discount) : '');
    setCheckoutServices(log?.service ? String(log.service).split(',').map((s:string)=>s.trim()).filter(Boolean) : []);
    
    // Calculate original amount by adding discount back to the current amount
    const currentAmount = (log?.Amount != null ? Number(log.Amount) : 0) + (log?.discount != null ? Number(log.discount) : 0);
    const discountAmount = log?.discount != null ? Number(log.discount) : 0;
    const originalAmount = currentAmount - discountAmount;
    setCheckoutAmount(currentAmount > 0 ? String(currentAmount) : '');
    
  // Default selected UPI account: If the log already has an associated upi_account_id, select it
  setSelectedUpiAccount(log?.upi_account_id || '');
    setCheckoutRemarks(''); // Reset remarks
    if (opts && typeof opts.loyaltyAmount === 'number') {
      setCheckoutLoyaltyAmount(Number(opts.loyaltyAmount) || 0);
    } else {
      setCheckoutLoyaltyAmount(null);
    }


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
      const discountNumRaw = checkoutDiscount === '' ? 0 : Number(checkoutDiscount) || 0;
      const amountNumRaw = checkoutAmount === '' ? 0 : Number(checkoutAmount) || 0;
      const finalAmt = Math.max(amountNumRaw - discountNumRaw, 0);
      
      // Find the selected UPI account details
      const selectedAccount = upiAccounts.find(acc => acc.id === selectedUpiAccount);
      
      const updateData: any = {
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        exit_time: new Date().toISOString(),
        payment_mode: checkoutPaymentMode,
        discount: checkoutDiscount === '' ? null : discountNumRaw,
        service: checkoutServices.join(','),
        Amount: finalAmt,
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
    // If the log already has an associated upi account, default-select it
    setSelectedUpiAccount(log?.upi_account_id || '');
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
    setEditLog(log);
    setEditVehicleNumber(log.vehicle_number || '');
    setEditVehicleType(log.vehicle_type || '');
    setEditServices(log.service || '');
    const originalAmount = (log?.Amount != null ? Number(log.Amount) : 0) + (log?.discount != null ? Number(log.discount) : 0);
    setEditAmount(originalAmount > 0 ? String(originalAmount) : '');
    setEditDiscount(log.discount != null ? String(log.discount) : '');
    setEditRemarks(log.remarks || '');
    setEditPaymentMode((log.payment_mode as any) || 'cash');
    setEditCustomerName(log.Name || '');
    setEditPhoneNumber(log.Phone_no || '');
    setEditVehicleBrand(log.vehicle_brand || '');
    setEditVehicleModel(log.vehicle_model || '');
    setEditWorkshop(log.workshop || '');
    setEditWheelType(log.wheel_type || '');
    // Pre-select UPI account if present on the log
    setEditSelectedUpiAccount(log?.upi_account_id || '');
    setEditOpen(true);
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
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Service</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Entry Time</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
                    ) : pendingLogs.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">
                        {selectedDate ? `No pending tickets found for ${new Date(selectedDate).toLocaleDateString()}` : 'No pending tickets'}
                      </td></tr>
                    ) : (
                      pendingLogs.map((log, idx) => (
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
                                onClick={() => {
                                  setLoyaltyLog(log);
                                  setSelectedLoyaltyPlanId('');
                                  setAddLoyaltyOpen(true);
                                }}
                              >
                                Add to Loyalty
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
                                  console.log('🚨 MANAGER DELETE BUTTON CLICKED!');
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
                      ))
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
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">Amount</th>
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
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600 ">
                            {log.Amount ? formatCurrency(log.Amount) : "-"}
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
                              <Button size="sm" variant="default" className="text-xs" onClick={() => openSettle(log)}>Settle</Button>
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
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">Amount</th>
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
                        {selectedDate ? `No approved logs found for ${new Date(selectedDate).toLocaleDateString()}` : 'No approved logs found'}
                      </td></tr>
                    ) : (
                      approvedLogs.map((log, idx) => (
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
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600 ">
                            {log.Amount ? formatCurrency(log.Amount) : "-"}
                            {/* Payment Method & UPI Account */}
                            <div className="mt-1 text-xs text-muted-foreground font-normal">
                              Payment: {log.payment_mode ? log.payment_mode.toUpperCase() : "-"}
                              {log.payment_mode === "upi" && log.upi_account_name && (
                                <>
                                  {" "}
                                  {log.upi_account_name}
                                  {/* {log.upi_id ? ` (${log.upi_id})` : ""} */}
                                </>
                              )}
                            </div>
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
                              variant="outline"
                              onClick={() => handleEdit(log)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                console.log('🚨 MANAGER APPROVED LOG DELETE BUTTON CLICKED!');
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
        <Dialog open={checkoutOpen} onOpenChange={(v)=>{ setCheckoutOpen(v); if(!v) setCheckoutLoyaltyAmount(null); }}>
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
                  {checkoutLoyaltyAmount != null && (
                    <div className="mt-1 text-xs text-muted-foreground text-right">
                      Loyalty: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(checkoutLoyaltyAmount)}
                    </div>
                  )}
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
                  <div className="mt-2 grid gap-2">
                    {upiAccountsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading accounts...</div>
                    ) : upiAccounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No UPI accounts found. Please add UPI accounts in the settings.</p>
                    ) : (
                      upiAccounts.map((acc) => (
                        <label key={acc.id} className={`flex items-start gap-3 p-3 rounded-lg border ${selectedUpiAccount === acc.id ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30 hover:border-border'} cursor-pointer`}>
                          <input
                            type="radio"
                            name="checkout-upi"
                            value={acc.id}
                            checked={selectedUpiAccount === acc.id}
                            onChange={() => setSelectedUpiAccount(acc.id)}
                            className="mt-1 h-4 w-4 text-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{acc.account_name}</div>
                              <div className="text-xs text-muted-foreground">{acc.location_name}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">{acc.upi_id}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>

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
            <Button variant="outline" onClick={() => { setCheckoutOpen(false); setCheckoutLoyaltyAmount(null); }}>Cancel</Button>
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
                  <div className="mt-2 grid gap-2">
                    {upiAccountsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading accounts...</div>
                    ) : upiAccounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No UPI accounts found. Please add UPI accounts in the settings.</p>
                    ) : (
                      upiAccounts.map((acc) => (
                        <label key={acc.id} className={`flex items-start gap-3 p-3 rounded-lg border ${selectedUpiAccount === acc.id ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30 hover:border-border'} cursor-pointer`}>
                          <input
                            type="radio"
                            name="settle-upi"
                            value={acc.id}
                            checked={selectedUpiAccount === acc.id}
                            onChange={() => setSelectedUpiAccount(acc.id)}
                            className="mt-1 h-4 w-4 text-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{acc.account_name}</div>
                              <div className="text-xs text-muted-foreground">{acc.location_name}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">{acc.upi_id}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>

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

      {/* Edit Log Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Log</DialogTitle>
            <DialogDescription>Update the ticket details and save.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle No</Label>
                <Input value={editVehicleNumber} onChange={(e) => setEditVehicleNumber(e.target.value)} />
              </div>
              <div>
                <Label>Vehicle Type</Label>
                <Input value={editVehicleType} onChange={(e) => setEditVehicleType(e.target.value)} />
              </div>
              <div>
                <Label>Customer Name</Label>
                <Input value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Amount</Label>
                <Input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
              <div>
                <Label>Discount</Label>
                <Input type="number" value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} />
              </div>
              <div>
                <Label>Final</Label>
                <div className="mt-1 text-sm font-semibold">
                  {(() => {
                    const amt = Number(editAmount || 0);
                    const disc = editDiscount === '' ? 0 : Number(editDiscount) || 0;
                    const finalAmt = Math.max(amt - disc, 0);
                    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(finalAmt);
                  })()}
                </div>
              </div>
            </div>
            <div>
              <Label>Service</Label>
              <Input placeholder="Comma separated" value={editServices} onChange={(e) => setEditServices(e.target.value)} />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={editPaymentMode} onValueChange={(v: any) => setEditPaymentMode(v)}>
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
            {editPaymentMode === 'upi' && (
              <div>
                <Label>Select UPI Account</Label>
                <div className="mt-2 grid gap-2">
                  {upiAccountsLoading ? (
                    <div className="text-sm text-muted-foreground">Loading accounts...</div>
                  ) : upiAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No UPI accounts found. Please add UPI accounts in the settings.</p>
                  ) : (
                    upiAccounts.map((acc) => (
                      <label key={acc.id} className={`flex items-start gap-3 p-3 rounded-lg border ${editSelectedUpiAccount === acc.id ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30 hover:border-border'} cursor-pointer`}>
                        <input
                          type="radio"
                          name="edit-upi"
                          value={acc.id}
                          checked={editSelectedUpiAccount === acc.id}
                          onChange={() => setEditSelectedUpiAccount(acc.id)}
                          className="mt-1 h-4 w-4 text-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{acc.account_name}</div>
                            <div className="text-xs text-muted-foreground">{acc.location_name}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">{acc.upi_id}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle Brand</Label>
                <Input value={editVehicleBrand} onChange={(e) => setEditVehicleBrand(e.target.value)} />
              </div>
              <div>
                <Label>Vehicle Model</Label>
                <Input value={editVehicleModel} onChange={(e) => setEditVehicleModel(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Workshop</Label>
                <Input value={editWorkshop} onChange={(e) => setEditWorkshop(e.target.value)} />
              </div>
              <div>
                <Label>Wheel Type</Label>
                <Input value={editWheelType} onChange={(e) => setEditWheelType(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editLog) return;
              try {
                const amountNum = editAmount === '' ? 0 : Number(editAmount) || 0;
                const discountNum = editDiscount === '' ? 0 : Number(editDiscount) || 0;
                const finalAmt = Math.max(amountNum - discountNum, 0);

                const updateData: any = {
                  vehicle_number: editVehicleNumber || null,
                  vehicle_type: editVehicleType || null,
                  service: editServices ? editServices.split(',').map(s=>s.trim()).filter(Boolean).join(',') : null,
                  Amount: finalAmt,
                  discount: editDiscount === '' ? null : discountNum,
                  remarks: editRemarks || null,
                  payment_mode: editPaymentMode,
                  Name: editCustomerName || null,
                  Phone_no: editPhoneNumber || null,
                  vehicle_brand: editVehicleBrand || null,
                  vehicle_model: editVehicleModel || null,
                  workshop: editWorkshop || null,
                  wheel_type: editWheelType || null,
                  updated_at: new Date().toISOString(),
                };

                if (editPaymentMode === 'upi' && editSelectedUpiAccount) {
                  const selectedAccount = upiAccounts.find(acc => acc.id === editSelectedUpiAccount);
                  if (selectedAccount) {
                    updateData.upi_account_id = editSelectedUpiAccount;
                    updateData.upi_account_name = selectedAccount.account_name;
                    updateData.upi_id = selectedAccount.upi_id;
                  }
                } else if (editPaymentMode !== 'upi') {
                  updateData.upi_account_id = null;
                  updateData.upi_account_name = null;
                  updateData.upi_id = null;
                }

                const { error } = await supabase
                  .from('logs-man')
                  .update(updateData)
                  .eq('id', editLog.id);
                if (error) throw error;
                toast.success('Log updated successfully');
                setEditOpen(false);
                setEditLog(null);
                fetchLogs();
              } catch (err: any) {
                toast.error(`Update failed: ${err?.message || err}`);
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Loyalty Dialog */}
      <Dialog open={addLoyaltyOpen} onOpenChange={setAddLoyaltyOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add to Loyalty</DialogTitle>
            <DialogDescription>Select a plan to enroll this customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer</Label>
                <div className="mt-1 text-sm font-medium">{loyaltyLog?.Name || '-'}</div>
              </div>
              <div>
                <Label>Phone</Label>
                <div className="mt-1 text-sm">{loyaltyLog?.Phone_no || '-'}</div>
              </div>
            </div>
            <div>
              <Label>Choose Plan</Label>
              <Select value={selectedLoyaltyPlanId} onValueChange={setSelectedLoyaltyPlanId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={loyaltyPlans.length ? 'Select plan' : 'No plans available'} />
                </SelectTrigger>
                <SelectContent>
                  {loyaltyPlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - ₹{p.plan_amount || p.price || 0} ({String(p.type || '').toLowerCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLoyaltyOpen(false)}>Cancel</Button>
            <Button disabled={!selectedLoyaltyPlanId || addingToLoyalty} onClick={async () => {
              if (!loyaltyLog || !selectedLoyaltyPlanId || !user?.id) return;
              setAddingToLoyalty(true);
              try {
                // Ensure customer exists (by phone), create or update
                const phoneKey = (loyaltyLog.Phone_no || '').toString();
                let customerId: string | null = null;
                if (phoneKey) {
                  const { data: existing } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('phone', phoneKey)
                    .limit(1);
                  if (existing && existing.length > 0) {
                    customerId = existing[0].id;
                    await supabase.from('customers').update({
                      name: loyaltyLog.Name || null,
                      email: null,
                      owner_id: user.id
                    }).eq('id', customerId);
                  } else {
                    const { data: ins } = await supabase
                      .from('customers')
                      .insert([{ name: loyaltyLog.Name || null, phone: phoneKey, owner_id: user.id }])
                      .select('id')
                      .limit(1);
                    customerId = ins && ins[0]?.id;
                  }
                }

                // Create purchase
                const plan = loyaltyPlans.find(p => p.id === selectedLoyaltyPlanId) || {} as any;
                const now = new Date();
                const startDate = now.toISOString();
                const expiryDate = plan?.duration_days ? new Date(now.getTime() + (Number(plan.duration_days) || 0) * 24 * 60 * 60 * 1000).toISOString() : null;
                const remainingVisits = plan?.max_redemptions != null ? Number(plan.max_redemptions) : null;
                const totalValue = Number(plan?.price || 0);

                await supabase
                  .from('subscription_purchases')
                  .insert([
                    {
                      plan_id: selectedLoyaltyPlanId,
                      customer_id: customerId,
                      vehicle_id: null,
                      location_id: selectedLocation || null,
                      status: 'active',
                      created_by: user.id,
                      start_date: startDate,
                      expiry_date: expiryDate,
                      total_value: totalValue,
                      remaining_visits: remainingVisits,
                      source_payment_method: null,
                    }
                  ]);

                setAddLoyaltyOpen(false);
                // Immediately proceed to checkout with same log, pass loyalty reference amount
                const loyaltyAmount = Number(plan?.plan_amount || plan?.price || 0) || 0;
                openCheckout(loyaltyLog, { loyaltyAmount });
              } catch (e) {
                toast.error('Failed to add to loyalty');
              } finally {
                setAddingToLoyalty(false);
              }
            }}>Add & Checkout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
  );
}