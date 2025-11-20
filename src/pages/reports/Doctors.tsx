import React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { useDoctors, useTokens, useCreateDoctorLedger } from '@/hooks/useApi';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';

const DoctorsReportPage: React.FC = () => {
  // Global filters (copied from Reports)
  const [useRange, setUseRange] = useState(false);
  const [rangeFromDate, setRangeFromDate] = useState<string>(''); // YYYY-MM-DD
  const [rangeFromTime, setRangeFromTime] = useState<string>(''); // HH:MM
  const [rangeToDate, setRangeToDate] = useState<string>('');
  const [rangeToTime, setRangeToTime] = useState<string>('');

  const [selectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear] = useState(new Date().getFullYear().toString());
  const [dateView] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data: doctorsData = [], refetch: refetchDoctors } = useDoctors();
  const { data: tokensData = [] } = useTokens();

  // Ledger modal state
  const createLedgerMutation = useCreateDoctorLedger();
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerType, setLedgerType] = useState<'credit'|'debit'>('credit');
  const [ledgerDoctor, setLedgerDoctor] = useState<{ id: string; name: string } | null>(null);
  const [ledgerAmount, setLedgerAmount] = useState<number>(0);
  const [ledgerDate, setLedgerDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [ledgerDesc, setLedgerDesc] = useState<string>('');

  // Recompute derived data when tokens change
  useEffect(() => {
    // nothing else to do; we derive in render
  }, [tokensData]);

  // Filter tokens per range/view (copied from Reports)
  const filteredTokens = useMemo(() => {
    let tokens: any[] = Array.isArray(tokensData) ? tokensData : [];
    const withinRange = (d: Date) => {
      let ok = true;
      if (rangeFromDate) ok = ok && d >= new Date(`${rangeFromDate}T${rangeFromTime || '00:00'}:00`);
      if (rangeToDate) ok = ok && d <= new Date(`${rangeToDate}T${rangeToTime || '23:59'}:59`);
      return ok;
    };
    if (useRange && (rangeFromDate || rangeToDate)) {
      return tokens.filter((t: any) => withinRange(new Date(t.dateTime)));
    }
    if (dateView === 'day') {
      const target = new Date(selectedDate);
      return tokens.filter((t: any) => new Date(t.dateTime).toDateString() === target.toDateString());
    }
    if (dateView === 'week') {
      const target = new Date(selectedDate);
      const startOfWeek = new Date(target);
      startOfWeek.setDate(target.getDate() - target.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return tokens.filter((t: any) => {
        const d = new Date(t.dateTime);
        return d >= startOfWeek && d <= endOfWeek;
      });
    }
    if (dateView === 'month') {
      return tokens.filter((t: any) => {
        const d = new Date(t.dateTime);
        return d.getMonth() === parseInt(selectedMonth) && d.getFullYear() === parseInt(selectedYear);
      });
    }
    if (dateView === 'year') {
      return tokens.filter((t: any) => new Date(t.dateTime).getFullYear() === parseInt(selectedYear));
    }
    return tokens;
  }, [tokensData, useRange, rangeFromDate, rangeFromTime, rangeToDate, rangeToTime, dateView, selectedDate, selectedMonth, selectedYear]);

  // Doctors metadata
  const activeDoctors: any[] = Array.isArray(doctorsData) ? doctorsData : [];
  const activeDoctorIds = useMemo(() => new Set<string>(activeDoctors.map((d: any) => String(d?.id || d?._id || '')).filter(Boolean)), [activeDoctors]);
  const activeDoctorNames = useMemo(() => new Set<string>(activeDoctors.map((d: any) => (d?.name || '').toString().trim().toLowerCase()).filter(Boolean)), [activeDoctors]);

  // Doctor revenue aggregation (copied from Reports)
  const [doctorSearch, setDoctorSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'patients'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const handleSort = (field: 'name' | 'revenue' | 'patients') => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const doctorRevenueArr = useMemo(() => {
    const map: { [doctorId: string]: { name: string; revenue: number; patients: number } } = {};
    activeDoctors.forEach((d: any) => {
      const id = String(d?.id || d?._id);
      const name = d?.name || 'Unknown';
      if (id && !map[id]) map[id] = { name, revenue: 0, patients: 0 };
    });
    filteredTokens.forEach((token: any) => {
      const isReturned = String(token?.status || '').toLowerCase() === 'returned';
      if (isReturned) return;
      const allDocs = activeDoctors;
      let doctorKey: string | undefined = token.doctorId || token.doctorId?._id;
      let doctorName: string | undefined;
      if (doctorKey && !activeDoctorIds.has(String(doctorKey))) doctorKey = undefined;
      if (!doctorKey) {
        const rawName: string = typeof token.doctor === 'string' ? token.doctor : '';
        const cleanName = rawName.replace(/^Dr\.?\s*/i, '').split(' - ')[0].trim().toLowerCase();
        if (!cleanName || !activeDoctorNames.has(cleanName)) return;
        const matched = allDocs.find((d: any) => (d.name || '').toString().trim().toLowerCase() === cleanName);
        if (matched) { doctorKey = String(matched.id || matched._id); doctorName = matched.name; } else { return; }
      } else {
        const byId = allDocs.find((d: any) => String(d.id || d._id) === String(doctorKey));
        doctorName = byId?.name;
      }
      if (!doctorKey) return;
      if (!map[doctorKey]) map[doctorKey] = { name: doctorName || 'Unknown', revenue: 0, patients: 0 };
      else if (!map[doctorKey].name && doctorName) map[doctorKey].name = doctorName;
      const consultationFee = parseFloat(token.fee) || parseFloat(token.consultationFee) || parseFloat(token.finalFee) || 0;
      map[doctorKey].revenue += isNaN(consultationFee) ? 0 : consultationFee;
      map[doctorKey].patients += 1;
    });
    let arr = Object.values(map);
    if (doctorSearch.trim()) arr = arr.filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()));
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'revenue') cmp = a.revenue - b.revenue;
      else cmp = a.patients - b.patients;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [activeDoctors, filteredTokens, doctorSearch, sortBy, sortOrder, activeDoctorIds, activeDoctorNames]);

  return (
    <div className="flex flex-col gap-6 min-h-screen w-full px-2 md:px-4 py-4 overflow-x-hidden">
      {/* Date/Time Range Filters */}
      <div className="mt-3 mb-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={useRange} onChange={e=>setUseRange(e.target.checked)} />
            Use custom date/time range
          </label>
          <div className="flex items-center gap-1">
            <input type="date" value={rangeFromDate} onChange={e=>setRangeFromDate(e.target.value)} className="border rounded-md h-9 px-2 text-sm" />
            <input type="time" value={rangeFromTime} onChange={e=>setRangeFromTime(e.target.value)} className="border rounded-md h-9 px-2 text-sm w-[110px]" />
          </div>
          <span className="text-sm text-slate-500">to</span>
          <div className="flex items-center gap-1">
            <input type="date" value={rangeToDate} onChange={e=>setRangeToDate(e.target.value)} className="border rounded-md h-9 px-2 text-sm" />
            <input type="time" value={rangeToTime} onChange={e=>setRangeToTime(e.target.value)} className="border rounded-md h-9 px-2 text-sm w-[110px]" />
          </div>
        </div>
        {useRange && (rangeFromDate || rangeToDate) && (
          <div className="mt-2 text-xs text-slate-600">
            Active range: {rangeFromDate || '—'} {rangeFromTime || ''} → {rangeToDate || '—'} {rangeToTime || ''}
          </div>
        )}
      </div>

      <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-50 to-blue-50 rounded-3xl w-full overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-400 to-blue-400 text-white rounded-t-3xl p-4">
          <CardTitle className="flex items-center space-x-3 text-lg">
            <TrendingUp className="h-6 w-6" />
            <span>Doctor-wise Revenue & Patient Count</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 overflow-x-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
            <Input
              type="text"
              placeholder="Search doctor name..."
              className="w-full md:w-64 border-emerald-300 focus:border-emerald-500"
              value={doctorSearch}
              onChange={e => setDoctorSearch(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className={sortBy === 'name' ? 'border-emerald-600 text-emerald-700' : ''} onClick={() => handleSort('name')}>
                Doctor {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
              </Button>
              <Button variant="outline" size="sm" className={sortBy === 'revenue' ? 'border-green-600 text-green-700' : ''} onClick={() => handleSort('revenue')}>
                Revenue {sortBy === 'revenue' && (sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
              </Button>
              <Button variant="outline" size="sm" className={sortBy === 'patients' ? 'border-blue-600 text-blue-700' : ''} onClick={() => handleSort('patients')}>
                Patients {sortBy === 'patients' && (sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
              </Button>
            </div>
          </div>
          {doctorRevenueArr.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-xl">No doctor revenue data for this period</p>
            </div>
          ) : (
            (() => {
              const metaByName = new Map(
                (Array.isArray(doctorsData) ? doctorsData : []).map((d: any) => [
                  (d?.name || '').toString().trim().toLowerCase(),
                  d,
                ])
              );
              const today = new Date();
              today.setHours(0,0,0,0);
              const profiles = doctorRevenueArr.map((doc) => {
                const meta = metaByName.get(doc.name.toLowerCase());
                const commissionRate = typeof meta?.commissionRate === 'number' ? meta.commissionRate : 0;
                const consultationFee = typeof meta?.consultationFee === 'number' ? meta.consultationFee : 0;
                const todayCount = (Array.isArray(tokensData) ? tokensData : []).filter((t: any) => {
                  const tDate = new Date(t.dateTime);
                  const sameDay = tDate.getFullYear() === today.getFullYear() && tDate.getMonth() === today.getMonth() && tDate.getDate() === today.getDate();
                  const tName = (typeof t.doctor === 'string' ? t.doctor : '').replace(/^Dr\.?\s*/i, '').split(' - ')[0].trim().toLowerCase();
                  return sameDay && tName === doc.name.toLowerCase();
                }).length;
                return {
                  id: String(meta?.id || meta?._id || ''),
                  name: doc.name,
                  specialization: meta?.specialization || '',
                  revenue: doc.revenue,
                  patients: doc.patients,
                  commissionRate,
                  commission: Math.round((doc.revenue || 0) * (commissionRate / 100)),
                  consultationFee,
                  phone: meta?.phone || '-',
                  today: todayCount,
                  outstanding: typeof meta?.ledgerBalance === 'number' ? meta.ledgerBalance : undefined,
                };
              });
              const hasLedger = (Array.isArray(doctorsData) ? doctorsData : []).some((d: any) => typeof d?.ledgerBalance === 'number');
              return (
                <div className="overflow-x-auto rounded-lg border bg-white">
                  <Table>
                    <TableHeader className="bg-blue-50">
                      <TableRow className="bg-blue-50">
                        <TableHead className="text-blue-900 font-semibold">Doctor</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Specialization</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Share</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Patients</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Fee</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Share %</TableHead>
                        {hasLedger && <TableHead className="text-blue-900 font-semibold">Outstanding</TableHead>}
                        <TableHead className="text-blue-900 font-semibold">Phone</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((p) => (
                        <TableRow key={p.name}>
                          <TableCell className="font-medium">Dr. {p.name}</TableCell>
                          <TableCell>{p.specialization}</TableCell>
                          <TableCell>Rs. {Number(p.commission || 0).toLocaleString()}</TableCell>
                          <TableCell>{p.patients}</TableCell>
                          <TableCell>Rs. {Number(p.consultationFee || 0).toLocaleString()}</TableCell>
                          <TableCell>{p.commissionRate}%</TableCell>
                          {hasLedger && (
                            <TableCell>Rs. {Number(p.outstanding || 0).toLocaleString()}</TableCell>
                          )}
                          <TableCell>{p.phone}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => { setLedgerDoctor({ id: p.id, name: p.name }); setLedgerType('credit'); setLedgerAmount(0); setLedgerDate(new Date().toISOString().split('T')[0]); setLedgerDesc(''); setLedgerOpen(true); }}
                                disabled={!p.id}
                              >Add Revenue</Button>
                              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() => { setLedgerDoctor({ id: p.id, name: p.name }); setLedgerType('debit'); setLedgerAmount(0); setLedgerDate(new Date().toISOString().split('T')[0]); setLedgerDesc(''); setLedgerOpen(true); }}
                                disabled={!p.id}
                              >Handover</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* Ledger Dialog */}
      <Dialog open={ledgerOpen} onOpenChange={setLedgerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ledgerType === 'credit' ? 'Add Revenue' : 'Record Handover'} {ledgerDoctor ? `- Dr. ${ledgerDoctor.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <Label>Amount (Rs.)</Label>
              <Input type="number" value={ledgerAmount} onChange={(e)=>setLedgerAmount(parseFloat(e.target.value)||0)} placeholder="0" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={ledgerDate} onChange={(e)=>setLedgerDate(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input value={ledgerDesc} onChange={(e)=>setLedgerDesc(e.target.value)} placeholder={ledgerType==='credit'?'e.g., Procedure revenue':'e.g., Cash handover'} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async ()=>{
                if (!ledgerDoctor) return;
                if (!(Number(ledgerAmount)>0)) return;
                try {
                  await createLedgerMutation.mutateAsync({
                    doctorId: ledgerDoctor.id,
                    type: ledgerType,
                    amount: Number(ledgerAmount),
                    description: ledgerDesc,
                    date: ledgerDate,
                    source: 'manual',
                  });
                  if (ledgerType === 'debit') {
                    // Also create an expense so it shows on Transactions and reduces hospital net revenue
                    await fetch('/api/expenses', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: 'Doctor Handover',
                        amount: Number(ledgerAmount),
                        category: 'Doctor Share',
                        date: ledgerDate,
                        description: `Handover to Dr. ${ledgerDoctor.name}${ledgerDesc ? ` - ${ledgerDesc}` : ''}`,
                      }),
                    });
                  }
                  setLedgerOpen(false);
                  setLedgerDoctor(null);
                  await refetchDoctors();
                } catch (e) {
                  setLedgerOpen(false);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >Save</Button>
            <Button variant="outline" onClick={()=>setLedgerOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorsReportPage;
