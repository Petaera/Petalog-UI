import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Download, 
  Calendar, 
  FileText, 
  Users, 
  Receipt, 
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportType, setReportType] = useState<'salary' | 'expense' | 'combined'>('combined');
  const [salaryReport, setSalaryReport] = useState<any>(null);
  const [expenseReport, setExpenseReport] = useState<any>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [prevExpenseTotal, setPrevExpenseTotal] = useState<number>(0);
  const [prevSalaryTotals, setPrevSalaryTotals] = useState<{ salaries: number; advances: number }>({ salaries: 0, advances: 0 });
  const [salaryFilterRole, setSalaryFilterRole] = useState<string>('');
  const [salaryFilterMode, setSalaryFilterMode] = useState<string>('');
  const [salaryFilterAdv, setSalaryFilterAdv] = useState<'all' | 'with' | 'without'>('all');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableModes, setAvailableModes] = useState<string[]>([]);
  const [branchName, setBranchName] = useState<string>('');

  const downloadFile = (filename: string, content: string, mime = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    // Export as CSV (Excel compatible)
    const monthLabel = selectedMonth;
    let csv = `Report Type,${reportType.toUpperCase()}\nMonth,${monthLabel}\n`;
    if (reportType === 'expense' || reportType === 'combined') {
      csv += `\nExpense Summary\nCategory,Total (INR)\n`;
      (expenseReport?.categoryBreakdown || []).forEach((row: any) => {
        csv += `${row.category.replace(/,/g, ' ')},${row.total}\n`;
      });
      csv += `Total Expenses,${expenseReport?.totalExpenses || 0}\n`;
    }
    if (reportType === 'salary' || reportType === 'combined') {
      csv += `\nSalary Summary\nTotal Salaries,${salaryReport?.totalSalaries || 0}\nTotal Advances,${salaryReport?.totalAdvances || 0}\nTotal Payable,${salaryReport?.totalPayable || 0}\n`;
    }
    const dateStr = new Date().toISOString().slice(0,10);
    const safeBranch = (branchName || 'branch').replace(/[^a-zA-Z0-9_-]/g, '_');
    const typeLabel = reportType;
    const filename = `${safeBranch}_${typeLabel}_report_${monthLabel}_${dateStr}.csv`;
    downloadFile(filename, csv);
  };

  const exportPdf = () => {
    const monthLabel = selectedMonth;
    const dateStr = new Date().toISOString().slice(0,10);
    const safeBranch = (branchName || 'branch').replace(/[^a-zA-Z0-9_-]/g, '_');
    const typeLabel = reportType;
    const filenameNoExt = `${safeBranch}_${typeLabel}_report_${monthLabel}_${dateStr}`;
    let html = `<html><head><title>${filenameNoExt}</title><style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px;color:#111}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ddd;padding:8px;font-size:12px}
      th{background:#f3f4f6;text-align:left}
      h2{margin:0 0 12px}
    </style></head><body>`;
    html += `<h2>${safeBranch} - ${typeLabel.toUpperCase()} Report (${monthLabel})</h2>`;
    if (reportType === 'expense' || reportType === 'combined') {
      html += `<h3>Expense Summary</h3><table><thead><tr><th>Category</th><th>Total (INR)</th></tr></thead><tbody>`;
      (expenseReport?.categoryBreakdown || []).forEach((row: any) => {
        html += `<tr><td>${row.category}</td><td>${row.total}</td></tr>`;
      });
      html += `<tr><th>Total Expenses</th><th>${expenseReport?.totalExpenses || 0}</th></tr></tbody></table>`;
    }
    if (reportType === 'salary' || reportType === 'combined') {
      html += `<h3>Salary Summary</h3><table><tbody>
        <tr><td>Total Salaries</td><td>${salaryReport?.totalSalaries || 0}</td></tr>
        <tr><td>Total Advances</td><td>${salaryReport?.totalAdvances || 0}</td></tr>
        <tr><td>Total Payable</td><td>${salaryReport?.totalPayable || 0}</td></tr>
      </tbody></table>`;
    }
    html += `</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = localStorage.getItem(`selectedLocation_${user.id}`);
      setSelectedLocationId(stored || '');
    } catch (_) {}
  }, [user?.id]);

  useEffect(() => {
    const loadBranchName = async () => {
      if (!selectedLocationId) return;
      try {
        const { data } = await supabase.from('locations').select('name').eq('id', selectedLocationId).maybeSingle();
        setBranchName(data?.name || 'branch');
      } catch (_) {
        setBranchName('branch');
      }
    };
    loadBranchName();
    const loadReports = async () => {
      try {
        setLoading(true);
        // Build date window
        const monthStart = `${selectedMonth}-01`;
        const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);

        // Load expenses for month and branch
        let expQuery: any = supabase
          .from('expenses')
          .select('id, amount, date, category_id, payment_mode, notes, branch_id')
          .gte('date', monthStart)
          .lte('date', monthEnd);
        if (selectedLocationId) expQuery = expQuery.eq('branch_id', selectedLocationId);
        const { data: expRows, error: expErr } = await expQuery;
        if (expErr) throw expErr;

        // Load categories for naming
        let catQuery: any = supabase
          .from('expense_categories')
          .select('id, name, branch_id');
        if (selectedLocationId) catQuery = catQuery.eq('branch_id', selectedLocationId);
        const { data: catRows } = await catQuery;
        const catMap: Record<string, string> = {};
        (catRows || []).forEach((c: any) => { catMap[c.id] = c.name; });

        // Aggregate expense totals by category
        const byCategory: Record<string, number> = {};
        (expRows || []).forEach((r: any) => {
          const key = r.category_id || 'Uncategorized';
          byCategory[key] = (byCategory[key] || 0) + Number(r.amount || 0);
        });
        const categoryBreakdown = Object.entries(byCategory).map(([catId, total]) => ({
          category: catMap[catId] || 'Uncategorized',
          total: Number(total || 0)
        })).sort((a, b) => b.total - a.total);

        const totalExpenses = (expRows || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

        setExpenseReport({ totalExpenses, categoryBreakdown });

        // Previous month expenses for comparison
        const prevDate = new Date(monthStart);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        const prevStart = `${prevYm}-01`;
        const prevEnd = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).toISOString().slice(0, 10);
        let prevExpQuery: any = supabase
          .from('expenses')
          .select('amount, date, branch_id')
          .gte('date', prevStart)
          .lte('date', prevEnd);
        if (selectedLocationId) prevExpQuery = prevExpQuery.eq('branch_id', selectedLocationId);
        const { data: prevRows } = await prevExpQuery;
        setPrevExpenseTotal((prevRows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0));

        // Load staff (for monthly salaries) using public view fallback
        const selectWithFallback = async (tables: string[], builder: (q: any) => Promise<{ data: any | null; error?: any }>) => {
          for (const t of tables) {
            try {
              const q = supabase.from(t);
              const { data, error } = await builder(q);
              if (error) throw error;
              if (data) return data;
            } catch (_) {}
          }
          return null;
        };

        const staffRows = await selectWithFallback(
          ['payroll_staff', 'payroll.staff'],
          async (q: any) => {
            let query = q.select('id, monthly_salary, branch_id, role_title, default_payment_mode, name');
            if (selectedLocationId) query = query.eq('branch_id', selectedLocationId);
            const { data, error } = await query;
            return { data, error };
          }
        );
        const totalSalaries = (staffRows || []).reduce((s: number, r: any) => s + Number(r.monthly_salary || 0), 0);

        // Load advances for month via public view fallback
        const advRows = await selectWithFallback(
          ['payroll_advances', 'payroll.advances'],
          async (q: any) => {
            let query = q.select('staff_id, amount, date');
            query = query.gte('date', monthStart).lte('date', monthEnd);
            if (selectedLocationId) {
              // filter by staff in branch if staffRows available
              const staffIds = (staffRows || []).map((s: any) => s.id);
              if (staffIds.length > 0) query = query.in('staff_id', staffIds);
            }
            const { data, error } = await query;
            return { data, error };
          }
        );
        const totalAdvances = (advRows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

        // Build staff-wise advances map
        const advancesByStaff: Record<string, number> = {};
        (advRows || []).forEach((r: any) => {
          const sid = r.staff_id;
          advancesByStaff[sid] = (advancesByStaff[sid] || 0) + Number(r.amount || 0);
        });

        const staffReports = (staffRows || []).map((s: any) => {
          const monthlySalary = Number(s.monthly_salary || 0);
          const totalAdv = Number(advancesByStaff[s.id] || 0);
          return {
            id: s.id,
            name: s.name || 'Staff',
            role: s.role_title || '—',
            paymentMode: s.default_payment_mode || '—',
            monthlySalary,
            totalAdvances: totalAdv,
            payableSalary: Math.max(0, monthlySalary - totalAdv),
          };
        });

        const totalPayable = Math.max(0, totalSalaries - totalAdvances);
        setSalaryReport({ totalSalaries, totalAdvances, totalPayable, staffReports });

        // Populate filter options
        setAvailableRoles(Array.from(new Set((staffRows || []).map((s: any) => (s.role_title || '').trim()).filter(Boolean))));
        setAvailableModes(Array.from(new Set((staffRows || []).map((s: any) => (s.default_payment_mode || '').trim()).filter(Boolean))));

        // Previous month salaries/advances
        const prevStaffRows = await selectWithFallback(
          ['payroll_staff', 'payroll.staff'],
          async (q: any) => {
            let query = q.select('id, monthly_salary, branch_id');
            if (selectedLocationId) query = query.eq('branch_id', selectedLocationId);
            const { data, error } = await query;
            return { data, error };
          }
        );
        const prevSalaries = (prevStaffRows || []).reduce((s: number, r: any) => s + Number(r.monthly_salary || 0), 0);
        const prevAdvRows = await selectWithFallback(
          ['payroll_advances', 'payroll.advances'],
          async (q: any) => {
            let query = q.select('staff_id, amount, date');
            query = query.gte('date', prevStart).lte('date', prevEnd);
            if (selectedLocationId && prevStaffRows) {
              const staffIds = (prevStaffRows || []).map((s: any) => s.id);
              if (staffIds.length > 0) query = query.in('staff_id', staffIds);
            }
            const { data, error } = await query;
            return { data, error };
          }
        );
        const prevAdvances = (prevAdvRows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        setPrevSalaryTotals({ salaries: prevSalaries, advances: prevAdvances });
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedLocationId) {
      loadReports();
    }
  }, [selectedMonth, selectedLocationId]);

  const formatCurrency = (amount: number) => 
    `₹${amount.toLocaleString('en-IN')}`;

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-IN', { 
      month: 'long', 
      year: 'numeric' 
    });

  // Chart data for expense breakdown
  const expenseChartData = {
    labels: expenseReport?.categoryBreakdown.map((cat: any) => cat.category) || [],
    datasets: [
      {
        data: expenseReport?.categoryBreakdown.map((cat: any) => cat.total) || [],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(234, 88, 12, 0.8)',
          'rgba(220, 38, 38, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(234, 88, 12, 1)',
          'rgba(220, 38, 38, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(236, 72, 153, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Chart data for salary vs expenses
  const comparisonChartData = {
    labels: ['Salaries', 'Advances', 'Expenses', 'Net Cost'],
    datasets: [
      {
        label: 'Amount (₹)',
        data: [
          salaryReport?.totalSalaries || 0,
          salaryReport?.totalAdvances || 0,
          expenseReport?.totalExpenses || 0,
          (salaryReport?.totalSalaries || 0) + (expenseReport?.totalExpenses || 0)
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(234, 88, 12, 0.8)',
          'rgba(220, 38, 38, 0.8)',
          'rgba(99, 102, 241, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(234, 88, 12, 1)',
          'rgba(220, 38, 38, 1)',
          'rgba(99, 102, 241, 1)',
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            // For Bar charts, context.parsed can be an object {x,y}
            const parsed = context.parsed;
            let value: any = parsed;
            if (parsed && typeof parsed === 'object' && parsed !== null) {
              value = parsed.y ?? parsed.x;
            }
            if (typeof value !== 'number') {
              const raw = context.raw as any;
              value = typeof raw === 'number' ? raw : Number(raw?.y ?? raw?.x ?? 0);
            }
            const amount = Number(value || 0);
            const datasetLabel = context.dataset?.label ? `${context.dataset.label}: ` : '';
            return `${datasetLabel}₹${amount.toLocaleString('en-IN')}`;
          },
        },
      },
    },
    maintainAspectRatio: false,
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
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your business finances
          </p>
        </div>
        
        <div className="flex gap-2" />
      </div>

      {/* Filters */}
      <div className="business-card p-6">
        <div className="p-4 border border-border rounded-lg bg-muted/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Month</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="form-input"
              />
            </div>
            
            <div>
              <label className="form-label">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="form-select w-full border border-border rounded-md bg-white"
              >
                <option value="combined">Combined Report</option>
                <option value="salary">Salary Report</option>
                <option value="expense">Expense Report</option>
              </select>
            </div>
            
            <div className="flex items-end gap-2">
              <Button variant="outline" className="w-full" onClick={exportPdf}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" className="w-full" onClick={exportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          {(reportType !== 'expense') && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Filter by Role</label>
                <select value={salaryFilterRole} onChange={(e) => setSalaryFilterRole(e.target.value)} className="form-select w-full">
                  <option value="">All Roles</option>
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Filter by Payment Mode</label>
                <select value={salaryFilterMode} onChange={(e) => setSalaryFilterMode(e.target.value)} className="form-select w-full">
                  <option value="">All Modes</option>
                  {availableModes.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Filter by Advances</label>
                <select value={salaryFilterAdv} onChange={(e) => setSalaryFilterAdv(e.target.value as any)} className="form-select w-full">
                  <option value="all">All Staff</option>
                  <option value="with">With Advances</option>
                  <option value="without">Without Advances</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(reportType === 'salary' || reportType === 'combined') && (
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Salaries</p>
              <p className="text-xl font-bold text-success">
                {formatCurrency(salaryReport?.totalSalaries || 0)}
              </p>
              <p className="text-xs text-success mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {(() => {
                  const prev = prevSalaryTotals.salaries || 0;
                  const curr = salaryReport?.totalSalaries || 0;
                  const pct = prev > 0 ? (((curr - prev) / prev) * 100) : 0;
                  return `${pct.toFixed(1)}% from last month`;
                })()}
              </p>
            </div>
            <Users className="h-8 w-8 text-success" />
          </div>
        </div>
        )}
        
        {(reportType === 'salary' || reportType === 'combined') && (
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Advances</p>
              <p className="text-xl font-bold text-warning">
                {formatCurrency(salaryReport?.totalAdvances || 0)}
              </p>
              <p className="text-xs text-destructive mt-1 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                {(() => {
                  const prev = prevSalaryTotals.advances || 0;
                  const curr = salaryReport?.totalAdvances || 0;
                  const pct = prev > 0 ? (((curr - prev) / prev) * 100) : 0;
                  return `${pct.toFixed(1)}% from last month`;
                })()}
              </p>
            </div>
            <IndianRupee className="h-8 w-8 text-warning" />
          </div>
        </div>
        )}
        
        {(reportType === 'expense' || reportType === 'combined') && (
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold text-destructive">
                {formatCurrency(expenseReport?.totalExpenses || 0)}
              </p>
              <p className="text-xs text-destructive mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {(() => {
                  const prev = prevExpenseTotal || 0;
                  const curr = expenseReport?.totalExpenses || 0;
                  const pct = prev > 0 ? (((curr - prev) / prev) * 100) : 0;
                  return `${pct.toFixed(1)}% from last month`;
                })()}
              </p>
            </div>
            <Receipt className="h-8 w-8 text-destructive" />
          </div>
        </div>
        )}
        
        {(reportType === 'combined') && (
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Monthly Cost</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency((salaryReport?.totalSalaries || 0) + (expenseReport?.totalExpenses || 0))}
              </p>
              <p className="text-xs text-warning mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {(() => {
                  const prev = (prevSalaryTotals.salaries || 0) + (prevExpenseTotal || 0);
                  const curr = (salaryReport?.totalSalaries || 0) + (expenseReport?.totalExpenses || 0);
                  const pct = prev > 0 ? (((curr - prev) / prev) * 100) : 0;
                  return `${pct.toFixed(1)}% from last month`;
                })()}
              </p>
            </div>
            <FileText className="h-8 w-8 text-primary" />
          </div>
        </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(reportType === 'expense' || reportType === 'combined') && (
          <div className="business-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Expense Breakdown - {formatDate(selectedMonth + '-01')}
            </h3>
            <div className="h-64">
              <Doughnut data={expenseChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {(reportType === 'combined') && (
          <div className="business-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Financial Overview - {formatDate(selectedMonth + '-01')}
            </h3>
            <div className="h-64">
              <Bar data={comparisonChartData} options={chartOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Detailed Reports */}
      {(reportType === 'salary' || reportType === 'combined') && salaryReport && (
        <div className="business-card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Salary Report - {formatDate(selectedMonth + '-01')}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">Staff Name</th>
                  <th className="text-left p-4 font-medium text-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-foreground">Payment Mode</th>
                  <th className="text-right p-4 font-medium text-foreground">Monthly Salary</th>
                  <th className="text-right p-4 font-medium text-foreground">Advances</th>
                  <th className="text-right p-4 font-medium text-foreground">Payable</th>
                  <th className="text-center p-4 font-medium text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {salaryReport.staffReports
                  .filter((s: any) => !salaryFilterRole || (s.role || '') === salaryFilterRole)
                  .filter((s: any) => !salaryFilterMode || (s.paymentMode || '') === salaryFilterMode)
                  .filter((s: any) => salaryFilterAdv === 'all' || (salaryFilterAdv === 'with' ? (s.totalAdvances || 0) > 0 : (s.totalAdvances || 0) === 0))
                  .map((staff: any) => (
                  <tr key={staff.id} className="border-b border-border">
                    <td className="p-4 font-medium text-foreground">{staff.name}</td>
                    <td className="p-4 text-muted-foreground">{staff.role}</td>
                    <td className="p-4 text-muted-foreground">{staff.paymentMode}</td>
                    <td className="p-4 text-right text-foreground">
                      {formatCurrency(staff.monthlySalary)}
                    </td>
                    <td className="p-4 text-right text-warning">
                      {formatCurrency(staff.totalAdvances)}
                    </td>
                    <td className="p-4 text-right text-success font-semibold">
                      {formatCurrency(staff.payableSalary)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="status-badge-success">Calculated</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-header">
                <tr>
                  <td className="p-4 font-semibold text-foreground" colSpan={2}>Total</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right font-semibold text-foreground">
                    {formatCurrency(salaryReport.totalSalaries)}
                  </td>
                  <td className="p-4 text-right font-semibold text-warning">
                    {formatCurrency(salaryReport.totalAdvances)}
                  </td>
                  <td className="p-4 text-right font-semibold text-success">
                    {formatCurrency(salaryReport.totalPayable)}
                  </td>
                  <td className="p-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Expense Category Summary */}
      {(reportType === 'expense' || reportType === 'combined') && expenseReport && (
        <div className="business-card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Expense Summary - {formatDate(selectedMonth + '-01')}
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {expenseReport.categoryBreakdown.map((category: any) => {
                const percentage = expenseReport.totalExpenses > 0 
                  ? (category.total / expenseReport.totalExpenses) * 100 
                  : 0;
                
                return (
                  <div key={category.category} className="p-4 border border-border rounded-lg">
                    <h4 className="font-medium text-foreground">{category.category}</h4>
                    <p className="text-2xl font-bold text-destructive mt-2">
                      {formatCurrency(category.total)}
                    </p>
                    <div className="w-full bg-muted rounded-full h-2 mt-3">
                      <div 
                        className="bg-destructive h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {percentage.toFixed(1)}% of total expenses
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;