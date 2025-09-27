import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  User, 
  Phone,
  Calendar,
  IndianRupee,
  CheckCircle,
  XCircle,
  CreditCard,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useUpiAccounts } from '@/hooks/useUpiAccounts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';

interface Staff {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  monthlySalary: number;
  payableSalary: number;
  totalAdvances: number;
  salaryPaid?: number;
  presentDays: number;
  absences: number;
  paidLeaves: number;
  unpaidLeaves: number;
  contact: string;
  dateOfJoining: string;
  paymentMode: string;
}

interface PayrollLine {
  id: string;
  staff_id: string;
  base_salary: number;
  present_days: number;
  paid_leaves: number;
  unpaid_leaves: number;
  advances_total: number;
  net_payable: number;
  payment_status: 'pending' | 'paid';
  paid_via?: string;
  paid_at?: string;
  payment_ref?: string;
  month: string;
  created_at: string;
}

const StaffPage: React.FC = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [payrollHistory, setPayrollHistory] = useState<PayrollLine[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [showPayrollHistory, setShowPayrollHistory] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedLocationId = useSelectedLocation();

  // Add Staff form state
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [contact, setContact] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState<string>(new Date().toISOString().split('T')[0]);
  const [monthlySalary, setMonthlySalary] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | ''>('');
  const [selectedUpiAccountId, setSelectedUpiAccountId] = useState<string>('');
  // Payments state
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [paymentStaffId, setPaymentStaffId] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'Advance' | 'Salary'>('Advance');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentModeSel, setPaymentModeSel] = useState<'Cash' | 'UPI' | ''>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [activities, setActivities] = useState<{ id: string; date: string; kind: 'Advance' | 'SalaryPayment'; description: string | null; amount: number; staffId?: string; staffName?: string }[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(0);
  const [activitiesPageSize] = useState(10);
  const [activitiesHasNext, setActivitiesHasNext] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [leaves, setLeaves] = useState<Array<{ id: string; staff_id: string; start_date: string; end_date: string; leave_type: 'Paid' | 'Unpaid'; notes: string | null }>>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);


  const { accounts: upiAccounts } = useUpiAccounts(selectedLocationId);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [useCustomRole, setUseCustomRole] = useState(false);

  const getCurrentMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM
  const getMonthEndDate = (yyyyMm: string) => {
    const [yStr, mStr] = yyyyMm.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const lastDay = new Date(y, m, 0).getDate();
    return `${yyyyMm}-${String(lastDay).padStart(2, '0')}`;
  };

  const mergeMonthlyAggregates = async (baseStaff: Staff[]) => {
    if (!baseStaff.length) return baseStaff;
    const month = getCurrentMonth();
    const staffIds = baseStaff.map(s => s.id);

    try {
      // Helper: select with fallback
      const selectWithFallback = async (tables: string[], builder: (q: any) => Promise<{ data: any | null }>) => {
        for (const t of tables) {
          try {
            const q = supabase.from(t).select('*');
            const { data } = await builder(q);
            if (data) return data;
          } catch (_) {}
        }
        return null;
      };

      // Attendance aggregates (prefer public view)
      const attData = await selectWithFallback(
        ['v_staff_monthly_attendance', 'payroll.v_staff_monthly_attendance'],
        async (q) => await q.eq('month', month).in('staff_id', staffIds)
      );

      // Advances aggregates (include current month window)
      const advData = await selectWithFallback(
        ['payroll_advances', 'advances', 'payroll.advances'],
        async (q) => await q.select('staff_id, amount, date')
          .in('staff_id', staffIds)
          .gte('date', month + '-01')
          .lte('date', getMonthEndDate(month))
      );

      const attendanceByStaff: Record<string, { present_days: number; paid_leaves: number; unpaid_leaves: number; absent_days: number; }> = {};
      (attData || []).forEach((row: any) => {
        attendanceByStaff[row.staff_id] = {
          present_days: Number(row.present_days || 0),
          paid_leaves: Number(row.paid_leaves || 0),
          unpaid_leaves: Number(row.unpaid_leaves || 0),
          absent_days: Number(row.absent_days || 0),
        };
      });

      const advancesByStaff: Record<string, number> = {};
      (advData || []).forEach((row: any) => {
        const sid = row.staff_id;
        advancesByStaff[sid] = (advancesByStaff[sid] || 0) + Number(row.amount || 0);
      });

      // Salary paid aggregates via activity logs
      const salaryPaidByStaff: Record<string, number> = {};
      const salLogs = await selectWithFallback(
        ['payroll_activity_logs', 'activity_logs', 'payroll.activity_logs'],
        async (q) => await q.select('ref_id, amount, date, kind')
          .eq('kind', 'SalaryPayment')
          .gte('date', month + '-01')
          .lte('date', getMonthEndDate(month))
      );
      (salLogs || []).forEach((row: any) => {
        const sid = row.ref_id;
        if (!sid) return;
        salaryPaidByStaff[sid] = (salaryPaidByStaff[sid] || 0) + Number(row.amount || 0);
      });

      const merged = baseStaff.map(s => {
        const att = attendanceByStaff[s.id] || { present_days: 0, paid_leaves: 0, unpaid_leaves: 0, absent_days: 0 };
        const advances = advancesByStaff[s.id] || 0;
        const paid = salaryPaidByStaff[s.id] || 0;
        const payable = Math.max(0, (s.monthlySalary || 0) - advances - paid);
        return {
          ...s,
          presentDays: att.present_days,
          paidLeaves: att.paid_leaves,
          unpaidLeaves: att.unpaid_leaves,
          absences: att.absent_days,
          totalAdvances: advances,
          salaryPaid: paid,
          payableSalary: payable,
        } as Staff;
      });

      return merged;
    } catch (_) {
      return baseStaff;
    }
  };

  const loadLeavesForStaff = async (staffIds: string[]) => {
    if (!staffIds.length) {
      setLeaves([]);
      return;
    }
    try {
      setLeavesLoading(true);
      const candidates = ['staff_leave_periods', 'payroll.staff_leave_periods'];
      let rows: any[] | null = null;
      for (const t of candidates) {
        try {
          const { data, error } = await supabase
            .from(t)
            .select('id, staff_id, start_date, end_date, leave_type, notes')
            .in('staff_id', staffIds)
            .order('start_date', { ascending: false } as any);
          if (error) throw error;
          rows = data || [];
          break;
        } catch (_) {}
      }
      setLeaves(rows || []);
    } catch (_) {
      setLeaves([]);
    } finally {
      setLeavesLoading(false);
    }
  };

  // Helper to insert into public views or underlying schema tables to avoid 404s
  const insertWithFallback = async (
    tableNames: string[],
    payload: any,
    returning?: string
  ): Promise<{ data: any[] | null; error: any | null }> => {
    for (const table of tableNames) {
      try {
        if (returning) {
          const { data, error } = await supabase.from(table).insert(payload).select(returning);
          if (error) throw error;
          return { data: data || null, error: null };
        } else {
          const { error } = await supabase.from(table).insert(payload);
          if (error) throw error;
          return { data: null, error: null };
        }
      } catch (e) {
        // try next candidate
      }
    }
    return { data: null, error: { message: 'Insert failed for all candidates' } };
  };

  const loadActivities = async (page: number) => {
    try {
      setActivitiesLoading(true);
      
      // Only load activities if we have a selected location
      if (!selectedLocationId) {
        setActivities([]);
        setActivitiesHasNext(false);
        return;
      }

      // Try public-friendly names first
      const candidates = ['payroll_activity_logs', 'activity_logs', 'payroll.activity_logs'];
      let rows: any[] | null = null;
      
      for (const t of candidates) {
        try {
          const q = supabase
            .from(t)
            .select('id, date, kind, description, amount, ref_id, branch_id')
            .eq('branch_id', selectedLocationId) // Ensure location filtering
            .in('kind', ['Advance', 'SalaryPayment'] as any)
            .order('date', { ascending: false } as any)
            .range(page * activitiesPageSize, page * activitiesPageSize + activitiesPageSize);
          
          const { data, error } = await q;
          if (error) throw error;
          rows = data || [];
          break;
        } catch (_) {}
      }

      // If we fetched pageSize+1 for hasNext check, trim to pageSize for render
      if ((rows || []).length > activitiesPageSize) {
        rows = rows!.slice(0, activitiesPageSize);
      }

      const baseActs = (rows || []).map((r: any) => ({
        id: r.id,
        date: r.date,
        kind: r.kind as 'Advance' | 'SalaryPayment',
        description: r.description || null,
        amount: Number(r.amount || 0),
        ref_id: r.ref_id as string | null,
        branch_id: (r as any).branch_id as string | null,
      }));

      // Resolve staff IDs for advances (need to look up advance rows)
      const advanceIds = baseActs.filter(a => a.kind === 'Advance' && a.ref_id).map(a => a.ref_id as string);
      let advanceMap: Record<string, string> = {};
      if (advanceIds.length > 0) {
        const advSources = ['payroll_advances', 'advances', 'payroll.advances'];
        for (const t of advSources) {
          try {
            const { data, error } = await supabase
              .from(t)
              .select('id, staff_id, branch_id')
              .in('id', advanceIds)
              .eq('branch_id', selectedLocationId); // Ensure advance is from current location
            if (error) throw error;
            (data || []).forEach((row: any) => { 
              // Double-check that the advance is from the current location
              if (row.branch_id === selectedLocationId) {
                advanceMap[row.id] = row.staff_id; 
              }
            });
            if (Object.keys(advanceMap).length === advanceIds.length) break;
          } catch (_) {}
        }
      }

      // Determine staff IDs per activity
      const withStaffIds = baseActs.map(a => ({
        ...a,
        staffId: a.kind === 'SalaryPayment' ? (a.ref_id || undefined) : (advanceMap[a.ref_id || ''] || undefined)
      }));

      // Build staffId -> name map from current staff state; collect missing ids
      const staffIdToName: Record<string, string> = {};
      staff.forEach(s => { staffIdToName[s.id] = s.name; });
      const missingIds = withStaffIds.map(a => a.staffId).filter((id): id is string => !!id && !staffIdToName[id]);
      const uniqueMissing = Array.from(new Set(missingIds));
      if (uniqueMissing.length > 0) {
        const staffSources = ['payroll_staff', 'payroll.staff'];
        for (const t of staffSources) {
          try {
            const { data, error } = await supabase
              .from(t)
              .select('id, name')
              .in('id', uniqueMissing)
              .eq('branch_id', selectedLocationId); // Ensure staff is from current location
            if (error) throw error;
            (data || []).forEach((row: any) => { staffIdToName[row.id] = row.name; });
            if (uniqueMissing.every(id => staffIdToName[id])) break;
          } catch (_) {}
        }
      }

      // Filter activities to only include those from current location staff
      const currentStaffIds = new Set(staff.map(s => s.id));
      let filteredActs = withStaffIds
        .filter(a => {
          // Only include activities that have a staff ID and that staff is from current location
          if (!a.staffId) return false;
          return currentStaffIds.has(a.staffId);
        });
      
      // For managers, filter out salary payments
      if (user?.role === 'manager') {
        filteredActs = filteredActs.filter(a => a.kind !== 'SalaryPayment');
      }
      
      const finalActs = filteredActs.map(a => ({
        id: a.id,
        date: a.date,
        kind: a.kind,
        description: a.description,
        amount: a.amount,
        staffId: a.staffId,
        staffName: a.staffId ? (staffIdToName[a.staffId] || undefined) : undefined
      }));

      // Debug logging for payment activities
      console.log('StaffPage Payment Activities Debug:', {
        selectedLocationId,
        userRole: user?.role,
        totalActivities: withStaffIds.length,
        currentStaffIds: Array.from(currentStaffIds),
        filteredActivities: filteredActs.length,
        finalActivities: finalActs.length,
        activityTypes: finalActs.map(a => a.kind),
        activitiesDetails: finalActs.map(a => ({ 
          kind: a.kind, 
          amount: a.amount, 
          staffName: a.staffName, 
          date: a.date 
        }))
      });

      setActivities(finalActs);
      // Determine if next page exists by probing one extra row
      setActivitiesHasNext((rows || []).length > activitiesPageSize);
      setActivitiesPage(page);
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivities([]);
      setActivitiesHasNext(false);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Also react to location id changes directly
  useEffect(() => {
    if (!user?.id || !selectedLocationId) {
      setActivities([]);
      setActivitiesHasNext(false);
      return;
    }
    loadActivities(0);
  }, [selectedLocationId]);

  const toggleActive = async (memberId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('payroll_staff')
        .update({ is_active: !current })
        .eq('id', memberId);
      if (error) throw error;
      toast({ title: current ? 'Staff deactivated' : 'Staff activated' });
      await refreshStaff();
    } catch (e: any) {
      toast({ title: 'Failed to update status', description: e?.message, variant: 'destructive' });
    }
  };

  const deleteStaff = async (memberId: string) => {
    try {
      // Try deleting via public view first
      let { error } = await supabase.from('payroll_staff').delete().eq('id', memberId);
      if (error) {
        // Fallback to underlying table
        const resp = await supabase.from('payroll.staff').delete().eq('id', memberId);
        if (resp.error) throw resp.error;
      }
      toast({ title: 'Staff deleted' });
      await refreshStaff();
    } catch (e: any) {
      toast({ title: 'Failed to delete staff', description: e?.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    const loadStaff = async () => {
      try {
        setLoading(true);
        if (!user?.id) {
          setStaff([]);
          return;
        }

        // Only load staff if we have a selected location
        if (!selectedLocationId) {
          setStaff([]);
          return;
        }

        // Use a public updatable view to expose payroll.staff: public.payroll_staff
        const tableName = 'payroll_staff';
        const baseQuery = supabase.from(tableName).select('*').eq('branch_id', selectedLocationId);
        const { data: staffData, error: staffError } = await baseQuery;
        if (staffError) throw staffError;

        let mapped = (staffData || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          role: row.role_title || row.role || '',
          isActive: typeof row.is_active === 'boolean' ? row.is_active : row.isActive,
          monthlySalary: Number((row.monthly_salary ?? row.monthlySalary) || 0),
          payableSalary: Number((row.monthly_salary ?? row.monthlySalary) || 0),
          totalAdvances: 0,
          presentDays: 0,
          absences: 0,
          paidLeaves: 0,
          unpaidLeaves: 0,
          contact: row.contact || '',
          dateOfJoining: row.date_of_joining || row.dateOfJoining,
          paymentMode: row.default_payment_mode || row.payment_mode || row.paymentMode || ''
        }));
        mapped = await mergeMonthlyAggregates(mapped);
        setStaff(mapped);
      } catch (error) {
        console.error('Error loading staff:', error);
        toast({
          title: "Error",
          description: "Failed to load staff data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
    loadActivities(0);
    // leaves will load after staff is set in a separate effect below
  }, [selectedLocationId]);

  const refreshStaff = async () => {
    if (!user?.id || !selectedLocationId) return;
    setLoading(true);
    try {
      const tableName = 'payroll_staff';
      const baseQuery = supabase.from(tableName).select('*').eq('branch_id', selectedLocationId);
      const { data: staffData } = await baseQuery;
      let mapped = (staffData || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        role: row.role_title || row.role || '',
        isActive: typeof row.is_active === 'boolean' ? row.is_active : row.isActive,
        monthlySalary: Number((row.monthly_salary ?? row.monthlySalary) || 0),
        payableSalary: Number((row.monthly_salary ?? row.monthlySalary) || 0),
        totalAdvances: 0,
        presentDays: 0,
        absences: 0,
        paidLeaves: 0,
        unpaidLeaves: 0,
        contact: row.contact || '',
        dateOfJoining: row.date_of_joining || row.dateOfJoining,
        paymentMode: row.default_payment_mode || row.payment_mode || row.paymentMode || ''
      }));
      mapped = await mergeMonthlyAggregates(mapped);
      setStaff(mapped);
      // Also reload activities when staff is refreshed
      await loadActivities(0);
    } finally {
      setLoading(false);
    }
  };

  // Load leaves whenever the visible staff list changes (e.g., location filter changes)
  useEffect(() => {
    if (staff.length === 0) {
      setLeaves([]);
      return;
    }
    const ids = staff.map(s => s.id);
    loadLeavesForStaff(ids);
  }, [staff.map(s => s.id).join(',')]);

  const handleAddStaff = async () => {
    if (!user?.id) return;
    if (!name.trim() || !roleTitle.trim() || !dateOfJoining || !monthlySalary || !paymentMode) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    if (!selectedLocationId) {
      toast({ title: 'No location selected', description: 'Select a location from the top bar', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Do not embed UPI account into contact anymore
      const contactToSave = (contact || '').trim();
      let lastError: any = null;
      const payloadSnake = {
        branch_id: selectedLocationId,
        name: name.trim(),
        role_title: roleTitle.trim(),
        contact: contactToSave || null,
        date_of_joining: dateOfJoining,
        monthly_salary: Number(monthlySalary),
        default_payment_mode: paymentMode,
        is_active: true
      } as any;
      const { error: insertError } = await supabase.from('payroll_staff').insert(payloadSnake);
      if (insertError) throw insertError;
      toast({ title: 'Staff added', description: 'New staff member has been created' });
      setShowAddForm(false);
      setName('');
      setRoleTitle('');
      setContact('');
      setDateOfJoining(new Date().toISOString().split('T')[0]);
      setMonthlySalary('');
      setPaymentMode('');
      setSelectedUpiAccountId('');
      await refreshStaff();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to add staff', description: e?.message || 'Insert blocked by policy or invalid data', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(staff.map(s => s.role)));

  const formatCurrency = (amount: number) => 
    `₹${amount.toLocaleString('en-IN')}`;

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-IN');

  const sanitizeContact = (raw: string) => {
    if (!raw) return '';
    // Remove any embedded upi:account tags
    return raw.replace(/\s*\|\s*?upi:[^|]+/gi, '').replace(/upi:[^|]+/i, '').trim();
  };

  const formatTelHref = (raw: string) => {
    const clean = (raw || '').replace(/\s+/g, '');
    // allow leading + and digits only
    const matched = clean.match(/^\+?[0-9]+$/) ? clean : clean.replace(/[^0-9+]/g, '');
    return `tel:${matched}`;
  };

  const loadPayrollHistory = async (staffId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payroll_lines')
        .select('*')
        .eq('staff_id', staffId)
        .order('month', { ascending: false })
        .limit(12); // Last 12 months
      
      if (error) throw error;
      setPayrollHistory(data || []);
      setSelectedStaffId(staffId);
      setShowPayrollHistory(true);
    } catch (error) {
      console.error('Error loading payroll history:', error);
      toast({
        title: "Error",
        description: "Failed to load payroll history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethod = (member: Staff) => {
    const mode = (member.paymentMode || '').trim();
    if (mode.toUpperCase() === 'UPI') {
      const match = (member.contact || '').match(/upi:([^|]+)/i);
      const account = match && match[1] ? match[1].trim() : '';
      return account ? `UPI: ${account}` : 'UPI';
    }
    return mode || '—';
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage your team members, attendance, and salary information
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowPaymentPanel((v) => !v)} variant="outline" className="hover:bg-muted">
            <CreditCard className="h-4 w-4 mr-2" />
            {showPaymentPanel ? 'Close Payments' : 'Make Payment'}
          </Button>
          {user?.role === 'owner' && (
            <Button onClick={() => setShowAddForm((v) => !v)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              {showAddForm ? 'Close' : 'Add Staff Member'}
            </Button>
          )}
        </div>
      </div>

      {showAddForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add Staff Member</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Ramesh Kumar" />
            </div>
            <div className="grid gap-2">
              <Label>Role/Title</Label>
              <div className="grid gap-2">
                <Select
                  value={useCustomRole ? '__custom__' : (roleTitle || '')}
                  onValueChange={(val) => {
                    if (val === '__custom__') {
                      setUseCustomRole(true);
                      setRoleTitle('');
                    } else {
                      setUseCustomRole(false);
                      setRoleTitle(val);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={uniqueRoles.length ? 'Choose existing role' : 'Enter new role'} />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueRoles.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Add new role…</SelectItem>
                  </SelectContent>
                </Select>
                {useCustomRole && (
                  <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Type new role" />
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact">Contact</Label>
              <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="grid gap-2">
              <Label>Date of Joining</Label>
              <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salary">Monthly Salary (INR)</Label>
              <Input id="salary" type="number" min="0" step="1" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} placeholder="e.g., 15000" />
            </div>
            <div className="grid gap-2">
              <Label>Default Payment Mode</Label>
              <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMode === 'UPI' && (
              <div className="grid gap-2 sm:col-span-2">
                <Label>Select UPI Account (Location)</Label>
                <Select value={selectedUpiAccountId} onValueChange={setSelectedUpiAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={upiAccounts.length ? 'Choose UPI account' : 'No UPI accounts found'} />
                  </SelectTrigger>
                  <SelectContent>
                    {upiAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.location_name || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Will be saved as upi:account in contact</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAddStaff} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? 'Saving...' : 'Add Staff'}
            </Button>
          </div>
        </Card>
      )}

      {showPaymentPanel && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Make Payment</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Staff</Label>
              <Select value={paymentStaffId} onValueChange={setPaymentStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {s.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Advance">Advance</SelectItem>
                  {user?.role === 'owner' && (
                    <SelectItem value="Salary">Salary</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input type="number" min="0" step="1" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Payment Mode</Label>
              <Select value={paymentModeSel} onValueChange={(v: any) => setPaymentModeSel(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentModeSel === 'UPI' && (
              <div className="grid gap-2 sm:col-span-2">
                <Label>Select UPI Account (Location)</Label>
                <Select value={selectedUpiAccountId} onValueChange={setSelectedUpiAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={upiAccounts.length ? 'Choose UPI account' : 'No UPI accounts found'} />
                  </SelectTrigger>
                  <SelectContent>
                    {upiAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.location_name || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPaymentPanel(false)}>Close</Button>
            <Button disabled={savingPayment} onClick={async () => {
              if (!paymentStaffId || !paymentAmount || !paymentModeSel) {
                toast({ title: 'Missing fields', description: 'Select staff, amount and mode', variant: 'destructive' });
                return;
              }
              try {
                setSavingPayment(true);
                const amtNum = Number(paymentAmount);
                const month = getCurrentMonth();
                const today = new Date().toISOString().slice(0,10);
                if (paymentType === 'Advance') {
                  // Insert into advances (fallback to public view if available)
                  const advancePayload = {
                    staff_id: paymentStaffId,
                    date: today,
                    amount: amtNum,
                    payment_mode: paymentModeSel,
                    notes: paymentNotes || null
                  };
                  const { data: advRows, error: advErr } = await insertWithFallback([
                    'payroll_advances',
                    'advances',
                    'payroll.advances'
                  ] as string[], advancePayload, 'id');
                  if (advErr) throw advErr;
                  const advanceId = advRows && advRows[0] ? advRows[0].id : null;
                  // Also log to activity_logs
                  let selectedLocation = '';
                  try { const stored = localStorage.getItem(`selectedLocation_${user?.id}` || ''); selectedLocation = stored || ''; } catch (_) {}
                  const actPayload = {
                    branch_id: selectedLocation || null,
                    kind: 'Advance',
                    ref_table: 'payroll.advances',
                    ref_id: advanceId,
                    date: new Date().toISOString(),
                    description: paymentNotes || null,
                    amount: amtNum
                  };
                  const { error: actErr } = await insertWithFallback([
                    'payroll_activity_logs',
                    'activity_logs',
                    'payroll.activity_logs'
                  ] as string[], actPayload);
                  if (actErr) throw actErr;
                } else {
                  // Salary payment: log to activity_logs with ref_id = staff_id
                  let selectedLocation = '';
                  try { const stored = localStorage.getItem(`selectedLocation_${user?.id}` || ''); selectedLocation = stored || ''; } catch (_) {}
                  const withUpi = paymentModeSel === 'UPI' && selectedUpiAccountId
                    ? `${paymentNotes ? paymentNotes + ' | ' : ''}UPI:${upiAccounts.find(a => a.id === selectedUpiAccountId)?.account_name || ''}`
                    : paymentNotes || null;
                  const actPayload = {
                    branch_id: selectedLocation || null,
                    kind: 'SalaryPayment',
                    ref_table: 'payroll.staff',
                    ref_id: paymentStaffId,
                    date: new Date().toISOString(),
                    description: withUpi,
                    amount: amtNum
                  };
                  const { error: salErr } = await insertWithFallback([
                    'payroll_activity_logs',
                    'activity_logs',
                    'payroll.activity_logs'
                  ] as string[], actPayload);
                  if (salErr) throw salErr;
                }
                toast({ title: 'Payment recorded' });
                setShowPaymentPanel(false);
                setPaymentStaffId('');
                setPaymentType('Advance');
                setPaymentAmount('');
                setPaymentModeSel('');
                setPaymentNotes('');
                setSelectedUpiAccountId('');
                await refreshStaff();
                // Ensure aggregates reflect the new advance/salary immediately
                await loadActivities(0);
              } catch (e: any) {
                toast({ title: 'Failed to record payment', description: e?.message, variant: 'destructive' });
              } finally {
                setSavingPayment(false);
              }
            }} className="bg-primary text-primary-foreground hover:bg-primary/90">{savingPayment ? 'Saving…' : 'Record Payment'}</Button>
          </div>
        </Card>
      )}

      {editMemberId && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Staff</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Role/Title</Label>
              <div className="grid gap-2">
                <Select
                  value={useCustomRole ? '__custom__' : (roleTitle || '')}
                  onValueChange={(val) => {
                    if (val === '__custom__') {
                      setUseCustomRole(true);
                      setRoleTitle('');
                    } else {
                      setUseCustomRole(false);
                      setRoleTitle(val);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={uniqueRoles.length ? 'Choose existing role' : 'Enter new role'} />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueRoles.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Add new role…</SelectItem>
                  </SelectContent>
                </Select>
                {useCustomRole && (
                  <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Type new role" />
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Contact</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Date of Joining</Label>
              <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Monthly Salary (INR)</Label>
              <Input type="number" min="0" step="1" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Default Payment Mode</Label>
              <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMode === 'UPI' && (
              <div className="grid gap-2 sm:col-span-2">
                <Label>Select UPI Account (Location)</Label>
                <Select value={selectedUpiAccountId} onValueChange={setSelectedUpiAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={upiAccounts.length ? 'Choose UPI account' : 'No UPI accounts found'} />
                  </SelectTrigger>
                  <SelectContent>
                    {upiAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.location_name || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditMemberId(null); }}>Cancel</Button>
            <Button onClick={async () => {
              if (!editMemberId) return;
              setEditSaving(true);
              try {
                // build update payload
                const updates: any = {
                  name: name.trim(),
                  role_title: roleTitle.trim(),
                  contact: (contact || '').trim() || null,
                  date_of_joining: dateOfJoining,
                  monthly_salary: Number(monthlySalary),
                  default_payment_mode: paymentMode,
                };
                const { error } = await supabase.from('payroll_staff').update(updates).eq('id', editMemberId);
                if (error) throw error;
                toast({ title: 'Staff updated' });
                setEditMemberId(null);
                await refreshStaff();
              } catch (e: any) {
                toast({ title: 'Failed to update staff', description: e?.message, variant: 'destructive' });
              } finally {
                setEditSaving(false);
              }
            }} disabled={editSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">{editSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="form-select pl-10 pr-8 min-w-[160px]"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Staff Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Staff</p>
              <p className="text-2xl font-bold text-foreground">{staff.length}</p>
            </div>
            <User className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {staff.filter(s => s.isActive).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        
        {user?.role === 'owner' && (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Salaries</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(staff.reduce((sum, s) => sum + (s.monthlySalary || 0), 0))}
                  </p>
                </div>
                <IndianRupee className="h-8 w-8 text-orange-600" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Payable</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(staff.reduce((sum, s) => sum + (s.payableSalary || 0), 0))}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Staff Table */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Staff Members</h3>
          <p className="text-sm text-muted-foreground">
            {filteredStaff.length} of {staff.length} staff members
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-foreground">Name</th>
                <th className="text-left p-4 font-medium text-foreground">Role</th>
                <th className="text-left p-4 font-medium text-foreground">Contact</th>
                <th className="text-left p-4 font-medium text-foreground">Joining Date</th>
                <th className="text-left p-4 font-medium text-foreground">Payment Method</th>
                {user?.role === 'owner' && (
                  <th className="text-right p-4 font-medium text-foreground">Salary</th>
                )}
                <th className="text-center p-4 font-medium text-foreground">Attendance</th>
                <th className="text-center p-4 font-medium text-foreground">Leaves</th>
                <th className="text-center p-4 font-medium text-foreground">Advances</th>
                {user?.role === 'owner' && (
                  <th className="text-right p-4 font-medium text-foreground">Payable</th>
                )}
                <th className="text-center p-4 font-medium text-foreground">Status</th>
                <th className="text-center p-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => (
                <tr key={member.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-sm font-medium">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        {/* removed payment mode under name */}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-foreground">{member.role}</td>
                  <td className="p-4">
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      {sanitizeContact(member.contact) ? (
                        <a
                          href={formatTelHref(sanitizeContact(member.contact))}
                          className="hover:underline"
                        >
                          {sanitizeContact(member.contact)}
                        </a>
                      ) : 'N/A'}
                    </div>
                  </td>
                  <td className="p-4 text-foreground">{formatDate(member.dateOfJoining)}</td>
                  <td className="p-4 text-foreground">{renderPaymentMethod(member)}</td>
                  {user?.role === 'owner' && (
                    <td className="p-4 text-right font-medium text-foreground">
                      <div className="flex flex-col items-end">
                        <span>{formatCurrency(member.monthlySalary || 0)}</span>
                        {member.salaryPaid && member.salaryPaid > 0 && (
                          <span className={
                            member.salaryPaid >= (member.monthlySalary || 0)
                              ? 'text-green-600 text-xs'
                              : 'text-amber-600 text-xs'
                          }>
                            {member.salaryPaid >= (member.monthlySalary || 0) ? 'Paid' : `Paid ${formatCurrency(member.salaryPaid)}`}
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="p-4 text-center text-foreground">
                    <div className="flex flex-col items-center">
                      <span className="text-green-600 font-medium">{`${member.presentDays || 0}P`}</span>
                      <span className="text-red-600 font-medium">{`${member.absences || 0}A`}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center text-foreground">
                    <div className="flex flex-col items-center">
                      <span className="text-green-600 font-medium">{`${member.paidLeaves || 0}PL`}</span>
                      <span className="text-red-600 font-medium">{`${member.unpaidLeaves || 0}UL`}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center font-medium text-foreground">{formatCurrency(member.totalAdvances || 0)}</td>
                  {user?.role === 'owner' && (
                    <td className="p-4 text-right font-semibold text-foreground">{formatCurrency(member.payableSalary || 0)}</td>
                  )}
                  <td className="p-4 text-center">
                    {member.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Deactive
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary"
                        title="Edit Staff"
                        onClick={() => {
                          setEditMemberId(member.id);
                          setName(member.name);
                          setRoleTitle(member.role);
                          setUseCustomRole(false);
                          setContact(sanitizeContact(member.contact || ''));
                          setDateOfJoining(member.dateOfJoining);
                          setMonthlySalary(String(member.monthlySalary || ''));
                          setPaymentMode((member.paymentMode as any) || '');
                          setSelectedUpiAccountId('');
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadPayrollHistory(member.id)}
                        className="text-blue-600 hover:text-blue-700"
                        title="View Payroll History"
                      >
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(member.id, member.isActive)}
                        className={member.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}
                        title={member.isActive ? 'Deactivate Staff' : 'Activate Staff'}
                      >
                        {member.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      {user?.role === 'owner' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete Staff"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete staff member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {member.name} from your staff list. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteStaff(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredStaff.length === 0 && (
          <div className="p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No staff members found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterRole ? 'Try adjusting your search or filter criteria.' : 'Get started by adding your first staff member.'}
            </p>
            {user?.role === 'owner' && (
              <Button onClick={() => setShowAddForm((v) => !v)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                {showAddForm ? 'Close' : 'Add Staff Member'}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Activities pagination (Payments only) - COMMENTED OUT */}
      {/* 
      <Card className="mt-6">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Payment Activity</h3>
            <p className="text-sm text-muted-foreground">Advance and salary payments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={activitiesLoading || activitiesPage === 0} onClick={() => loadActivities(Math.max(0, activitiesPage - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={activitiesLoading || !activitiesHasNext} onClick={() => loadActivities(activitiesPage + 1)}>Next</Button>
          </div>
        </div>
        <div className="p-4">
          {activitiesLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : activities.length === 0 ? (
            <div className="text-sm text-muted-foreground">No payment activity.</div>
          ) : (
            <ul className="divide-y divide-border">
              {activities.map((a) => (
                <li key={a.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${a.kind === 'Advance' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {a.kind === 'Advance' ? 'A' : 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {a.kind === 'Advance'
                          ? `Advance payment of ${formatCurrency(a.amount)} to ${a.staffName || 'staff'}`
                          : `Salary payment of ${formatCurrency(a.amount)} to ${a.staffName || 'staff'}`}
                      </div>
                      {a.description && (
                        <div className="text-xs text-muted-foreground truncate">{a.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{new Date(a.date).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
      */}

      {/* Long Leaves */}
      <Card className="mt-6">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Long Leaves</h3>
            <p className="text-sm text-muted-foreground">Approved leave periods for current staff</p>
          </div>
          <div className="text-sm text-muted-foreground">
            {leavesLoading ? 'Loading…' : `${leaves.length} record${leaves.length === 1 ? '' : 's'}`}
          </div>
        </div>
        {leavesLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : leaves.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No long leaves found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">Staff</th>
                  <th className="text-left p-4 font-medium text-foreground">Period</th>
                  <th className="text-left p-4 font-medium text-foreground">Type</th>
                  <th className="text-left p-4 font-medium text-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => {
                  const s = staff.find(st => st.id === l.staff_id);
                  const name = s ? s.name : l.staff_id.slice(0, 8);
                  const period = `${new Date(l.start_date).toLocaleDateString('en-IN')} → ${new Date(l.end_date).toLocaleDateString('en-IN')}`;
                  return (
                    <tr key={l.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4 text-foreground">{name}</td>
                      <td className="p-4 text-foreground">{period}</td>
                      <td className="p-4 text-foreground">{l.leave_type}</td>
                      <td className="p-4 text-muted-foreground">{l.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payroll History Modal */}
      {showPayrollHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Payroll History - {staff.find(s => s.id === selectedStaffId)?.name || 'Staff Member'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPayrollHistory(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {payrollHistory.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payroll records found for this staff member.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-foreground">Month</th>
                        <th className="text-right p-3 text-foreground">Base Salary</th>
                        <th className="text-center p-3 text-foreground">Present Days</th>
                        <th className="text-center p-3 text-foreground">Paid Leaves</th>
                        <th className="text-center p-3 text-foreground">Unpaid Leaves</th>
                        <th className="text-right p-3 text-foreground">Advances</th>
                        <th className="text-right p-3 text-foreground">Net Payable</th>
                        <th className="text-center p-3 text-foreground">Status</th>
                        <th className="text-center p-3 text-foreground">Payment Method</th>
                        <th className="text-center p-3 text-foreground">Paid Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollHistory.map((line) => (
                        <tr key={line.id} className="border-b border-border hover:bg-muted/30">
                          <td className="p-3 text-foreground font-medium">
                            {new Date(line.month + '-01').toLocaleDateString('en-IN', { 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </td>
                          <td className="p-3 text-right text-foreground">
                            {formatCurrency(line.base_salary)}
                          </td>
                          <td className="p-3 text-center text-foreground">
                            {line.present_days}
                          </td>
                          <td className="p-3 text-center text-foreground">
                            {line.paid_leaves}
                          </td>
                          <td className="p-3 text-center text-foreground">
                            {line.unpaid_leaves}
                          </td>
                          <td className="p-3 text-right text-warning">
                            {formatCurrency(line.advances_total)}
                          </td>
                          <td className="p-3 text-right text-success font-semibold">
                            {formatCurrency(line.net_payable)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              line.payment_status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {line.payment_status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">
                            {line.paid_via || '—'}
                          </td>
                          <td className="p-3 text-center text-muted-foreground">
                            {line.paid_at ? new Date(line.paid_at).toLocaleDateString('en-IN') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-border">
              <div className="flex justify-end">
                <Button onClick={() => setShowPayrollHistory(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPage;