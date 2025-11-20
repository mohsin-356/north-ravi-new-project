import React from 'react';
import { indoorApi } from '@/Indoor lib/api';

type SupplierRow = {
  type: 'supplier';
  date: string;
  amount: number;
  supplierId: string;
  supplierName: string;
  purchaseId?: string;
  invoiceNumber?: string;
  medicineName?: string;
  totalItems?: number | null;
};

type CustomerRow = {
  type: 'customer';
  date: string;
  amount: number;
  billNo?: string;
  customerName?: string;
  saleId?: string | null;
};

const IndoorSupplierReturnHistory: React.FC = () => {
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [supplierRows, setSupplierRows] = React.useState<SupplierRow[]>([]);
  const [customerRows, setCustomerRows] = React.useState<CustomerRow[]>([]);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const params: any = {};
      if (from) params.from = from; if (to) params.to = to; if (q.trim()) params.q = q.trim();
      const [supRes, custRes] = await Promise.all([
        indoorApi.get('/supplier-returns/history', { params }),
        indoorApi.get('/returns/history', { params })
      ]);
      const sup: SupplierRow[] = Array.isArray(supRes?.data) ? supRes.data : [];
      const cust: CustomerRow[] = Array.isArray(custRes?.data) ? custRes.data : [];
      setSupplierRows(sup);
      setCustomerRows(cust);
    } catch (e:any) { setErr(e?.message || 'Failed to load history'); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, []);

  const supplierTotal = React.useMemo(() => supplierRows.reduce((s, r) => s + Number(r.amount || 0), 0), [supplierRows]);
  const customerTotal = React.useMemo(() => customerRows.reduce((s, r) => s + Number(r.amount || 0), 0), [customerRows]);

  return (
    <div className="space-y-3">
      <div className="p-3 bg-white border rounded-md grid grid-cols-1 md:grid-cols-6 gap-2">
        <input type="date" className="border rounded px-2 py-1" value={from} onChange={e=>setFrom(e.target.value)} />
        <input type="date" className="border rounded px-2 py-1" value={to} onChange={e=>setTo(e.target.value)} />
        <input className="border rounded px-2 py-1 md:col-span-2" placeholder="Search supplier/invoice/medicine/bill" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={load}>Filter</button>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="text-sm text-gray-700 font-semibold">Supplier Returns • Total: PKR {Number(supplierTotal||0).toLocaleString()}</div>
          <div className="overflow-auto bg-white border rounded-md">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-left">Supplier</th>
                  <th className="px-2 py-1 text-left">Invoice</th>
                  <th className="px-2 py-1 text-left">Medicine</th>
                  <th className="px-2 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {supplierRows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-2 py-1">{r.date ? new Date(r.date).toLocaleString() : '-'}</td>
                    <td className="px-2 py-1">{r.supplierName}</td>
                    <td className="px-2 py-1">{r.invoiceNumber || '-'}</td>
                    <td className="px-2 py-1">{r.medicineName || '-'}</td>
                    <td className="px-2 py-1 text-right">{Number(r.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {supplierRows.length === 0 && !loading && (
                  <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={5}>No returns</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-gray-700 font-semibold">Customer Returns • Total: PKR {Number(customerTotal||0).toLocaleString()}</div>
          <div className="overflow-auto bg-white border rounded-md">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-left">Customer</th>
                  <th className="px-2 py-1 text-left">Bill</th>
                  <th className="px-2 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {customerRows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-2 py-1">{r.date ? new Date(r.date).toLocaleString() : '-'}</td>
                    <td className="px-2 py-1">{r.customerName || '-'}</td>
                    <td className="px-2 py-1">{r.billNo || '-'}</td>
                    <td className="px-2 py-1 text-right">{Number(r.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {customerRows.length === 0 && !loading && (
                  <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={4}>No returns</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndoorSupplierReturnHistory;
