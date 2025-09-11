import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Plus, 
  Search, 
  Filter, 
  Receipt, 
  IndianRupee, 
  Calendar,
  Edit,
  Trash2,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExpenseCategory {
  id: string;
  name: string;
}

interface ExpenseRecord {
  id: string;
  date: string;
  categoryId: string;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | string;
  notes?: string;
  isMonthly?: boolean;
}

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setLoading(true);
        
        // Optional Supabase loading (backend wiring can be added later)
        // Expenses by month
        try {
          const monthStart = `${selectedMonth}-01`;
          const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
            .toISOString()
            .slice(0, 10);

          const { data: expData, error: expErr } = await supabase
            .from('expenses')
            .select('id,date,category_id,amount,payment_mode,notes,is_monthly')
            .gte('date', monthStart)
            .lte('date', monthEnd)
            .order('date', { ascending: false });

          if (!expErr && expData) {
            setExpenses(
              expData.map((e: any) => ({
                id: e.id,
                date: e.date,
                categoryId: e.category_id,
                amount: e.amount,
                paymentMode: e.payment_mode,
                notes: e.notes || '',
                isMonthly: e.is_monthly,
              }))
            );
          } else {
            setExpenses([]);
          }
        } catch (_) {
          setExpenses([]);
        }

        // Categories
        try {
          const { data: catData, error: catErr } = await supabase
            .from('expense_categories')
            .select('id,name')
            .order('name');

          if (!catErr && catData) {
            setExpenseCategories(catData as ExpenseCategory[]);
          } else {
            setExpenseCategories([]);
          }
        } catch (_) {
          setExpenseCategories([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadExpenses();
  }, [selectedMonth]);

  const filteredExpenses = expenses.filter(expense => {
    const category = expenseCategories.find(c => c.id === expense.categoryId);
    const categoryName = category?.name || '';
    
    const matchesSearch = categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || expense.categoryId === filterCategory;
    const matchesMode = !filterMode || expense.paymentMode === filterMode;
    
    return matchesSearch && matchesCategory && matchesMode;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const cashExpenses = filteredExpenses.filter(e => e.paymentMode === 'Cash').reduce((sum, e) => sum + (e.amount || 0), 0);
  const upiExpenses = filteredExpenses.filter(e => e.paymentMode === 'UPI').reduce((sum, e) => sum + (e.amount || 0), 0);

  const formatCurrency = (amount: number) => 
    `₹${(amount || 0).toLocaleString('en-IN')}`;

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-IN');

  const getCategoryName = (categoryId: string) => 
    expenseCategories.find(c => c.id === categoryId)?.name || 'Unknown';

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
          <h1 className="text-3xl font-bold text-foreground">Expense Management</h1>
          <p className="text-muted-foreground">
            Track and manage your business expenses
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="text-muted-foreground">
            <Settings className="h-4 w-4 mr-2" />
            Categories
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Recent Expenses Card */}
      <div className="business-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Expenses</h3>
        {/* Replace with RecentExpensesCard when available */}
        <div className="text-sm text-muted-foreground">Recent expenses will appear here.</div>
      </div>

      {/* Expense Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold text-destructive">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <Receipt className="h-8 w-8 text-destructive" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cash Payments</p>
              <p className="text-xl font-bold text-warning">
                {formatCurrency(cashExpenses)}
              </p>
            </div>
            <IndianRupee className="h-8 w-8 text-warning" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">UPI Payments</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(upiExpenses)}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold text-foreground">
                {filteredExpenses.length}
              </p>
            </div>
            <Receipt className="h-8 w-8 text-success" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="business-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="form-input"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="form-select pl-10 pr-8 w-full"
            >
              <option value="">All Categories</option>
              {expenseCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="form-select w-full"
            >
              <option value="">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="table-container">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Expense Records</h3>
          <p className="text-sm text-muted-foreground">
            {filteredExpenses.length} expenses • Total: {formatCurrency(totalExpenses)}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left p-4 font-medium text-foreground">Date</th>
                <th className="text-left p-4 font-medium text-foreground">Category</th>
                <th className="text-right p-4 font-medium text-foreground">Amount</th>
                <th className="text-center p-4 font-medium text-foreground">Mode</th>
                <th className="text-left p-4 font-medium text-foreground">Notes</th>
                <th className="text-center p-4 font-medium text-foreground">Type</th>
                <th className="text-center p-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-border table-row-hover">
                  <td className="p-4 text-foreground font-medium">
                    {formatDate(expense.date)}
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {getCategoryName(expense.categoryId)}
                    </span>
                  </td>
                  <td className="p-4 text-right text-destructive font-semibold">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`status-badge ${
                      expense.paymentMode === 'Cash' ? 'status-badge-warning' : 'status-badge-success'
                    }`}>
                      {expense.paymentMode}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground max-w-xs truncate">
                    {expense.notes || '-'}
                  </td>
                  <td className="p-4 text-center">
                    {expense.isMonthly ? (
                      <span className="status-badge-success">Monthly</span>
                    ) : (
                      <span className="status-badge">One-time</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredExpenses.length === 0 && (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No expenses found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterCategory || filterMode 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Start tracking your expenses by adding your first entry.'}
            </p>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        )}
      </div>

      {/* Category Summary */}
      <div className="business-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Category Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {expenseCategories.map(category => {
            const categoryTotal = filteredExpenses
              .filter(e => e.categoryId === category.id)
              .reduce((sum, e) => sum + (e.amount || 0), 0);
            
            const percentage = totalExpenses > 0 ? (categoryTotal / totalExpenses) * 100 : 0;
            
            return (
              <div key={category.id} className="p-4 border border-border rounded-lg">
                <h4 className="font-medium text-foreground">{category.name}</h4>
                <p className="text-2xl font-bold text-destructive mt-2">
                  {formatCurrency(categoryTotal)}
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-3">
                  <div 
                    className="bg-destructive h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {percentage.toFixed(1)}% of total
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExpensesPage;