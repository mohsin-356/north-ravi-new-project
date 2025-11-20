import React from 'react';
import { indoorApi } from '@/Indoor lib/api';

type Sale = {
  _id: string;
  billNo?: string;
  items: Array<{ _id: string; medicineName?: string; quantity: number; price: number }>;
  customerName?: string;
  totalAmount: number;
  paymentMethod?: string;
  date: string;
};

const IndoorSalesHistory: React.FC = () => {
  const [rows, setRows] = React.useState<Sale[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [billNo, setBillNo] = React.useState('');
  const [medicine, setMedicine] = React.useState('');
  const [payment, setPayment] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const params: any = { page, limit };
      if (billNo.trim()) params.billNo = billNo.trim();
      if (medicine.trim()) params.medicine = medicine.trim();
      if (payment.trim()) params.payment = payment.trim();
      if (from) params.from = from; if (to) params.to = to;
      const { data } = await indoorApi.get('/sales', { params });
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load sales');
      setRows([]);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, [page, limit]);

  const resetFilters = () => {
    setBillNo(''); setMedicine(''); setPayment(''); setFrom(''); setTo(''); setPage(1);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="p-3 bg-white border rounded-md">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Bill No" value={billNo} onChange={e=>setBillNo(e.target.value)} />
          <input className="border rounded px-2 py-1" placeholder="Medicine" value={medicine} onChange={e=>setMedicine(e.target.value)} />
          <select className="border rounded px-2 py-1" value={payment} onChange={e=>setPayment(e.target.value)}>
            <option value="">Any Payment</option>
            <option value="cash">Cash</option>
            <option value="credit">Credit</option>
          </select>
          <input type="date" className="border rounded px-2 py-1" value={from} onChange={e=>setFrom(e.target.value)} />
          <input type="date" className="border rounded px-2 py-1" value={to} onChange={e=>setTo(e.target.value)} />
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={()=>{ setPage(1); load(); }}>Filter</button>
            <button className="px-3 py-1 rounded border" onClick={resetFilters}>Reset</button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="text-sm">Per page</label>
          <select className="border rounded px-2 py-1" value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)||20); setPage(1); }}>
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {loading && <span className="text-sm text-gray-500">Loading…</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>

      <div className="overflow-auto bg-white border rounded-md">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-1 text-left">Date</th>
              <th className="px-2 py-1 text-left">Bill No</th>
              <th className="px-2 py-1 text-left">Items</th>
              <th className="px-2 py-1 text-left">Customer</th>
              <th className="px-2 py-1 text-right">Amount</th>
              <th className="px-2 py-1 text-left">Payment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r._id} className="border-t">
                <td className="px-2 py-1">{new Date(r.date).toLocaleString()}</td>
                <td className="px-2 py-1">{r.billNo || '-'}</td>
                <td className="px-2 py-1">{r.items.map(i => `${i.medicineName || ''} x${i.quantity}`).join(', ')}</td>
                <td className="px-2 py-1">{r.customerName || 'Walk-in'}</td>
                <td className="px-2 py-1 text-right">{r.totalAmount.toFixed(2)}</td>
                <td className="px-2 py-1">{r.paymentMethod || '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={6}>No sales</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button className="px-2 py-1 border rounded" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
        <div className="text-sm">Page {page}</div>
        <button className="px-2 py-1 border rounded" onClick={()=>setPage(p=>p+1)} disabled={rows.length < limit}>Next</button>
      </div>
    </div>
  );
};

export default IndoorSalesHistory;
