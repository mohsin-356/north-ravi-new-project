import React, { useState, useEffect } from 'react';
import { getDailyAttendance } from '@/pharmacy utilites/staffService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Clock, 
  User,
  Download,
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  FileText,
  Calendar as CalendarIcon
} from 'lucide-react';
import { MonthYearPicker } from '@/components/Pharmacy components/ui/month-year-picker';
import type { UIStaff } from '@/pharmacy utilites/staffService';
import ConfirmStaffDeleteDialog from './ConfirmStaffDeleteDialog';
import { getStaff as fetchStaff, getStaffById, addStaff as apiAddStaff, updateStaff as apiUpdateStaff, deleteStaff as apiDeleteStaff, clockIn as apiClockIn, clockOut as apiClockOut } from '@/pharmacy utilites/staffService';
import AttendanceForm from './AttendanceForm';
import StaffForm from './StaffForm';
import StaffReport from './StaffReport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface StaffAttendanceProps {
  isUrdu: boolean;
}

type TranslationKeys = {
  title: string;
  attendance: string;
  staffManagement: string;
  searchPlaceholder: string;
  addAttendance: string;
  addStaff: string;
  exportReport: string;
  dailyView: string;
  monthlyView: string;
  filterMonth: string;
  staffName: string;
  position: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  notes: string;
  present: string;
  absent: string;
  late: string;
  halfDay: string;
  phone: string;
  email: string;
  salary: string;
  joinDate: string;
  edit: string;
  delete: string;
  view: string;
  pharmacist: string;
  assistant: string;
  cashier: string;
  manager: string;
  active: string;
  inactive: string;
  noRecords: string;
  noRecordsDesc: string;
  employee: string;
  time: string;
};

