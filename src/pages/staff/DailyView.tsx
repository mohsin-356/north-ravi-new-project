import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Download, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { getDailyAttendancePaged } from '@/utils/staffService';

const t = {
  title: 'Staff & Attendance',
  dailyView: 'Daily View',
  employee: 'Employee',
  status: 'Status',
  time: 'Time',
  notes: 'Notes',
  noRecords: 'No attendance records',
  noRecordsDesc: 'No attendance records found for the selected period',
  exportReport: 'Export Report',
};

function formatTime(iso?: string) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const DailyViewPage: React.FC = () => {
  const [dailyRows, setDailyRows] = useState<any[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getDailyAttendancePaged(today, page, limit)
      .then(({ data, total }) => { setDailyRows(data); setTotal(total); })
      .catch(console.error);
  }, [page, limit]);

  const refresh = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data, total } = await getDailyAttendancePaged(today, page, limit);
      setDailyRows(data); setTotal(total);
    } catch {}
    setLastRefreshed(new Date().toLocaleTimeString());
  };

  const exportAttendanceReport = () => {
    const header = 'Staff Name,Date,Check In,Check Out,Status\n';
    const dateStr = new Date().toISOString().split('T')[0];
    const rows = dailyRows.map((r:any) => `${r.name},${dateStr},${formatTime(r.checkIn)},${formatTime(r.checkOut)},${r.status||''}`);
    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `attendance_report_${dateStr}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>{t.dailyView} - {new Date().toLocaleDateString()}</span>
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
                    <TableCell>{formatTime(record.checkIn)} - {formatTime(record.checkOut)}</TableCell>
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
    </div>
  );
};

export default DailyViewPage;
