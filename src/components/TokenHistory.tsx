import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, FileText, Search, History as HistoryIcon, BarChart3, Download, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { printTokenSlip } from '@/utils/printToken';
import { Input } from '@/components/ui/input';
import { useDoctors, useDepartments } from '@/hooks/useApi';
import { API_URL } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Token {
  _id?: string;
  id?: string;
  tokenNumber: string;
  dateTime: Date | string;
  patientName: string;
  age: string | number;
  gender: string;
  phone?: string;
  address?: string;
  guardianRelation?: string; // 'S/O' | 'D/O'
  guardianName?: string;
  cnic?: string;
  doctor: string;
  department: string;
  finalFee: number;
  mrNumber: string;
}

const formatDateForQuery = (d: Date) => d.toLocaleDateString('en-CA'); // yyyy-mm-dd

const TokenHistory: React.FC = () => {
  const today = formatDateForQuery(new Date());
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const rangeActive = fromDate !== toDate;
  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const refetch = React.useCallback(async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem('token') || '';
      const params = new URLSearchParams();
      if (fromDate) params.set('dateFrom', fromDate);
      if (toDate) params.set('dateTo', toDate);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const res = await fetch(`${API_URL}/api/tokens?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      setTokens(items);
      setTotal(!Array.isArray(data) ? (data?.total ?? null) : null);
    } catch {
      setTokens([]);
      setTotal(null);
    } finally { setIsFetching(false); }
  }, [fromDate, toDate, page, limit]);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: doctors = [] } = useDoctors();
  const { data: departments = [] } = useDepartments();
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  useEffect(() => {
    // Normalize dates: ensure from <= to
    if (new Date(fromDate) > new Date(toDate)) {
      setToDate(fromDate);
    }
  }, [fromDate]);

  useEffect(() => {
    if (new Date(fromDate) > new Date(toDate)) {
      setFromDate(toDate);
    }
  }, [toDate]);

  useEffect(() => {
    // Refetch on boundary/page/limit changes
    refetch();
  }, [fromDate, toDate, page, limit, refetch]);

  const filtered = useMemo(() => {
    if (!Array.isArray(tokens)) return [] as Token[];
    const byDate = tokens as Token[]; // already filtered by date on server
    if (!searchTerm) return byDate;
    const query = searchTerm.toLowerCase();
    return (byDate as Token[]).filter(token =>
      (token.patientName || '').toLowerCase().includes(query) ||
      (token.tokenNumber || '').toLowerCase().includes(query) ||
      (token.mrNumber || '').toLowerCase().includes(query) ||
      (token.phone?.includes(searchTerm) || false) ||
      ((token.guardianName || '').toLowerCase().includes(query)) ||
      ((token.guardianRelation || '').toLowerCase().includes(query)) ||
      ((token.cnic || '').includes(searchTerm)) ||
      (token.doctor || '').toLowerCase().includes(query) ||
      (token.department || '').toLowerCase().includes(query) ||
      (token.age ?? '').toString().includes(searchTerm) ||
      (token.gender || '').toLowerCase().includes(query) ||
      (token.address || '').toLowerCase().includes(query) ||
      (token.dateTime ? new Date(token.dateTime).toLocaleTimeString().includes(searchTerm) : false)
    );
  }, [tokens, searchTerm, fromDate, toDate]);

  // Apply dropdown filters
  const filteredByDropdowns = useMemo(() => {
    return (filtered as Token[]).filter((t) => {
      const doctorMatch = doctorFilter === 'all' || (t.doctor || '').toLowerCase().includes(doctorFilter.toLowerCase());
      const deptMatch = deptFilter === 'all' || (t.department || '').toLowerCase() === deptFilter.toLowerCase();
      return doctorMatch && deptMatch;
    });
  }, [filtered, doctorFilter, deptFilter]);

  const { totalRevenue, returnedCount } = useMemo(() => {
    if (!Array.isArray(filteredByDropdowns)) return { totalRevenue: 0, returnedCount: 0 };
    let revenue = 0;
    let returned = 0;
    for (const anyT of filteredByDropdowns as any[]) {
      const isReturned = String(anyT?.status || '').toLowerCase() === 'returned';
      const refundAmount = Number(anyT?.refundAmount || 0) || 0;
      const fee = Number(anyT?.finalFee || 0) || 0;
      if (isReturned) {
        returned += 1;
        continue; // exclude from revenue like Today's Tokens
      }
      revenue += Math.max(0, fee - refundAmount);
    }
    return { totalRevenue: revenue, returnedCount: returned };
  }, [filteredByDropdowns]);

  const handlePrint = (t: Token) => {
    printTokenSlip({
      tokenNumber: t.tokenNumber,
      dateTime: t.dateTime,
      patientName: t.patientName,
      age: t.age,
      gender: t.gender,
      bloodPressure: (t as any).bloodPressure,
      phone: t.phone,
      address: t.address,
      doctor: t.doctor,
      department: t.department,
      finalFee: t.finalFee,
      mrNumber: t.mrNumber,
      guardianRelation: t.guardianRelation,
      guardianName: t.guardianName,
      cnic: t.cnic,
    });
  };

  const exportCsv = () => {
    const rows = (filteredByDropdowns as Token[]).map((t) => ({
      Date: t.dateTime ? new Date(t.dateTime).toLocaleDateString('en-CA') : '',
      Time: t.dateTime ? new Date(t.dateTime).toLocaleTimeString() : '',
      Token: t.tokenNumber,
      MR: t.mrNumber,
      Patient: t.patientName,
      Guardian: `${t.guardianRelation ? t.guardianRelation + ' ' : ''}${t.guardianName || ''}`.trim(),
      CNIC: t.cnic || '',
      Age: t.age,
      Gender: t.gender,
      Phone: t.phone || '',
      Address: t.address || '',
      Doctor: t.doctor,
      Department: t.department,
      Fee: t.finalFee,
    }));

    const header = Object.keys(rows[0] || {
      Date: '', Time: '', Token: '', MR: '', Patient: '', Guardian: '', CNIC: '', Age: '', Gender: '', Phone: '', Address: '', Doctor: '', Department: '', Fee: ''
    });
    const csv = [header.join(','), ...rows.map(r => header.map(h => String((r as any)[h] ?? '').replace(/,/g, ' ')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = rangeActive ? `token-history-${fromDate}_to_${toDate}.csv` : `token-history-${fromDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-amber-600 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HistoryIcon className="h-5 w-5 text-amber-600" />
              <span>Token History</span>
              <span className="ml-2 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-sm">{Array.isArray(filteredByDropdowns) ? filteredByDropdowns.length : 0}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* From-To date pickers */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <input
                  aria-label="From date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border rounded-md h-9 px-2 text-sm"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  aria-label="To date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border rounded-md h-9 px-2 text-sm"
                />
              </div>
              {/* Department filter */}
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {Array.isArray(departments) && departments.map((d: any) => (
                    <SelectItem key={d._id || d.id || d.name} value={(d.name || '').toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Doctor filter */}
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="Doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {Array.isArray(doctors) && doctors.map((doc: any) => (
                    <SelectItem key={doc._id || doc.id || doc.name} value={(doc.name || '').toString()}>{doc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Export */}
              <Button variant="outline" onClick={exportCsv} className="h-9">
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, token#, MR#, phone, doctor, department, age, gender, address, or time..."
              className="pl-10 border-gray-300 focus:border-amber-500 rounded-xl"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
              <div className="flex items-center space-x-2">
                <Calendar className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-amber-600 font-semibold text-sm">{rangeActive ? 'Date Range' : 'Date'}</p>
                  <p className="text-2xl font-bold text-amber-700">{rangeActive ? `${fromDate} → ${toDate}` : fromDate}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200">
              <div className="flex items-center space-x-2">
                <span className="h-8 w-8 rounded-full bg-emerald-600 text-white grid place-items-center text-sm font-bold">#</span>
                <div>
                  <p className="text-emerald-600 font-semibold text-sm">Total Tokens</p>
                  <p className="text-2xl font-bold text-emerald-700">{filtered.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-purple-600 font-semibold text-sm">Revenue</p>
                  <p className="text-2xl font-bold text-purple-700">Rs. {totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
              <div className="flex items-center space-x-2">
                <Undo2 className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-amber-600 font-semibold text-sm">Returned</p>
                  <p className="text-2xl font-bold text-amber-700">{returnedCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* List (Table) */}
          {filteredByDropdowns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{isFetching ? 'Loading...' : 'No tokens found for the selected date'}</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-amber-50 sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Token #</th>
                    <th className="px-3 py-2">MR #</th>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2">Guardian</th>
                    <th className="px-3 py-2">CNIC</th>
                    <th className="px-3 py-2">Age</th>
                    <th className="px-3 py-2">Gender</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Doctor</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Fee</th>
                    <th className="px-3 py-2">Print</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredByDropdowns.map((t, idx) => (
                    <tr key={(t as any)._id || t.id || idx} className="border-t hover:bg-amber-50">
                      <td className="px-3 py-2">{t.dateTime ? new Date(t.dateTime).toLocaleDateString('en-CA') : '-'}</td>
                      <td className="px-3 py-2">{t.dateTime ? new Date(t.dateTime).toLocaleTimeString() : '-'}</td>
                      <td className="px-3 py-2 font-semibold">{t.tokenNumber}</td>
                      <td className="px-3 py-2">{t.mrNumber}</td>
                      <td className="px-3 py-2">{t.patientName}</td>
                      <td className="px-3 py-2">{`${t.guardianRelation ? t.guardianRelation + ' ' : ''}${t.guardianName || ''}`.trim()}</td>
                      <td className="px-3 py-2">{t.cnic || ''}</td>
                      <td className="px-3 py-2">{t.age}</td>
                      <td className="px-3 py-2">{t.gender}</td>
                      <td className="px-3 py-2">{t.phone || ''}</td>
                      <td className="px-3 py-2">{(t.doctor || '').split(' - ')[0] || '-'}</td>
                      <td className="px-3 py-2">{t.department}</td>
                      <td className="px-3 py-2 font-bold text-green-700">Rs. {t.finalFee}</td>
                      <td className="px-3 py-2"><button onClick={()=>handlePrint(t)} className="text-indigo-600 hover:text-indigo-800">Print</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page</span>
              <select className="border rounded h-8 px-2" value={limit} onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value)||10); }}>
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={page<=1 || isFetching} onClick={()=> setPage(p => Math.max(1, p-1))}>Prev</Button>
              <div className="text-sm">Page {page}{total!=null ? ` of ${Math.max(1, Math.ceil(total/limit))}` : ''}</div>
              <Button variant="outline" disabled={isFetching || (total!=null ? (page*limit)>=total : tokens.length<limit)} onClick={()=> setPage(p => p+1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenHistory;
