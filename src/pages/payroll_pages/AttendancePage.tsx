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

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch staff from Supabase
        const { data: staffData, error } = await supabase
          .from('staff')
          .select('*')
          .eq('is_active', true);
        
        if (error) throw error;
        
        setStaff(staffData || []);
        
        // Initialize attendance for today
        const attendanceMap: Record<string, DailyAttendance> = {};
        (staffData || []).forEach(member => {
          attendanceMap[member.id] = {
            staffId: member.id,
            status: 'Present',
            notes: ''
          };
        });
        setDailyAttendance(attendanceMap);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load staff data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
      
      const attendanceRecords = Object.values(dailyAttendance).map(record => ({
        staff_id: record.staffId,
        date: selectedDate,
        status: record.status,
        notes: record.notes || null
      }));

      // Save attendance records to Supabase
      const { error } = await supabase
        .from('attendance')
        .insert(attendanceRecords);

      if (error) throw error;

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