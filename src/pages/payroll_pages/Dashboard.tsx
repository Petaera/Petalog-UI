import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  IndianRupee, 
  TrendingUp, 
  Receipt,
  Calendar,
  AlertTriangle 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import MetricCard from '@/components/dashboard/MetricCard';
import RecentActivityLogs from '@/components/dashboard/RecentActivityLogs';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';

interface Staff {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  monthlySalary: number;
  payableSalary: number;
  totalAdvances: number;
  presentDays: number;
  absences: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedLocationId = useSelectedLocation();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [totals, setTotals] = useState({
    totalSalaries: 0,
    totalAdvances: 0,
    totalSalaryPaid: 0,
    totalExpenses: 0,
    totalPayable: 0,
  });
  const [prevTotals, setPrevTotals] = useState({
    totalSalaries: 0,
    totalAdvances: 0,
    totalExpenses: 0,
    totalPayable: 0,
    netCost: 0,
  });
  const [expenseBreakdown, setExpenseBreakdown] = useState<{ category: string; total: number }[]>([]);
  const [recentActivities, setRecentActivities] = useState<Array<{ id: string; kind: 'Expense' | 'Advance' | 'SalaryPayment'; date: string; title: string; description?: string; amount: number; note?: string }>>([]);
  const [attendanceAlerts, setAttendanceAlerts] = useState<Array<{ type: 'leave' | 'absent'; staffName: string; date: string; endDate?: string; reason?: string }>>([]);


