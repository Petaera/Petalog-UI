import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Settings, 
  Building2, 
  Calculator, 
  Users, 
  Bell,
  Save,
  Key,
  Shield,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    companyName: 'Your Company',
    currentMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  });

  const [formData, setFormData] = useState({
    companyName: settings.companyName,
    salaryCalculationMethod: '30-day' as '30-day' | 'calendar',
    currency: 'INR',
  });

  const [loading, setSaving] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Load selected location
  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = localStorage.getItem(`selectedLocation_${user.id}`);
      setSelectedLocationId(stored || '');
    } catch (_) {}
  }, [user?.id]);

  // Load payroll.settings for selected branch
  useEffect(() => {
    const loadSettings = async () => {
      if (!selectedLocationId) return;
      try {
        // Load branch name
        try {
          const { data: loc, error: locErr } = await supabase
            .from('locations')
            .select('name')
            .eq('id', selectedLocationId)
            .maybeSingle();
          if (!locErr && loc?.name) {
            setBranchName(loc.name);
            setFormData(prev => ({ ...prev, companyName: loc.name }));
          }
        } catch (_) {}

        for (const table of ['payroll_settings', 'payroll.settings']) {
          try {
            const { data, error } = await supabase
              .from(table)
              .select('salary_calc_method, currency')
              .eq('branch_id', selectedLocationId)
              .maybeSingle();
            if (error) throw error;
            if (data) {
              setFormData(prev => ({
                ...prev,
                salaryCalculationMethod: data.salary_calc_method === 'calendar' ? 'calendar' : '30-day',
                currency: data.currency || 'INR',
              }));
              break;
            }
          } catch (_) {}
        }
      } catch (_) {
        // ignore
      }
    };
    loadSettings();
  }, [selectedLocationId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!selectedLocationId) {
        toast({ title: 'No location selected', description: 'Select a location to save settings for.', variant: 'destructive' });
        return;
      }
      const payload = {
        branch_id: selectedLocationId,
        salary_calc_method: formData.salaryCalculationMethod,
        currency: formData.currency || 'INR',
      } as any;
      let lastError: any = null;
      for (const table of ['payroll_settings', 'payroll.settings']) {
        try {
          const { error } = await supabase.from(table).upsert(payload);
          if (error) throw error;
          lastError = null;
          break;
        } catch (e) {
          lastError = e;
        }
      }
      if (lastError) throw lastError;
      setSettings(prev => ({ ...prev, companyName: formData.companyName }));
      toast({
        title: 'Settings saved',
        description: 'Branch payroll settings updated.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const isOwner = user?.role === 'owner';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences and configuration
        </p>
      </div>

      {/* Company Settings */}
      <div className="business-card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Company Information</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <div className="form-input bg-muted/50">
                {branchName || formData.companyName || '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This will appear on reports and documents
              </p>
            </div>
            
            <div className="form-group">
              <label className="form-label">Current Period</label>
              <div className="flex space-x-2">
                <Input
                  type="month"
                  value={settings.currentMonth}
                  onChange={(e) => setSettings(prev => ({ ...prev, currentMonth: e.target.value }))}
                  className="form-input"
                  disabled={!isOwner}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active month for calculations and reports
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Settings */}
      <div className="business-card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <Calculator className="h-6 w-6 text-success" />
            <h3 className="text-lg font-semibold text-foreground">Payroll Configuration</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="form-group">
            <label className="form-label">Salary Calculation Method</label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="30day"
                  value="30-day"
                  checked={formData.salaryCalculationMethod === '30-day'}
                  onChange={(e) => handleInputChange('salaryCalculationMethod', e.target.value)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                  disabled={!isOwner}
                />
                <label htmlFor="30day" className="text-sm text-foreground">
                  <strong>30-Day Fixed Month</strong> - Always calculate based on 30 days
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="calendar"
                  value="calendar"
                  checked={formData.salaryCalculationMethod === 'calendar'}
                  onChange={(e) => handleInputChange('salaryCalculationMethod', e.target.value)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                  disabled={!isOwner}
                />
                <label htmlFor="calendar" className="text-sm text-foreground">
                  <strong>Calendar Days</strong> - Calculate based on actual days in the month
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This affects how daily rates are calculated for salary and attendance
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Currency</label>
            <Input
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="form-input max-w-xs"
              placeholder="INR"
              disabled={!isOwner}
            />
            <p className="text-xs text-muted-foreground mt-1">Used for payroll calculations and reports</p>
          </div>

          <div className="p-4 bg-primary-light border border-primary rounded-lg">
            <h4 className="font-medium text-primary mb-2">Calculation Example</h4>
            <div className="text-sm text-primary space-y-1">
              <p>Monthly Salary: ₹30,000</p>
              <p>
                30-Day Method: ₹1,000/day ({formData.salaryCalculationMethod === '30-day' ? '✓ Selected' : ''})
              </p>
              <p>
                {(() => {
                  const ym = (settings.currentMonth || '').split('-');
                  const y = Number(ym[0]) || new Date().getFullYear();
                  const m = Number(ym[1]) || (new Date().getMonth() + 1);
                  const daysInMonth = new Date(y, m, 0).getDate();
                  const perDay = Math.round(30000 / daysInMonth);
                  return `Calendar Method: ₹${perDay}/day ${formData.salaryCalculationMethod === 'calendar' ? '(✓ Selected)' : ''}`;
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Management - Owner Only */}
      {isOwner && (
        <div className="business-card">
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-warning" />
              <h3 className="text-lg font-semibold text-foreground">User Management</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Current User</h4>
                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-medium text-sm">
                      {(user?.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{user?.email || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{user?.role}</p>
                  </div>
                  <span className="ml-auto px-2 py-1 bg-success-light text-success rounded text-xs">
                    Active
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Role Permissions</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Staff Management</span>
                    <span className="text-success">Owner, Manager</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expense Categories</span>
                    <span className="text-warning">Owner Only</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Settings</span>
                    <span className="text-warning">Owner Only</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reports Export</span>
                    <span className="text-success">Owner, Manager</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="business-card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">System Information</h3>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-foreground mb-2">Application</h4>
              <p className="text-sm text-muted-foreground">Business Manager v1.0</p>
              <p className="text-xs text-muted-foreground">React + TypeScript</p>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-2">Database</h4>
              <p className="text-sm text-muted-foreground">Mock API (Development)</p>
              <p className="text-xs text-muted-foreground">Ready for PetaLog integration</p>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-2">Last Backup</h4>
              <p className="text-sm text-muted-foreground">Local Storage</p>
              <p className="text-xs text-muted-foreground">Auto-saved continuously</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {isOwner && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={loading}
            className="btn-primary min-w-[120px]"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}

      {!isOwner && (
        <div className="business-card p-6 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-2">Limited Access</h3>
          <p className="text-muted-foreground">
            You have Manager-level access. Contact your administrator to modify system settings.
          </p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;