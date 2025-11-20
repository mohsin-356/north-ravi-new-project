import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useTokens } from '@/hooks/useApi';

type MonthDatum = { month: string; revenue: number; expenses: number };

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ReportsDashboard: React.FC = () => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => now.getFullYear() - i), [now]);
  // Date range (defaults to month-to-date)
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const [range, setRange] = useState<{ from: string; to: string }>({ from: isoDate(firstOfMonth), to: isoDate(now) });

  const { data: tokensData = [] } = useTokens();
  const [yearExpensesByMonth, setYearExpensesByMonth] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  // Load expenses for selected year (fallback) or for date range when provided
  useEffect(() => {
    const loadExpenses = async () => {
      setLoading(true);
      try {
        // Try range API first
        const resRange = await fetch(`/api/expenses?from=${range.from}&to=${range.to}`);
        if (resRange.ok) {
          const list = await resRange.json();
          const map: Record<number, number> = {};
          (Array.isArray(list) ? list : []).forEach((e: any) => {
            const d = new Date(e.date || e.createdAt);
            const m = d.getMonth();
            map[m] = (map[m] || 0) + (Number(e.amount) || 0);
          });
          setYearExpensesByMonth(map);
          return;
        }
      } catch { /* fall through to yearly */ }
      try {
        const fetches = Array.from({ length: 12 }, (_, i) => i + 1).map(async (m) => {
          const res = await fetch(`/api/expenses?month=${m}&year=${selectedYear}`);
          if (!res.ok) return { m: m - 1, total: 0 };
          const list = await res.json();
          // If range is set, restrict totals to range
          const inRange = (d: Date) => new Date(`${range.from}T00:00:00`) <= d && d <= new Date(`${range.to}T23:59:59`);
          const total = (Array.isArray(list) ? list : [])
            .filter((e: any) => inRange(new Date(e.date || e.createdAt || e.expenseDate || '')))
            .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
          return { m: m - 1, total };
        });
        const out = await Promise.all(fetches);
        const map: Record<number, number> = {};
        out.forEach(({ m, total }) => { map[m] = total; });
        setYearExpensesByMonth(map);
      } catch {
        setYearExpensesByMonth({});
      } finally {
        setLoading(false);
      }
    };
    loadExpenses();
  }, [selectedYear, range.from, range.to]);

  const monthlyData: MonthDatum[] = useMemo(() => {
    const tokens = Array.isArray(tokensData) ? tokensData : [];
    const inRange = (d: Date) => new Date(`${range.from}T00:00:00`) <= d && d <= new Date(`${range.to}T23:59:59`);
    return months.map((label, idx) => {
      const monthRevenue = tokens.reduce((sum: number, t: any) => {
        const d = new Date(t.dateTime);
        if (!(inRange(d) && d.getMonth() === idx)) return sum;
        const isReturned = String(t?.status || '').toLowerCase() === 'returned';
        if (isReturned) return sum;
        const refundAmount = Number(t?.refundAmount || 0) || 0;
        const base = Number(t?.finalFee || 0) || 0;
        return sum + Math.max(0, base - refundAmount);
      }, 0);
      const monthExpenses = yearExpensesByMonth[idx] || 0;
      return { month: label, revenue: monthRevenue, expenses: monthExpenses };
    });
  }, [tokensData, range.from, range.to, yearExpensesByMonth]);

  const totals = useMemo(() => {
    const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
    const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
    const totalTokens = (Array.isArray(tokensData) ? tokensData : []).filter((t: any) => {
      const d = new Date(t.dateTime);
      return new Date(`${range.from}T00:00:00`) <= d && d <= new Date(`${range.to}T23:59:59`);
    }).length;
    const avgFee = totalTokens > 0 ? totalRevenue / totalTokens : 0;
    const departmentBreakdown: Record<string, number> = {};
    const departmentLabels: Record<string, string> = {};
    (Array.isArray(tokensData) ? tokensData : []).forEach((t: any) => {
      const d = new Date(t.dateTime);
      if (d.getFullYear() !== selectedYear) return;
      const isReturned = String(t?.status || '').toLowerCase() === 'returned';
      if (isReturned) return;
      const refundAmount = Number(t?.refundAmount || 0) || 0;
      const base = Number(t?.finalFee || 0) || 0;
      const rawDept = (t.department || 'Unknown').toString();
      const key = (rawDept.trim().toLowerCase() || 'unknown');
      if (!departmentLabels[key]) {
        departmentLabels[key] = (key === 'ipd' || key === 'opd')
          ? key.toUpperCase()
          : key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      departmentBreakdown[key] = (departmentBreakdown[key] || 0) + Math.max(0, base - refundAmount);
    });
    return { totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses, totalTokens, averageFee: avgFee, departmentBreakdown, departmentLabels };
  }, [monthlyData, tokensData, range.from, range.to]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
        >
          {years.map(y => (<option key={y} value={y}>{y}</option>))}
        </select>
        <div className="flex items-center gap-2">
          <Input type="date" className="h-9 w-[150px]" value={range.from} onChange={(e)=>setRange(r=>({...r, from: e.target.value}))} />
          <span>—</span>
          <Input type="date" className="h-9 w-[150px]" value={range.to} onChange={(e)=>setRange(r=>({...r, to: e.target.value}))} />
          <Button variant="outline" className="h-9" onClick={()=>setRange(r=>({...r}))}>Apply</Button>
        </div>
        {loading && <span className="text-xs text-gray-500">Loading expenses…</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Revenue</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-emerald-700">Rs. {totals.totalRevenue.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Expenses</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-red-700">Rs. {totals.totalExpenses.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Net Income</CardTitle></CardHeader>
          <CardContent className={`text-3xl font-bold ${totals.netIncome >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Rs. {totals.netIncome.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Patients</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-violet-700">{totals.totalTokens}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {Object.entries(totals.departmentBreakdown).map(([deptKey, revenue]) => {
          const dept = (totals as any).departmentLabels?.[deptKey] || deptKey;
          return (
          <div key={deptKey} className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4 min-h-[92px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-800 text-base">{dept}</span>
              <span className="font-bold text-slate-900 text-lg">Rs. {Number(revenue).toLocaleString()}</span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${totals.totalRevenue > 0 ? (Number(revenue) / totals.totalRevenue) * 100 : 0}%` }} />
            </div>
            <p className="text-slate-600 text-xs mt-2 font-medium">
              {totals.totalRevenue > 0 ? ((Number(revenue) / totals.totalRevenue) * 100).toFixed(1) : 0}% of total revenue
            </p>
          </div>
        );})}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="font-semibold text-gray-700 mb-2">Revenue vs Expenses with Net Income (Yearly)</div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData.map(md => ({ month: md.month, revenue: md.revenue, expenses: md.expenses, net: md.revenue - md.expenses }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[6,6,0,0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[6,6,0,0]} />
              <Line type="monotone" dataKey="net" name="Net Income" stroke="#3b82f6" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
