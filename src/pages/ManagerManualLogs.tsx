import { useEffect, useState } from "react";
import { ArrowLeft, PenTool, Check, X, Clock, CheckCircle, Calendar, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

export default function ManagerManualLogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingLogs, setPendingLogs] = useState([]);
  const [approvedLogs, setApprovedLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Set default date to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  console.log("ManagerManualLogs component rendered. assignedLocation:", user?.assigned_location);

  useEffect(() => {
    console.log("ManagerManualLogs useEffect running. assignedLocation:", user?.assigned_location);
    if (!user?.assigned_location) {
      toast.error("No location assigned to manager");
      return;
    }
    
    fetchLogs();
  }, [user?.assigned_location, selectedDate]);

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
        
        if (approvedFallbackData && approvedFallbackData.length > 0) {
          console.log("Found approved data with created_at filter");
          setApprovedLogs(approvedFallbackData);
        } else {
          setApprovedLogs(approvedData || []);
        }
      } else {
        setApprovedLogs(approvedData || []);
      }
      
      // If no results, try a broader query to see what approval_status values exist
      if (approvedData.length === 0 && !selectedDate) {
        console.log("No approved logs found, checking all approval_status values...");
        const { data: allStatuses, error: statusError } = await supabase
          .from("logs-man")
          .select("id, approval_status")
          .eq("location_id", user?.assigned_location)
          .limit(10);
        
        console.log("All approval statuses in database:", allStatuses);
      }

      console.log("Approved query final result:", { approvedData, approvedError });
      console.log("Approved logs count:", approvedData?.length || 0);

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
    <Layout>
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
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <span>Pending Approvals</span>
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
                          {selectedDate ? `No pending approvals found for ${new Date(selectedDate).toLocaleDateString()}` : 'No pending approvals'}
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
                                  onClick={() => handleApproval(log.id, 'approve')}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs"
                                  onClick={() => handleApproval(log.id, 'reject')}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Reject
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

        {/* Approved Logs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Approved Manual Logs</span>
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr><td colSpan={10} className="text-center py-4">Loading...</td></tr>
                      ) : approvedLogs.length === 0 ? (
                        <tr><td colSpan={10} className="text-center py-4 text-muted-foreground">
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
      </div>
    </Layout>
  );
} 