const StaffAttendance: React.FC<StaffAttendanceProps> = ({ isUrdu }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showStaffReport, setShowStaffReport] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [loadingButton, setLoadingButton] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [salaryData, setSalaryData] = useState<any[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
  const [deductionRecords, setDeductionRecords] = useState<any[]>([]);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeductionDialog, setShowDeductionDialog] = useState(false);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [leaveData, setLeaveData] = useState({ days: 0, reason: '', type: '' });
  const [deductionData, setDeductionData] = useState({ amount: 0, reason: '' });
  const [salaryDataState, setSalaryDataState] = useState({ amount: 0, bonus: 0, month: '' });
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  // backend-driven attendance
  const [dailyRows, setDailyRows] = useState<any[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedEmployeeId,setSelectedEmployeeId]=useState('');
  const [attendanceDefaults,setAttendanceDefaults]=useState<{staffId?:string;date?:string}>({});
  const [lastRefreshed,setLastRefreshed]=useState('');

  // Attendance Settings state
  const [attendanceSettings, setAttendanceSettings] = useState(() => {
    const saved = localStorage.getItem('pharmacy_attendance_settings');
    return saved
      ? JSON.parse(saved)
      : {
          leaveDeduction: 0,
          lateDeduction: 0,
          earlyOutDeduction: 0,
          clockInTime: '09:00',
          clockOutTime: '18:00',
        };
  });

  // Helpers to convert between input type="time" (HH:MM 24h) and backend's 'hh:mm am/pm'
  const toAmPm = (hhmm: string) => {
    if (!hhmm) return '09:00 am';
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const hour12 = ((h % 12) || 12).toString().padStart(2, '0');
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };
  const fromAmPm = (s: string) => {
    if (!s) return '09:00';
    const parts = s.trim().toLowerCase().split(/[:\s]/g); // [hh, mm, am/pm]
    if (parts.length < 3) return s; // already HH:MM
    const hh = parseInt(parts[0], 10);
    const mm = parts[1];
    const ap = parts[2];
    let h24 = hh % 12;
    if (ap === 'pm') h24 += 12;
    return `${h24.toString().padStart(2, '0')}:${mm}`;
  };

  // Save attendance settings to localStorage
  useEffect(() => {
    localStorage.setItem('pharmacy_attendance_settings', JSON.stringify(attendanceSettings));
  }, [attendanceSettings]);

  // Load settings from backend once (and hydrate local state)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/staff-settings');
        if (!res.ok) return; // keep defaults/local if backend not ready
        const doc = await res.json();
        setAttendanceSettings({
          leaveDeduction: doc.leaveDeduction ?? 0,
          lateDeduction: doc.lateDeduction ?? 0,
          earlyOutDeduction: doc.earlyOutDeduction ?? 0,
          clockInTime: fromAmPm(doc.officialClockIn || '09:00 am'),
          clockOutTime: fromAmPm(doc.officialClockOut || '06:00 pm'),
        });
      } catch {}
    })();
  }, []);

  // (Removed old handleSaveSettings; Save button directly performs PUT)

  // Load initial data from localStorage or use default data
  const loadInitialData = () => {
    const savedStaff = localStorage.getItem('pharmacy_staff');
    const savedAttendance = localStorage.getItem('pharmacy_attendance');
    const savedSalaries = localStorage.getItem('pharmacy_salaries');
    const savedLeaves = localStorage.getItem('pharmacy_leaves');
    const savedDeductions = localStorage.getItem('pharmacy_deductions');
    
    const defaultStaff = [
      {
        id: 1,
        name: 'Dr. Ahmad Hassan',
        position: 'pharmacist',
        phone: '+92-300-1234567',
        email: 'ahmad@pharmacare.com',
        address: 'Gulshan-e-Iqbal, Karachi',
        salary: '85000',
        joinDate: '2020-01-15',
        status: 'active',
        attendanceRecords: []
      },
      {
        id: 2,
        name: 'Ms. Fatima Khan',
        position: 'assistant',
        phone: '+92-321-9876543',
        email: 'fatima@pharmacare.com',
        address: 'North Nazimabad, Karachi',
        salary: '45000',
        joinDate: '2021-03-20',
        status: 'active',
        attendanceRecords: []
      }
    ];

    const defaultAttendance = [
      { id: 1, staffId: 1, staffName: 'Dr. Ahmad Hassan', date: new Date().toISOString().split('T')[0], checkIn: '09:00', checkOut: '18:00', status: 'present', notes: '' },
      { id: 2, staffId: 2, staffName: 'Ms. Fatima Khan', date: new Date().toISOString().split('T')[0], checkIn: '09:05', checkOut: '17:00', status: 'late', notes: 'Traffic delay' }
    ];

    return {
      staff: savedStaff ? JSON.parse(savedStaff) : defaultStaff,
      attendance: savedAttendance ? JSON.parse(savedAttendance) : defaultAttendance,
      salaries: savedSalaries ? JSON.parse(savedSalaries) : [],
      leaves: savedLeaves ? JSON.parse(savedLeaves) : [],
      deductions: savedDeductions ? JSON.parse(savedDeductions) : []
    };
  };

  const [staff, setStaff] = useState<any[]>([]);
  const [salaries, setSalaries] = useState(loadInitialData().salaries);
  const [leaves, setLeaves] = useState(loadInitialData().leaves);
  const [deductions, setDeductions] = useState(loadInitialData().deductions);

  // --- Load staff list from backend on mount ---
  useEffect(() => {
    fetchStaff()
      .then(setStaff)
      .catch(err => {
        console.error('Failed to fetch staff list from backend, falling back to local data', err);
        setStaff(loadInitialData().staff);
      });
  }, []);

  // Save to localStorage whenever staff or attendance changes
  useEffect(() => {
    localStorage.setItem('pharmacy_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('pharmacy_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('pharmacy_salaries', JSON.stringify(salaries));
  }, [salaries]);

  useEffect(() => {
    localStorage.setItem('pharmacy_leaves', JSON.stringify(leaves));
  }, [leaves]);

  useEffect(() => {
    localStorage.setItem('pharmacy_deductions', JSON.stringify(deductions));
  }, [deductions]);

  // This useEffect is removed to favor fetching live data from the backend when a profile is viewed.

  const text = {
    en: {
      title: 'Staff & Attendance',
      attendance: 'Attendance',
      staffManagement: 'Staff Management',
      searchPlaceholder: 'Search staff...',
      addAttendance: 'Add Attendance',
      addStaff: 'Add Staff',
      exportReport: 'Export Report',
      dailyView: 'Daily View',
      monthlyView: 'Monthly View',
      filterMonth: 'Filter by Month',
      staffName: 'Staff Name',
      position: 'Position',
      date: 'Date',
      checkIn: 'Check In',
      checkOut: 'Check Out',
      status: 'Status',
      notes: 'Notes',
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      halfDay: 'Half Day',
      phone: 'Phone',
      email: 'Email',
      salary: 'Salary',
      joinDate: 'Join Date',
      edit: 'Edit',
      delete: 'Delete',
      view: 'View',
      pharmacist: 'Pharmacist',
      assistant: 'Assistant',
      cashier: 'Cashier',
      manager: 'Manager',
      active: 'Active',
      inactive: 'Inactive',
      noRecords: 'No attendance records',
      noRecordsDesc: 'No attendance records found for the selected period',
      employee: 'Employee',
      time: 'Time',
    },
    ur: {
      title: 'عملہ اور حاضری',
      attendance: 'حاضری',
      staffManagement: 'عملے کا انتظام',
      searchPlaceholder: 'عملہ تلاش کریں...',
      addAttendance: 'حاضری شامل کریں',
      addStaff: 'عملہ شامل کریں',
      exportReport: 'رپورٹ برآمد کریں',
      dailyView: 'روزانہ نظارہ',
      monthlyView: 'ماہانہ نظارہ',
      filterMonth: 'مہینے کے ذریعے فلٹر',
      staffName: 'عملے کا نام',
      position: 'عہدہ',
      date: 'تاریخ',
      checkIn: 'آمد',
      checkOut: 'رخصت',
      status: 'حالت',
      notes: 'نوٹس',
      present: 'حاضر',
      absent: 'غائب',
      late: 'دیر',
      halfDay: 'آدھا دن',
      phone: 'فون',
      email: 'ای میل',
      salary: 'تنخواہ',
      joinDate: 'شمولیت کی تاریخ',
      edit: 'تبدیل کریں',
      delete: 'حذف کریں',
      view: 'دیکھیں',
      pharmacist: 'فارماسسٹ',
      assistant: 'اسسٹنٹ',
      cashier: 'کیشیئر',
      manager: 'منیجر',
      active: 'فعال',
      inactive: 'غیر فعال',
      noRecords: 'کوئی حاضری ریکارڈ نہیں ملا',
      noRecordsDesc: 'منتخب مدت کے لیے کوئی حاضری کا ریکارڈ دستیاب نہیں ہے',
      employee: 'ملازم',
      time: 'وقت',
    }
  };

  const t = text.en;

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAttendance = attendanceRecords.filter(record => {
    const matchesSearch = searchTerm === '' || 
      record.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = record.date.startsWith(selectedMonth);
    return matchesSearch && matchesDate;
  });

  const todaysAttendance = attendanceRecords.filter(
    record => record.date === new Date().toISOString().split('T')[0]
  );

  // Save / update staff via backend
  const handleSaveStaff = async (formData: any) => {
    try {
      // sanitize payload
      // map only allowed fields
      const payload: any = {
        name: formData.name.trim(),
        designation: formData.position,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        status: formData.status || 'active',
      } as any;
      if (formData.salary) payload.salary = Number(formData.salary);
      if (formData.joinDate) payload.joinDate = new Date(formData.joinDate);
      

      if (editingStaff && editingStaff._id) {
        await apiUpdateStaff(editingStaff._id, payload);
      } else {
        await apiAddStaff(payload);
      }
      const refreshed = await fetchStaff();
      setStaff(refreshed);
    } catch (err) {
      console.error('Failed to save staff:', err);
    }
  };

  const handleAddAttendance = async (attendanceData: any) => {
    try {
      // 1. persist to backend
      await fetch(`/api/staff/${attendanceData.staffId}/attendance`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(attendanceData)
      });

      // 2. update local state for instant UI feedback
      setStaff(prev=>prev.map(s=> (String(s._id||s.id)===String(attendanceData.staffId))
        ? {...s, attendance:[...(s.attendance||[]), attendanceData]}
        : s));

      // refresh daily and monthly views
      getDailyAttendance().then(setDailyRows).catch(()=>{});
      if(activeTab==='monthly' && selectedEmployeeId===String(attendanceData.staffId)){
        setMonthlyRows(m=>[...m, attendanceData]);
      }

      toast({title: isUrdu? 'حاضری محفوظ ہو گئی':'Attendance saved'});
    } catch(err){
      console.error(err);
      toast({variant:'destructive', title:isUrdu? 'حاضری محفوظ کرنے میں ناکامی':'Failed to save attendance'});
    } finally { setShowAttendanceForm(false);} };



  const handleEditStaff = (staffMember: any) => {
    setEditingStaff(staffMember);
    setShowStaffForm(true);
  };

  const handleViewProfile = async (staffMember: any) => {
    if (!staffMember._id) {
      toast({
        title: 'Cannot load profile for unsaved staff member.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const fullProfile = await getStaffById(staffMember._id);
      setSelectedEmployee(fullProfile);
      setShowProfile(true);
    } catch (err) {
      console.error('Failed to fetch staff profile:', err);
      toast({
        title: 'Failed to load staff profile.',
        description: 'Please check the console for more details.',
        variant: 'destructive',
      });
    }
  };

  // ---- Delete staff helpers ----
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<UIStaff | null>(null);

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    try {
      if (staffToDelete._id) {
        await apiDeleteStaff(staffToDelete._id);
      }
      setStaff(prev => prev.filter(s => s._id !== staffToDelete?._id));
      toast({ title: 'Staff deleted', variant: 'default' });
    } catch (err) {
      console.error('Failed to delete staff:', err);
      toast({ title: 'Failed to delete staff', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    }
  };

  const handleRequestDeleteStaff = (staffMember: UIStaff) => {
    setStaffToDelete(staffMember);
    setDeleteDialogOpen(true);
  };

  const handleTimeAction = async (record: any, action: 'checkIn' | 'checkOut') => {
    const buttonId = `${record.staffId}-${record.date}-${action}`;
    setLoadingButton(buttonId);
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    // Determine if this is a new record or updating an existing one
    const existingRecordIndex = attendanceRecords.findIndex(
      r => r.staffId === record.staffId && r.date === record.date
    );

    const updatedRecord = {
      ...record,
      [action]: timeString,
      status: action === 'checkIn' ? 'present' : record.status
    };

    let updatedRecords;
    if (existingRecordIndex >= 0) {
      // Update existing record
      updatedRecords = [...attendanceRecords];
      updatedRecords[existingRecordIndex] = updatedRecord;
    } else {
      // Add new record
      updatedRecords = [...attendanceRecords, updatedRecord];
    }

    setAttendanceRecords(updatedRecords);
    
    // Save to localStorage
    localStorage.setItem('pharmacy_attendance', JSON.stringify(updatedRecords));
    
    // Reset loading state after a short delay
    setTimeout(() => setLoadingButton(null), 300);
  };

  const exportAttendanceReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Staff Name,Date,Check In,Check Out,Status,Notes\n"
      + filteredAttendance.map(record => 
          `${record.staffName},${record.date},${record.checkIn},${record.checkOut},${record.status},${record.notes}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const refreshAll = async () => {
    try {
      const refreshed = await fetchStaff();
      setStaff(refreshed);
    } catch (err) { console.error(err); }
    getDailyAttendance().then(setDailyRows).catch(()=>{});
    if(activeTab==='monthly' && selectedEmployeeId){
      const res = await fetch(`/api/staff/${selectedEmployeeId}`);
      if(res.ok){ const data=await res.json(); setMonthlyRows(data.attendance||[]);} }
    setLastRefreshed(new Date().toLocaleTimeString());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'halfDay':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "destructive" | "secondary" | "outline" } = {
      present: 'default',
      absent: 'destructive',
      late: 'secondary',
      halfDay: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{t[status as keyof typeof t] || status}</Badge>;
  };

  const handleClockInOut = async (staffId: string) => {
    setLoadingButton(`clock-${staffId}`);
    
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Check if staff has already clocked in today
      const existingRecord = attendanceRecords.find(
        (record) => record.staffId === staffId && record.date === today
      );
      
      if (existingRecord) {
        // Clock out
        const updatedRecord = {
          ...existingRecord,
          clockOut: now.toISOString(),
          hoursWorked: calculateHoursWorked(existingRecord.clockIn, now.toISOString())
        };
        
        // Update attendance record
        const updatedAttendance = attendanceRecords.map(record => 
          record.id === existingRecord.id ? updatedRecord : record
        );
        
        setAttendanceRecords(updatedAttendance);
        localStorage.setItem('pharmacy_attendance', JSON.stringify(updatedAttendance));
      } else {
        // Clock in
        const newRecord = {
          id: Math.random().toString(36).substr(2, 9),
          staffId,
          date: today,
          clockIn: now.toISOString(),
          status: 'Present'
        };
        
        setAttendanceRecords([...attendanceRecords, newRecord]);
        localStorage.setItem(
          'pharmacy_attendance', 
          JSON.stringify([...attendanceRecords, newRecord])
        );
      }
    } finally {
      setLoadingButton(null);
    }
  };

  const calculateHoursWorked = (clockIn: string, clockOut: string) => {
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    return ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2);
  };

  const handleRequestDelete = (item: any) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    // First verification - show success message but don't delete yet
    // toast({
    //   title: 'First verification complete',
    //   description: 'Please confirm again to permanently delete',
    //   variant: 'default'
    // });
    
    // Set a timeout to reset if not confirmed within 10 seconds
    setTimeout(() => {
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        setItemToDelete(null);
      }
    }, 10000);
  };

  const finalConfirmDelete = () => {
    if (!itemToDelete) return;
    
    // Actual deletion logic here
    if (activeTab === 'staff') {
      const updatedStaff = staff.filter(staff => staff.id !== itemToDelete.id);
      setStaff(updatedStaff);
      localStorage.setItem('pharmacy_staff', JSON.stringify(updatedStaff));
    } else {
      const updatedAttendance = attendanceRecords.filter(record => record.id !== itemToDelete.id);
      setAttendanceRecords(updatedAttendance);
      localStorage.setItem('pharmacy_attendance', JSON.stringify(updatedAttendance));
    }
    
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    
    // toast({
    //   title: 'Successfully deleted',
    //   description: 'The record has been permanently removed',
    //   variant: 'default'
    // });
  };

  const handleAddLeave = async () => {
    try {
      const updatedLeaves = [...leaveRecords];
      updatedLeaves.push({
        id: Date.now().toString(),
        staffId: currentStaff.id,
        staffName: currentStaff.name,
        ...leaveData,
        date: new Date().toISOString().split('T')[0]
      });
      
      setLeaveRecords(updatedLeaves);
      localStorage.setItem('pharmacy_leaves', JSON.stringify(updatedLeaves));
      
      // toast({
      //   title: isUrdu ? 'چھٹی درج ہو گئی' : 'Leave Added',
      //   description: isUrdu 
      //     ? `${currentStaff.name} کی چھٹی کامیابی سے درج ہو گئی` 
      //     : `Leave recorded for ${currentStaff.name}`,
      //   variant: 'default'
      // });
      
      setShowLeaveDialog(false);
      setLeaveData({ days: 0, reason: '', type: '' });
    } catch (error) {
      console.error('Failed to add leave:', error);
      // toast({
      //   title: isUrdu ? 'خرابی' : 'Error',
      //   description: isUrdu 
      //     ? 'چھٹی درج کرنے میں خرابی آئی ہے' 
      //     : 'Failed to record leave',
      //   variant: 'destructive'
      // });
    }
  };

  const handleAddDeduction = async () => {
    try {
      const updatedDeductions = [...deductionRecords];
      updatedDeductions.push({
        id: Date.now().toString(),
        staffId: currentStaff.id,
        staffName: currentStaff.name,
        ...deductionData,
        date: new Date().toISOString().split('T')[0]
      });
      
      setDeductionRecords(updatedDeductions);
      localStorage.setItem('pharmacy_deductions', JSON.stringify(updatedDeductions));
      
      // toast({
      //   title: isUrdu ? 'کٹوتی درج ہو گئی' : 'Deduction Added',
      //   description: isUrdu 
      //     ? `${currentStaff.name} کی کٹوتی کامیابی سے درج ہو گئی` 
      //     : `Deduction recorded for ${currentStaff.name}`,
      //   variant: 'default'
      // });
      
      setShowDeductionDialog(false);
      setDeductionData({ amount: 0, reason: '' });
    } catch (error) {
      console.error('Failed to add deduction:', error);
      // toast({
      //   title: isUrdu ? 'خرابی' : 'Error',
      //   description: isUrdu 
      //     ? 'کٹوتی درج کرنے میں خرابی آئی ہے' 
      //     : 'Failed to record deduction',
      //   variant: 'destructive'
      // });
    }
  };

  const handleAddSalary = async () => {
    try {
      const updatedSalaries = [...salaryRecords];
      updatedSalaries.push({
        id: Date.now().toString(),
        staffId: currentStaff.id,
        staffName: currentStaff.name,
        ...salaryDataState,
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
      
      setSalaryRecords(updatedSalaries);
      localStorage.setItem('pharmacy_salaries', JSON.stringify(updatedSalaries));
      
      // toast({
      //   title: isUrdu ? 'تنخواہ درج ہو گئی' : 'Salary Added',
      //   description: isUrdu 
      //     ? `${currentStaff.name} کی تنخواہ کامیابی سے درج ہو گئی` 
      //     : `Salary recorded for ${currentStaff.name}`,
      //   variant: 'default'
      // });
      
      setShowSalaryDialog(false);
      setSalaryDataState({ amount: 0, bonus: 0, month: '' });
    } catch (error) {
      console.error('Failed to add salary:', error);
      // toast({
      //   title: isUrdu ? 'خرابی' : 'Error',
      //   description: isUrdu 
      //     ? 'تنخواہ درج کرنے میں خرابی آئی ہے' 
      //     : 'Failed to record salary',
      //   variant: 'destructive'
      // });
    }
  };

  const handleDeleteConfirmation = (item: any, type: 'staff' | 'attendance' | 'leave' | 'deduction' | 'salary') => {
    setItemToDelete({ ...item, type });
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    try {
      if (!itemToDelete) return;
      
      switch (itemToDelete.type) {
        case 'staff':
          const updatedStaff = staff.filter((s: any) => s.id !== itemToDelete.id);
          setStaff(updatedStaff);
          localStorage.setItem('pharmacy_staff', JSON.stringify(updatedStaff));
          break;
        
        case 'attendance':
          const updatedAttendance = attendanceRecords.filter((a: any) => a.id !== itemToDelete.id);
          setAttendanceRecords(updatedAttendance);
          localStorage.setItem('pharmacy_attendance', JSON.stringify(updatedAttendance));
          break;
          
        case 'leave':
          const updatedLeaves = leaveRecords.filter((l: any) => l.id !== itemToDelete.id);
          setLeaveRecords(updatedLeaves);
          localStorage.setItem('pharmacy_leaves', JSON.stringify(updatedLeaves));
          break;
          
        case 'deduction':
          const updatedDeductions = deductionRecords.filter((d: any) => d.id !== itemToDelete.id);
          setDeductionRecords(updatedDeductions);
          localStorage.setItem('pharmacy_deductions', JSON.stringify(updatedDeductions));
          break;
          
        case 'salary':
          const updatedSalaries = salaryRecords.filter((s: any) => s.id !== itemToDelete.id);
          setSalaryRecords(updatedSalaries);
          localStorage.setItem('pharmacy_salaries', JSON.stringify(updatedSalaries));
          break;
      }
      
      // toast({
      //   title: isUrdu ? 'کامیابی' : 'Success',
      //   description: isUrdu 
      //     ? 'ریکارڈ کامیابی سے حذف ہو گیا' 
      //     : 'Record deleted successfully',
      //   variant: 'default'
      // });
    } catch (error) {
      console.error('Failed to delete:', error);
      // toast({
      //   title: isUrdu ? 'خرابی' : 'Error',
      //   description: isUrdu 
      //     ? 'ریکارڈ حذف کرنے میں خرابی آئی ہے' 
      //     : 'Failed to delete record',
      //   variant: 'destructive'
      // });
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  // fetch today on mount
  useEffect(() => {
    getDailyAttendance().then(setDailyRows).catch(console.error);
  }, []);

  // add effect for selectedMonth when tab monthly active
  useEffect(()=>{
    if(activeTab!=='monthly' || !selectedEmployeeId) return;
    (async ()=>{
      try{
        const res=await fetch(`/api/staff/${selectedEmployeeId}`);
        if(!res.ok) throw new Error('net');
        const staffRec=await res.json();
        const [yr,mo]=selectedMonth.split('-').map(Number);
        const start=new Date(yr,mo-1,1);
        const end=new Date(yr,mo,1);
        const rows=(staffRec.attendance||[]).filter((a:any)=>{
          const d=new Date(a.date);
          return d>=start && d<end;
        });
        setMonthlyRows(rows);
      }catch{setMonthlyRows([]);} })();
  },[activeTab,selectedMonth,selectedEmployeeId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <div className="flex space-x-2 items-center">
          {lastRefreshed && <span className="text-sm text-gray-500">Refreshed: {lastRefreshed}</span>}
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={exportAttendanceReport}>
            <Download className="h-4 w-4 mr-2" />
            {t.exportReport}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily">{t.dailyView}</TabsTrigger>
          <TabsTrigger value="monthly">{t.monthlyView}</TabsTrigger>
          <TabsTrigger value="staff">{t.staffManagement}</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5" />
                <span>{t.dailyView} - {new Date().toLocaleDateString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyRows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.employee}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.time}</TableHead>
                      <TableHead>{t.notes}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyRows.map((record) => (
                      <TableRow key={record.staffId}>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.checkIn ?? '--:--'} - {record.checkOut ?? '--:--'}</TableCell>
                        <TableCell>{record.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>{t.noRecords}</p>
                  <p className="text-sm">{t.noRecordsDesc}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="w-64"><SelectValue placeholder={t.staffName}/></SelectTrigger>
              <SelectContent>
                {staff.map(s=><SelectItem key={s._id||s.id} value={s._id||s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <MonthYearPicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                className="w-full sm:w-48"
              />
              <Button 
                onClick={() => { if(selectedEmployeeId){ setAttendanceDefaults({staffId:String(selectedEmployeeId),date:selectedMonth+'-01'});} setShowAttendanceForm(true); }}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t.addAttendance}
              </Button>
            </div>
          </div>
          {monthlyRows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>{t.noRecords}</p>
              <p className="text-sm">{t.noRecordsDesc}</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5" />
                  <span>{t.monthlyView} - {selectedMonth}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyRows.map((record) => (
                    <div key={`${record.staffId}-${record.date}`} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{record.staffName}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col space-y-2">
                          <div className="text-sm text-center">
                            <div className="text-gray-500 text-xs mb-1">{t.checkIn}</div>
                            <div className="font-medium">{record.checkIn ?? '--:--'}</div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-1 text-xs h-7 min-w-[100px]"
                              onClick={() => handleTimeAction(record, 'checkIn')}
                              disabled={!!loadingButton}
                            >
                              {loadingButton === `${record.staffId}-${record.date}-checkIn` ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {loadingButton === `${record.staffId}-${record.date}-checkIn` ? 'Saving...' : t.checkIn}
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <div className="text-sm text-center">
                            <div className="text-gray-500 text-xs mb-1">{t.checkOut}</div>
                            <div className="font-medium">{record.checkOut ?? '--:--'}</div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-1 text-xs h-7 min-w-[100px]"
                              onClick={() => handleTimeAction(record, 'checkOut')}
                              disabled={!!loadingButton}
                            >
                              {loadingButton === `${record.staffId}-${record.date}-checkOut` ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {loadingButton === `${record.staffId}-${record.date}-checkOut` ? 'Saving...' : t.checkOut}
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <div className="text-xs text-gray-500">{t.status}</div>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(record.status)}
                            {getStatusBadge(record.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowStaffReport(true)}
                className="w-full sm:w-auto"
              >
                <FileText className="h-4 w-4 mr-2" />
                Staff Report
              </Button>
              <Button 
                onClick={() => setShowStaffForm(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t.addStaff}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((staffMember) => (
              <Card key={staffMember._id ?? staffMember.id ?? staffMember.email ?? staffMember.phone} className="hover:shadow-md transition-all">
                <CardContent className="p-6">
                  {(() => {
                    const today = new Date();
                    const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
                    const attendanceToday = staffMember.attendance?.find((a: any) => new Date(a.date).toISOString() === dateOnly);
                    if(!staffMember._id) return; // skip for local-only records
                    const handleClockIn = async () => {
                      setLoadingButton(staffMember._id + '-in');
                      try {
                        const updated = await apiClockIn(staffMember._id);
                        setStaff(prev => prev.map(s => s._id === staffMember._id ? { ...s, attendance: [...(s.attendance || []).filter((a:any)=> new Date(a.date).toISOString()!==dateOnly), updated] } : s));
                        toast({ title: 'Clocked in', description: `${staffMember.name} clocked in at ${updated.checkIn}` });
                        getDailyAttendance().then(setDailyRows).catch(()=>{});
                      } catch (err:any) {
                        toast({ variant:'destructive', title:'Clock in failed', description: err.response?.data?.message||err.message });
                      } finally { setLoadingButton(null);} };
                    if(!staffMember._id) return;
                    const handleClockOut = async () => {
                      setLoadingButton(staffMember._id + '-out');
                      try {
                        const updated = await apiClockOut(staffMember._id);
                        setStaff(prev => prev.map(s => s._id === staffMember._id ? { ...s, attendance: [...(s.attendance || []).filter((a:any)=> new Date(a.date).toISOString()!==dateOnly), updated] } : s));
                        toast({ title: 'Clocked out', description: `${staffMember.name} clocked out at ${updated.checkOut}` });
                        getDailyAttendance().then(setDailyRows).catch(()=>{});
                      } catch (err:any) {
                        toast({ variant:'destructive', title:'Clock out failed', description: err.response?.data?.message||err.message });
                      } finally { setLoadingButton(null);} };
                    return (
                      <div className="mb-4">
                        {attendanceToday ? (
                          <div className="space-y-1 text-sm text-gray-700">
                            <div>Check-in: {attendanceToday.checkIn ?? '—'}</div>
                            <div>Check-out: {attendanceToday.checkOut ?? '—'}</div>
                          </div>
                        ) : null}
                        {/* clock buttons */}
                        {staffMember._id && (!attendanceToday || !attendanceToday.checkIn) ? (
                          <Button size="sm" className="mt-2" disabled={loadingButton===staffMember._id+'-in'} onClick={handleClockIn}>Clock In</Button>
                        ) : staffMember._id && !attendanceToday.checkOut ? (
                          <Button variant="outline" size="sm" className="mt-2" disabled={loadingButton===staffMember._id+'-out'} onClick={handleClockOut}>Clock Out</Button>
                        ) : null}
                      </div>
                    );
                  })()}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{staffMember.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{t[staffMember.position as keyof typeof t] || staffMember.position}</p>
                      </div>
                    </div>
                    <Badge variant={staffMember.status === 'active' ? 'default' : 'secondary'}>
                      {staffMember.status === 'active' ? t.active : t.inactive}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">{t.phone}: </span>
                      <span>{staffMember.phone}</span>
                    </div>
                    <div>
                      <span className="font-medium">{t.email}: </span>
                      <span>{staffMember.email}</span>
                    </div>
                    <div>
                      <span className="font-medium">{t.salary}: </span>
                      <span>PKR {parseInt(staffMember.salary).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium">{t.joinDate}: </span>
                      <span>{staffMember.joinDate}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="text-xs text-gray-500">ID: {staffMember.id}</span>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline" onClick={() => handleEditStaff(staffMember)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRequestDeleteStaff(staffMember)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Leave Deduction (Rs)</Label>
                    <Input 
                      type="number" 
                      value={attendanceSettings.leaveDeduction}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        leaveDeduction: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Late Deduction (Rs)</Label>
                    <Input 
                      type="number" 
                      value={attendanceSettings.lateDeduction}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        lateDeduction: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Early Out Deduction (Rs)</Label>
                    <Input 
                      type="number" 
                      value={attendanceSettings.earlyOutDeduction}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        earlyOutDeduction: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Official Clock-in Time</Label>
                    <Input 
                      type="time" 
                      value={attendanceSettings.clockInTime}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        clockInTime: e.target.value
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Official Clock-out Time</Label>
                    <Input 
                      type="time" 
                      value={attendanceSettings.clockOutTime}
                      onChange={(e) => setAttendanceSettings({
                        ...attendanceSettings,
                        clockOutTime: e.target.value
                      })}
                    />
                  </div>
                </div>
                <Button 
                  type="button"
                  onClick={async () => {
                    try {
                      const payload = {
                        leaveDeduction: Number(attendanceSettings.leaveDeduction) || 0,
                        lateDeduction: Number(attendanceSettings.lateDeduction) || 0,
                        earlyOutDeduction: Number(attendanceSettings.earlyOutDeduction) || 0,
                        officialClockIn: toAmPm(attendanceSettings.clockInTime),
                        officialClockOut: toAmPm(attendanceSettings.clockOutTime),
                      };
                      const res = await fetch('/api/staff-settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });
                      if (!res.ok) throw new Error(await res.text());
                      const saved = await res.json();
                      // reflect normalized values from backend
                      setAttendanceSettings((prev) => ({
                        ...prev,
                        clockInTime: fromAmPm(saved.officialClockIn || toAmPm(prev.clockInTime)),
                        clockOutTime: fromAmPm(saved.officialClockOut || toAmPm(prev.clockOutTime)),
                      }));
                      toast({ title: 'Settings saved successfully' });
                    } catch (e:any) {
                      toast({ variant: 'destructive', title: 'Failed to save settings', description: e?.message || 'Network error' });
                    }
                  }}
                >
                  Save Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showAttendanceForm && (
        <AttendanceForm
          isUrdu={isUrdu}
          staffList={staff}
          defaultStaffId={selectedEmployeeId}
          defaultDate={`${selectedMonth}-01`}
          onClose={() => setShowAttendanceForm(false)}
          onSave={(data) => {
            console.log('Saving attendance data:', data);
            handleAddAttendance(data);
          }}
        />
      )}

      {showStaffForm && (
        <StaffForm
          isUrdu={isUrdu}
          onClose={() => {
            setShowStaffForm(false);
            setEditingStaff(null);
          }}
          onSave={handleSaveStaff}
          staff={editingStaff}
        />
      )}

      {deleteDialogOpen && staffToDelete && (
        <ConfirmStaffDeleteDialog
          isOpen={deleteDialogOpen}
          staffName={staffToDelete.name}
          isUrdu={isUrdu}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setStaffToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      )}

      {showStaffReport && (
        <StaffReport
          isUrdu={isUrdu}
          staffList={staff}
          attendanceRecords={attendanceRecords}
          onClose={() => setShowStaffReport(false)}
        />
      )}

      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                {itemToDelete?.name ? 
                  `Are you sure you want to delete ${itemToDelete.name}?` :
                  'Are you sure you want to delete this record?'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                <p className="text-sm text-yellow-700">
                  This action requires double verification. Deleting cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDelete}
                >
                  First Verification
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={finalConfirmDelete}
                  disabled={!itemToDelete?.verified}
                >
                  Final Confirm
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showProfile && selectedEmployee && (
        <Dialog open={showProfile} onOpenChange={setShowProfile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEmployee.name}'s Profile</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Total Leaves</h3>
                  <p>{selectedEmployee.totalLeaves || 0}</p>
                </div>
                <div>
                  <h3 className="font-medium">Status</h3>
                  <Badge variant={selectedEmployee.status === 'Active' ? 'default' : 'destructive'}>
                    {selectedEmployee.status}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Base Salary</h3>
                  <p>{selectedEmployee.baseSalary?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <h3 className="font-medium">Total Deductions</h3>
                  <p>{selectedEmployee.totalDeductions?.toLocaleString() || 0}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium">Net Salary</h3>
                <p>{(selectedEmployee.baseSalary - selectedEmployee.totalDeductions)?.toLocaleString() || 0}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Clock In/Out History</h3>
                <div className="space-y-2 mt-2">
                  {selectedEmployee.clockHistory?.map((entry: any) => (
                    <div key={entry.date} className="flex justify-between">
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                      <span>{entry.type}: {entry.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StaffAttendance;