  const getMonthRange = (ym: string) => {
    const start = `${ym}-01`;
    const d = new Date(start);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    return { start, end };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { start: monthStart, end: monthEnd } = getMonthRange(selectedMonth);

        // Load staff for branch via public view
        let staffQuery: any = supabase
          .from('payroll_staff')
          .select('id, name, role_title, is_active, monthly_salary, branch_id');
        if (selectedLocationId) staffQuery = staffQuery.eq('branch_id', selectedLocationId);
        const { data: staffData, error: staffErr } = await staffQuery;
        if (staffErr) throw staffErr;

        const staffMapped: Staff[] = (staffData || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          role: row.role_title || '',
          isActive: !!row.is_active,
          monthlySalary: Number(row.monthly_salary || 0),
          payableSalary: Number(row.monthly_salary || 0),
          totalAdvances: 0,
          presentDays: 0,
          absences: 0,
        }));
        setStaff(staffMapped);

        const staffIds = staffMapped.map(s => s.id);

        // Advances in month
        let totalAdvances = 0;
        let advancesData: any[] = [];
        if (staffIds.length > 0) {
          for (const t of ['payroll_advances', 'advances', 'payroll.advances']) {
            try {
              let q: any = supabase
                .from(t)
                .select('staff_id, amount, date')
                .gte('date', monthStart)
                .lte('date', monthEnd)
                .in('staff_id', staffIds);
              const { data, error } = await q;
              if (error) throw error;
              advancesData = data || [];
              totalAdvances = advancesData.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              break;
            } catch (_) {}
          }
        }

        // Salary payments (activity logs) in month for branch
        let totalSalaryPaid = 0;
        let salaryPaymentsData: any[] = [];
        for (const t of ['payroll_activity_logs', 'activity_logs', 'payroll.activity_logs']) {
          try {
            let q: any = supabase
              .from(t)
              .select('kind, amount, date, branch_id, ref_id')
              .eq('kind', 'SalaryPayment')
              .gte('date', monthStart)
              .lte('date', monthEnd);
            if (selectedLocationId) q = q.eq('branch_id', selectedLocationId);
            const { data, error } = await q;
            if (error) throw error;
            salaryPaymentsData = data || [];
            totalSalaryPaid = salaryPaymentsData.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
            break;
          } catch (_) {}
        }

        // Expenses in month for branch + category breakdown + recent expense activities
        let totalExpenses = 0;
        let expenseRows: any[] = [];
        
        // Try different table names for expenses
        const expenseTables = ['expenses', 'payroll_expenses', 'payroll.expenses'];
        for (const tableName of expenseTables) {
          try {
            let expQ: any = supabase
              .from(tableName)
              .select('id, amount, date, category_id, notes, branch_id')
              .gte('date', monthStart)
              .lte('date', monthEnd)
              .order('date', { ascending: false } as any);
            if (selectedLocationId) expQ = expQ.eq('branch_id', selectedLocationId);
            const { data: expRows, error: expError } = await expQ;
            
            console.log(`Expenses Query Debug (${tableName}):`, {
              table: tableName,
              monthStart,
              monthEnd,
              selectedLocationId,
              error: expError,
              dataCount: expRows?.length || 0,
              data: expRows
            });
            
            if (!expError && expRows && expRows.length > 0) {
              expenseRows = expRows;
              totalExpenses = expenseRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              break; // Found data, stop trying other tables
            }
          } catch (error) {
            console.error(`Expenses fetch error for ${tableName}:`, error);
          }
        }

        // Category names
        let catMap: Record<string, string> = {};
        try {
          let catQ: any = supabase
            .from('expense_categories')
            .select('id, name, branch_id');
          if (selectedLocationId) catQ = catQ.eq('branch_id', selectedLocationId);
          const { data: catRows } = await catQ;
          (catRows || []).forEach((c: any) => { catMap[c.id] = c.name; });
        } catch (_) {}

        // Build expense breakdown by category
        const byCategory: Record<string, number> = {};
        (expenseRows || []).forEach((r: any) => {
          const key = r.category_id || 'Uncategorized';
          byCategory[key] = (byCategory[key] || 0) + Number(r.amount || 0);
        });
        const breakdown = Object.entries(byCategory)
          .map(([catId, total]) => ({ category: catMap[catId] || 'Uncategorized', total: Number(total || 0) }))
          .sort((a, b) => b.total - a.total);
        setExpenseBreakdown(breakdown);

        // Remove old pending attendance calculation - now using real alerts

        const totalSalaries = staffMapped.reduce((sum, s) => sum + (s.monthlySalary || 0), 0);
        // Calculate payable salary per staff: individual salary - individual advances - individual salary paid, then sum
        const totalPayable = staffMapped.reduce((sum, s) => {
          const staffAdvances = advancesData.filter(r => r.staff_id === s.id).reduce((advSum, r) => advSum + Number(r.amount || 0), 0);
          const staffSalaryPaid = salaryPaymentsData.filter(r => r.ref_id === s.id).reduce((paidSum, r) => paidSum + Number(r.amount || 0), 0);
          const payableForStaff = Math.max(0, (s.monthlySalary || 0) - staffAdvances - staffSalaryPaid);
          return sum + payableForStaff;
        }, 0);
        setTotals({ totalSalaries, totalAdvances, totalSalaryPaid, totalExpenses, totalPayable });

        // Build Recent Activities: Expenses + Advances + Salary Payments (top 5 by date desc) with names
        // Use the same expenseRows that we already fetched for the current month (which includes the water bill)
        const expenseActs = (expenseRows || []).map((r: any) => ({
          id: `exp_${r.id}`,
          kind: 'Expense' as const,
          date: r.date,
          title: `Expense Payment`,
          description: `${catMap[r.category_id] || 'Uncategorized'}${r.notes ? ` - ${r.notes}` : ''}`,
          amount: Number(r.amount || 0),
          note: r.notes || undefined,
        }));
        // Load last 20 payroll activities in month for branch
        let payActs: any[] = [];
        for (const t of ['payroll_activity_logs', 'activity_logs', 'payroll.activity_logs']) {
          try {
            let q: any = supabase
              .from(t)
              .select('id, kind, amount, date, description, ref_id, branch_id')
              .in('kind', ['Advance', 'SalaryPayment'] as any)
              .gte('date', monthStart)
              .lte('date', monthEnd)
              .order('date', { ascending: false } as any)
              .limit(20);
            if (selectedLocationId) q = q.eq('branch_id', selectedLocationId);
            const { data, error } = await q;
            if (error) throw error;
            payActs = data || [];
            break;
          } catch (_) {}
        }
        // Resolve staff IDs for advances (ref_id points to advance id)
        const advanceIds = (payActs || []).filter(r => r.kind === 'Advance' && r.ref_id).map(r => r.ref_id);
        const advanceIdToStaff: Record<string, string> = {};
        if (advanceIds.length > 0) {
          for (const t of ['payroll_advances', 'advances', 'payroll.advances']) {
            try {
              const { data, error } = await supabase.from(t).select('id, staff_id').in('id', advanceIds);
              if (error) throw error;
              (data || []).forEach((row: any) => { advanceIdToStaff[row.id] = row.staff_id; });
              if (Object.keys(advanceIdToStaff).length === advanceIds.length) break;
            } catch (_) {}
          }
        }
        // Build staff id -> name map; fetch missing names if needed
        const staffIdToName: Record<string, string> = {};
        staffMapped.forEach(s => { staffIdToName[s.id] = s.name; });
        const missingStaffIds = Array.from(new Set((payActs || []).map((r: any) => r.kind === 'SalaryPayment' ? r.ref_id : advanceIdToStaff[r.ref_id || '']).filter((id: any) => id && !staffIdToName[id])));
        if (missingStaffIds.length > 0) {
          for (const t of ['payroll_staff', 'payroll.staff']) {
            try {
              const { data, error } = await supabase.from(t).select('id, name').in('id', missingStaffIds);
              if (error) throw error;
              (data || []).forEach((row: any) => { staffIdToName[row.id] = row.name; });
              break;
            } catch (_) {}
          }
        }
        const payrollActs = (payActs || []).map((r: any) => {
          const staffId = r.kind === 'SalaryPayment' ? r.ref_id : advanceIdToStaff[r.ref_id || ''];
          const staffName = staffId ? (staffIdToName[staffId] || staffId.slice(0, 8)) : undefined;
          return ({
            id: `pay_${r.id}`,
            kind: (r.kind as 'Advance' | 'SalaryPayment'),
            date: r.date,
            title: r.kind === 'Advance' ? `Advance Payment` : `Salary Payment`,
            description: `To ${staffName || 'staff member'}${r.description ? ` - ${r.description}` : ''}`,
            amount: Number(r.amount || 0),
            note: r.description || undefined,
          });
        });
        const combined = [...expenseActs, ...payrollActs]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
        
        // Debug logging
        console.log('Recent Activities Debug:', {
          expenseActs: expenseActs.length,
          payrollActs: payrollActs.length,
          combined: combined.length,
          selectedLocationId,
          selectedMonth,
          expenseRowsCount: expenseRows.length,
          expenseActsDetails: expenseActs.map(e => ({ title: e.title, amount: e.amount, date: e.date })),
          combinedDetails: combined.map(c => ({ kind: c.kind, title: c.title, amount: c.amount, date: c.date }))
        });
        
        setRecentActivities(combined);

        // Load attendance alerts (long leaves and today's absences)
        const loadAttendanceAlerts = async () => {
          const today = new Date().toISOString().slice(0, 10);
          const alerts: Array<{ type: 'leave' | 'absent'; staffName: string; date: string; endDate?: string; reason?: string }> = [];

          // Load long leaves (staff_leave_periods)
          try {
            for (const t of ['staff_leave_periods', 'payroll.staff_leave_periods']) {
              try {
                let q: any = supabase
                  .from(t)
                  .select('staff_id, start_date, end_date, leave_type, notes')
                  .lte('start_date', today)
                  .gte('end_date', today);
                if (staffIds.length > 0) q = q.in('staff_id', staffIds);
                const { data: leaveRows, error } = await q;
                if (error) throw error;
                
                if (leaveRows && leaveRows.length > 0) {
                  // Get staff names for leave periods
                  const leaveStaffIds = leaveRows.map((l: any) => l.staff_id);
                  const leaveStaffMap: Record<string, string> = {};
                  staffMapped.forEach(s => { leaveStaffMap[s.id] = s.name; });
                  
                  // Fetch missing staff names if needed
                  const missingLeaveStaffIds = leaveStaffIds.filter((id: string) => !leaveStaffMap[id]);
                  if (missingLeaveStaffIds.length > 0) {
                    for (const staffTable of ['payroll_staff', 'payroll.staff']) {
                      try {
                        const { data: staffData } = await supabase.from(staffTable).select('id, name').in('id', missingLeaveStaffIds);
                        (staffData || []).forEach((s: any) => { leaveStaffMap[s.id] = s.name; });
                        break;
                      } catch (_) {}
                    }
                  }
                  
                  leaveRows.forEach((leave: any) => {
                    alerts.push({
                      type: 'leave',
                      staffName: leaveStaffMap[leave.staff_id] || 'Unknown Staff',
                      date: leave.start_date,
                      endDate: leave.end_date,
                      reason: `${leave.leave_type} Leave${leave.notes ? ` - ${leave.notes}` : ''}`
                    });
                  });
                }
                break;
              } catch (_) {}
            }
          } catch (_) {}

          // Load today's absences (attendance table)
          try {
            for (const t of ['attendance', 'payroll.attendance']) {
              try {
                let q: any = supabase
                  .from(t)
                  .select('staff_id, status, notes')
                  .eq('date', today)
                  .eq('status', 'Absent');
                if (staffIds.length > 0) q = q.in('staff_id', staffIds);
                const { data: absentRows, error } = await q;
                if (error) throw error;
                
                if (absentRows && absentRows.length > 0) {
                  // Get staff names for absences
                  const absentStaffIds = absentRows.map((a: any) => a.staff_id);
                  const absentStaffMap: Record<string, string> = {};
                  staffMapped.forEach(s => { absentStaffMap[s.id] = s.name; });
                  
                  // Fetch missing staff names if needed
                  const missingAbsentStaffIds = absentStaffIds.filter((id: string) => !absentStaffMap[id]);
                  if (missingAbsentStaffIds.length > 0) {
                    for (const staffTable of ['payroll_staff', 'payroll.staff']) {
                      try {
                        const { data: staffData } = await supabase.from(staffTable).select('id, name').in('id', missingAbsentStaffIds);
                        (staffData || []).forEach((s: any) => { absentStaffMap[s.id] = s.name; });
                        break;
                      } catch (_) {}
                    }
                  }
                  
                  absentRows.forEach((absent: any) => {
                    alerts.push({
                      type: 'absent',
                      staffName: absentStaffMap[absent.staff_id] || 'Unknown Staff',
                      date: today,
                      reason: absent.notes || 'No reason provided'
                    });
                  });
                }
                break;
              } catch (_) {}
            }
          } catch (_) {}

          setAttendanceAlerts(alerts);
        };

        loadAttendanceAlerts();

        // Previous month comparisons
        const prevDate = new Date(`${selectedMonth}-01`);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        const { start: prevStart, end: prevEnd } = getMonthRange(prevYm);

        // Prev expenses
        let prevExpenses = 0;
        try {
          let q: any = supabase.from('expenses').select('amount, date, branch_id').gte('date', prevStart).lte('date', prevEnd);
          if (selectedLocationId) q = q.eq('branch_id', selectedLocationId);
          const { data } = await q;
          prevExpenses = (data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        } catch (_) {}
        // Prev salaries
        let prevSalaries = 0;
        try {
          let q: any = supabase.from('payroll_staff').select('monthly_salary, branch_id');
          if (selectedLocationId) q = q.eq('branch_id', selectedLocationId);
          const { data } = await q;
          prevSalaries = (data || []).reduce((s: number, r: any) => s + Number(r.monthly_salary || 0), 0);
        } catch (_) {}
        // Prev advances
        let prevAdvances = 0;
        try {
          for (const t of ['payroll_advances', 'advances', 'payroll.advances']) {
            try {
              let q: any = supabase.from(t).select('amount, date');
              q = q.gte('date', prevStart).lte('date', prevEnd);
              if (staffIds.length > 0) q = q.in('staff_id', staffIds);
              const { data, error } = await q;
              if (error) throw error;
              prevAdvances = (data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              break;
            } catch (_) {}
          }
        } catch (_) {}
        const prevPayable = Math.max(0, prevSalaries - prevAdvances); // ignoring prev paid here for comparable figure
        const prevNet = prevSalaries + prevExpenses;
        setPrevTotals({ totalSalaries: prevSalaries, totalAdvances: prevAdvances, totalExpenses: prevExpenses, totalPayable: prevPayable, netCost: prevNet });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (selectedLocationId) {
      loadData();
    } else {
      // Clear data when no location selected
      setTotals({ totalSalaries: 0, totalAdvances: 0, totalSalaryPaid: 0, totalExpenses: 0, totalPayable: 0 });
      setPrevTotals({ totalSalaries: 0, totalAdvances: 0, totalExpenses: 0, totalPayable: 0, netCost: 0 });
      setExpenseBreakdown([]);
      setRecentActivities([]);
      setAttendanceAlerts([]);
      setLoading(false);
    }
  }, [selectedLocationId, selectedMonth]);

  // Calculate metrics
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.isActive).length;
  const totalSalaries = totals.totalSalaries;
  const totalPayable = totals.totalPayable;
  const totalAdvances = totals.totalAdvances;
  const totalExpenses = totals.totalExpenses;
  const totalSalaryPaid = totals.totalSalaryPaid;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.email}! Here's what's happening with your business.
        </p>
      </div>

      {/* Attendance Alerts */}
      {attendanceAlerts.length > 0 && (
        <div className="space-y-3">
          {attendanceAlerts.map((alert, index) => (
            <div key={index} className={`p-4 border-l-4 rounded-lg ${
              alert.type === 'leave' 
                ? 'bg-blue-50 border-blue-400' 
                : 'bg-red-50 border-red-400'
            }`}>
          <div className="flex items-center">
                <AlertTriangle className={`h-5 w-5 mr-3 ${
                  alert.type === 'leave' ? 'text-blue-600' : 'text-red-600'
                }`} />
                <div className="flex-1">
                  <h3 className={`text-sm font-medium ${
                    alert.type === 'leave' ? 'text-blue-800' : 'text-red-800'
                  }`}>
                    {alert.type === 'leave' ? 'On Leave' : 'Absent Today'}
                  </h3>
                  <p className={`text-xs mt-1 ${
                    alert.type === 'leave' ? 'text-blue-700' : 'text-red-700'
                  }`}>
                    <strong>{alert.staffName}</strong>
                    {alert.type === 'leave' && alert.endDate ? (
                      <> - {alert.date} to {alert.endDate}</>
                    ) : (
                      <> - {alert.date}</>
                    )}
                    {alert.reason && (
                      <> • {alert.reason}</>
                    )}
              </p>
            </div>
          </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Total Staff"
          value={`${activeStaff}/${totalStaff}`}
          icon={Users}
          color="default"
          change={{ value: 0, type: 'neutral' }}
        />
        
        {user?.role === 'owner' && (
          <MetricCard
            title="Monthly Salaries"
            value={totalSalaries}
            icon={IndianRupee}
            color="success"
            change={{ 
              value: prevTotals.totalSalaries ? (((totalSalaries - prevTotals.totalSalaries) / prevTotals.totalSalaries) * 100) : 0, 
              type: !prevTotals.totalSalaries || totalSalaries === prevTotals.totalSalaries ? 'neutral' : (totalSalaries > prevTotals.totalSalaries ? 'positive' : 'negative') 
            }}
          />
        )}
        
        <MetricCard
          title="Total Advances"
          value={totalAdvances}
          icon={TrendingUp}
          color="warning"
          change={{ 
            value: prevTotals.totalAdvances ? (((totalAdvances - prevTotals.totalAdvances) / prevTotals.totalAdvances) * 100) : 0, 
            type: !prevTotals.totalAdvances || totalAdvances === prevTotals.totalAdvances ? 'neutral' : (totalAdvances > prevTotals.totalAdvances ? 'negative' : 'positive') 
          }}
        />
        
        <MetricCard
          title="Monthly Expenses"
          value={totalExpenses}
          icon={Receipt}
          color="danger"
          change={{ 
            value: prevTotals.totalExpenses ? (((totalExpenses - prevTotals.totalExpenses) / prevTotals.totalExpenses) * 100) : 0, 
            type: !prevTotals.totalExpenses || totalExpenses === prevTotals.totalExpenses ? 'neutral' : (totalExpenses > prevTotals.totalExpenses ? 'negative' : 'positive') 
          }}
        />
        
        {user?.role === 'owner' && (
          <>
            <MetricCard
              title="Payable Salaries"
              value={totalPayable}
              icon={Calendar}
              color="success"
              change={{ 
                value: prevTotals.totalPayable ? (((totalPayable - prevTotals.totalPayable) / prevTotals.totalPayable) * 100) : 0, 
                type: !prevTotals.totalPayable || totalPayable === prevTotals.totalPayable ? 'neutral' : (totalPayable > prevTotals.totalPayable ? 'negative' : 'positive') 
              }}
            />
            
            <MetricCard
              title="Net Monthly Cost"
              value={totalSalaries + totalExpenses}
              icon={Receipt}
              color="danger"
              change={{ 
                value: prevTotals.netCost ? ((((totalSalaries + totalExpenses) - prevTotals.netCost) / prevTotals.netCost) * 100) : 0, 
                type: !prevTotals.netCost || (totalSalaries + totalExpenses) === prevTotals.netCost ? 'neutral' : ((totalSalaries + totalExpenses) > prevTotals.netCost ? 'negative' : 'positive') 
              }}
            />
          </>
        )}
      </div>

      {/* Charts Section - Owner Only */}
      {user?.role === 'owner' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Breakdown (Donut) */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Expense Breakdown</h3>
            <div className="h-64 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="flex items-center justify-center">
                {(() => {
                  const data = expenseBreakdown;
                  const total = Math.max(1, data.reduce((s, d) => s + (d.total || 0), 0));
                  const r = 40;
                  const circ = 2 * Math.PI * r;
                  let offset = 0;
                  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
                  return (
                    <svg width="160" height="160" viewBox="0 0 100 100">
                      <title>Expense Breakdown</title>
                      <desc>Share of expenses by category</desc>
                      <circle cx="50" cy="50" r={r} fill="transparent" stroke="#e5e7eb" strokeWidth="12" />
                      {data.map((d, i) => {
                        const len = (Math.max(0, d.total) / total) * circ;
                        const el = (
                          <circle
                            key={d.category}
                            cx="50" cy="50" r={r} fill="transparent"
                            stroke={colors[i % colors.length]}
                            strokeWidth="12"
                            strokeDasharray={`${len} ${circ - len}`}
                            strokeDashoffset={-offset}
                            transform="rotate(-90 50 50)"
                          />
                        );
                        offset += len;
                        return el;
                      })}
                      <text x="50" y="47" textAnchor="middle" fontSize="9" fill="#111">Total</text>
                      <text x="50" y="58" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#111">{`₹${(total||0).toLocaleString('en-IN')}`}</text>
                    </svg>
                  );
                })()}
              </div>
              <div className="text-sm space-y-2">
                {expenseBreakdown.length === 0 ? (
                  <div className="text-muted-foreground">No expenses recorded for this period.</div>
                ) : (
                  expenseBreakdown.slice(0, 6).map((d, i) => (
                    <div key={d.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'][i % 7] }} />
                        <span className="text-foreground">{d.category}</span>
                      </div>
                      <span className="text-foreground font-medium">{`₹${(d.total||0).toLocaleString('en-IN')}`}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Monthly Overview (Bars) */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Overview</h3>
            <div className="h-64 flex items-end justify-center gap-4 p-4">
              {(() => {
              const bars = [
                { label: 'Total Salaries', value: totalSalaries, color: '#10b981' },
                { label: 'Advances Given', value: totalAdvances, color: '#f59e0b' },
                { label: 'Salaries Paid', value: totalSalaryPaid, color: '#3b82f6' },
                { label: 'Payable Amount', value: totalPayable, color: '#8b5cf6' },
                { label: 'Expenses', value: totalExpenses, color: '#ef4444' },
              ];
                const max = Math.max(1, ...bars.map(b => b.value || 0));
                return bars.map((b) => {
                  const h = Math.round(((b.value || 0) / max) * 180);
                  return (
                    <div key={b.label} className="flex flex-col items-center">
                      <div className="text-xs mb-2 text-foreground">{`₹${(b.value||0).toLocaleString('en-IN')}`}</div>
                      <div className="w-8 rounded-t-md" style={{ height: `${h}px`, backgroundColor: b.color }} />
                      <div className="text-xs mt-2 text-muted-foreground text-center">{b.label}</div>
            </div>
                  );
                });
              })()}
            </div>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Payments</h3>
          <p className="text-sm text-muted-foreground">Latest expense payments, advance payments, and salary payments made by owners/managers</p>
        </div>
        <div className="p-4">
          {recentActivities.length === 0 ? (
            <div className="text-sm text-muted-foreground p-2">No activity for this period.</div>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivities.map(act => (
                <li key={act.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${act.kind === 'Expense' ? 'bg-red-100 text-red-700' : act.kind === 'Advance' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {act.kind === 'Expense' ? 'E' : act.kind === 'Advance' ? 'A' : 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {act.title}
                      </div>
                      {act.description && (
                        <div className="text-xs text-muted-foreground truncate">{act.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(act.date).toLocaleDateString('en-IN')} at {new Date(act.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-lg font-bold ${act.kind === 'Expense' ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{(act.amount||0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {act.kind === 'Expense' ? 'EXPENSE' : act.kind === 'Advance' ? 'ADVANCE' : 'SALARY'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;