import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Package, 
  PackageCheck,
  PackageX,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';

interface StockItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  minStockLevel: number;
  isActive: boolean;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

interface StockTransaction {
  id: string;
  stockItemId: string;
  transactionType: 'add' | 'remove' | 'adjust' | 'initial';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  notes?: string;
  createdAt: string;
}

const StockManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const selectedLocationId = useSelectedLocation();

  // Add Item form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState<string>('0');
  const [formUnit, setFormUnit] = useState<string>('pcs');
  const [formMinStockLevel, setFormMinStockLevel] = useState<string>('0');
  const [saving, setSaving] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);

  // Edit Item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editUnit, setEditUnit] = useState('');
  const [editMinStockLevel, setEditMinStockLevel] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Stock adjustment state
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadStockItems();
  }, [selectedLocationId]);

  const loadStockItems = async () => {
    try {
      setLoading(true);
      
      if (!selectedLocationId) {
        setStockItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('branch_id', selectedLocationId)
        .order('name');

      if (error) throw error;

      setStockItems((data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: Number(item.quantity || 0),
        unit: item.unit || 'pcs',
        minStockLevel: Number(item.min_stock_level || 0),
        isActive: item.is_active !== false,
        branchId: item.branch_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })));
    } catch (error: any) {
      console.error('Error loading stock items:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to load stock items', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormQuantity('0');
    setFormUnit('pcs');
    setFormMinStockLevel('0');
  };

  const saveItem = async () => {
    if (!selectedLocationId) {
      toast({ title: 'Select branch', description: 'Choose a branch first.', variant: 'destructive' });
      return;
    }
    if (!formName.trim()) {
      toast({ title: 'Name required', description: 'Enter an item name.', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      
      const payload: any = {
        branch_id: selectedLocationId,
        name: formName.trim(),
        description: formDescription.trim() || null,
        quantity: Number(formQuantity) || 0,
        unit: formUnit || 'pcs',
        min_stock_level: Number(formMinStockLevel) || 0,
        is_active: true,
        created_by: user?.id || null,
      };

      // Create the item
      const { error: insertError } = await supabase
        .from('stock_items')
        .insert(payload);

      if (insertError) throw insertError;

      // If initial quantity > 0, create an initial transaction
      if (Number(formQuantity) > 0) {
        const { data: insertedData } = await supabase
          .from('stock_items')
          .select('id')
          .eq('branch_id', selectedLocationId)
          .eq('name', formName.trim())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (insertedData) {
          await supabase
            .from('stock_transactions')
            .insert({
              stock_item_id: insertedData.id,
              branch_id: selectedLocationId,
              transaction_type: 'initial',
              quantity: Number(formQuantity),
              previous_quantity: 0,
              new_quantity: Number(formQuantity),
              notes: 'Initial stock',
              created_by: user?.id || null,
            });
        }
      }

      toast({ 
        title: 'Item added', 
        description: 'Stock item has been created successfully.',
        duration: 3000
      });
      resetForm();
      setAddItemDialogOpen(false);
      await loadStockItems();
    } catch (error: any) {
      console.error('Error saving item:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to save item', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditItem = (item: StockItem) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditDescription(item.description || '');
    setEditQuantity(String(item.quantity));
    setEditUnit(item.unit);
    setEditMinStockLevel(String(item.minStockLevel));
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditName('');
    setEditDescription('');
    setEditQuantity('');
    setEditUnit('');
    setEditMinStockLevel('');
  };

  const saveEditItem = async () => {
    if (!editingItemId) return;
    if (!editName.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }

    try {
      setSavingEdit(true);
      
      const updates: any = {
        name: editName.trim(),
        description: editDescription.trim() || null,
        quantity: Number(editQuantity) || 0,
        unit: editUnit || 'pcs',
        min_stock_level: Number(editMinStockLevel) || 0,
      };

      const { error } = await supabase
        .from('stock_items')
        .update(updates)
        .eq('id', editingItemId);

      if (error) throw error;

      toast({ 
        title: 'Item updated', 
        description: 'Stock item has been updated successfully.',
        duration: 3000
      });
      cancelEditItem();
      await loadStockItems();
    } catch (e: any) {
      toast({ title: 'Failed to update item', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const openAdjustDialog = (item: StockItem, type: 'add' | 'remove') => {
    setAdjustingItemId(item.id);
    setAdjustType(type);
    setAdjustQuantity('');
    setAdjustNotes('');
    setAdjustDialogOpen(true);
  };

  const adjustStock = async () => {
    if (!adjustingItemId) return;
    if (!adjustQuantity || Number(adjustQuantity) <= 0) {
      toast({ title: 'Invalid quantity', description: 'Enter a valid quantity.', variant: 'destructive' });
      return;
    }

    try {
      setAdjusting(true);

      const item = stockItems.find(i => i.id === adjustingItemId);
      if (!item) {
        toast({ title: 'Item not found', variant: 'destructive' });
        return;
      }

      const adjustmentAmount = Number(adjustQuantity);
      const previousQuantity = item.quantity;
      const newQuantity = adjustType === 'add' 
        ? previousQuantity + adjustmentAmount
        : Math.max(0, previousQuantity - adjustmentAmount);

      // Update the item quantity
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ quantity: newQuantity })
        .eq('id', adjustingItemId);

      if (updateError) throw updateError;

      // Create transaction record manually (since trigger might not fire in all cases)
      await supabase
        .from('stock_transactions')
        .insert({
          stock_item_id: adjustingItemId,
          branch_id: item.branchId,
          transaction_type: adjustType,
          quantity: adjustmentAmount,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          notes: adjustNotes.trim() || null,
          created_by: user?.id || null,
        });

      toast({ 
        title: adjustType === 'add' ? 'Stock added' : 'Stock removed', 
        description: `${adjustmentAmount} ${item.unit} ${adjustType === 'add' ? 'added' : 'removed'} successfully.`,
        duration: 3000
      });
      
      setAdjustDialogOpen(false);
      setAdjustingItemId(null);
      setAdjustQuantity('');
      setAdjustNotes('');
      await loadStockItems();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to adjust stock', 
        variant: 'destructive' 
      });
    } finally {
      setAdjusting(false);
    }
  };

  const openDeleteDialog = (item: { id: string; name: string }) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      toast({ 
        title: 'Item deleted', 
        description: 'Stock item has been removed successfully.',
        duration: 3000
      });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      await loadStockItems();
    } catch (e: any) {
      toast({ title: 'Failed to delete item', description: e?.message, variant: 'destructive' });
    }
  };

  const filteredItems = stockItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = filteredItems.filter(item => 
    item.quantity <= item.minStockLevel && item.isActive
  );

  const outOfStockItems = filteredItems.filter(item => 
    item.quantity === 0 && item.isActive
  );

  const totalItems = filteredItems.length;
  const totalValue = filteredItems.reduce((sum, item) => sum + item.quantity, 0);

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
          <h1 className="text-3xl font-bold text-foreground">Stock Management</h1>
          <p className="text-muted-foreground">
            Manage inventory and track stock levels for your branch
          </p>
        </div>
        
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAddItemDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Alerts for low stock and out of stock */}
      {outOfStockItems.length > 0 && (
        <div className="p-4 rounded-md border border-destructive/40 bg-destructive/10 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-destructive">Out of Stock ({outOfStockItems.length})</div>
            <div className="text-foreground">
              {outOfStockItems.map((item, idx) => (
                <span key={item.id}>
                  {idx > 0 ? ', ' : ''}{item.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-md border border-warning/40 bg-warning/10 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-warning">Low Stock Alert ({lowStockItems.length})</div>
            <div className="text-foreground">
              {lowStockItems.map((item, idx) => (
                <span key={item.id}>
                  {idx > 0 ? ', ' : ''}{item.name} ({item.quantity} {item.unit})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            </div>
            <Package className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Items</p>
              <p className="text-2xl font-bold text-success">
                {filteredItems.filter(i => i.isActive).length}
              </p>
            </div>
            <PackageCheck className="h-8 w-8 text-success" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <p className="text-2xl font-bold text-destructive">{outOfStockItems.length}</p>
            </div>
            <PackageX className="h-8 w-8 text-destructive" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="business-card p-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="table-container">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Stock Items</h3>
          <p className="text-sm text-muted-foreground">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left p-4 font-medium text-foreground">Item Name</th>
                <th className="text-left p-4 font-medium text-foreground">Description</th>
                <th className="text-right p-4 font-medium text-foreground">Quantity</th>
                <th className="text-center p-4 font-medium text-foreground">Unit</th>
                <th className="text-right p-4 font-medium text-foreground">Min. Level</th>
                <th className="text-center p-4 font-medium text-foreground">Status</th>
                <th className="text-center p-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-border table-row-hover">
                  {editingItemId === item.id ? (
                    <>
                      <td className="p-4">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="form-input" />
                      </td>
                      <td className="p-4">
                        <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="form-input" placeholder="Description" />
                      </td>
                      <td className="p-4 text-right">
                        <Input type="number" min="0" step="0.01" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} className="form-input text-right" />
                      </td>
                      <td className="p-4 text-center">
                        <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="form-input text-center" />
                      </td>
                      <td className="p-4 text-right">
                        <Input type="number" min="0" step="0.01" value={editMinStockLevel} onChange={(e) => setEditMinStockLevel(e.target.value)} className="form-input text-right" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Button size="sm" onClick={saveEditItem} disabled={savingEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={cancelEditItem}>Cancel</Button>
                        </div>
                      </td>
                      <td></td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-foreground font-medium">{item.name}</td>
                      <td className="p-4 text-muted-foreground">{item.description || '-'}</td>
                      <td className="p-4 text-right">
                        <span className={`font-semibold ${item.quantity === 0 ? 'text-destructive' : item.quantity <= item.minStockLevel ? 'text-warning' : 'text-foreground'}`}>
                          {item.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-4 text-center text-muted-foreground">{item.unit}</td>
                      <td className="p-4 text-right text-muted-foreground">
                        {item.minStockLevel.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        {item.quantity === 0 ? (
                          <span className="status-badge status-badge-destructive">Out of Stock</span>
                        ) : item.quantity <= item.minStockLevel ? (
                          <span className="status-badge status-badge-warning">Low Stock</span>
                        ) : (
                          <span className="status-badge status-badge-success">In Stock</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-success hover:text-success" 
                            onClick={() => openAdjustDialog(item, 'add')}
                            title="Add Stock"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive" 
                            onClick={() => openAdjustDialog(item, 'remove')}
                            title="Remove Stock"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => startEditItem(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user?.role === 'owner' && (
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => openDeleteDialog({ id: item.id, name: item.name })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredItems.length === 0 && (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No stock items found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'Try adjusting your search criteria.' 
                : 'Start managing your inventory by adding your first item.'}
            </p>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAddItemDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        )}
      </div>

      {/* Add Item Dialog */}
      <AlertDialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Add Stock Item</AlertDialogTitle>
            <AlertDialogDescription>Create a new stock item for your inventory.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Item Name *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="form-input" placeholder="e.g., Soap, Detergent" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Description (Optional)</label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="form-input" placeholder="Additional details about the item" />
            </div>
            <div>
              <label className="form-label">Initial Quantity</label>
              <Input type="number" min="0" step="0.01" value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)} className="form-input" placeholder="0" />
            </div>
            <div>
              <label className="form-label">Unit</label>
              <select value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className="form-select w-full bg-white border-border rounded-md py-2 px-3">
                <option value="pcs">pcs (pieces)</option>
                <option value="kg">kg (kilograms)</option>
                <option value="g">g (grams)</option>
                <option value="liters">liters</option>
                <option value="ml">ml (milliliters)</option>
                <option value="boxes">boxes</option>
                <option value="packets">packets</option>
                <option value="bottles">bottles</option>
                <option value="bags">bags</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Minimum Stock Level</label>
              <Input type="number" min="0" step="0.01" value={formMinStockLevel} onChange={(e) => setFormMinStockLevel(e.target.value)} className="form-input" placeholder="Alert when stock goes below this level" />
              <p className="text-xs text-muted-foreground mt-1">You'll be alerted when stock falls below this level</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setAddItemDialogOpen(false); resetForm(); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await saveItem(); }} disabled={saving || !selectedLocationId}>
              {saving ? 'Saving…' : 'Add Item'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Adjust Stock Dialog */}
      <AlertDialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{adjustType === 'add' ? 'Add Stock' : 'Remove Stock'}</AlertDialogTitle>
            <AlertDialogDescription>
              {adjustType === 'add' 
                ? 'Increase the quantity of this item in stock.'
                : 'Decrease the quantity of this item in stock.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="form-label">Quantity to {adjustType === 'add' ? 'Add' : 'Remove'}</label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={adjustQuantity} 
                onChange={(e) => setAdjustQuantity(e.target.value)} 
                className="form-input" 
                placeholder="0"
              />
            </div>
            <div>
              <label className="form-label">Notes (Optional)</label>
              <Input 
                value={adjustNotes} 
                onChange={(e) => setAdjustNotes(e.target.value)} 
                className="form-input" 
                placeholder="e.g., Purchased from supplier, Used for cleaning"
              />
            </div>
            {adjustingItemId && (
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="text-sm text-foreground">
                  Current Stock: <strong>{stockItems.find(i => i.id === adjustingItemId)?.quantity || 0} {stockItems.find(i => i.id === adjustingItemId)?.unit || 'pcs'}</strong>
                </p>
                {adjustQuantity && !isNaN(Number(adjustQuantity)) && Number(adjustQuantity) > 0 && (
                  <p className="text-sm text-foreground mt-1">
                    {adjustType === 'add' ? 'New Stock' : 'Remaining Stock'}: <strong>
                      {adjustType === 'add' 
                        ? (stockItems.find(i => i.id === adjustingItemId)?.quantity || 0) + Number(adjustQuantity)
                        : Math.max(0, (stockItems.find(i => i.id === adjustingItemId)?.quantity || 0) - Number(adjustQuantity))
                      } {stockItems.find(i => i.id === adjustingItemId)?.unit || 'pcs'}
                    </strong>
                  </p>
                )}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setAdjustDialogOpen(false); setAdjustQuantity(''); setAdjustNotes(''); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={adjustStock} disabled={adjusting || !adjustQuantity || Number(adjustQuantity) <= 0}>
              {adjusting ? 'Processing…' : adjustType === 'add' ? 'Add Stock' : 'Remove Stock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item {itemToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All stock history for this item will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockManagementPage;

