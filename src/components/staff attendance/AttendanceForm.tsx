import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Clock, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface StaffMember {
  _id?: string;
  id?: string | number; // fallback local
  name: string;
  position: string;
}

interface AttendanceFormProps {
  isUrdu: boolean;
  onClose: () => void;
  onSave: (attendance: any) => void;
  staffList: StaffMember[];
  staff?: StaffMember | null;
  defaultStaffId?: string;
  defaultDate?: string; // YYYY-MM-DD
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({
  isUrdu,
  onClose,
  onSave,
  staffList = [],
  staff = null,  // Default to null for new attendance
  defaultStaffId,
  defaultDate
}) => {
  // Initialize form with empty/default values
  type AttendanceStatus = 'present' | 'absent' | 'late' | 'halfDay';

  const [formData, setFormData] = useState(() => {
    const preStaff = staffList.find(s=> (s._id||s.id?.toString())===defaultStaffId);
    return {
      staffId: preStaff?._id ?? preStaff?.id ?? null,
      staffName: preStaff?.name ?? '',
      date: defaultDate || new Date().toISOString().split('T')[0],
      status: 'present' as AttendanceStatus,
      notes: ''
    };
  });
  
  const handleStaffChange = (value: string) => {
    const selectedStaff = staffList.find(staff => (staff._id||staff.id?.toString()) === value);
    setFormData(prev => ({
      ...prev,
      staffId: selectedStaff?._id || selectedStaff?.id || null,
      staffName: selectedStaff?.name || ''
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      date: e.target.value
    }));
  };

  const handleStatusChange = (value: AttendanceStatus) => {
    setFormData(prev => ({
      ...prev,
      status: value
    }));
  };

  const text = {
    en: {
      title: 'Mark Attendance',
      staffName: 'Staff Name',
      date: 'Date',
      checkIn: 'Check In Time',
      checkOut: 'Check Out Time',
      status: 'Status',
      notes: 'Notes',
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      halfDay: 'Half Day',
      save: 'Save',
      cancel: 'Cancel'
    },
     
  };

  const t = text.en;

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.staffName.trim()) {
      toast({
        title: 'Please select a staff member',
        variant: 'destructive'
      });
      return;
    }
    
    if (!formData.date) {
      toast({
        title: 'Please enter a date',
        variant: 'destructive'
      });
      return;
    }
    
    if (!formData.status) {
      toast({
        title: 'Please select a status',
        variant: 'destructive'
      });
      return;
    }
    
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t.title}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff">{t.staffName}</Label>
              <Select value={formData.staffId?.toString()||''} onValueChange={handleStaffChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(staff => (
                    <SelectItem key={staff._id||staff.id} value={(staff._id||staff.id).toString()}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{t.date} <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={formData.date}
                onChange={handleDateChange}
                required
              />
            </div>

            <div>
              <Label>{t.status}</Label>
              <Select 
                value={formData.status} 
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">{t.present}</SelectItem>
                  <SelectItem value="absent">{t.absent}</SelectItem>
                  <SelectItem value="late">{t.late}</SelectItem>
                  <SelectItem value="halfDay">{t.halfDay}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <Button type="submit" className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {t.save}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                {t.cancel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceForm;
