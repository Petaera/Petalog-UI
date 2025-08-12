import { useEffect, useState } from "react";
import { ArrowLeft, PenTool, Check, X, Clock, CheckCircle, Calendar, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactSelect from 'react-select';

export default function ManagerManualLogs() {
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

  // Service price matrix for recomputing totals
  const [priceMatrix, setPriceMatrix] = useState<any[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchServicePrices = async () => {
      const { data } = await supabase.from('Service_prices').select('*');
      if (data && data.length > 0) {
        setPriceMatrix(data);
      }
    };
    fetchServicePrices();
  }, []);

  const openCheckout = (log: any) => {
    setCheckoutLog(log);
    setCheckoutPaymentMode((log?.payment_mode as any) || 'cash');
    setCheckoutDiscount(log?.discount != null ? String(log.discount) : '');
    setCheckoutServices(log?.service ? String(log.service).split(',').map((s:string)=>s.trim()).filter(Boolean) : []);
    setCheckoutAmount(log?.Amount != null ? String(log.Amount) : '');

    // Build service options for the vehicle type
    try {
      const options = priceMatrix
        .filter(row => (row.VEHICLE && row.VEHICLE.trim()) === String(log?.vehicle_type || '').trim())
        .map(row => row.SERVICE)
        .filter((v: string, i: number, arr: string[]) => v && arr.indexOf(v) === i);
      setServiceOptions(options);
    } catch {}
    setCheckoutOpen(true);
  };

  const confirmCheckout = async () => {
    if (!checkoutLog) return;
    try {
      const discountNum = checkoutDiscount === '' ? null : Number(checkoutDiscount) || 0;
      const amountNum = checkoutAmount === '' ? null : Number(checkoutAmount) || 0;
      const updateData: any = {
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        exit_time: new Date().toISOString(),
        payment_mode: checkoutPaymentMode,
        discount: discountNum,
        service: checkoutServices.join(','),
        Amount: amountNum,
      };
      const { error } = await supabase
        .from('logs-man')
        .update(updateData)
        .eq('id', checkoutLog.id);
      if (error) throw error;
      toast.success('Checkout completed');
      setCheckoutOpen(false);
      setCheckoutLog(null);
      fetchLogs();
    } catch (err: any) {
      toast.error(`Checkout failed: ${err?.message || err}`);
    }
  };

  console.log("ManagerManualLogs component rendered. assignedLocation:", user?.assigned_location);

  useEffect(() => {
    console.log("ManagerManualLogs useEffect running. assignedLocation:", user?.assigned_location);
    if (!user?.assigned_location) {
      toast.error("No location assigned to manager");
      return;
    }
    
    // Only fetch if we have a valid assigned location
    if (user.assigned_location && selectedDate) {
      fetchLogs();
    }
  }, [user?.assigned_location, selectedDate]); // Removed fetchLogs from dependencies

  const clearDateFilter = () => {
    // Reset to today's date instead of clearing
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const handleEdit = (log: any) => {
    // Navigate to manager owner entry with log data for editing
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
      wheel_type: log.wheel_type || null,
      isEditing: true
    };
    
    // Store the log data in sessionStorage for the entry form to access
    sessionStorage.setItem('editLogData', JSON.stringify(logData));
    navigate('/manager-owner-entry');
  };





  const fetchLogs = async () => {
    setLoading(true);
    try {
      console.log("Fetching logs for location:", user?.assigned_location);
      console.log("Selected date:", selectedDate);
      
      // Fetch pending logs (not approved yet)
      let pendingQuery = supabase
        .from("logs-man")
        .select("*, vehicles(number_plate)")
        .eq("location_id", user?.assigned_location)
        .in("approval_status", ["pending", null])
        .order("created_at", { ascending: false });

      // Add date filter if selected
      if (selectedDate) {
        const startOfDay = `${selectedDate}T00:00:00.000Z`;
        const endOfDay = `${selectedDate}T23:59:59.999Z`;
        console.log("Date filter - startOfDay:", startOfDay, "endOfDay:", endOfDay);
        
        // Try filtering by entry_time first, then fallback to created_at
        pendingQuery = pendingQuery
          .gte("entry_time", startOfDay)
          .lte("entry_time", endOfDay);
      }

      const { data: pendingData, error: pendingError } = await pendingQuery;

      console.log("Pending query result:", { pendingData, pendingError });
      console.log("Pending logs count:", pendingData?.length || 0);
      
      // If no results with entry_time filter, try created_at
      if (selectedDate && pendingData?.length === 0) {
        console.log("No results with entry_time filter, trying created_at...");
        let fallbackQuery = supabase
          .from("logs-man")
          .select("*, vehicles(number_plate)")
          .eq("location_id", user?.assigned_location)
          .in("approval_status", ["pending", null])
          .order("created_at", { ascending: false });
        
        const startOfDay = `${selectedDate}T00:00:00.000Z`;
        const endOfDay = `${selectedDate}T23:59:59.999Z`;
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay);
        
        console.log("Fallback query result:", { fallbackData, fallbackError });
        
        if (fallbackData && fallbackData.length > 0) {
          console.log("Found data with created_at filter");
          setPendingLogs(fallbackData);
        } else {
          setPendingLogs(pendingData || []);
        }
      } else {
        setPendingLogs(pendingData || []);
      }

      // Fetch approved logs - try different query approaches
      let approvedData = [];
      let approvedError = null;
      let finalApproved = [];
      
      // First try: exact match for approved
      let approvedQuery = supabase
        .from("logs-man")
        .select("*, vehicles(number_plate)")
        .eq("location_id", user?.assigned_location)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      // Add date filter if selected
      if (selectedDate) {
        const startOfDay = `${selectedDate}T00:00:00.000Z`;
        const endOfDay = `${selectedDate}T23:59:59.999Z`;
        console.log("Approved query - Date filter - startOfDay:", startOfDay, "endOfDay:", endOfDay);
        
        // Try filtering by entry_time first, then fallback to created_at
        approvedQuery = approvedQuery
          .gte("entry_time", startOfDay)
          .lte("entry_time", endOfDay);
      }

      const { data: approved1, error: error1 } = await approvedQuery;
      
      console.log("Approved query 1 result:", { approved1, error1 });
      
      if (error1) {
        console.error("Approved query 1 failed:", error1);
      } else {
        approvedData = approved1 || [];
        approvedError = error1;
      }
      
      // If no results with entry_time filter, try created_at
      if (selectedDate && approvedData.length === 0) {
        console.log("No approved results with entry_time filter, trying created_at...");
        let approvedFallbackQuery = supabase
          .from("logs-man")
          .select("*, vehicles(number_plate)")
          .eq("location_id", user?.assigned_location)
          .eq("approval_status", "approved")
          .order("created_at", { ascending: false });
        
        const startOfDay = `${selectedDate}T00:00:00.000Z`;
        const endOfDay = `${selectedDate}T23:59:59.999Z`;
        
        const { data: approvedFallbackData, error: approvedFallbackError } = await approvedFallbackQuery
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay);
        
        console.log("Approved fallback query result:", { approvedFallbackData, approvedFallbackError });
        
        finalApproved = approvedFallbackData && approvedFallbackData.length > 0 ? approvedFallbackData : (approvedData || []);
      } else {
        finalApproved = approvedData || [];
      }

      // Split approved into Pay Later vs Closed
      const payLater = (finalApproved || []).filter((log: any) => String(log.payment_mode).toLowerCase() === 'credit');
      const closed = (finalApproved || []).filter((log: any) => String(log.payment_mode).toLowerCase() !== 'credit');
      setPayLaterLogs(payLater);
      setApprovedLogs(closed);
      
      // If no results, try a broader query to see what approval_status values exist
      if (finalApproved.length === 0 && !selectedDate) {
        console.log("No approved logs found, checking all approval_status values...");
        const { data: allStatuses, error: statusError } = await supabase
          .from("logs-man")
          .select("id, approval_status")
          .eq("location_id", user?.assigned_location)
          .limit(10);
        
        console.log("All approval statuses in database:", allStatuses);
      }

      console.log("Approved query final result:", { approvedData, approvedError });
      console.log("Approved logs count:", finalApproved?.length || 0);

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

  const handleDelete = async (logId: string, tableName: 'logs-man' | 'logs-man-approved') => {
    if (!confirm('Are you sure you want to delete this log? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', logId);

      if (error) {
        console.error('Error deleting log:', error);
        toast.error('Failed to delete log');
        return;
      }

      toast.success('Log deleted successfully');
      // Refresh the logs
      fetchLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Failed to delete log');
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
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">

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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
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
                        <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
                      ) : pendingLogs.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">
                          {selectedDate ? `No pending tickets found for ${new Date(selectedDate).toLocaleDateString()}` : 'No pending tickets'}
                        </td></tr>
                      ) : (
                        pendingLogs.map((log, idx) => (
                          <tr key={log.id || idx} className="hover:bg-muted/30">
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.vehicle_number || log.vehicles?.number_plate || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{log.vehicle_type || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{log.Name || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{log.Phone_no || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600 hidden md:table-cell">
                              {log.Amount ? formatCurrency(log.Amount) : "-"}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{log.service || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
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
                                  onClick={() => handleDelete(log.id, 'logs-man')}
                                  title="Delete log"
                                >
                                  <Trash2 className="h-3 w-3" />
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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Customer Name</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Phone</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Amount</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Service</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Entry Time</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Exit Time</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                        payLaterLogs.map((log: any, idx: number) => (
                          <tr key={log.id || idx} className="hover:bg-muted/30">
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.vehicle_number || log.vehicles?.number_plate || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{log.vehicle_type || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{log.Name || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">{log.Phone_no || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600 hidden md:table-cell">
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
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs">Pay Later</Badge>
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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Customer Name</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Phone</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Amount</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Service</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Entry Time</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Exit Time</th>
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
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{log.vehicle_type || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{log.Name || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">{log.Phone_no || "-"}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600 hidden md:table-cell">
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
                                onClick={() => handleDelete(log.id, 'logs-man-approved')}
                                className="text-xs"
                                title="Delete log"
                              >
                                <Trash2 className="h-3 w-3" />
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
        <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
              <DialogDescription>Confirm details before completing checkout.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vehicle No</Label>
                  <div className="mt-1 text-sm font-medium">{checkoutLog?.vehicle_number || '-'}</div>
                </div>
                <div>
                  <Label>Vehicle Type</Label>
                  <div className="mt-1 text-sm">{checkoutLog?.vehicle_type || '-'}</div>
                </div>
                <div>
                  <Label>Customer Name</Label>
                  <div className="mt-1 text-sm">{checkoutLog?.Name || '-'}</div>
                </div>
              </div>
              <div>
                <Label>Service Chosen</Label>
                <ReactSelect
                  isMulti
                  options={serviceOptions.map(opt => ({ value: opt, label: opt }))}
                  value={checkoutServices.map(s => ({ value: s, label: s }))}
                  onChange={(selected) => {
                    const values = Array.isArray(selected) ? selected.map((s: any) => s.value) : [];
                    setCheckoutServices(values);
                    // recompute amount if price matrix available
                    if (priceMatrix.length > 0 && checkoutLog?.vehicle_type) {
                      let total = 0;
                      for (const sv of values) {
                        const row = priceMatrix.find(r => (r.VEHICLE && r.VEHICLE.trim()) === String(checkoutLog.vehicle_type).trim() && (r.SERVICE && r.SERVICE.trim()) === String(sv).trim());
                        if (row && row.PRICE !== undefined) total += Number(row.PRICE);
                      }
                      setCheckoutAmount(String(total));
                    }
                  }}
                  placeholder={serviceOptions.length ? 'Select services' : 'No services'}
                  classNamePrefix="react-select"
                />
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
              <Button onClick={confirmCheckout}>Confirm Checkout</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
} 