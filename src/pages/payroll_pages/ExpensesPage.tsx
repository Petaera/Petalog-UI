import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
// useUpiAccounts imported once below
import { 
  Plus, 
  Search, 
  Filter, 
  Receipt, 
  IndianRupee, 
  Calendar,
  Edit,
  Trash2,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpiAccounts } from '@/hooks/useUpiAccounts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';

interface ExpenseCategory {
  id: string;
  name: string;
  monthlyBudget?: number | null;
  recurrenceType?: 'One-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Bi-Monthly' | 'Quarterly' | 'Yearly' | null;
  recurrenceInterval?: number | null;
  defaultRecurrenceEnd?: string | null;
}

interface ExpenseRecord {
  id: string;
  date: string;
  categoryId: string;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | string;
  notes?: string;
  isMonthly?: boolean;
  recurrenceType?: 'One-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Bi-Monthly' | 'Quarterly' | 'Yearly' | null;
  recurrenceInterval?: number | null;
  recurrenceEndDate?: string | null;
  nextDueDate?: string | null;
}

const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const selectedLocationId = useSelectedLocation();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Add Expense form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [formCategory, setFormCategory] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formMode, setFormMode] = useState<'Cash' | 'UPI' | ''>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formIsMonthly, setFormIsMonthly] = useState<boolean>(false);
  const [formMonthlyDays, setFormMonthlyDays] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [selectedUpiAccountId, setSelectedUpiAccountId] = useState<string>('');
  const [formRepeatDaily, setFormRepeatDaily] = useState<boolean>(false);
  // Recurrence form state
  const [formRecurrenceType, setFormRecurrenceType] = useState<'One-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Bi-Monthly' | 'Quarterly' | 'Yearly'>('One-time');
  const [formRecurrenceInterval, setFormRecurrenceInterval] = useState<string>('1');
  const [formRecurrenceEndDate, setFormRecurrenceEndDate] = useState<string>('');
  // Manage Categories state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [manageCategories, setManageCategories] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catBudget, setCatBudget] = useState<string>('');
  const [catRecurrenceType, setCatRecurrenceType] = useState<'One-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Bi-Monthly' | 'Quarterly' | 'Yearly'>('One-time');
  const [catRecurrenceInterval, setCatRecurrenceInterval] = useState<string>('1');
  const [catDefaultRecurrenceEnd, setCatDefaultRecurrenceEnd] = useState<string>('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryDesc, setEditingCategoryDesc] = useState('');
  const [editingCategoryBudget, setEditingCategoryBudget] = useState<string>('');
  const [editingCategoryRecurrenceType, setEditingCategoryRecurrenceType] = useState<'One-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Bi-Monthly' | 'Quarterly' | 'Yearly'>('One-time');
  const [editingCategoryRecurrenceInterval, setEditingCategoryRecurrenceInterval] = useState<string>('1');
  const [editingCategoryDefaultRecurrenceEnd, setEditingCategoryDefaultRecurrenceEnd] = useState<string>('');

  // UPI accounts for selected branch (used when Payment Mode is UPI)
  const { accounts: upiAccounts } = useUpiAccounts(selectedLocationId);

  // Edit Expense state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editMode, setEditMode] = useState<'Cash' | 'UPI' | ''>('');
  const [editUpiAccountId, setEditUpiAccountId] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);
  // Edit recurrence state
  const [editRecurrenceType, setEditRecurrenceType] = useState<'One-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Bi-Monthly' | 'Quarterly' | 'Yearly'>('One-time');
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState<string>('1');
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState<string>('');
  // Delete dialogs state
  const [deleteExpenseOpen, setDeleteExpenseOpen] = useState(false);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);
  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [categoryDeleteCount, setCategoryDeleteCount] = useState(0);
  const [categoryConfirmName, setCategoryConfirmName] = useState('');
  // Add Expense dialog
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);


  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setLoading(true);
        
        // Only load if we have a selected location
        if (!selectedLocationId) {
          setExpenses([]);
          setExpenseCategories([]);
          setLoading(false);
          return;
        }
        
        // Expenses by month for selected branch
        try {
          const monthStart = `${selectedMonth}-01`;
          const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
            .toISOString()
            .slice(0, 10);

          // First try with new recurrence fields
          let expQuery = supabase
            .from('expenses')
            .select('id,date,category_id,amount,payment_mode,notes,is_monthly,branch_id,recurrence_type,recurrence_interval,recurrence_end_date,next_due_date')
            .gte('date', monthStart)
            .lte('date', monthEnd)
            .eq('branch_id', selectedLocationId)
            .order('date', { ascending: false });
          const { data: expData, error: expErr } = await expQuery as any;

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
                recurrenceType: e.recurrence_type || null,
                recurrenceInterval: e.recurrence_interval || null,
                recurrenceEndDate: e.recurrence_end_date || null,
                nextDueDate: e.next_due_date || null,
              }))
            );
          } else {
            // Fallback to old query without recurrence fields
            let fallbackQuery = supabase
              .from('expenses')
              .select('id,date,category_id,amount,payment_mode,notes,is_monthly,branch_id')
              .gte('date', monthStart)
              .lte('date', monthEnd)
              .eq('branch_id', selectedLocationId)
              .order('date', { ascending: false });
            const { data: fallbackData, error: fallbackErr } = await fallbackQuery as any;
            
            if (!fallbackErr && fallbackData) {
              setExpenses(
                fallbackData.map((e: any) => ({
                  id: e.id,
                  date: e.date,
                  categoryId: e.category_id,
                  amount: e.amount,
                  paymentMode: e.payment_mode,
                  notes: e.notes || '',
                  isMonthly: e.is_monthly,
                  recurrenceType: null,
                  recurrenceInterval: null,
                  recurrenceEndDate: null,
                  nextDueDate: null,
                }))
              );
            } else {
              setExpenses([]);
            }
          }
        } catch (_) {
          setExpenses([]);
        }

        // Categories for selected branch
        try {
          // First try with new recurrence fields
          let catQuery = supabase
            .from('expense_categories')
            .select('id,name,branch_id,monthly_budget,recurrence_type,recurrence_interval,default_recurrence_end')
            .eq('branch_id', selectedLocationId)
            .order('name');
          const { data: catData, error: catErr } = await catQuery as any;

          if (!catErr && catData) {
            setExpenseCategories((catData as any[]).map(r => ({ 
              id: r.id, 
              name: r.name, 
              monthlyBudget: r.monthly_budget,
              recurrenceType: r.recurrence_type || null,
              recurrenceInterval: r.recurrence_interval || null,
              defaultRecurrenceEnd: r.default_recurrence_end || null
            })));
          } else {
            // Fallback to old query without recurrence fields
            let fallbackQuery = supabase
              .from('expense_categories')
              .select('id,name,branch_id,monthly_budget')
              .eq('branch_id', selectedLocationId)
              .order('name');
            const { data: fallbackData, error: fallbackErr } = await fallbackQuery as any;
            
            if (!fallbackErr && fallbackData) {
              setExpenseCategories((fallbackData as any[]).map(r => ({ 
                id: r.id, 
                name: r.name, 
                monthlyBudget: r.monthly_budget,
                recurrenceType: null,
                recurrenceInterval: null,
                defaultRecurrenceEnd: null
              })));
            } else {
              setExpenseCategories([]);
            }
          }
        } catch (_) {
          setExpenseCategories([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadExpenses();
  }, [selectedMonth, selectedLocationId]);

  // (already loaded above)

  const reloadCategories = async () => {
    if (!selectedLocationId) return;
    try {
      // First try with new recurrence fields
      let catQuery = supabase
        .from('expense_categories')
        .select('id,name,branch_id,monthly_budget,recurrence_type,recurrence_interval,default_recurrence_end')
        .eq('branch_id', selectedLocationId)
        .order('name');
      const { data: catData, error: catErr } = await catQuery as any;
      
      if (!catErr && catData) {
        setExpenseCategories((catData as any[]).map(r => ({ 
          id: r.id, 
          name: r.name, 
          monthlyBudget: r.monthly_budget,
          recurrenceType: r.recurrence_type || null,
          recurrenceInterval: r.recurrence_interval || null,
          defaultRecurrenceEnd: r.default_recurrence_end || null
        })));
      } else {
        // Fallback to old query without recurrence fields
        let fallbackQuery = supabase
          .from('expense_categories')
          .select('id,name,branch_id,monthly_budget')
          .eq('branch_id', selectedLocationId)
          .order('name');
        const { data: fallbackData, error: fallbackErr } = await fallbackQuery as any;
        
        if (!fallbackErr && fallbackData) {
          setExpenseCategories((fallbackData as any[]).map(r => ({ 
            id: r.id, 
            name: r.name, 
            monthlyBudget: r.monthly_budget,
            recurrenceType: null,
            recurrenceInterval: null,
            defaultRecurrenceEnd: null
          })));
        }
      }
    } catch (_) {}
  };

  const reloadExpenses = async () => {
    if (!selectedLocationId) return;
    try {
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      
      // First try with new recurrence fields
      let expQuery = supabase
        .from('expenses')
        .select('id,date,category_id,amount,payment_mode,notes,is_monthly,branch_id,recurrence_type,recurrence_interval,recurrence_end_date,next_due_date')
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('branch_id', selectedLocationId)
        .order('date', { ascending: false });
      const { data: expData, error: expErr } = await expQuery as any;
      
      if (!expErr && expData) {
        setExpenses(
          (expData || []).map((e: any) => ({
            id: e.id,
            date: e.date,
            categoryId: e.category_id,
            amount: e.amount,
            paymentMode: e.payment_mode,
            notes: e.notes || '',
            isMonthly: e.is_monthly,
            recurrenceType: e.recurrence_type || null,
            recurrenceInterval: e.recurrence_interval || null,
            recurrenceEndDate: e.recurrence_end_date || null,
            nextDueDate: e.next_due_date || null,
          }))
        );
      } else {
        // Fallback to old query without recurrence fields
        let fallbackQuery = supabase
          .from('expenses')
          .select('id,date,category_id,amount,payment_mode,notes,is_monthly,branch_id')
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .eq('branch_id', selectedLocationId)
          .order('date', { ascending: false });
        const { data: fallbackData, error: fallbackErr } = await fallbackQuery as any;
        
        if (!fallbackErr && fallbackData) {
          setExpenses(
            (fallbackData || []).map((e: any) => ({
              id: e.id,
              date: e.date,
              categoryId: e.category_id,
              amount: e.amount,
              paymentMode: e.payment_mode,
              notes: e.notes || '',
              isMonthly: e.is_monthly,
              recurrenceType: null,
              recurrenceInterval: null,
              recurrenceEndDate: null,
              nextDueDate: null,
            }))
          );
        }
      }
    } catch (_) {}
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().slice(0,10));
    setFormCategory('');
    setFormAmount('');
    setFormMode('');
    setFormNotes('');
    setFormIsMonthly(false);
    setFormMonthlyDays('');
    setFormRepeatDaily(false);
    setFormRecurrenceType('One-time');
    setFormRecurrenceInterval('1');
    setFormRecurrenceEndDate('');
  };

  const saveExpense = async () => {
    if (!selectedLocationId) { toast({ title: 'Select branch', description: 'Choose a branch first.', variant: 'destructive' }); return; }
    if (!formCategory || !formAmount || !formMode || !formDate) { toast({ title: 'Missing fields', description: 'Fill all required fields.', variant: 'destructive' }); return; }
    if (formMode === 'UPI' && !selectedUpiAccountId) { toast({ title: 'Select UPI account', description: 'Choose a UPI account for UPI payments.', variant: 'destructive' }); return; }
    try {
      setSaving(true);
      const buildNotes = () => {
        if (formMode === 'UPI' && selectedUpiAccountId) {
          const acc = upiAccounts.find(a => a.id === selectedUpiAccountId);
          const tag = acc ? `UPI:${acc.account_name}` : '';
          return `${formNotes ? formNotes + ' | ' : ''}${tag}`.trim() || null;
        }
        return formNotes || null;
      };

      // Calculate next due date for recurring expenses
      const nextDueDate = formRecurrenceType !== 'One-time' 
        ? calculateNextDueDate(formDate, formRecurrenceType, Number(formRecurrenceInterval))
        : null;

      if (formRepeatDaily) {
        const month = selectedMonth || formDate.slice(0, 7);
        const monthStart = `${month}-01`;
        const endDate = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0);
        const days = endDate.getDate();
        const payloads: any[] = [];
        for (let d = 1; d <= days; d++) {
          const dayStr = `${month}-${String(d).padStart(2, '0')}`;
          payloads.push({
            branch_id: selectedLocationId,
            date: dayStr,
            amount: Number(formAmount),
            payment_mode: formMode,
            category_id: formCategory,
            notes: buildNotes(),
            is_monthly: formIsMonthly || false,
            monthly_allocation_days: formIsMonthly && formMonthlyDays ? Number(formMonthlyDays) : null,
            created_by: user?.id || null,
          });
        }
        const { error: batchInsertError } = await supabase.from('expenses').insert(payloads);
        if (batchInsertError) throw batchInsertError;
      } else {
        const payload: any = {
          branch_id: selectedLocationId,
          date: formDate,
          amount: Number(formAmount),
          payment_mode: formMode,
          category_id: formCategory,
          notes: buildNotes(),
          is_monthly: formIsMonthly || false,
          monthly_allocation_days: formIsMonthly && formMonthlyDays ? Number(formMonthlyDays) : null,
          created_by: user?.id || null,
        };
        const { error: singleInsertError } = await supabase.from('expenses').insert(payload);
        if (singleInsertError) throw singleInsertError;
      }
      toast({ 
        title: 'Expense added', 
        description: formRepeatDaily ? 'Daily expenses created for the month.' : 'Your expense has been recorded successfully.',
        duration: 3000 // Auto-dismiss after 3 seconds
      });
      resetForm();
      setShowAddForm(false);
      await reloadExpenses();
    } catch (_) {
      // swallow for now or show toast if available
    } finally {
      setSaving(false);
    }
  };

  const resetCategoryForm = () => {
    setCatName('');
    setCatDesc('');
    setCatBudget('');
    setCatRecurrenceType('One-time');
    setCatRecurrenceInterval('1');
    setCatDefaultRecurrenceEnd('');
  };

  const saveCategory = async () => {
    if (!selectedLocationId) {
      toast({ title: 'No branch selected', description: 'Select a location to add category.', variant: 'destructive' });
      return;
    }
    if (!catName.trim()) {
      toast({ title: 'Name required', description: 'Enter a category name.', variant: 'destructive' });
      return;
    }
    try {
      setSavingCategory(true);
      const payload: any = {
        branch_id: selectedLocationId,
        name: catName.trim(),
        description: catDesc.trim() || null,
        monthly_budget: catBudget ? Number(catBudget) : null,
      };
      
      // Try to include recurrence fields, but don't fail if they don't exist
      if (catRecurrenceType !== 'One-time') {
        payload.recurrence_type = catRecurrenceType;
        payload.recurrence_interval = Number(catRecurrenceInterval);
        payload.default_recurrence_end = catDefaultRecurrenceEnd || null;
      }
      const { error } = await supabase.from('expense_categories').insert(payload);
      if (error) throw error;
      toast({ 
        title: 'Category added', 
        description: 'New expense category has been created.',
        duration: 3000
      });
      resetCategoryForm();
      setShowAddCategory(false);
      await reloadCategories();
    } catch (e: any) {
      toast({ title: 'Failed to add category', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingCategory(false);
    }
  };

  const startEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setEditingCategoryDesc(cat.description || '');
    setEditingCategoryBudget(
      cat.monthlyBudget !== undefined && cat.monthlyBudget !== null ? String(cat.monthlyBudget) : ''
    );
    setEditingCategoryRecurrenceType(cat.recurrenceType || 'One-time');
    setEditingCategoryRecurrenceInterval(String(cat.recurrenceInterval || 1));
    setEditingCategoryDefaultRecurrenceEnd(cat.defaultRecurrenceEnd || '');
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setEditingCategoryDesc('');
    setEditingCategoryBudget('');
    setEditingCategoryRecurrenceType('One-time');
    setEditingCategoryRecurrenceInterval('1');
    setEditingCategoryDefaultRecurrenceEnd('');
  };

  const updateCategory = async () => {
    if (!editingCategoryId) return;
    if (!editingCategoryName.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    try {
      setSavingCategory(true);
      const updates: any = {
        name: editingCategoryName.trim(),
        description: editingCategoryDesc.trim() || null,
        monthly_budget: editingCategoryBudget ? Number(editingCategoryBudget) : null,
      };
      
      // Try to include recurrence fields, but don't fail if they don't exist
      if (editingCategoryRecurrenceType !== 'One-time') {
        updates.recurrence_type = editingCategoryRecurrenceType;
        updates.recurrence_interval = Number(editingCategoryRecurrenceInterval);
        updates.default_recurrence_end = editingCategoryDefaultRecurrenceEnd || null;
      }
      const { error } = await supabase.from('expense_categories').update(updates).eq('id', editingCategoryId);
      if (error) throw error;
      toast({ 
        title: 'Category updated', 
        description: 'Expense category has been updated successfully.',
        duration: 3000
      });
      cancelEditCategory();
      await reloadCategories();
    } catch (e: any) {
      toast({ title: 'Failed to update category', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingCategory(false);
    }
  };

  const openDeleteCategory = async (cat: { id: string; name: string }) => {
    try {
      const { count } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', cat.id);
      setCategoryDeleteCount(count || 0);
    } catch (_) {
      setCategoryDeleteCount(0);
    }
    setCategoryToDelete(cat);
    setCategoryConfirmName('');
    setDeleteCategoryOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const { error } = await supabase.from('expense_categories').delete().eq('id', categoryToDelete.id);
      if (error) throw error;
      toast({ 
        title: 'Category deleted', 
        description: 'Expense category has been removed successfully.',
        duration: 3000
      });
      setDeleteCategoryOpen(false);
      setCategoryToDelete(null);
      await reloadCategories();
    } catch (e: any) {
      toast({ title: 'Failed to delete category', description: e?.message, variant: 'destructive' });
    }
  };

  const startEditExpense = (expense: ExpenseRecord) => {
    setEditingExpenseId(expense.id);
    setEditDate(expense.date);
    setEditCategory(expense.categoryId);
    setEditAmount(String(expense.amount));
    const mode = (expense.paymentMode as any) as 'Cash' | 'UPI' | '';
    setEditMode(mode);
    setEditNotes(expense.notes || '');
    setEditUpiAccountId('');
    setEditRecurrenceType(expense.recurrenceType || 'One-time');
    setEditRecurrenceInterval(String(expense.recurrenceInterval || 1));
    setEditRecurrenceEndDate(expense.recurrenceEndDate || '');
  };

  const cancelEditExpense = () => {
    setEditingExpenseId(null);
    setEditDate('');
    setEditCategory('');
    setEditAmount('');
    setEditMode('');
    setEditNotes('');
    setEditUpiAccountId('');
    setEditRecurrenceType('One-time');
    setEditRecurrenceInterval('1');
    setEditRecurrenceEndDate('');
  };

  const saveEditExpense = async () => {
    if (!editingExpenseId) return;
    if (!editCategory || !editAmount || !editMode || !editDate) { toast({ title: 'Missing fields', variant: 'destructive' }); return; }
    if (editMode === 'UPI' && !editUpiAccountId) { toast({ title: 'Select UPI account', variant: 'destructive' }); return; }
    try {
      setSavingEdit(true);
      const notes = (() => {
        if (editMode === 'UPI' && editUpiAccountId) {
          const acc = upiAccounts.find((a: any) => a.id === editUpiAccountId);
          const tag = acc ? `UPI:${acc.account_name}` : '';
          return `${editNotes ? editNotes + ' | ' : ''}${tag}`.trim() || null;
        }
        return editNotes || null;
      })();
      // Calculate next due date for recurring expenses
      const nextDueDate = editRecurrenceType !== 'One-time' 
        ? calculateNextDueDate(editDate, editRecurrenceType, Number(editRecurrenceInterval))
        : null;

      const updates: any = {
        date: editDate,
        category_id: editCategory,
        amount: Number(editAmount),
        payment_mode: editMode,
        notes,
      };
      const { error } = await supabase.from('expenses').update(updates).eq('id', editingExpenseId);
      if (error) throw error;
      toast({ 
        title: 'Expense updated', 
        description: 'Expense record has been updated successfully.',
        duration: 3000
      });
      cancelEditExpense();
      await reloadExpenses();
    } catch (e: any) {
      toast({ title: 'Failed to update expense', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteExpense = (expenseId: string) => {
    setExpenseToDeleteId(expenseId);
    setDeleteExpenseOpen(true);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDeleteId) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseToDeleteId);
      if (error) throw error;
      toast({ 
        title: 'Expense deleted', 
        description: 'Expense record has been removed successfully.',
        duration: 3000
      });
      setDeleteExpenseOpen(false);
      setExpenseToDeleteId(null);
      await reloadExpenses();
    } catch (e: any) {
      toast({ title: 'Failed to delete expense', description: e?.message, variant: 'destructive' });
    }
  };

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
  // Budget checks per category for current filtered set
  const categorySpendMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.categoryId] = (map[e.categoryId] || 0) + (e.amount || 0);
    });
    return map;
  }, [filteredExpenses]);
  const overBudgetCategories = expenseCategories
    .filter(c => typeof c.monthlyBudget === 'number' && c.monthlyBudget! > 0)
    .filter(c => (categorySpendMap[c.id] || 0) > (c.monthlyBudget || 0));

  const formatCurrency = (amount: number) => 
    `₹${(amount || 0).toLocaleString('en-IN')}`;

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-IN');

  const getCategoryName = (categoryId: string) => 
    expenseCategories.find(c => c.id === categoryId)?.name || 'Unknown';

  const calculateNextDueDate = (startDate: string, recurrenceType: string, interval: number): string => {
    const date = new Date(startDate);
    switch (recurrenceType) {
      case 'Daily':
        date.setDate(date.getDate() + interval);
        break;
      case 'Weekly':
        date.setDate(date.getDate() + (interval * 7));
        break;
      case 'Monthly':
        date.setMonth(date.getMonth() + interval);
        break;
      case 'Bi-Monthly':
        date.setMonth(date.getMonth() + (interval * 2));
        break;
      case 'Quarterly':
        date.setMonth(date.getMonth() + (interval * 3));
        break;
      case 'Yearly':
        date.setFullYear(date.getFullYear() + interval);
        break;
      default:
        return startDate;
    }
    return date.toISOString().slice(0, 10);
  };

  const formatRecurrenceInfo = (expense: ExpenseRecord): string => {
    if (!expense.recurrenceType || expense.recurrenceType === 'One-time') {
      return 'One-time';
    }
    
    const interval = expense.recurrenceInterval || 1;
    const type = expense.recurrenceType.toLowerCase();
    let recurrenceText = `Every ${interval} ${type}`;
    
    if (expense.recurrenceEndDate) {
      recurrenceText += ` until ${formatDate(expense.recurrenceEndDate)}`;
    }
    
    return recurrenceText;
  };

  const getRecurrenceSource = (expense: ExpenseRecord): { isInherited: boolean; categoryName: string } => {
    const category = expenseCategories.find(cat => cat.id === expense.categoryId);
    if (!category) return { isInherited: false, categoryName: 'Unknown' };
    
    const isInherited = category.recurrenceType === expense.recurrenceType && 
                       category.recurrenceInterval === expense.recurrenceInterval &&
                       category.defaultRecurrenceEnd === expense.recurrenceEndDate;
    
    return { isInherited, categoryName: category.name };
  };

  const formatCategoryRecurrenceInfo = (category: ExpenseCategory): string => {
    if (!category.recurrenceType || category.recurrenceType === 'One-time') {
      return 'One-time';
    }
    
    const interval = category.recurrenceInterval || 1;
    const type = category.recurrenceType.toLowerCase();
    let recurrenceText = `Every ${interval} ${type}`;
    
    if (category.defaultRecurrenceEnd) {
      recurrenceText += ` until ${formatDate(category.defaultRecurrenceEnd)}`;
    }
    
    return recurrenceText;
  };

  const handleCategorySelection = (categoryId: string) => {
    setFormCategory(categoryId);
    const selectedCategory = expenseCategories.find(cat => cat.id === categoryId);
    if (selectedCategory) {
      // Auto-populate recurrence fields from category
      setFormRecurrenceType(selectedCategory.recurrenceType || 'One-time');
      setFormRecurrenceInterval(String(selectedCategory.recurrenceInterval || 1));
      setFormRecurrenceEndDate(selectedCategory.defaultRecurrenceEnd || '');
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
          {user?.role === 'owner' && (
            <Button variant="outline" className="text-muted-foreground" onClick={() => { setManageCategories(s => !s); setShowAddCategory(false); }}>
              <Settings className="h-4 w-4 mr-2" />
              {manageCategories ? 'Close' : 'Manage Categories'}
            </Button>
          )}
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAddExpenseOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {user?.role === 'owner' && manageCategories && (
        <div className="business-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Manage Categories</h3>
            <Button variant="outline" onClick={() => setShowAddCategory(s => !s)}>
              {showAddCategory ? 'Close' : 'Add Category'}
            </Button>
          </div>
          {showAddCategory && (
            <div className="mt-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="form-label">Name</label>
                  <Input value={catName} onChange={(e) => setCatName(e.target.value)} className="form-input" placeholder="e.g., Electricity" />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Description (optional)</label>
                  <Input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="form-input" placeholder="Notes about this category" />
                </div>
                <div className="md:col-span-1">
                  <label className="form-label">Monthly Budget (₹)</label>
                  <Input type="number" min="0" step="1" value={catBudget} onChange={(e) => setCatBudget(e.target.value)} className="form-input" placeholder="Optional" />
                </div>
              </div>
              
              {/* Recurrence Section */}
              <div className="mt-4 border-t border-border pt-4">
                <h4 className="text-sm font-medium text-foreground mb-3">Default Recurrence Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Recurrence Type</label>
                    <select 
                      value={catRecurrenceType} 
                      onChange={e => setCatRecurrenceType(e.target.value as any)} 
                      className="form-select w-full bg-white border-border rounded-md py-2 px-3"
                    >
                      <option value="One-time">One-time</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Bi-Monthly">Bi-Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  
                  {catRecurrenceType !== 'One-time' && (
                    <div>
                      <label className="form-label">Interval</label>
                      <Input 
                        type="number" 
                        min="1" 
                        step="1" 
                        value={catRecurrenceInterval} 
                        onChange={e => setCatRecurrenceInterval(e.target.value)} 
                        className="form-input" 
                        placeholder="1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Every {catRecurrenceInterval} {catRecurrenceType.toLowerCase()}
                      </p>
                    </div>
                  )}
                  
                  {catRecurrenceType !== 'One-time' && (
                    <div>
                      <label className="form-label">Default End Date (Optional)</label>
                      <Input 
                        type="date" 
                        value={catDefaultRecurrenceEnd} 
                        onChange={e => setCatDefaultRecurrenceEnd(e.target.value)} 
                        className="form-input" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty for indefinite recurrence
                      </p>
                    </div>
                  )}
                </div>
                
                {catRecurrenceType !== 'One-time' && (
                  <div className="mt-3 p-3 bg-muted/30 rounded-md">
                    <p className="text-sm text-foreground">
                      <strong>Preview:</strong> Expenses in this category will default to repeating every {catRecurrenceInterval} {catRecurrenceType.toLowerCase()}
                      {catDefaultRecurrenceEnd && ` until ${formatDate(catDefaultRecurrenceEnd)}`}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowAddCategory(false); }}>Cancel</Button>
                <Button disabled={savingCategory || !selectedLocationId} onClick={saveCategory} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {savingCategory ? 'Saving…' : 'Save Category'}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-foreground">Name</th>
                  <th className="text-left p-3 text-foreground">Monthly Budget</th>
                  <th className="text-left p-3 text-foreground">Recurrence</th>
                  <th className="text-left p-3 text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenseCategories.map((cat: any) => (
                  <tr key={cat.id} className="border-b border-border">
                    <td className="p-3 text-foreground">
                      {editingCategoryId === cat.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Input value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} className="form-input" />
                          <Input value={editingCategoryDesc} onChange={(e) => setEditingCategoryDesc(e.target.value)} className="form-input" placeholder="Description" />
                        </div>
                      ) : (
                        <span>{cat.name}</span>
                      )}
                    </td>
                    <td className="p-3 text-foreground">
                      {editingCategoryId === cat.id ? (
                        <Input type="number" min="0" step="1" value={editingCategoryBudget} onChange={(e) => setEditingCategoryBudget(e.target.value)} className="form-input" placeholder="₹" />
                      ) : (
                        <span>{typeof cat.monthlyBudget === 'number' ? `₹${(cat.monthlyBudget||0).toLocaleString('en-IN')}` : '—'}</span>
                      )}
                    </td>
                    <td className="p-3 text-foreground">
                      {editingCategoryId === cat.id ? (
                        <div className="flex flex-col gap-2">
                          <select 
                            value={editingCategoryRecurrenceType} 
                            onChange={e => setEditingCategoryRecurrenceType(e.target.value as any)} 
                            className="form-select w-full text-sm"
                          >
                            <option value="One-time">One-time</option>
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Bi-Monthly">Bi-Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Yearly">Yearly</option>
                          </select>
                          {editingCategoryRecurrenceType !== 'One-time' && (
                            <>
                              <Input 
                                type="number" 
                                min="1" 
                                step="1" 
                                value={editingCategoryRecurrenceInterval} 
                                onChange={e => setEditingCategoryRecurrenceInterval(e.target.value)} 
                                className="form-input text-sm" 
                                placeholder="Interval"
                              />
                              <Input 
                                type="date" 
                                value={editingCategoryDefaultRecurrenceEnd} 
                                onChange={e => setEditingCategoryDefaultRecurrenceEnd(e.target.value)} 
                                className="form-input text-sm" 
                                placeholder="End date (optional)"
                              />
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className={`status-badge ${cat.recurrenceType && cat.recurrenceType !== 'One-time' ? 'status-badge-success' : 'status-badge'}`}>
                            {cat.recurrenceType && cat.recurrenceType !== 'One-time' ? '🔁 Recurring' : 'One-time'}
                          </span>
                          {cat.recurrenceType && cat.recurrenceType !== 'One-time' && (
                            <span className="text-xs text-muted-foreground">
                              {formatCategoryRecurrenceInfo(cat)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {editingCategoryId === cat.id ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={updateCategory} disabled={savingCategory}>Save</Button>
                          <Button size="sm" variant="outline" onClick={cancelEditCategory}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEditCategory(cat)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => openDeleteCategory(cat)}>Delete</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Dialog */}
      <AlertDialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Expense</AlertDialogTitle>
            <AlertDialogDescription>Record a new expense for the selected branch and month.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Date</label>
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select value={formCategory} onChange={e => handleCategorySelection(e.target.value)} className="form-select w-full bg-white border-border rounded-md py-2 px-3">
                <option value="">Select category</option>
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.recurrenceType && c.recurrenceType !== 'One-time' ? '🔁' : ''}
                  </option>
                ))}
              </select>
              {formCategory && (() => {
                const selectedCategory = expenseCategories.find(cat => cat.id === formCategory);
                return selectedCategory && selectedCategory.recurrenceType && selectedCategory.recurrenceType !== 'One-time' ? (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Category Default:</strong> This category repeats every {selectedCategory.recurrenceInterval || 1} {selectedCategory.recurrenceType.toLowerCase()}
                      {selectedCategory.defaultRecurrenceEnd && ` until ${formatDate(selectedCategory.defaultRecurrenceEnd)}`}
                    </p>
                  </div>
                ) : null;
              })()}
            </div>
            <div>
              <label className="form-label">Amount</label>
              <Input type="number" min="0" step="1" value={formAmount} onChange={e => setFormAmount(e.target.value)} className="form-input" placeholder="0" />
            </div>
            <div>
              <label className="form-label">Payment Mode</label>
              <select value={formMode} onChange={e => setFormMode(e.target.value as any)} className="form-select w-full bg-white border-border rounded-md py-2 px-3">
                <option value="">Select mode</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            {formMode === 'UPI' && (
              <div>
                <label className="form-label">UPI Account</label>
                <select value={selectedUpiAccountId} onChange={(e) => setSelectedUpiAccountId(e.target.value)} className="form-select w-full bg-white border-border rounded-md py-2 px-3">
                  <option value="">Select UPI Account</option>
                  {upiAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="form-label">Notes</label>
              <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} className="form-input" placeholder="Optional" />
            </div>
            <div className="flex items-center gap-2">
              <input id="isMonthly" type="checkbox" checked={formIsMonthly} onChange={e => setFormIsMonthly(e.target.checked)} />
              <label htmlFor="isMonthly" className="text-sm text-foreground">Monthly Allocation</label>
            </div>
            {formIsMonthly && (
              <div>
                <label className="form-label">Allocation Days</label>
                <Input type="number" min="1" max="31" value={formMonthlyDays} onChange={e => setFormMonthlyDays(e.target.value)} className="form-input" />
              </div>
            )}
            <div className="md:col-span-3 flex items-center gap-2">
              <input id="repeatDaily" type="checkbox" checked={formRepeatDaily} onChange={e => setFormRepeatDaily(e.target.checked)} />
              <label htmlFor="repeatDaily" className="text-sm text-foreground">Repeat daily for selected month</label>
            </div>
            
            {/* Recurrence Section */}
            <div className="md:col-span-3 border-t border-border pt-4">
              <h4 className="text-sm font-medium text-foreground mb-3">Recurrence Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Recurrence Type</label>
                  <select 
                    value={formRecurrenceType} 
                    onChange={e => setFormRecurrenceType(e.target.value as any)} 
                    className="form-select w-full bg-white border-border rounded-md py-2 px-3"
                  >
                    <option value="One-time">One-time</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Bi-Monthly">Bi-Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                
                {formRecurrenceType !== 'One-time' && (
                  <div>
                    <label className="form-label">Interval</label>
                    <Input 
                      type="number" 
                      min="1" 
                      step="1" 
                      value={formRecurrenceInterval} 
                      onChange={e => setFormRecurrenceInterval(e.target.value)} 
                      className="form-input" 
                      placeholder="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Every {formRecurrenceInterval} {formRecurrenceType.toLowerCase()}
                    </p>
                  </div>
                )}
                
                {formRecurrenceType !== 'One-time' && (
                  <div>
                    <label className="form-label">End Date (Optional)</label>
                    <Input 
                      type="date" 
                      value={formRecurrenceEndDate} 
                      onChange={e => setFormRecurrenceEndDate(e.target.value)} 
                      className="form-input" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for indefinite recurrence
                    </p>
                  </div>
                )}
              </div>
              
              {formRecurrenceType !== 'One-time' && (
                <div className="mt-3 p-3 bg-muted/30 rounded-md">
                  <p className="text-sm text-foreground">
                    <strong>Preview:</strong> This expense will repeat every {formRecurrenceInterval} {formRecurrenceType.toLowerCase()}
                    {formRecurrenceEndDate && ` until ${formatDate(formRecurrenceEndDate)}`}
                    . Next due: {formatDate(calculateNextDueDate(formDate, formRecurrenceType, Number(formRecurrenceInterval)))}
                  </p>
                </div>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAddExpenseOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await saveExpense(); setAddExpenseOpen(false); }} disabled={saving || !selectedLocationId}>
              {saving ? 'Saving…' : 'Save Expense'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recent Expenses Card */}
      <div className="business-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Expenses</h3>
        {/* Replace with RecentExpensesCard when available */}
        <div className="text-sm text-muted-foreground">Recent expenses will appear here.</div>
      </div>

      {/* Expense Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget Warnings */}
        {overBudgetCategories.length > 0 && (
          <div className="md:col-span-2 lg:col-span-4">
            <div className="p-3 rounded-md border border-destructive/40 bg-destructive/10 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-destructive">Budget exceeded</div>
                <div className="text-foreground">
                  {overBudgetCategories.map((c, idx) => {
                    const spent = categorySpendMap[c.id] || 0;
                    const over = spent - (c.monthlyBudget || 0);
                    return (
                      <span key={c.id}>
                        {idx > 0 ? ', ' : ''}{c.name}: over by {formatCurrency(over)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* Payment Mode Pie + UPI Breakdown */}
      <div className="business-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Payments Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Pie Chart */}
          <div className="flex items-center justify-center">
            {(() => {
              const cash = cashExpenses;
              const upi = upiExpenses;
              const total = Math.max(1, cash + upi);
              const cashPct = (cash / total) * 100;
              const upiPct = 100 - cashPct;
              const circ = 2 * Math.PI * 40; // r=40
              const cashLen = (cashPct / 100) * circ;
              const upiLen = circ - cashLen;
              return (
                <svg width="160" height="160" viewBox="0 0 100 100">
                  <title>Payments by mode</title>
                  <desc>Cash vs UPI distribution</desc>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="12" />
                  {/* Cash slice (green) */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="12"
                    strokeDasharray={`${cashLen} ${circ - cashLen}`} strokeDashoffset="0" transform="rotate(-90 50 50)" />
                  {/* UPI slice (blue) */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="12"
                    strokeDasharray={`${upiLen} ${circ - upiLen}`} strokeDashoffset={-cashLen} transform="rotate(-90 50 50)" />
                  {/* Center labels */}
                  <text x="50" y="47" textAnchor="middle" fontSize="9" fill="#111">Total</text>
                  <text x="50" y="58" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#111">{`₹${(total||0).toLocaleString('en-IN')}`}</text>
                </svg>
              );
            })()}
          </div>
          
          {/* Legend */}
          <div className="mt-3 flex items-center justify-center gap-6 text-sm">
            {(() => {
              const cash = cashExpenses;
              const upi = upiExpenses;
              const total = Math.max(1, cash + upi);
              const cashPct = Math.round((cash / total) * 100);
              const upiPct = Math.round(100 - cashPct);
              return (
                <>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-foreground">Cash</span>
                    <span className="text-muted-foreground">{cashPct}%</span>
                    <span className="text-foreground font-medium">{`₹${(cash||0).toLocaleString('en-IN')}`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="text-foreground">UPI</span>
                    <span className="text-muted-foreground">{upiPct}%</span>
                    <span className="text-foreground font-medium">{`₹${(upi||0).toLocaleString('en-IN')}`}</span>
                  </div>
                </>
              );
            })()}
          </div>
          {/* UPI Breakdown */}
          <div>
            <h4 className="font-medium text-foreground mb-2">UPI Breakdown</h4>
            {(() => {
              // naive parse of notes to find UPI:account_name
              const upiMap: Record<string, number> = {};
              filteredExpenses
                .filter(e => (e.paymentMode || '').toString().toUpperCase() === 'UPI')
                .forEach(e => {
                  const match = (e.notes || '').match(/UPI:([^|]+)/i);
                  const name = match && match[1] ? match[1].trim() : 'Unknown';
                  upiMap[name] = (upiMap[name] || 0) + (e.amount || 0);
                });
              const entries = Object.entries(upiMap).sort((a,b) => b[1]-a[1]);
              if (entries.length === 0) return <div className="text-sm text-muted-foreground">No UPI payments this period.</div>;
              return (
                <ul className="space-y-2">
                  {entries.map(([name, amt]) => (
                    <li key={name} className="flex items-center justify-between">
                      <span className="text-foreground">{name}</span>
                      <span className="text-primary font-medium">{formatCurrency(amt)}</span>
                    </li>
                  ))}
                </ul>
              );
            })()}
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
                <th className="text-center p-4 font-medium text-foreground">Recurrence</th>
                <th className="text-center p-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-border table-row-hover">
                  {editingExpenseId === expense.id ? (
                    <>
                      <td className="p-4">
                        <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="form-input" />
                  </td>
                  <td className="p-4">
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="form-select w-full">
                          <option value="">Select category</option>
                          {expenseCategories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                  </td>
                      <td className="p-4 text-right">
                        <Input type="number" min="0" step="1" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="form-input text-right" />
                  </td>
                      <td className="p-4">
                        <select value={editMode} onChange={(e) => setEditMode(e.target.value as any)} className="form-select w-full">
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                        </select>
                        {editMode === 'UPI' && (
                          <div className="mt-2">
                            <select value={editUpiAccountId} onChange={(e) => setEditUpiAccountId(e.target.value)} className="form-select w-full">
                              <option value="">Select UPI Account</option>
                              {upiAccounts.map((acc: any) => (
                                <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                  </td>
                      <td className="p-4">
                        <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="form-input" placeholder="Notes" />
                  </td>
                  <td className="p-4 text-center">
                        <div className="flex flex-col gap-2">
                          <select 
                            value={editRecurrenceType} 
                            onChange={e => setEditRecurrenceType(e.target.value as any)} 
                            className="form-select w-full text-sm"
                          >
                            <option value="One-time">One-time</option>
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Bi-Monthly">Bi-Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Yearly">Yearly</option>
                          </select>
                          {editRecurrenceType !== 'One-time' && (
                            <>
                              <Input 
                                type="number" 
                                min="1" 
                                step="1" 
                                value={editRecurrenceInterval} 
                                onChange={e => setEditRecurrenceInterval(e.target.value)} 
                                className="form-input text-sm" 
                                placeholder="Interval"
                              />
                              <Input 
                                type="date" 
                                value={editRecurrenceEndDate} 
                                onChange={e => setEditRecurrenceEndDate(e.target.value)} 
                                className="form-input text-sm" 
                                placeholder="End date (optional)"
                              />
                            </>
                          )}
                        </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center space-x-2">
                          <Button size="sm" onClick={saveEditExpense} disabled={savingEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={cancelEditExpense}>Cancel</Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-foreground font-medium">{formatDate(expense.date)}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">{getCategoryName(expense.categoryId)}</span>
                      </td>
                      <td className="p-4 text-right text-destructive font-semibold">{formatCurrency(expense.amount)}</td>
                      <td className="p-4 text-center">
                        <span className={`status-badge ${expense.paymentMode === 'Cash' ? 'status-badge-warning' : 'status-badge-success'}`}>{expense.paymentMode}</span>
                      </td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate">{expense.notes || '-'}</td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`status-badge ${expense.recurrenceType && expense.recurrenceType !== 'One-time' ? 'status-badge-success' : 'status-badge'}`}>
                            {expense.recurrenceType && expense.recurrenceType !== 'One-time' ? 'Recurring' : 'One-time'}
                          </span>
                          {expense.recurrenceType && expense.recurrenceType !== 'One-time' && (() => {
                            const source = getRecurrenceSource(expense);
                            return (
                              <div className="text-xs text-muted-foreground text-center">
                                <div>{formatRecurrenceInfo(expense)}</div>
                                {source.isInherited ? (
                                  <div className="text-blue-600">📋 From {source.categoryName}</div>
                                ) : (
                                  <div className="text-orange-600">✏️ Custom</div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => startEditExpense(expense)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => openDeleteExpense(expense.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                    </>
                  )}
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
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAddExpenseOpen(true)}>
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
            const hasBudget = typeof category.monthlyBudget === 'number' && (category.monthlyBudget || 0) > 0;
            const upper = hasBudget ? (category.monthlyBudget || 0) : Math.max(totalExpenses, 1);
            const percentage = upper > 0 ? Math.min((categoryTotal / upper) * 100, 100) : 0;
            
            return (
              <div key={category.id} className="p-4 border border-border rounded-lg">
                <h4 className="font-medium text-foreground">{category.name}</h4>
                <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                  <span className="text-foreground font-semibold">{formatCurrency(categoryTotal)}</span>
                  {hasBudget && (
                    <span>
                      of <span className="text-foreground">{formatCurrency(category.monthlyBudget || 0)}</span>
                    </span>
                  )}
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-3">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${hasBudget ? 'bg-primary' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasBudget ? (
                    <>
                      {percentage.toFixed(1)}% of budget
                      {categoryTotal > (category.monthlyBudget || 0) && (
                        <span className="ml-2 text-destructive font-medium">Over by {formatCurrency(categoryTotal - (category.monthlyBudget || 0))}</span>
                      )}
                    </>
                  ) : (
                    <>{percentage.toFixed(1)}% of total</>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Expense Dialog */}
      <AlertDialog open={deleteExpenseOpen} onOpenChange={setDeleteExpenseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExpense}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={deleteCategoryOpen} onOpenChange={setDeleteCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category {categoryToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryDeleteCount > 0 ? (
                <>
                  This category has {categoryDeleteCount} expense{categoryDeleteCount === 1 ? '' : 's'}. Deleting it will remove the category reference. Type the category name to confirm.
                </>
              ) : (
                <>This action cannot be undone. Type the category name to confirm.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <Input placeholder="Type category name to confirm" value={categoryConfirmName} onChange={(e) => setCategoryConfirmName(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!categoryToDelete || categoryConfirmName.trim() !== (categoryToDelete?.name || '')} onClick={confirmDeleteCategory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpensesPage;