import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Download, RefreshCw, Calendar as CalendarIcon, Plus, Clock, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { getStaff as fetchStaff, getMonthlyAttendancePaged, addAttendance as apiAddAttendance } from '@/utils/staffService';
import AttendanceForm from '@/components/staff attendance/AttendanceForm';

const t = {
  title: 'Staff & Attendance',
  monthlyView: 'Monthly View',
  staffName: 'Staff Name',
  checkIn: 'Check In',
  checkOut: 'Check Out',
  status: 'Status',
  notes: 'Notes',
  noRecords: 'No attendance records',
  noRecordsDesc: 'No attendance records found for the selected period',
  addAttendance: 'Add Attendance',
  exportReport: 'Export Report',
};

function formatTime(iso?: string) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const MonthlyViewPage: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0,7));
  const [monthlyRows, setMonthlyRows] = useState<any[]>([]);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceDefaults, setAttendanceDefaults] = useState<{staffId?:string; date?:string}>({});
  const [loadingButton, setLoadingButton] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => { fetchStaff().then(setStaff).catch(console.error); }, []);
  useEffect(() => {
    if (!selectedEmployeeId) { setMonthlyRows([]); setTotal(0); return; }
    (async () => {
      try {
        const { data, total } = await getMonthlyAttendancePaged(String(selectedEmployeeId), selectedMonth, page, limit);
        setMonthlyRows(data); setTotal(total);
      } catch { setMonthlyRows([]); setTotal(0); }
    })();
  }, [selectedEmployeeId, selectedMonth, page, limit]);

  const exportAttendanceReport = () => {
    const header = 'Staff Name,Date,Check In,Check Out,Status\n';
    const rows = monthlyRows.map((r:any)=>{
      const name = r.staffName || (staff.find(s=> String(s._id||s.id)===String(r.staffId))?.name || '');
      return `${name},${r.date},${formatTime(r.checkIn)},${formatTime(r.checkOut)},${r.status||''}`;
    });
    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `attendance_report_${selectedMonth}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const refresh = async () => {
    try {
      if (selectedEmployeeId) {
        const { data, total } = await getMonthlyAttendancePaged(String(selectedEmployeeId), selectedMonth, page, limit);
        setMonthlyRows(data); setTotal(total);
      }
    } catch {}
    setLastRefreshed(new Date().toLocaleTimeString());
  };

  const handleTimeAction = async (record: any, action: 'checkIn' | 'checkOut') => {
    const buttonId = `${record.staffId}-${record.date}-${action}`;
    setLoadingButton(buttonId);
    await new Promise(r=>setTimeout(r,400));
    const now = new Date();
    const timeString = now.toISOString();
    setMonthlyRows(prev => prev.map(r => (r.staffId===record.staffId && r.date===record.date) ? { ...r, [action]: timeString } : r));
    setLoadingButton(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <div className="flex space-x-2 items-center">
          {lastRefreshed && <span className="text-sm text-gray-500">Refreshed: {lastRefreshed}</span>}
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={exportAttendanceReport}>
            <Download className="h-4 w-4 mr-2" />
            {t.exportReport}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
          <SelectTrigger className="w-64"><SelectValue placeholder={t.staffName}/></SelectTrigger>
          <SelectContent>
            {staff.map(s=> <SelectItem key={s._id||s.id} value={s._id||s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} className="w-full sm:w-48" />
          <Button onClick={() => { if(selectedEmployeeId){ setAttendanceDefaults({staffId:String(selectedEmployeeId),date:selectedMonth+'-01'});} setShowAttendanceForm(true); }} className="w-full sm:w-auto">
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
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil(total / limit))} • Total {total}</div>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={limit}
                  onChange={(e)=>{ setPage(1); setLimit(parseInt(e.target.value)); }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={()=> setPage(p=> (p < Math.max(1, Math.ceil(total/limit)) ? p+1 : p))} disabled={page>=Math.max(1, Math.ceil(total/limit))}>Next</Button>
              </div>
            </div>
            <div className="space-y-4">
              {monthlyRows.map((record) => (
                <div key={`${record.staffId}-${record.date}`} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{record.staffName}</h4>
                      <p className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col space-y-2">
                      <div className="text-sm text-center">
                        <div className="text-gray-500 text-xs mb-1">{t.checkIn}</div>
                        <div className="font-medium">{formatTime(record.checkIn)}</div>
                        <Button variant="outline" size="sm" className="mt-1 text-xs h-7 min-w-[100px]" onClick={() => handleTimeAction(record, 'checkIn')} disabled={!!loadingButton}>
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
                        <div className="font-medium">{formatTime(record.checkOut)}</div>
                        <Button variant="outline" size="sm" className="mt-1 text-xs h-7 min-w-[100px]" onClick={() => handleTimeAction(record, 'checkOut')} disabled={!!loadingButton}>
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
                        <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>{record.status}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showAttendanceForm && (
        <AttendanceForm
          isUrdu={false}
          staffList={staff}
          defaultStaffId={selectedEmployeeId}
          defaultDate={`${selectedMonth}-01`}
          onClose={() => setShowAttendanceForm(false)}
          onSave={async (data) => { await apiAddAttendance(data); setShowAttendanceForm(false); refresh(); }}
        />
      )}
    </div>
  );
};

export default MonthlyViewPage;
