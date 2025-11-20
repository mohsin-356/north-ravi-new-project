import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTokens } from '@/hooks/useApi';
import { DollarSign, FileText } from 'lucide-react';

type Txn = {
  date: string;
  type: 'revenue' | 'expense';
  description: string;
  amount: number;
};

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TransactionsPage: React.FC = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = React.useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = React.useState<number>(now.getFullYear());
  // Date range (defaults to month-to-date)
  const firstOfMonth = new Date(); firstOfMonth.setDate(1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const [range, setRange] = React.useState<{ from: string; to: string }>({ from: isoDate(firstOfMonth), to: isoDate(now) });
  const years = React.useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 5 }, (_, i) => y - i);
  }, [now]);

  // Expenses for selected month/year
  const [expenses, setExpenses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const { data: tokensData = [] } = useTokens();
  // Filters & pagination
  const [typeFilter, setTypeFilter] = React.useState<'all'|'revenue'|'expense'>('all');
  const [query, setQuery] = React.useState('');
  const [minAmount, setMinAmount] = React.useState('');
  const [maxAmount, setMaxAmount] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'asc'|'desc'>('asc');
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;

  const loadExpenses = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Try range endpoint first
      try {
        const resRange = await fetch(`/api/expenses?from=${range.from}&to=${range.to}`);
        if (resRange.ok) {
          const list = await resRange.json();
          setExpenses(Array.isArray(list) ? list : []);
          return;
        }
      } catch { /* fall back to month/year */ }
      const month = (selectedMonth + 1).toString(); // API expects 1-12
      const year = selectedYear.toString();
      const res = await fetch(`/api/expenses?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Failed to load expenses');
      const list = await res.json();
      setExpenses(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, range.from, range.to]);

  React.useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  React.useEffect(() => {
    // Reset page when filters or period change
    setPage(1);
  }, [selectedMonth, selectedYear, typeFilter, query, minAmount, maxAmount, sortOrder]);

  const txns: Txn[] = React.useMemo(() => {
    const month = selectedMonth;
    const year = selectedYear;
    const inRange = (d: Date) => new Date(`${range.from}T00:00:00`) <= d && d <= new Date(`${range.to}T23:59:59`);

    // Revenues from OPD tokens for month/year
    const tokenTxns: Txn[] = (Array.isArray(tokensData) ? tokensData : [])
      .filter((t: any) => { const d = new Date(t.dateTime); return inRange(d); })
      .filter((t: any) => String(t?.status || '').toLowerCase() !== 'returned')
      .map((t: any) => ({
        date: new Date(t.dateTime).toLocaleDateString(),
        type: 'revenue' as const,
        description: `Token #${t.tokenNumber} - ${t.patientName || 'Patient'}`,
        amount: Math.max(0, (Number(t.finalFee || 0) || 0) - (Number(t.refundAmount || 0) || 0)),
      }));

    // Expenses list (already filtered by month/year from API)
    const expenseTxns: Txn[] = (Array.isArray(expenses) ? expenses : []).map((e: any) => ({
      date: new Date(e.date).toLocaleDateString(),
      type: 'expense' as const,
      description: e.description || e.title || 'Expense',
      amount: Number(e.amount) || 0,
    }));

    const list = [...tokenTxns, ...expenseTxns]
      .filter((it) => !!it.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return list;
  }, [tokensData, expenses, selectedMonth, selectedYear]);

  // Totals can be reintroduced if needed for KPIs; currently removed with widgets

  const filteredTxns = React.useMemo(() => {
    let list = txns;
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    if (query.trim()) list = list.filter(t => (t.description || '').toLowerCase().includes(query.toLowerCase()));
    const minVal = minAmount !== '' ? parseFloat(minAmount) : null;
    const maxVal = maxAmount !== '' ? parseFloat(maxAmount) : null;
    if (minVal !== null && !Number.isNaN(minVal)) list = list.filter(t => t.amount >= minVal);
    if (maxVal !== null && !Number.isNaN(maxVal)) list = list.filter(t => t.amount <= maxVal);
    list = [...list].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'asc' ? da - db : db - da;
    });
    return list;
  }, [txns, typeFilter, query, minAmount, maxAmount, sortOrder]);

  const total = filteredTxns.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageItems = filteredTxns.slice(start, end);

  const exportCsv = () => {
    if (filteredTxns.length === 0) return;
    const csv = [
      ['Date', 'Type', 'Description', 'Amount'],
      ...filteredTxns.map(t => [t.date, t.type, t.description, String(t.amount)])
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${months[selectedMonth]}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
        >
          {months.map((m, idx) => (
            <option key={m} value={idx}>{m}</option>
          ))}
        </select>
        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" className="border rounded-md h-9 px-2 text-sm w-[150px]" value={range.from} onChange={(e)=>setRange(r=>({...r, from: e.target.value}))} />
          <span>—</span>
          <input type="date" className="border rounded-md h-9 px-2 text-sm w-[150px]" value={range.to} onChange={(e)=>setRange(r=>({...r, to: e.target.value}))} />
          <Button variant="outline" className="h-9" onClick={loadExpenses}>Apply</Button>
        </div>
        <Button onClick={loadExpenses} className="ml-auto">Refresh</Button>
        <Button onClick={exportCsv} variant="outline">Export CSV</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <select className="border rounded-md h-9 px-2 text-sm" value={typeFilter} onChange={e=>setTypeFilter(e.target.value as any)}>
              <option value="all">All</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expenses</option>
            </select>
            <input className="border rounded-md h-9 px-2 text-sm" placeholder="Search description" value={query} onChange={e=>setQuery(e.target.value)} />
            <input className="border rounded-md h-9 px-2 text-sm w-32" type="number" placeholder="Min amount" value={minAmount} onChange={e=>setMinAmount(e.target.value)} />
            <input className="border rounded-md h-9 px-2 text-sm w-32" type="number" placeholder="Max amount" value={maxAmount} onChange={e=>setMaxAmount(e.target.value)} />
            <select className="border rounded-md h-9 px-2 text-sm" value={sortOrder} onChange={e=>setSortOrder(e.target.value as any)}>
              <option value="asc">Date ↑</option>
              <option value="desc">Date ↓</option>
            </select>
            <Button variant="outline" onClick={() => { setTypeFilter('all'); setQuery(''); setMinAmount(''); setMaxAmount(''); setSortOrder('asc'); }}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Transactions — {range.from} → {range.to}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : txns.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              No transactions found for this period
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Showing {total === 0 ? 0 : start + 1}-{end} of {total}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 px-3">Prev</Button>
                  <span className="px-2">Page {currentPage} / {totalPages}</span>
                  <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-8 px-3">Next</Button>
                </div>
              </div>
              {pageItems.map((t, i) => (
                <div
                  key={`${t.type}-${t.date}-${i}`}
                  className={`flex items-center justify-between p-4 rounded-xl border-l-4 ${t.type === 'revenue' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}
                >
                  <div>
                    <div className="font-semibold">{t.description}</div>
                    <div className="text-xs text-gray-600">{t.date}</div>
                  </div>
                  <div className={`font-bold ${t.type === 'revenue' ? 'text-green-700' : 'text-red-700'}`}>
                    {t.type === 'revenue' ? '+' : '-'}Rs. {t.amount.toLocaleString()}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Showing {total === 0 ? 0 : start + 1}-{end} of {total}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 px-3">Prev</Button>
                  <span className="px-2">Page {currentPage} / {totalPages}</span>
                  <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-8 px-3">Next</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsPage;
