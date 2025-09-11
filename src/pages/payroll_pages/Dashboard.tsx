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

interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load staff data
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('is_active', true);
        
        if (staffError) throw staffError;
        setStaff(staffData || []);
        
        // Load expenses data (placeholder - you'll need to create expenses table)
        // const { data: expenseData, error: expenseError } = await supabase
        //   .from('expenses')
        //   .select('*');
        
        // if (expenseError) throw expenseError;
        // setExpenses(expenseData || []);
        
        // Mock expense categories for now
        setExpenseCategories([
          { id: '1', name: 'Office Supplies' },
          { id: '2', name: 'Utilities' },
          { id: '3', name: 'Marketing' },
          { id: '4', name: 'Travel' },
          { id: '5', name: 'Other' }
        ]);
        
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

    loadData();
  }, []);

  // Calculate metrics
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.isActive).length;
  const totalSalaries = staff.reduce((sum, s) => sum + (s.monthlySalary || 0), 0);
  const totalPayable = staff.reduce((sum, s) => sum + (s.payableSalary || 0), 0);
  const totalAdvances = staff.reduce((sum, s) => sum + (s.totalAdvances || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingAttendance = staff.filter(s => (s.presentDays || 0) + (s.absences || 0) < 25).length;

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

      {/* Quick Actions Alert */}
      {pendingAttendance > 0 && (
        <div className="bg-warning/10 p-4 border-l-4 border-warning rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-warning mr-3" />
            <div>
              <h3 className="text-sm font-medium text-warning">Attendance Pending</h3>
              <p className="text-xs text-warning mt-1">
                {pendingAttendance} staff members have incomplete attendance for this month.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Total Staff"
          value={`${activeStaff}/${totalStaff}`}
          icon={Users}
          color="default"
          change={{ value: 8.2, type: 'positive' }}
        />
        
        <MetricCard
          title="Monthly Salaries"
          value={totalSalaries}
          icon={IndianRupee}
          color="success"
          change={{ value: 3.1, type: 'positive' }}
        />
        
        <MetricCard
          title="Total Advances"
          value={totalAdvances}
          icon={TrendingUp}
          color="warning"
          change={{ value: 12.5, type: 'negative' }}
        />
        
        <MetricCard
          title="Monthly Expenses"
          value={totalExpenses}
          icon={Receipt}
          color="danger"
          change={{ value: 5.4, type: 'positive' }}
        />
        
        <MetricCard
          title="Payable Salaries"
          value={totalPayable}
          icon={Calendar}
          color="success"
          change={{ value: 2.8, type: 'neutral' }}
        />
        
        <MetricCard
          title="Net Monthly Cost"
          value={totalSalaries + totalExpenses}
          icon={Receipt}
          color="danger"
          change={{ value: 4.2, type: 'positive' }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Expense Breakdown</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Charts coming soon</p>
              <p className="text-sm text-muted-foreground">Visual expense breakdown will be available here</p>
            </div>
          </div>
        </Card>

        {/* Monthly Overview */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Overview</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Charts coming soon</p>
              <p className="text-sm text-muted-foreground">Monthly trends will be displayed here</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">Latest 5 staff payments and expenses</p>
        </div>
        <div className="p-6">
          <RecentActivityLogs />
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;