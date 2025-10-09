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
  carryForwardBalance?: number;
}

interface PayrollLineView {
  payroll_line_id: string;
  period_id: string;
  period_month: string;
  staff_id: string;
  staff_name: string;
  role_title: string | null;
  monthly_salary: number | null;
  base_salary: number | null;
  present_days: number | null;
  paid_leaves: number | null;
  unpaid_leaves: number | null;
  advances_total: number | null;
  net_payable: number | null;
  carry_forward_balance: number | null;
  payment_status: 'pending' | 'paid';
  paid_via?: string | null;
  paid_at?: string | null;
  payment_ref?: string | null;
  created_at: string;
  settlement_mode?: 'monthly' | 'carry_forward';
  salary_calc_method?: '30-day' | 'calendar';
  branch_id?: string | null;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedLocationId = useSelectedLocation();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try {
      const stored = localStorage.getItem('payroll_current_period_month');
      if (stored) return stored;
    } catch (_) {}
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
  const [settlementMode, setSettlementMode] = useState<'monthly' | 'carry_forward'>('monthly');
  const [lines, setLines] = useState<PayrollLineView[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [nameFilter, setNameFilter] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'status'>('name');
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

        // Load branch settlement mode
        try {
          const { data } = await supabase
            .from('payroll_settings')
            .select('settlement_mode, current_period_month')
            .eq('branch_id', selectedLocationId)
            .maybeSingle();
          if (data) {
            setSettlementMode((data.settlement_mode === 'carry_forward' ? 'carry_forward' : 'monthly') as 'monthly' | 'carry_forward');
            if (data.current_period_month) {
              setSelectedMonth(data.current_period_month);
              try { localStorage.setItem('payroll_current_period_month', data.current_period_month); } catch (_) {}
            }
          }
        } catch (_) {}

        // Load staff for branch from public.staff
        const { data: staffData, error: staffErr } = await supabase
          .from('staff')
          .select('id, name, role_title, is_active, monthly_salary')
          .eq('branch_id', selectedLocationId)
          .order('name', { ascending: true } as any);
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
          carryForwardBalance: 0,
        }));
        setStaff(staffMapped);

        const staffIds = staffMapped.map(s => s.id);

        // Advances in month (via view)
        let totalAdvances = 0;
        let advancesData: any[] = [];
        if (staffIds.length > 0) {
          const { data: advancesRows } = await supabase
            .from('payroll_advances')
            .select('staff_id, amount, date')
            .gte('date', monthStart)
            .lte('date', monthEnd)
            .in('staff_id', staffIds as any);
          advancesData = advancesRows || [];
          totalAdvances = advancesData.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        }

        // Salary payments (activity logs) in month for branch
        let totalSalaryPaid = 0;
        let salaryPaymentsData: any[] = [];
        const { data: salaryPaymentsDataResult } = await supabase
          .rpc('get_activity_logs_by_branch', {
            branch_id_param: selectedLocationId,
            start_date: monthStart,
            end_date: monthEnd
          });
        salaryPaymentsData = (salaryPaymentsDataResult || []).filter((r: any) => r.kind === 'SalaryPayment');
        totalSalaryPaid = salaryPaymentsData.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

        // Expenses in month for branch + category breakdown + recent expense activities
        let totalExpenses = 0;
        let expenseRows: any[] = [];
        
        // Use public.expenses
        try {
          let expQ: any = supabase
            .from('expenses')
            .select('id, amount, date, category_id, notes, branch_id')
            .gte('date', monthStart)
            .lte('date', monthEnd)
            .order('date', { ascending: false } as any);
          if (selectedLocationId) expQ = expQ.eq('branch_id', selectedLocationId);
          const { data: expRows, error: expError } = await expQ;
          
          console.log('Expenses Query Debug (public.expenses):', {
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
          }
        } catch (error) {
          console.error('Expenses fetch error for public.expenses:', error);
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

        // Carry-forward balances for current month (if enabled)
        const carryForwardByStaff: Record<string, number> = {};
        if (settlementMode === 'carry_forward' && staffIds.length > 0) {
          for (const t of ['payroll_lines', 'payroll.payroll_lines']) {
            try {
              const { data: cfRows } = await supabase
                .from(t)
                .select('staff_id, carry_forward_balance, month')
                .eq('month', selectedMonth)
                .in('staff_id', staffIds as any);
              (cfRows || []).forEach((r: any) => { carryForwardByStaff[r.staff_id] = Number(r.carry_forward_balance || 0); });
              break;
            } catch (_) {
              try {
                const { data: cfLite } = await supabase
                  .from(t)
                  .select('staff_id, month')
                  .eq('month', selectedMonth)
                  .in('staff_id', staffIds as any);
                (cfLite || []).forEach((r: any) => { carryForwardByStaff[r.staff_id] = 0; });
                break;
              } catch (_) {}
            }
          }
        }

        const totalSalaries = staffMapped.reduce((sum, s) => sum + (s.monthlySalary || 0), 0);
        // Calculate payable salary per staff considering carry-forward if enabled
        const totalPayable = staffMapped.reduce((sum, s) => {
          const staffAdvances = advancesData.filter(r => r.staff_id === s.id).reduce((advSum, r) => advSum + Number(r.amount || 0), 0);
          const staffSalaryPaid = salaryPaymentsData.filter(r => r.ref_id === s.id).reduce((paidSum, r) => paidSum + Number(r.amount || 0), 0);
          const cf = settlementMode === 'carry_forward' ? (carryForwardByStaff[s.id] || 0) : 0;
          const payableForStaff = Math.max(0, (s.monthlySalary || 0) + cf - staffAdvances - staffSalaryPaid);
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
        const { data: payActs } = await supabase
          .rpc('get_activity_logs_filtered', {
            branch_id_param: selectedLocationId,
            start_date: monthStart,
            end_date: monthEnd,
            limit_param: 20,
            offset_param: 0
          });
        // Resolve staff IDs for advances (ref_id points to advance id)
        const advanceIds = (payActs || []).filter(r => r.kind === 'Advance' && r.ref_id).map(r => r.ref_id);
        const advanceIdToStaff: Record<string, string> = {};
        if (advanceIds.length > 0) {
          const { data: advRows } = await supabase
            .from('payroll_advances')
            .select('id, staff_id')
            .in('id', advanceIds as any);
          (advRows || []).forEach((row: any) => { advanceIdToStaff[row.id] = row.staff_id; });
        }
        // Build staff id -> name map; fetch missing names if needed
        const staffIdToName: Record<string, string> = {};
        staffMapped.forEach(s => { staffIdToName[s.id] = s.name; });
        const missingStaffIds = Array.from(new Set((payActs || []).map((r: any) => r.kind === 'SalaryPayment' ? r.ref_id : advanceIdToStaff[r.ref_id || '']).filter((id: any) => id && !staffIdToName[id])));
        if (missingStaffIds.length > 0) {
          const { data: staffRows } = await supabase
            .from('staff')
            .select('id, name')
            .in('id', missingStaffIds as any);
          (staffRows || []).forEach((row: any) => { staffIdToName[row.id] = row.name; });
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
        // Filter activities based on user role - managers don't see salary payments
        const filteredPayrollActs = user?.role === 'manager' 
          ? payrollActs.filter(act => act.kind !== 'SalaryPayment')
          : payrollActs;
        
        const combined = [...expenseActs, ...filteredPayrollActs]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
        
        // Debug logging
        console.log('Recent Activities Debug:', {
          expenseActs: expenseActs.length,
          payrollActs: payrollActs.length,
          filteredPayrollActs: filteredPayrollActs.length,
          combined: combined.length,
          selectedLocationId,
          selectedMonth,
          userRole: user?.role,
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
            for (const t of ['staff_leave_periods', 'payroll_staff_leave_periods']) {
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
                    const { data: staffRows } = await supabase
                      .from('staff')
                      .select('id, name')
                      .in('id', missingLeaveStaffIds as any);
                    (staffRows || []).forEach((s: any) => { leaveStaffMap[s.id] = s.name; });
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
                    const { data: staffRows } = await supabase
                      .from('staff')
                      .select('id, name')
                      .in('id', missingAbsentStaffIds as any);
                    (staffRows || []).forEach((s: any) => { absentStaffMap[s.id] = s.name; });
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
          const { data } = await supabase
            .from('staff')
            .select('monthly_salary')
            .eq('branch_id', selectedLocationId);
          prevSalaries = (data || []).reduce((s: number, r: any) => s + Number(r.monthly_salary || 0), 0);
        } catch (_) {}
        // Prev advances
        let prevAdvances = 0;
        try {
          const { data: prevAdvRows } = await supabase
            .from('payroll_advances')
            .select('staff_id, amount, date')
            .gte('date', prevStart)
            .lte('date', prevEnd)
            .in('staff_id', staffIds as any);
          prevAdvances = (prevAdvRows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        } catch (_) {}
        const prevPayable = Math.max(0, prevSalaries - prevAdvances); // ignoring prev paid here for comparable figure
        const prevNet = prevSalaries + prevExpenses;
        setPrevTotals({ totalSalaries: prevSalaries, totalAdvances: prevAdvances, totalExpenses: prevExpenses, totalPayable: prevPayable, netCost: prevNet });

        // Load payroll lines view for selected period and branch
        try {
          setLinesLoading(true);
          let vq: any = supabase
            .from('v_payroll_lines')
            .select('*')
            .eq('period_month', selectedMonth)
            .order('staff_name', { ascending: true } as any);
          // try branch filter if available on view
          if (selectedLocationId) {
            try {
              vq = vq.eq('branch_id', selectedLocationId);
            } catch (_) {}
          }
          const { data: vrows, error: verr } = await vq;
          if (verr) {
            // fallback: filter by staff_ids of branch if branch_id col is missing
            if (staffIds.length > 0) {
              const { data: vrows2 } = await supabase
                .from('v_payroll_lines')
                .select('*')
                .eq('period_month', selectedMonth)
                .in('staff_id', staffIds as any)
                .order('staff_name', { ascending: true } as any);
              setLines(vrows2 || []);
            } else {
              setLines([]);
            }
          } else {
            setLines(vrows || []);
          }
          // Pick settlement mode from view if present
          const first = (lines && lines[0]) || null;
          if (first && first.settlement_mode) {
            setSettlementMode(first.settlement_mode);
          }
        } finally {
          setLinesLoading(false);
        }
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

      {/* Payroll Lines for Period */}
      <Card>
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Payroll Lines</h3>
            <p className="text-sm text-muted-foreground">
              Period {selectedMonth} • Mode: {settlementMode} {lines[0]?.salary_calc_method ? `• Calc: ${lines[0]?.salary_calc_method}` : ''}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              className="form-input min-w-[200px]"
              placeholder="Filter by name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
            <select className="form-select" value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
              <option value="name">Sort by name</option>
              <option value="status">Sort by status</option>
            </select>
          </div>
        </div>
        <div className="p-4">
          {linesLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : lines.length === 0 ? (
            <div className="text-sm text-muted-foreground">No payroll lines for this period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-foreground">Staff</th>
                    <th className="text-right p-3 text-foreground">Base</th>
                    <th className="text-center p-3 text-foreground">Present</th>
                    <th className="text-center p-3 text-foreground">Paid L</th>
                    <th className="text-center p-3 text-foreground">Unpaid L</th>
                    <th className="text-right p-3 text-foreground">Advances</th>
                    <th className="text-right p-3 text-foreground">Carry Fwd</th>
                    <th className="text-right p-3 text-foreground">Net Payable</th>
                    <th className="text-center p-3 text-foreground">Status</th>
                    <th className="text-center p-3 text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines
                    .filter(l => !nameFilter || (l.staff_name || '').toLowerCase().includes(nameFilter.toLowerCase()))
                    .filter(l => statusFilter === 'all' ? true : l.payment_status === statusFilter)
                    .sort((a, b) => {
                      if (sortKey === 'status') return (a.payment_status > b.payment_status ? 1 : -1);
                      return (a.staff_name || '').localeCompare(b.staff_name || '');
                    })
                    .map((l) => (
                    <tr key={l.payroll_line_id} className={`border-b border-border ${l.payment_status !== 'paid' ? 'bg-amber-50/40' : ''}`}>
                      <td className="p-3 text-foreground">
                        <div className="font-medium">{l.staff_name}</div>
                        <div className="text-xs text-muted-foreground">{l.role_title || ''}</div>
                      </td>
                      <td className="p-3 text-right text-foreground">₹{Number(l.base_salary||0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-center text-foreground">{l.present_days || 0}</td>
                      <td className="p-3 text-center text-foreground">{l.paid_leaves || 0}</td>
                      <td className="p-3 text-center text-foreground">{l.unpaid_leaves || 0}</td>
                      <td className="p-3 text-right text-foreground">₹{Number(l.advances_total||0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-foreground">₹{Number(l.carry_forward_balance||0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-semibold text-foreground">₹{Number(l.net_payable||0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${l.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {l.payment_status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          className="text-muted-foreground cursor-not-allowed text-sm"
                          onClick={() => {
                            toast({ title: 'Salary payments disabled', description: 'Recording salary payments is currently disabled.', variant: 'destructive' });
                          }}
                          disabled
                        >Pay</button>
                        <a className="ml-3 text-blue-600 hover:underline text-sm" href="#" onClick={(e) => { e.preventDefault(); /* link to activity logs page/section if available */ }}>
                          Activity
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;