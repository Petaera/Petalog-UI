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
import { useSelectedLocation } from '@/hooks/useSelectedLocation';

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
  const selectedLocationId = useSelectedLocation();
  const [prevExpenseTotal, setPrevExpenseTotal] = useState<number>(0);
  const [prevSalaryTotals, setPrevSalaryTotals] = useState<{ salaries: number; advances: number }>({ salaries: 0, advances: 0 });
  const [salaryFilterRole, setSalaryFilterRole] = useState<string>('');
  const [salaryFilterMode, setSalaryFilterMode] = useState<string>('');
  const [salaryFilterAdv, setSalaryFilterAdv] = useState<'all' | 'with' | 'without'>('all');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableModes, setAvailableModes] = useState<string[]>([]);
  const [branchName, setBranchName] = useState<string>('');
  
  // Revenue/Profit tracking
  const [revenueReport, setRevenueReport] = useState<any>(null);
  const [prevRevenueTotal, setPrevRevenueTotal] = useState<number>(0);
  const [revenueFilterService, setRevenueFilterService] = useState<string>('');
  const [revenueFilterPayment, setRevenueFilterPayment] = useState<string>('');
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>([]);

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
    if (reportType === 'combined' && revenueReport) {
      csv += `\nRevenue Summary\nTotal Revenue,${revenueReport.totalRevenue || 0}\nCar Wash Services,${revenueReport.carWashServices || 0}\nSubscription Sales,${revenueReport.subscriptionSales || 0}\nCredit Top-ups,${revenueReport.creditTopups || 0}\nGross Profit,${revenueReport.grossProfit || 0}\nProfit Margin %,${(revenueReport.profitMargin || 0).toFixed(1)}\n`;
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
    if (reportType === 'combined' && revenueReport) {
      html += `<h3>Revenue & Profit Summary</h3><table><tbody>
        <tr><td>Total Revenue</td><td>${formatCurrency(revenueReport.totalRevenue || 0)}</td></tr>
        <tr><td>Car Wash Services</td><td>${formatCurrency(revenueReport.carWashServices || 0)}</td></tr>
        <tr><td>Subscription Sales</td><td>${formatCurrency(revenueReport.subscriptionSales || 0)}</td></tr>
        <tr><td>Credit Top-ups</td><td>${formatCurrency(revenueReport.creditTopups || 0)}</td></tr>
        <tr><td>Gross Profit</td><td>${formatCurrency(revenueReport.grossProfit || 0)}</td></tr>
        <tr><td>Profit Margin</td><td>${(revenueReport.profitMargin || 0).toFixed(1)}%</td></tr>
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
        
        // Only load if we have a selected location
        if (!selectedLocationId) {
          setExpenseReport(null);
          setSalaryReport(null);
          setPrevExpenseTotal(0);
          setPrevSalaryTotals({ salaries: 0, advances: 0 });
          setLoading(false);
          return;
        }
        
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
          .lte('date', monthEnd)
          .eq('branch_id', selectedLocationId);
        const { data: expRows, error: expErr } = await expQuery;
        if (expErr) throw expErr;

        // Load categories for naming
        let catQuery: any = supabase
          .from('expense_categories')
          .select('id, name, branch_id')
          .eq('branch_id', selectedLocationId);
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
        
        // Debug logging
        console.log('Expense Report Data:', { totalExpenses, categoryBreakdown });

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
          .lte('date', prevEnd)
          .eq('branch_id', selectedLocationId);
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

        const { data: staffRows } = await supabase
          .rpc('get_staff_by_branch', { branch_id_param: selectedLocationId });
        const totalSalaries = (staffRows || []).reduce((s: number, r: any) => s + Number(r.monthly_salary || 0), 0);

        // Load advances for month using RPC function
        const staffIds = (staffRows || []).map((s: any) => s.id);
        const { data: advRows } = await supabase
          .rpc('get_advances_by_staff', {
            staff_ids: staffIds,
            start_date: monthStart,
            end_date: monthEnd
          });
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
        const { data: prevStaffRows } = await supabase
          .rpc('get_staff_by_branch', { branch_id_param: selectedLocationId });
        const prevSalaries = (prevStaffRows || []).reduce((s: number, r: any) => s + Number(r.monthly_salary || 0), 0);
        const prevStaffIds = (prevStaffRows || []).map((s: any) => s.id);
        const { data: prevAdvRows } = await supabase
          .rpc('get_advances_by_staff', {
            staff_ids: prevStaffIds,
            start_date: prevStart,
            end_date: prevEnd
          });
        const prevAdvances = (prevAdvRows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        setPrevSalaryTotals({ salaries: prevSalaries, advances: prevAdvances });

        // Load Revenue Data from multiple sources
        let totalRevenue = 0;
        let revenueBreakdown: any = {
          carWashServices: 0,
          subscriptionSales: 0,
          creditTopups: 0,
          serviceBreakdown: {},
          paymentMethodBreakdown: {}
        };

        // 1. Car wash services from logs-man table
        try {
          const { data: logsData, error: logsErr } = await supabase
            .from('logs-man')
            .select('id, Amount, Total, service, payment_mode, entry_time, exit_time, discount')
            .eq('location_id', selectedLocationId)
            .gte('entry_time', monthStart)
            .lte('entry_time', monthEnd)
            .not('Amount', 'is', null);
          
          if (!logsErr && logsData) {
            const carWashRevenue = logsData.reduce((sum: number, log: any) => {
              const amount = Number(log.Total || log.Amount || 0);
              return sum + amount;
            }, 0);
            
            revenueBreakdown.carWashServices = carWashRevenue;
            totalRevenue += carWashRevenue;

            // Service breakdown
            const serviceMap: Record<string, number> = {};
            const paymentMap: Record<string, number> = {};
            
            logsData.forEach((log: any) => {
              const amount = Number(log.Total || log.Amount || 0);
              const service = log.service || 'Car Wash';
              const paymentMode = log.payment_mode || 'Cash';
              
              serviceMap[service] = (serviceMap[service] || 0) + amount;
              paymentMap[paymentMode] = (paymentMap[paymentMode] || 0) + amount;
            });
            
            revenueBreakdown.serviceBreakdown = serviceMap;
            revenueBreakdown.paymentMethodBreakdown = paymentMap;
            
            setAvailableServices(Object.keys(serviceMap));
            setAvailablePaymentMethods(Object.keys(paymentMap));
          }
        } catch (error) {
          console.error('Error loading car wash revenue:', error);
        }

        // 2. Subscription sales from subscription_purchases
        try {
          const { data: subsData, error: subsErr } = await supabase
            .from('subscription_purchases')
            .select('id, total_value, amount, created_at, source_payment_method')
            .eq('location_id', selectedLocationId)
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd)
            .not('total_value', 'is', null);
          
          if (!subsErr && subsData) {
            const subscriptionRevenue = subsData.reduce((sum: number, sub: any) => {
              const amount = Number(sub.total_value || sub.amount || 0);
              return sum + amount;
            }, 0);
            
            revenueBreakdown.subscriptionSales = subscriptionRevenue;
            totalRevenue += subscriptionRevenue;

            // Add subscription payment methods to breakdown
            subsData.forEach((sub: any) => {
              const amount = Number(sub.total_value || sub.amount || 0);
              const paymentMode = sub.source_payment_method || 'Unknown';
              revenueBreakdown.paymentMethodBreakdown[paymentMode] = 
                (revenueBreakdown.paymentMethodBreakdown[paymentMode] || 0) + amount;
            });
            
            // Update available payment methods
            const newPaymentMethods = subsData.map(sub => sub.source_payment_method).filter(Boolean);
            setAvailablePaymentMethods(prev => Array.from(new Set([...prev, ...newPaymentMethods])));
          }
        } catch (error) {
          console.error('Error loading subscription revenue:', error);
        }

        // 3. Credit top-ups from credit_transactions
        try {
          const { data: creditData, error: creditErr } = await supabase
            .from('credit_transactions')
            .select('id, amount, transaction_type, created_at, credit_account_id')
            .eq('transaction_type', 'topup')
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd);
          
          if (!creditErr && creditData) {
            // For now, include all credit transactions since location filtering isn't available
            // TODO: Add proper location filtering when credit_accounts table is updated
            const creditRevenue = creditData.reduce((sum: number, credit: any) => {
              return sum + Number(credit.amount || 0);
            }, 0);
            
            revenueBreakdown.creditTopups = creditRevenue;
            totalRevenue += creditRevenue;
          }
        } catch (error) {
          console.error('Error loading credit revenue:', error);
        }

        // Calculate profit (Revenue - Expenses - Salaries)
        const totalCosts = totalExpenses + totalSalaries;
        const grossProfit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        setRevenueReport({
          totalRevenue,
          grossProfit,
          profitMargin,
          totalCosts,
          ...revenueBreakdown
        });

        // Previous month revenue for comparison
        try {
          const { data: prevLogsData } = await supabase
            .from('logs-man')
            .select('Amount, Total')
            .eq('location_id', selectedLocationId)
            .gte('entry_time', prevStart)
            .lte('entry_time', prevEnd)
            .not('Amount', 'is', null);
          
          const { data: prevSubsData } = await supabase
            .from('subscription_purchases')
            .select('total_value, amount')
            .eq('location_id', selectedLocationId)
            .gte('created_at', prevStart)
            .lte('created_at', prevEnd)
            .not('total_value', 'is', null);

          const prevCarWash = (prevLogsData || []).reduce((sum: number, log: any) => 
            sum + Number(log.Total || log.Amount || 0), 0);
          const prevSubs = (prevSubsData || []).reduce((sum: number, sub: any) => 
            sum + Number(sub.total_value || sub.amount || 0), 0);
          
          setPrevRevenueTotal(prevCarWash + prevSubs);
        } catch (error) {
          console.error('Error loading previous revenue:', error);
          setPrevRevenueTotal(0);
        }
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
    labels: expenseReport?.categoryBreakdown?.map((cat: any) => cat.category) || ['No Data'],
    datasets: [
      {
        label: 'Expense Amount',
        data: expenseReport?.categoryBreakdown?.map((cat: any) => cat.total) || [0],
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

  // Chart data for revenue breakdown
  const revenueChartData = {
    labels: ['Car Wash Services', 'Subscription Sales', 'Credit Top-ups'],
    datasets: [
      {
        data: [
          revenueReport?.carWashServices || 0,
          revenueReport?.subscriptionSales || 0,
          revenueReport?.creditTopups || 0
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(234, 88, 12, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(234, 88, 12, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Chart data for profit analysis
  const profitChartData = {
    labels: ['Revenue', 'Expenses', 'Salaries', 'Profit'],
    datasets: [
      {
        label: 'Amount (₹)',
        data: [
          revenueReport?.totalRevenue || 0,
          expenseReport?.totalExpenses || 0,
          salaryReport?.totalSalaries || 0,
          revenueReport?.grossProfit || 0
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(220, 38, 38, 0.8)',
          'rgba(234, 88, 12, 0.8)',
          revenueReport?.grossProfit >= 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(220, 38, 38, 1)',
          'rgba(234, 88, 12, 1)',
          revenueReport?.grossProfit >= 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
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
    scales: {
      x: {
        display: false
      },
      y: {
        display: false
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Comprehensive insights into your business finances
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-border shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* Primary Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Month</label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full border border-border rounded-md px-3 py-2 bg-white text-sm"
                >
                  <option value="combined">Combined Report</option>
                  <option value="salary">Salary Report</option>
                  <option value="expense">Expense Report</option>
                </select>
              </div>
              
              {/* Export buttons - full width on mobile */}
              <div className="sm:col-span-2 lg:col-span-1 space-y-2 sm:space-y-0 sm:flex sm:gap-2 lg:block lg:space-y-2">
                <Button variant="outline" className="w-full sm:flex-1 lg:w-full" onClick={exportPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export </span>PDF
                </Button>
                <Button variant="outline" className="w-full sm:flex-1 lg:w-full" onClick={exportExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export </span>Excel
                </Button>
              </div>
            </div>

            {/* Secondary Filters - Salary */}
            {(reportType !== 'expense') && (
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium text-foreground mb-3">Salary Filters</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Filter by Role</label>
                    <select 
                      value={salaryFilterRole} 
                      onChange={(e) => setSalaryFilterRole(e.target.value)} 
                      className="w-full border border-border rounded-md px-3 py-2 bg-white text-sm"
                    >
                      <option value="">All Roles</option>
                      {availableRoles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Filter by Payment Mode</label>
                    <select 
                      value={salaryFilterMode} 
                      onChange={(e) => setSalaryFilterMode(e.target.value)} 
                      className="w-full border border-border rounded-md px-3 py-2 bg-white text-sm"
                    >
                      <option value="">All Modes</option>
                      {availableModes.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-sm text-muted-foreground mb-2">Filter by Advances</label>
                    <select 
                      value={salaryFilterAdv} 
                      onChange={(e) => setSalaryFilterAdv(e.target.value as any)} 
                      className="w-full border border-border rounded-md px-3 py-2 bg-white text-sm"
                    >
                      <option value="all">All Staff</option>
                      <option value="with">With Advances</option>
                      <option value="without">Without Advances</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Secondary Filters - Revenue */}
            {(reportType === 'combined') && revenueReport && (
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium text-foreground mb-3">Revenue Filters</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Filter by Service Type</label>
                    <select 
                      value={revenueFilterService} 
                      onChange={(e) => setRevenueFilterService(e.target.value)} 
                      className="w-full border border-border rounded-md px-3 py-2 bg-white text-sm"
                    >
                      <option value="">All Services</option>
                      {availableServices.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Filter by Payment Method</label>
                    <select 
                      value={revenueFilterPayment} 
                      onChange={(e) => setRevenueFilterPayment(e.target.value)} 
                      className="w-full border border-border rounded-md px-3 py-2 bg-white text-sm"
                    >
                      <option value="">All Payment Methods</option>
                      {availablePaymentMethods.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

      {/* Revenue & Profit Section */}
      {revenueReport && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="metric-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-success">
                  {formatCurrency(revenueReport.totalRevenue || 0)}
                </p>
                <p className="text-xs text-success mt-1 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {(() => {
                    const prev = prevRevenueTotal || 0;
                    const curr = revenueReport.totalRevenue || 0;
                    const pct = prev > 0 ? (((curr - prev) / prev) * 100) : 0;
                    return `${pct.toFixed(1)}% from last month`;
                  })()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </div>
          
          <div className="metric-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <p className={`text-xl font-bold ${revenueReport.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(revenueReport.grossProfit || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Margin: {(revenueReport.profitMargin || 0).toFixed(1)}%
                </p>
              </div>
              {revenueReport.grossProfit >= 0 ? (
                <TrendingUp className="h-8 w-8 text-success" />
              ) : (
                <TrendingDown className="h-8 w-8 text-destructive" />
              )}
            </div>
          </div>
          
          <div className="metric-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Car Wash Revenue</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(revenueReport.carWashServices || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {revenueReport.totalRevenue > 0 ? 
                    `${((revenueReport.carWashServices / revenueReport.totalRevenue) * 100).toFixed(1)}% of total` 
                    : '0% of total'}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="metric-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subscription Sales</p>
                <p className="text-xl font-bold text-warning">
                  {formatCurrency(revenueReport.subscriptionSales || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {revenueReport.totalRevenue > 0 ? 
                    `${((revenueReport.subscriptionSales / revenueReport.totalRevenue) * 100).toFixed(1)}% of total` 
                    : '0% of total'}
                </p>
              </div>
              <IndianRupee className="h-8 w-8 text-warning" />
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {(reportType === 'expense' || reportType === 'combined') && (
          <div className="bg-white rounded-lg border border-border shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
              Expense Breakdown - {formatDate(selectedMonth + '-01')}
            </h3>
            <div className="h-48 sm:h-64">
              {expenseReport?.categoryBreakdown && expenseReport.categoryBreakdown.length > 0 ? (
                <Doughnut data={expenseChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p className="text-sm">No expense data available</p>
                    <p className="text-xs mt-1">for {formatDate(selectedMonth + '-01')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(reportType === 'combined') && (
          <div className="bg-white rounded-lg border border-border shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
              Financial Overview - {formatDate(selectedMonth + '-01')}
            </h3>
            <div className="h-48 sm:h-64">
              <Bar data={comparisonChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {revenueReport && (reportType === 'combined') && (
          <div className="bg-white rounded-lg border border-border shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
              Revenue Sources - {formatDate(selectedMonth + '-01')}
            </h3>
            <div className="h-48 sm:h-64">
              <Doughnut data={revenueChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {revenueReport && (reportType === 'combined') && (
          <div className="bg-white rounded-lg border border-border shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
              Profit Analysis - {formatDate(selectedMonth + '-01')}
            </h3>
            <div className="h-48 sm:h-64">
              <Bar data={profitChartData} options={chartOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Detailed Reports */}
      {(reportType === 'salary' || reportType === 'combined') && salaryReport && (
        <div className="bg-white rounded-lg border border-border shadow-sm">
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              Salary Report - {formatDate(selectedMonth + '-01')}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 sm:p-4 font-medium text-foreground text-xs sm:text-sm">Staff Name</th>
                  <th className="text-left p-2 sm:p-4 font-medium text-foreground text-xs sm:text-sm">Role</th>
                  <th className="text-left p-2 sm:p-4 font-medium text-foreground text-xs sm:text-sm">Payment Mode</th>
                  <th className="text-right p-2 sm:p-4 font-medium text-foreground text-xs sm:text-sm">Monthly Salary</th>
                  <th className="text-right p-2 sm:p-4 font-medium text-foreground text-xs sm:text-sm">Advances</th>
                  <th className="text-right p-2 sm:p-4 font-medium text-foreground text-xs sm:text-sm">Payable</th>
                  <th className="text-center p-2 sm:p-4 font-medium text-foreground text-xs sm:text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {salaryReport.staffReports
                  .filter((s: any) => !salaryFilterRole || (s.role || '') === salaryFilterRole)
                  .filter((s: any) => !salaryFilterMode || (s.paymentMode || '') === salaryFilterMode)
                  .filter((s: any) => salaryFilterAdv === 'all' || (salaryFilterAdv === 'with' ? (s.totalAdvances || 0) > 0 : (s.totalAdvances || 0) === 0))
                  .map((staff: any) => (
                  <tr key={staff.id} className="border-b border-border">
                    <td className="p-2 sm:p-4 font-medium text-foreground text-xs sm:text-sm">{staff.name}</td>
                    <td className="p-2 sm:p-4 text-muted-foreground text-xs sm:text-sm">{staff.role}</td>
                    <td className="p-2 sm:p-4 text-muted-foreground text-xs sm:text-sm">{staff.paymentMode}</td>
                    <td className="p-2 sm:p-4 text-right text-foreground text-xs sm:text-sm">
                      {formatCurrency(staff.monthlySalary)}
                    </td>
                    <td className="p-2 sm:p-4 text-right text-warning text-xs sm:text-sm">
                      {formatCurrency(staff.totalAdvances)}
                    </td>
                    <td className="p-2 sm:p-4 text-right text-success font-semibold text-xs sm:text-sm">
                      {formatCurrency(staff.payableSalary)}
                    </td>
                    <td className="p-2 sm:p-4 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Calculated
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/50">
                <tr>
                  <td className="p-2 sm:p-4 font-semibold text-foreground text-xs sm:text-sm" colSpan={3}>Total</td>
                  <td className="p-2 sm:p-4 text-right font-semibold text-foreground text-xs sm:text-sm">
                    {formatCurrency(salaryReport.totalSalaries)}
                  </td>
                  <td className="p-2 sm:p-4 text-right font-semibold text-warning text-xs sm:text-sm">
                    {formatCurrency(salaryReport.totalAdvances)}
                  </td>
                  <td className="p-2 sm:p-4 text-right font-semibold text-success text-xs sm:text-sm">
                    {formatCurrency(salaryReport.totalPayable)}
                  </td>
                  <td className="p-2 sm:p-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Expense Category Summary */}
      {(reportType === 'expense' || reportType === 'combined') && expenseReport && (
        <div className="bg-white rounded-lg border border-border shadow-sm">
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              Expense Summary - {formatDate(selectedMonth + '-01')}
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {expenseReport.categoryBreakdown.map((category: any) => {
                const percentage = expenseReport.totalExpenses > 0 
                  ? (category.total / expenseReport.totalExpenses) * 100 
                  : 0;
                
                return (
                  <div key={category.category} className="p-3 sm:p-4 border border-border rounded-lg">
                    <h4 className="font-medium text-foreground text-sm sm:text-base">{category.category}</h4>
                    <p className="text-lg sm:text-2xl font-bold text-destructive mt-2">
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

      {/* Revenue Breakdown */}
      {revenueReport && (reportType === 'combined') && (
        <div className="bg-white rounded-lg border border-border shadow-sm">
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              Revenue Analysis - {formatDate(selectedMonth + '-01')}
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Service Revenue Breakdown */}
              <div>
                <h4 className="font-medium text-foreground mb-3 sm:mb-4 text-sm sm:text-base">Revenue by Service Type</h4>
                <div className="space-y-2 sm:space-y-3">
                  {Object.entries(revenueReport.serviceBreakdown || {})
                    .filter(([service]) => !revenueFilterService || service === revenueFilterService)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([service, amount]) => {
                      const percentage = revenueReport.totalRevenue > 0 
                        ? ((amount as number) / revenueReport.totalRevenue) * 100 
                        : 0;
                      
                      return (
                        <div key={service} className="flex items-center justify-between p-2 sm:p-3 border border-border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-xs sm:text-sm truncate">{service}</p>
                            <p className="text-xs text-muted-foreground">
                              {percentage.toFixed(1)}% of total revenue
                            </p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="font-bold text-success text-xs sm:text-sm">{formatCurrency(amount as number)}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div>
                <h4 className="font-medium text-foreground mb-3 sm:mb-4 text-sm sm:text-base">Revenue by Payment Method</h4>
                <div className="space-y-2 sm:space-y-3">
                  {Object.entries(revenueReport.paymentMethodBreakdown || {})
                    .filter(([method]) => !revenueFilterPayment || method === revenueFilterPayment)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([method, amount]) => {
                      const percentage = revenueReport.totalRevenue > 0 
                        ? ((amount as number) / revenueReport.totalRevenue) * 100 
                        : 0;
                      
                      return (
                        <div key={method} className="flex items-center justify-between p-2 sm:p-3 border border-border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-xs sm:text-sm truncate">{method}</p>
                            <p className="text-xs text-muted-foreground">
                              {percentage.toFixed(1)}% of total revenue
                            </p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="font-bold text-primary text-xs sm:text-sm">{formatCurrency(amount as number)}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Profit Summary */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 border border-border rounded-lg bg-muted/30">
              <h4 className="font-medium text-foreground mb-3 text-sm sm:text-base">Profit Summary</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-sm sm:text-lg font-bold text-success">{formatCurrency(revenueReport.totalRevenue)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Costs</p>
                  <p className="text-sm sm:text-lg font-bold text-destructive">{formatCurrency(revenueReport.totalCosts)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Gross Profit</p>
                  <p className={`text-sm sm:text-lg font-bold ${revenueReport.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(revenueReport.grossProfit)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Profit Margin</p>
                  <p className={`text-sm sm:text-lg font-bold ${revenueReport.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {revenueReport.profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;