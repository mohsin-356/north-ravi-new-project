import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { MonthYearPicker } from '@/components/Pharmacy components/ui/month-year-picker';
import { Badge } from '@/components/ui/badge';

interface StaffReportProps {
  isUrdu: boolean;
  staffList: any[];
  attendanceRecords: any[];
  onClose: () => void;
}

const StaffReport: React.FC<StaffReportProps> = ({ isUrdu, staffList, attendanceRecords, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportData, setReportData] = useState<any>(null);

  const text = {
    en: {
      title: 'Staff Report',
      searchPlaceholder: 'Search staff by name...',
      close: 'Close',
      selectStaff: 'Select a staff member to view report',
      noResults: 'No staff found',
      monthlyReport: 'Monthly Report',
      filterMonth: 'Select Month',
      staffDetails: 'Staff Details',
      name: 'Name',
      position: 'Position',
      workingDays: 'Working Days',
      present: 'Present',
      absent: 'Absent',
      leaves: 'Leaves',
      late: 'Late Arrivals',
      attendance: 'Attendance',
      salaryDetails: 'Salary Details',
      basicSalary: 'Basic Salary',
      deductions: 'Deductions',
      lateDeduction: 'Late Arrivals',
      leaveDeduction: 'Leaves',
      totalDeductions: 'Total Deductions',
      netSalary: 'Net Salary',
      noData: 'No attendance data available for selected month',
    },
    ur: {
      title: 'عملے کی رپورٹ',
      searchPlaceholder: 'عملے کا نام تلاش کریں...',
      close: 'بند کریں',
      selectStaff: 'رپورٹ دیکھنے کے لیے عملے کا رکن منتخب کریں',
      noResults: 'کوئی عملہ نہیں ملا',
      monthlyReport: 'ماہانہ رپورٹ',
      filterMonth: 'مہینہ منتخب کریں',
      staffDetails: 'عملے کی تفصیلات',
      name: 'نام',
      position: 'عہدہ',
      workingDays: 'کام کے دن',
      present: 'حاضر',
      absent: 'غائب',
      leaves: 'چھٹیاں',
      late: 'دیر سے آنا',
      attendance: 'حاضری',
      salaryDetails: 'تنخواہ کی تفصیلات',
      basicSalary: 'بنیادی تنخواہ',
      deductions: 'کٹوتیاں',
      lateDeduction: 'دیر سے آنے پر',
      leaveDeduction: 'چھٹیوں پر',
      totalDeductions: 'کل کٹوتیاں',
      netSalary: 'خالص تنخواہ',
      noData: 'منتخب مہینے کے لیے کوئی حاضری کا ڈیٹا دستیاب نہیں ہے',
    }
  };

  const t = isUrdu ? text.ur : text.en;

  // Filter staff based on search term
  const filteredStaff = staffList.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Generate report when staff or month changes
  useEffect(() => {
    if (!selectedStaff) return;
    
    const staffAttendance = attendanceRecords.filter(
      record => record.staffId === selectedStaff.id && 
               record.date.startsWith(selectedMonth)
    );

    const totalDays = new Date(
      new Date(selectedMonth).getFullYear(),
      new Date(selectedMonth).getMonth() + 1,
      0
    ).getDate();

    const presentDays = staffAttendance.filter(
      record => record.status === 'present' || record.status === 'late'
    ).length;

    const lateDays = staffAttendance.filter(
      record => record.status === 'late'
    ).length;

    const leaveDays = staffAttendance.filter(
      record => record.status === 'absent' || record.status === 'halfDay'
    ).length;

    const basicSalary = parseFloat(selectedStaff.salary) || 0;
    const perDaySalary = basicSalary / 30; // Assuming 30 days in a month
    const lateDeduction = lateDays * (perDaySalary * 0.1); // 10% deduction for being late
    const leaveDeduction = leaveDays * perDaySalary;
    const totalDeductions = lateDeduction + leaveDeduction;
    const netSalary = Math.max(0, basicSalary - totalDeductions);

    setReportData({
      totalDays,
      presentDays,
      lateDays,
      leaveDays,
      basicSalary,
      lateDeduction,
      leaveDeduction,
      totalDeductions,
      netSalary,
      attendance: staffAttendance
    });
  }, [selectedStaff, selectedMonth, attendanceRecords]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-hidden p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-y-auto max-h-[90vh]">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">{t.title}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">{t.close}</span>
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Search and Staff Selection */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={t.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <MonthYearPicker
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  className="w-full sm:w-48"
                />
              </div>

              {/* Staff List */}
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map(staff => (
                    <div 
                      key={staff._id ?? staff.id ?? staff.email ?? staff.phone}
                      className={`p-3 hover:bg-gray-50 cursor-pointer ${selectedStaff?.id === staff.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedStaff(staff)}
                    >
                      <div className="font-medium">{staff.name}</div>
                      <div className="text-sm text-gray-500">
                        {isUrdu ? 
                          (staff.position === 'pharmacist' ? 'فارماسسٹ' :
                           staff.position === 'assistant' ? 'اسسٹنٹ' :
                           staff.position === 'cashier' ? 'کیشیئر' : 'منیجر') :
                          staff.position ? staff.position.charAt(0).toUpperCase() + staff.position.slice(1) : '—'
                        }
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {t.noResults}
                  </div>
                )}
              </div>
            </div>

            {/* Report Section */}
            {selectedStaff && reportData && (
              <div className="space-y-6">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">{t.monthlyReport} - {new Date(selectedMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</h3>
                  
                  {/* Staff Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-medium mb-2">{t.staffDetails}</h4>
                      <div className="space-y-2">
                        <div><span className="text-gray-600">{t.name}:</span> {selectedStaff.name}</div>
                        <div><span className="text-gray-600">{t.position}:</span> {
                          isUrdu ? 
                            (selectedStaff.position === 'pharmacist' ? 'فارماسسٹ' :
                             selectedStaff.position === 'assistant' ? 'اسسٹنٹ' :
                             selectedStaff.position === 'cashier' ? 'کیشیئر' : 'منیجر') :
                            selectedStaff.position ? selectedStaff.position.charAt(0).toUpperCase() + selectedStaff.position.slice(1) : '—'
                        }</div>
                        <div><span className="text-gray-600">{t.basicSalary}:</span> {selectedStaff.salary} PKR</div>
                      </div>
                    </div>

                    {/* Attendance Summary */}
                    <div>
                      <h4 className="font-medium mb-2">{t.attendance}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50 p-3 rounded">
                          <div className="text-green-600 font-medium">{reportData.presentDays}</div>
                          <div className="text-sm text-gray-600">{t.present}</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                          <div className="text-red-600 font-medium">{reportData.leaveDays}</div>
                          <div className="text-sm text-gray-600">{t.leaves}</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded">
                          <div className="text-yellow-600 font-medium">{reportData.lateDays}</div>
                          <div className="text-sm text-gray-600">{t.late}</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="text-blue-600 font-medium">{reportData.totalDays}</div>
                          <div className="text-sm text-gray-600">{t.workingDays}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Salary Details */}
                  <div>
                    <h4 className="font-medium mb-2">{t.salaryDetails}</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                        <div className="p-4">
                          <div className="flex justify-between py-2">
                            <span>{t.basicSalary}:</span>
                            <span>{reportData.basicSalary.toLocaleString()} PKR</span>
                          </div>
                          <div className="text-sm text-gray-500 mb-2">{t.deductions}:</div>
                          <div className="pl-4 space-y-1">
                            <div className="flex justify-between">
                              <span>{t.lateDeduction} ({reportData.lateDays}):</span>
                              <span className="text-red-600">-{reportData.lateDeduction.toFixed(2)} PKR</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t.leaveDeduction} ({reportData.leaveDays}):</span>
                              <span className="text-red-600">-{reportData.leaveDeduction.toFixed(2)} PKR</span>
                            </div>
                          </div>
                          <div className="flex justify-between font-medium border-t mt-2 pt-2">
                            <span>{t.totalDeductions}:</span>
                            <span className="text-red-600">-{reportData.totalDeductions.toFixed(2)} PKR</span>
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">{t.netSalary}:</div>
                            <div className="text-2xl font-bold text-green-600">
                              {reportData.netSalary.toLocaleString()} PKR
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffReport;
