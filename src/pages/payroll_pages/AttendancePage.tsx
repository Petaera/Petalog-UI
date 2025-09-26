import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock,
  Coffee,
  Search,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';

interface Staff {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface DailyAttendance {
  staffId: string;
  status: 'Present' | 'Absent' | 'Paid Leave' | 'Unpaid Leave';
  notes?: string;
}

const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dailyAttendance, setDailyAttendance] = useState<Record<string, DailyAttendance>>({});
  const [saving, setSaving] = useState(false);
  const [showLongLeaveForm, setShowLongLeaveForm] = useState(false);
  const [leaveStaffId, setLeaveStaffId] = useState<string>('');
  const [leaveStartDate, setLeaveStartDate] = useState<string>('');
  const [leaveEndDate, setLeaveEndDate] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'Paid' | 'Unpaid' | ''>('');
  const [leaveNotes, setLeaveNotes] = useState<string>('');
  const [leaveSaving, setLeaveSaving] = useState(false);
  const selectedLocationId = useSelectedLocation();

  const submitLongLeave = async () => {
    if (user?.role !== 'manager' && user?.role !== 'owner') {
      toast({
        title: 'Access Denied',
        description: 'Only managers can apply long leaves',
        variant: 'destructive'
      });
      return;
    }
    if (!leaveStaffId || !leaveStartDate || !leaveEndDate || !leaveType) {
      toast({ title: 'Missing fields', description: 'Select staff, dates, and leave type.', variant: 'destructive' });
      return;
    }
    try {
      setLeaveSaving(true);
      const { error } = await supabase
        .from('staff_leave_periods')
        .insert({
          staff_id: leaveStaffId,
          start_date: leaveStartDate,
          end_date: leaveEndDate,
          leave_type: leaveType,
          notes: leaveNotes || null,
        });
      if (error) throw error;
      toast({ title: 'Long leave added', description: 'Leave period saved successfully.' });
      setShowLongLeaveForm(false);
      setLeaveStaffId('');
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveType('');
      setLeaveNotes('');
    } catch (err) {
      console.error('Error applying long leave:', err);
      toast({ title: 'Error', description: 'Failed to save long leave.', variant: 'destructive' });
    } finally {
      setLeaveSaving(false);
    }
  };


  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (!selectedLocationId) {
          setStaff([]);
          setDailyAttendance({});
          setLoading(false);
          return;
        }
        
        // Fetch staff with schema fallback (payroll -> public)
        const fetchStaff = async () => {
          let q = supabase
            .from('staff')
            .select('id, name, role_title, is_active, branch_id')
            .eq('is_active', true)
            .eq('branch_id', selectedLocationId);
          const { data, error } = await q;
          if (error) throw error;
          return data || [];
        };

        const rawStaff = await fetchStaff();
        
        // Map DB -> UI model
        const mappedStaff: Staff[] = (rawStaff || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          role: (s.role_title || s.role || ''),
          isActive: !!(s.is_active ?? s.isActive),
        }));

        setStaff(mappedStaff);

        // Initialize attendance map with defaults first
        const defaultAttendanceMap: Record<string, DailyAttendance> = {};
        mappedStaff.forEach(member => {
          defaultAttendanceMap[member.id] = {
            staffId: member.id,
            status: 'Present',
            notes: ''
          };
        });

        // Load any existing attendance for the selected date and overlay (with fallback)
        const staffIdsForFilter = mappedStaff.map(s => s.id);

        const fetchAttendance = async () => {
          const { data, error } = await supabase
            .from('attendance')
            .select('staff_id, status, notes')
            .eq('date', selectedDate);
          if (error) throw error;
          // We store only non-Present rows; treat missing rows as Present
          return data || [];
        };

        const existingAttendance = await fetchAttendance();

        const attendanceMap: Record<string, DailyAttendance> = { ...defaultAttendanceMap };
        (existingAttendance || [])
          .filter((rec: any) => staffIdsForFilter.includes(rec.staff_id))
          .forEach((rec: any) => {
          if (attendanceMap[rec.staff_id]) {
            attendanceMap[rec.staff_id] = {
              staffId: rec.staff_id,
              status: rec.status,
              notes: rec.notes || ''
            };
          }
        });
        setDailyAttendance(attendanceMap);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load staff/attendance data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedLocationId]);

  // Reload attendance when date changes (after staff is loaded)
  useEffect(() => {
    const loadAttendanceForDate = async () => {
      if (staff.length === 0) return;
      try {
        setLoading(true);
        // Start from defaults
        const defaults: Record<string, DailyAttendance> = {};
        staff.forEach(member => {
          defaults[member.id] = {
            staffId: member.id,
            status: 'Present',
            notes: ''
          };
        });

        const staffIdsForFilter = staff.map(s => s.id);

        // Attendance fetch with schema fallback
        const fetchAttendance = async () => {
          const { data, error } = await supabase
            .from('attendance')
            .select('staff_id, status, notes')
            .eq('date', selectedDate);
          if (error) throw error;
          return data || [];
        };

        const existingAttendance = await fetchAttendance();

        const attendanceMap: Record<string, DailyAttendance> = { ...defaults };
        (existingAttendance || [])
          .filter((rec: any) => staffIdsForFilter.includes(rec.staff_id))
          .forEach((rec: any) => {
          if (attendanceMap[rec.staff_id]) {
            attendanceMap[rec.staff_id] = {
              staffId: rec.staff_id,
              status: rec.status,
              notes: rec.notes || ''
            };
          }
        });
        setDailyAttendance(attendanceMap);
      } catch (err) {
        console.error('Error loading attendance for date:', err);
        toast({
          title: 'Error',
          description: 'Failed to load attendance for selected date',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceForDate();
  }, [selectedDate, staff]);

  const filteredStaff = staff.filter(member => 
    member.isActive && 
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateAttendanceStatus = (staffId: string, status: DailyAttendance['status']) => {
    setDailyAttendance(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        status
      }
    }));
  };

  const updateNotes = (staffId: string, notes: string) => {
    setDailyAttendance(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        notes
      }
    }));
  };

  const saveAttendance = async () => {
    if (user?.role !== 'manager' && user?.role !== 'owner') {
      toast({
        title: "Access Denied",
        description: "Only managers can mark attendance",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      const allRecords = Object.values(dailyAttendance).map(record => ({
        staff_id: record.staffId,
        date: selectedDate,
        status: record.status,
        notes: record.notes || null
      }));
      // Store only non-Present rows; absence of a row means Present by default
      const attendanceRecords = allRecords.filter(r => r.status !== 'Present');

      if (!selectedDate) {
        toast({
          title: 'Invalid date',
          description: 'Please select a valid date.',
          variant: 'destructive'
        });
        return;
      }

      // Replace attendance records for the selected date to avoid duplicates
      // We clear for all visible staff to ensure old explicit 'Present' rows are removed
      const staffIds = allRecords.map(r => r.staff_id);

      // Save strictly to payroll schema; surface clear message if not exposed
      const { error: delErr } = await supabase
        .from('attendance')
        .delete()
        .eq('date', selectedDate)
        .in('staff_id', staffIds);
      if (delErr) {
        throw delErr;
      }

      if (attendanceRecords.length > 0) {
        const { error } = await supabase
          .from('attendance')
          .insert(attendanceRecords);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Attendance saved successfully",
      });
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        title: "Error",
        description: "Failed to save attendance",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: DailyAttendance['status']) => {
    switch (status) {
      case 'Present':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'Absent':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'Paid Leave':
        return <Coffee className="h-4 w-4 text-warning" />;
      case 'Unpaid Leave':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: DailyAttendance['status']) => {
    switch (status) {
      case 'Present':
        return 'border-success bg-success/20 text-success hover:bg-success/30';
      case 'Absent':
        return 'border-destructive bg-destructive/20 text-destructive hover:bg-destructive/30';
      case 'Paid Leave':
        return 'border-warning bg-warning/20 text-warning hover:bg-warning/30';
      case 'Unpaid Leave':
        return 'border-muted-foreground bg-muted/50 text-muted-foreground hover:bg-muted/70';
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
          <h1 className="text-3xl font-bold text-foreground">Daily Attendance</h1>
          <p className="text-muted-foreground">
            Mark attendance for {new Date(selectedDate).toLocaleDateString('en-IN')}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowLongLeaveForm((s) => !s)}
          >
            Apply Long Leave
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input"
          />
          <Button 
            onClick={saveAttendance}
            disabled={saving}
            className="btn-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {showLongLeaveForm && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">Staff</label>
              <select
                value={leaveStaffId}
                onChange={(e) => setLeaveStaffId(e.target.value)}
                className="form-input w-full"
              >
                <option value="">Select staff</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Start date</label>
              <input type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} className="form-input w-full" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">End date</label>
              <input type="date" value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)} className="form-input w-full" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Type</label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as any)} className="form-input w-full">
                <option value="">Select</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-sm text-muted-foreground">Notes</label>
              <input type="text" value={leaveNotes} onChange={(e) => setLeaveNotes(e.target.value)} className="form-input w-full" placeholder="Optional" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={submitLongLeave} disabled={leaveSaving} className="btn-primary w-full">
                {leaveSaving ? 'Saving...' : 'Save Long Leave'}
              </Button>
              <Button variant="outline" onClick={() => setShowLongLeaveForm(false)} className="w-full">Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Attendance Grid */}
      <div className="grid gap-4">
        {filteredStaff.map((member) => {
          const currentAttendance = dailyAttendance[member.id];
          return (
            <Card key={member.id} className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Staff Info */}
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-medium">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>

                {/* Status Buttons */}
                <div className="flex flex-wrap gap-2">
                  {(['Present', 'Absent', 'Paid Leave', 'Unpaid Leave'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={currentAttendance?.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateAttendanceStatus(member.id, status)}
                      className={`transition-all duration-200 ${
                        currentAttendance?.status === status 
                          ? getStatusColor(status) + ' shadow-md' 
                          : 'hover:scale-105 ' + getStatusColor(status)
                      }`}
                    >
                      {getStatusIcon(status)}
                      <span className="ml-2 text-xs font-medium">{status}</span>
                    </Button>
                  ))}
                </div>

                {/* Notes */}
                {(currentAttendance?.status === 'Paid Leave' || 
                  currentAttendance?.status === 'Unpaid Leave' || 
                  currentAttendance?.status === 'Absent') && (
                  <div className="lg:w-64">
                    <Input
                      placeholder="Add notes..."
                      value={currentAttendance?.notes || ''}
                      onChange={(e) => updateNotes(member.id, e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Today's Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {Object.values(dailyAttendance).filter(a => a.status === 'Present').length}
            </div>
            <div className="text-sm text-muted-foreground">Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">
              {Object.values(dailyAttendance).filter(a => a.status === 'Absent').length}
            </div>
            <div className="text-sm text-muted-foreground">Absent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">
              {Object.values(dailyAttendance).filter(a => a.status === 'Paid Leave').length}
            </div>
            <div className="text-sm text-muted-foreground">Paid Leave</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {Object.values(dailyAttendance).filter(a => a.status === 'Unpaid Leave').length}
            </div>
            <div className="text-sm text-muted-foreground">Unpaid Leave</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AttendancePage;