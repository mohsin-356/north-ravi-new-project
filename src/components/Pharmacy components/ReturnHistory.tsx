import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';

interface ReturnRow {
  date: string | Date;
  amount: number;
  type: 'customer' | 'supplier';
  partyName?: string;
  invoiceNumber?: string;
  totalItems?: number | null;
  reference?: string;
}

const pageSizes = [10, 20, 50];

const ReturnHistory: React.FC = () => {
  const [rows, setRows] = React.useState<ReturnRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [q, setQ] = React.useState('');
  const [type, setType] = React.useState<'all' | 'customer' | 'supplier'>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const list: ReturnRow[] = [];

      // 1) Customer returns saved by ReturnsPage (pharmacyReturns)
      try {
        const savedCustomer = localStorage.getItem('pharmacyReturns');
        if (savedCustomer) {
          const arr = JSON.parse(savedCustomer);
          if (Array.isArray(arr)) {
            for (const r of arr) {
              if ((r?.type || '').toLowerCase() !== 'customer') continue;
              const meds = Array.isArray(r.medicines) ? r.medicines : [];
              const totalAmount = meds.reduce((s: number, m: any) => s + (Number(m.price||0) * Number(m.quantity||0)), 0);
              const totalItems = meds.reduce((s: number, m: any) => s + Number(m.quantity||0), 0);
              list.push({
                date: r.date || new Date().toISOString(),
                amount: totalAmount,
                type: 'customer',
                partyName: r.name || 'Customer',
                invoiceNumber: r.originalBillNo || '-',
                reference: r.originalBillNo || '-',
                totalItems,
              });
            }
          }
        }
      } catch {}

      // 1b) Older/local key 'submittedReturns' fallback
      try {
        const savedSubmitted = localStorage.getItem('submittedReturns');
        if (savedSubmitted) {
          const arr = JSON.parse(savedSubmitted);
          if (Array.isArray(arr)) {
            for (const r of arr) {
              if ((r?.type || '').toLowerCase() !== 'customer') continue;
              const meds = Array.isArray(r.medicines) ? r.medicines : [];
              const totalAmount = meds.reduce((s: number, m: any) => s + (Number(m.price||0) * Number(m.quantity||0)), 0);
              const totalItems = meds.reduce((s: number, m: any) => s + Number(m.quantity||0), 0);
              list.push({
                date: r.date || new Date().toISOString(),
                amount: totalAmount,
                type: 'customer',
                partyName: r.name || 'Customer',
                invoiceNumber: r.originalBillNo || '-',
                reference: r.originalBillNo || '-',
                totalItems,
              });
            }
          }
        }
      } catch {}

      // 2) Item-level returns recorded by returnService (pharmacy-return-records)
      try {
        const savedLocal = localStorage.getItem('pharmacy-return-records');
        if (savedLocal) {
          const arr2 = JSON.parse(savedLocal);
          if (Array.isArray(arr2)) {
            for (const r of arr2) {
              const dateVal = r?.date ? new Date(r.date) : new Date();
              list.push({
                date: dateVal.toISOString(),
                amount: 0,
                type: (r?.type || 'customer').toLowerCase() === 'supplier' ? 'supplier' : 'customer',
                partyName: r?.processedBy || (r?.type === 'supplier' ? 'Supplier' : 'Customer'),
                invoiceNumber: '-',
                reference: r?.medicineName || '-',
                totalItems: Number(r?.quantity || 0),
              });
            }
          }
        }
      } catch {}

      // 3) Supplier returns from backend (optional)
      try {
        const params = new URLSearchParams();
        if (fromDate) params.set('from', new Date(fromDate + 'T00:00:00').toISOString());
        if (toDate) params.set('to', new Date(toDate + 'T00:00:00').toISOString());
        if (q) params.set('q', q);
        const res = await fetch(`/api/supplier-returns/history?${params.toString()}`);
        if (res.ok) {
          const json: any[] = await res.json();
          (json || []).forEach((r: any) => list.push({
            date: r.date || r.createdAt || new Date().toISOString(),
            amount: Number(r.amount||0),
            type: 'supplier',
            partyName: r.supplierName || r.supplier?.name || 'Supplier',
            invoiceNumber: r.invoiceNumber || r.invoiceNo || '-',
            reference: r.purchaseId || r._id || '-',
            totalItems: r.totalItems ?? null,
          }));
        }
      } catch {}

      setRows(list);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchRows(); }, []);
  // Auto-refresh when localStorage or custom events update
  React.useEffect(() => {
    const onChange = () => fetchRows();
    window.addEventListener('storage', onChange);
    window.addEventListener('returnProcessed', onChange as any);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('returnProcessed', onChange as any);
    };
  }, []);
  React.useEffect(() => { setPage(1); }, [fromDate, toDate, q, pageSize, type]);

  const filtered = React.useMemo(() => {
    let list = rows;
    if (type === 'customer') list = rows.filter(r => r.type === 'customer');
    if (type === 'supplier') list = rows.filter(r => r.type === 'supplier');
    if (q.trim()) {
      const f = q.trim().toLowerCase();
      list = list.filter(r =>
        (r.partyName || '').toLowerCase().includes(f) ||
        (r.invoiceNumber || '').toLowerCase().includes(f) ||
        (r.reference || '').toLowerCase().includes(f)
      );
    }
    if (fromDate) {
      const fromTs = new Date(fromDate + 'T00:00:00').getTime();
      list = list.filter(r => new Date(r.date as any).getTime() >= fromTs);
    }
    if (toDate) {
      const toTs = new Date(toDate + 'T23:59:59').getTime();
      list = list.filter(r => new Date(r.date as any).getTime() <= toTs);
    }
    return list;
  }, [rows, type, q, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Return History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">Search</label>
              <Input placeholder="invoice, supplier, medicine" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Type</label>
              <select className="border rounded-md p-2 text-sm w-full" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="all">All</option>
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={fetchRows} disabled={loading} title="Refresh">{loading ? 'Loading...' : 'Refresh'}</Button>
              <select className="border rounded-md p-2 text-sm" value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value))}>
                {pageSizes.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Party</th>
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4">Items</th>
                  <th className="py-2 pr-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r, idx) => {
                  const d = r.date ? new Date(r.date as any) : null;
                  const dateStr = d && !isNaN(d.getTime()) ? d.toLocaleDateString() : String(r.date || '');
                  return (
                  <tr key={idx} className="border-b">
                    <td className="py-2 pr-4">{dateStr}</td>
                    <td className="py-2 pr-4">{r.type === 'customer' ? 'Customer' : 'Supplier'}</td>
                    <td className="py-2 pr-4">{r.partyName || '-'}</td>
                    <td className="py-2 pr-4">{r.invoiceNumber || r.reference || '-'}</td>
                    <td className="py-2 pr-4">{r.totalItems ?? '-'}</td>
                    <td className="py-2 pr-4">Rs {(Number(r.amount) || 0).toFixed(2)}</td>
                  </tr>
                );})}
                {paged.length === 0 && (
                  <tr><td className="py-8 text-center text-gray-500" colSpan={6}>No records</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>Page {page} of {totalPages}</div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e: any) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e: any) => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReturnHistory;
