import { useEffect, useState } from "react";
import { ArrowLeft, PenTool, Check, X, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

interface ManualLogsProps {
  selectedLocation?: string;
}

export default function ManualLogs({ selectedLocation }: ManualLogsProps) {
  const { user } = useAuth();
  const [pendingLogs, setPendingLogs] = useState([]);
  const [approvedLogs, setApprovedLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  console.log("ManualLogs component rendered. selectedLocation:", selectedLocation);

  useEffect(() => {
    console.log("ManualLogs useEffect running. selectedLocation:", selectedLocation);
    if (!selectedLocation) {
      toast.error("No location selected");
      return;
    }
    
    // Test database schema first
    const initData = async () => {
      const schemaOk = await testDatabaseSchema();
      if (schemaOk) {
        fetchLogs();
      } else {
        console.error("Database schema test failed, cannot proceed");
      }
    };
    
    initData();
  }, [selectedLocation]);

  const testDatabaseSchema = async () => {
    try {
      console.log("Testing database schema...");
      
      // First, check if the column exists by trying to select it
      const { data, error } = await supabase
        .from("logs-man")
        .select("id, approval_status, approved_at")
        .limit(1);
      
      if (error) {
        console.error("Database schema test failed:", error);
        if (error.message.includes("approval_status") || error.message.includes("approved_at")) {
          toast.error("Database columns missing! Please add 'approval_status' and 'approved_at' columns to logs-man table in Supabase.");
          return false;
        }
      } else {
        console.log("Database schema test passed:", data);
      }
      
      // Test if we can actually update the column
      if (data && data.length > 0) {
        const testId = data[0].id;
        console.log("Testing update on existing record:", testId);
        
        const { data: updateData, error: updateError } = await supabase
          .from("logs-man")
          .update({ approval_status: 'test_working' })
          .eq("id", testId)
          .select("approval_status");
        
        console.log("Update test result:", { updateData, updateError });
        
        if (updateError) {
          console.error("Update test failed:", updateError);
          toast.error("Cannot update approval_status column: " + updateError.message);
          return false;
        } else {
          console.log("Update test successful:", updateData);
          
          // Revert the test update
          await supabase
            .from("logs-man")
            .update({ approval_status: 'pending' })
            .eq("id", testId);
          
          return true;
        }
      }
      
      return true;
    } catch (error) {
      console.error("Schema test error:", error);
      return false;
    }
  };

  const testRLSPolicies = async () => {
    console.log("Testing RLS policies...");
    
    try {
      // Test SELECT permission
      const { data: selectData, error: selectError } = await supabase
        .from("logs-man")
        .select("id, approval_status")
        .limit(1);
      
      console.log("SELECT test result:", { selectData, selectError });
      
      // Test UPDATE permission
      if (selectData && selectData.length > 0) {
        const testId = selectData[0].id;
        console.log("Testing UPDATE on ID:", testId);
        
        const { data: updateData, error: updateError } = await supabase
          .from("logs-man")
          .update({ approval_status: 'test_rls' })
          .eq("id", testId)
          .select("approval_status");
        
        console.log("UPDATE test result:", { updateData, updateError });
        
        if (updateError) {
          console.error("UPDATE permission denied:", updateError);
          toast.error("UPDATE permission denied: " + updateError.message);
          
          // Check if it's an RLS policy issue
          if (updateError.message.includes("policy") || updateError.message.includes("row-level security")) {
            toast.error("RLS Policy Issue: You need to add UPDATE policy for logs-man table in Supabase");
          }
        } else {
          console.log("UPDATE permission granted");
          
          // Revert the test
          await supabase
            .from("logs-man")
            .update({ approval_status: 'pending' })
            .eq("id", testId);
        }
      }
      
      // Test INSERT permission
      const { data: insertData, error: insertError } = await supabase
        .from("logs-man")
        .insert([{
          vehicle_number: 'TEST_RLS',
          location_id: selectedLocation,
          approval_status: 'test_insert'
        }])
        .select("id");
      
      console.log("INSERT test result:", { insertData, insertError });
      
      if (insertData && insertData.length > 0) {
        // Clean up test insert
        await supabase
          .from("logs-man")
          .delete()
          .eq("id", insertData[0].id);
      }
      
    } catch (error) {
      console.error("RLS test error:", error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      console.log("Fetching logs for location:", selectedLocation);
      
      // Fetch pending logs (not approved yet)
      const { data: pendingData, error: pendingError } = await supabase
        .from("logs-man")
        .select("*, vehicles(number_plate)")
        .eq("location_id", selectedLocation)
        .in("approval_status", ["pending", null])
        .order("created_at", { ascending: false });

      console.log("Pending query result:", { pendingData, pendingError });
      console.log("Pending logs count:", pendingData?.length || 0);

      // Fetch approved logs - try different query approaches
      let approvedData = [];
      let approvedError = null;
      
      // First try: exact match for approved
      const { data: approved1, error: error1 } = await supabase
        .from("logs-man")
        .select("*, vehicles(number_plate)")
        .eq("location_id", selectedLocation)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });
      
      console.log("Approved query 1 result:", { approved1, error1 });
      
      if (error1) {
        console.error("Approved query 1 failed:", error1);
      } else {
        approvedData = approved1 || [];
        approvedError = error1;
      }
      
      // If no results, try a broader query to see what approval_status values exist
      if (approvedData.length === 0) {
        console.log("No approved logs found, checking all approval_status values...");
        const { data: allStatuses, error: statusError } = await supabase
          .from("logs-man")
          .select("id, approval_status")
          .eq("location_id", selectedLocation)
          .limit(10);
        
        console.log("All approval statuses in database:", allStatuses);
      }

      console.log("Approved query final result:", { approvedData, approvedError });
      console.log("Approved logs count:", approvedData?.length || 0);

      if (pendingError) {
        console.error('Error fetching pending logs:', pendingError);
        toast.error('Error fetching pending logs: ' + pendingError.message);
      } else {
        setPendingLogs(pendingData || []);
        console.log('Pending logs set:', pendingData);
      }

      if (approvedError) {
        console.error('Error fetching approved logs:', approvedError);
        toast.error('Error fetching approved logs: ' + approvedError.message);
      } else {
        setApprovedLogs(approvedData || []);
        console.log('Approved logs set:', approvedData);
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
        approved_at: action === 'approve' ? new Date().toISOString() : null
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

  const testApprovalUpdate = async () => {
    if (pendingLogs.length === 0) {
      console.log("No pending logs to test with");
      return;
    }
    
    const testLog = pendingLogs[0];
    console.log("Testing approval update with log:", testLog);
    
    try {
      const { data, error } = await supabase
        .from("logs-man")
        .update({ 
          approval_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq("id", testLog.id)
        .select();
      
      console.log("Test update result:", { data, error });
      
      if (error) {
        console.error("Test update failed:", error);
        toast.error("Test update failed: " + error.message);
      } else {
        console.log("Test update successful:", data);
        
        // Verify the update
        const { data: verifyData, error: verifyError } = await supabase
          .from("logs-man")
          .select("approval_status, approved_at")
          .eq("id", testLog.id)
          .single();
        
        console.log("Test verification result:", { verifyData, verifyError });
        
        if (verifyData && verifyData.approval_status === 'approved') {
          toast.success("Test update successful! Refreshing data...");
          setTimeout(() => fetchLogs(), 1000);
        } else {
          toast.error("Test update verification failed");
        }
      }
    } catch (error) {
      console.error("Test update error:", error);
      toast.error("Test update error: " + error.message);
    }
  };

  const testColumnDirectly = async () => {
    console.log("Testing approval_status column directly...");
    
    try {
      // Try to update a simple field first
      const { data: testData, error: testError } = await supabase
        .from("logs-man")
        .select("id, approval_status")
        .limit(1);
      
      console.log("Column test - current data:", { testData, testError });
      
      if (testData && testData.length > 0) {
        const testId = testData[0].id;
        console.log("Testing update on ID:", testId);
        
        const { data: updateData, error: updateError } = await supabase
          .from("logs-man")
          .update({ approval_status: 'test_value' })
          .eq("id", testId)
          .select("approval_status");
        
        console.log("Column test - update result:", { updateData, updateError });
        
        if (updateError) {
          toast.error("Column test failed: " + updateError.message);
        } else {
          toast.success("Column test successful!");
        }
      }
    } catch (error) {
      console.error("Column test error:", error);
      toast.error("Column test error: " + error.message);
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
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <PenTool className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Manual Logs</h1>
          </div>
        </div>
      </div>

        {/* Pending Approvals Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Approvals
              <Badge variant="secondary">{pendingLogs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border px-4 py-2 text-left">Vehicle No</th>
                    <th className="border px-4 py-2 text-left">Customer Name</th>
                    <th className="border px-4 py-2 text-left">Phone</th>
                    <th className="border px-4 py-2 text-left">Amount</th>
                    <th className="border px-4 py-2 text-left">Service</th>
                    <th className="border px-4 py-2 text-left">Entry Time</th>
                    <th className="border px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
                  ) : pendingLogs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">No pending approvals</td></tr>
                  ) : (
                    pendingLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-muted/30">
                        <td className="border px-4 py-2 font-medium">{log.vehicle_number || log.vehicles?.number_plate || "-"}</td>
                        <td className="border px-4 py-2">{log.Name || "-"}</td>
                        <td className="border px-4 py-2">{log.Phone_no || "-"}</td>
                        <td className="border px-4 py-2 font-medium text-green-600">
                          {log.Amount ? formatCurrency(log.Amount) : "-"}
                        </td>
                        <td className="border px-4 py-2">{log.service || "-"}</td>
                        <td className="border px-4 py-2">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                        </td>
                        <td className="border px-4 py-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                console.log("Approve button clicked for log ID:", log.id);
                                console.log("Log ID type:", typeof log.id);
                                console.log("Log data:", log);
                                handleApproval(log.id, 'approve');
                              }}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                console.log("Reject button clicked for log ID:", log.id);
                                console.log("Log ID type:", typeof log.id);
                                console.log("Log data:", log);
                                handleApproval(log.id, 'reject');
                              }}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Approved Logs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Approved Manual Logs
              <Badge variant="default">{approvedLogs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border px-4 py-2 text-left">Vehicle No</th>
                    <th className="border px-4 py-2 text-left">Vehicle Type</th>
                    <th className="border px-4 py-2 text-left">Customer Name</th>
                    <th className="border px-4 py-2 text-left">Phone</th>
                    <th className="border px-4 py-2 text-left">Amount</th>
                    <th className="border px-4 py-2 text-left">Service</th>
                    <th className="border px-4 py-2 text-left">Entry Time</th>
                    <th className="border px-4 py-2 text-left">Exit Time</th>
                    <th className="border px-4 py-2 text-left">Duration</th>
                    <th className="border px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="text-center py-4">Loading...</td></tr>
                  ) : approvedLogs.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-4 text-muted-foreground">No approved logs found</td></tr>
                  ) : (
                    approvedLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-muted/30">
                        <td className="border px-4 py-2 font-medium">{log.vehicle_number || log.vehicles?.number_plate || "-"}</td>
                        <td className="border px-4 py-2">{log.vehicle_type || "-"}</td>
                        <td className="border px-4 py-2">{log.Name || "-"}</td>
                        <td className="border px-4 py-2">{log.Phone_no || "-"}</td>
                        <td className="border px-4 py-2 font-medium text-green-600">
                          {log.Amount ? formatCurrency(log.Amount) : "-"}
                        </td>
                        <td className="border px-4 py-2">{log.service || "-"}</td>
                        <td className="border px-4 py-2">
                          {log.entry_time ? new Date(log.entry_time).toLocaleString() : 
                           log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                        </td>
                        <td className="border px-4 py-2">
                          {log.exit_time ? new Date(log.exit_time).toLocaleString() : "-"}
                        </td>
                        <td className="border px-4 py-2">{getDuration(log.entry_time, log.exit_time)}</td>
                        <td className="border px-4 py-2">
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Approved
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}