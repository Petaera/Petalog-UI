import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportType, setReportType] = useState<'salary' | 'expense' | 'combined'>('combined');
  const [salaryReport, setSalaryReport] = useState<any>(null);
  const [expenseReport, setExpenseReport] = useState<any>(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        // TODO: Wire up backend later. For now, set mock-safe structures
        const mockSalary = {
          totalSalaries: 0,
          totalAdvances: 0,
          totalPayable: 0,
          staffReports: [],
        };
        const mockExpense = {
          totalExpenses: 0,
          categoryBreakdown: [] as { category: string; total: number }[],
        };
        setSalaryReport(mockSalary);
        setExpenseReport(mockExpense);
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [selectedMonth]);

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
            const value = context.parsed || context.raw;
            return `₹${value.toLocaleString('en-IN')}`;
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
        
        <div className="flex gap-2">
          <Button variant="outline" className="text-muted-foreground">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" className="text-muted-foreground">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="business-card p-6">
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
              className="form-select w-full"
            >
              <option value="combined">Combined Report</option>
              <option value="salary">Salary Report</option>
              <option value="expense">Expense Report</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button className="btn-primary w-full">
              <Filter className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Salaries</p>
              <p className="text-xl font-bold text-success">
                {formatCurrency(salaryReport?.totalSalaries || 0)}
              </p>
              <p className="text-xs text-success mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +5.2% from last month
              </p>
            </div>
            <Users className="h-8 w-8 text-success" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Advances</p>
              <p className="text-xl font-bold text-warning">
                {formatCurrency(salaryReport?.totalAdvances || 0)}
              </p>
              <p className="text-xs text-destructive mt-1 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                -12.4% from last month
              </p>
            </div>
            <IndianRupee className="h-8 w-8 text-warning" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold text-destructive">
                {formatCurrency(expenseReport?.totalExpenses || 0)}
              </p>
              <p className="text-xs text-destructive mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +3.8% from last month
              </p>
            </div>
            <Receipt className="h-8 w-8 text-destructive" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Monthly Cost</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency((salaryReport?.totalSalaries || 0) + (expenseReport?.totalExpenses || 0))}
              </p>
              <p className="text-xs text-warning mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +4.1% from last month
              </p>
            </div>
            <FileText className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="business-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Expense Breakdown - {formatDate(selectedMonth + '-01')}
          </h3>
          <div className="h-64">
            <Doughnut data={expenseChartData} options={chartOptions} />
          </div>
        </div>

        {/* Financial Overview */}
        <div className="business-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Financial Overview - {formatDate(selectedMonth + '-01')}
          </h3>
          <div className="h-64">
            <Bar data={comparisonChartData} options={chartOptions} />
          </div>
        </div>
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
                  <th className="text-right p-4 font-medium text-foreground">Monthly Salary</th>
                  <th className="text-right p-4 font-medium text-foreground">Advances</th>
                  <th className="text-right p-4 font-medium text-foreground">Payable</th>
                  <th className="text-center p-4 font-medium text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {salaryReport.staffReports.map((staff: any) => (
                  <tr key={staff.id} className="border-b border-border">
                    <td className="p-4 font-medium text-foreground">{staff.name}</td>
                    <td className="p-4 text-muted-foreground">{staff.role}</td>
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