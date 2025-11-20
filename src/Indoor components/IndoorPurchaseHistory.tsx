import React from 'react';
import { indoorApi } from '../Indoor lib/api';
import { Download, Printer, Search as SearchIcon, Trash2 } from 'lucide-react';
import IndoorPurchaseSlipModal from './IndoorPurchaseSlipModal';
import { useIndoorSettings } from '../Indoor contexts/SettingsContext';

type Purchase = {
  _id: string;
  medicineName: string;
  supplierName: string;
  quantity: number;
  packQuantity: number;
  totalItems: number;
  buyPricePerPack: number;
  buyPricePerUnit?: number;
  salePricePerPack?: number;
  salePricePerUnit?: number | null;
  totalPurchaseAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  invoiceNumber?: string;
  purchaseDate?: string;
  expiryDate?: string;
};

const IndoorPurchaseHistory: React.FC = () => {
  const [rows, setRows] = React.useState<Purchase[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [status, setStatus] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [selected, setSelected] = React.useState<Purchase | null>(null);
  const { settings } = useIndoorSettings();

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const params: any = {};
      params.status = status; // important: send 'all' explicitly so backend does not default to approved
      if (from) params.startDate = from;
      if (to) params.endDate = to;
      const { data } = await indoorApi.get('/purchases', { params });
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load purchases');
      setRows([]);
    } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    try {
      if (!window.confirm('Delete this purchase? This cannot be undone.')) return;
      await indoorApi.delete(`/purchases/${id}`);
      await load();
    } catch (e:any) {
      setErr(e?.response?.data?.error || e?.message || 'Delete failed');
    }
  };

  React.useEffect(() => { load(); }, []);
  React.useEffect(() => { load(); }, [status, from, to]);

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = rows;
    if (term) {
      list = rows.filter(r =>
        (r.medicineName || '').toLowerCase().includes(term) ||
        (r.supplierName || '').toLowerCase().includes(term) ||
        (r.invoiceNumber || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageItems = React.useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  React.useEffect(() => { setPage(1); }, [q, limit, status, from, to]);

  const unitBuy = (p: Purchase) => {
    if (p.buyPricePerUnit != null) return Number(p.buyPricePerUnit);
    const pq = Math.max(1, Number(p.packQuantity || 1));
    return Number(p.buyPricePerPack || 0) / pq;
  };
  const unitSale = (p: Purchase) => {
    if (p.salePricePerUnit != null) return Number(p.salePricePerUnit || 0);
    const pq = Math.max(1, Number(p.packQuantity || 1));
    return Number(p.salePricePerPack || 0) / pq;
  };

  const downloadCsv = () => {
    const headers = ['Date','Medicine','Supplier','Packs','Units/Pack','Total Items','Buy/Pack','Buy/Unit','Sale/Pack','Sale/Unit','Total Amount','Invoice #','Expiry','Status'];
    const lines = [headers.join(',')];
    filtered.forEach(p => {
      lines.push([
        p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : '',
        p.medicineName,
        p.supplierName,
        Number(p.quantity || 0),
        Number(p.packQuantity || 0),
        Number(p.totalItems || (p.quantity * p.packQuantity)),
        Number(p.buyPricePerPack || 0),
        unitBuy(p).toFixed(2),
        Number(p.salePricePerPack || 0),
        unitSale(p).toFixed(2),
        Number(p.totalPurchaseAmount || 0),
        p.invoiceNumber || '',
        p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '',
        p.status
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'indoor_purchase_history.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 bg-white border rounded-md space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm">From</label>
            <input type="date" className="border rounded px-2 py-1" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">To</label>
            <input type="date" className="border rounded px-2 py-1" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div className="relative min-w-[280px] flex-1 max-w-md">
            <input className="border rounded px-3 py-2 w-full pr-8" placeholder="medicine, supplier, invoice" value={q} onChange={e=>setQ(e.target.value)} />
            <SearchIcon className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
          <button className="px-3 py-2 rounded bg-indigo-600 text-white" onClick={load}>Apply</button>
          <button className="px-3 py-2 rounded border inline-flex items-center gap-2" onClick={downloadCsv}><Download className="h-4 w-4" /> Download</button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">Rows per page</span>
            <select value={limit} onChange={e=>setLimit(parseInt(e.target.value))} className="border rounded px-2 py-1">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          {loading && <span className="text-sm text-gray-500">Loading…</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>

      <div className="overflow-auto bg-white border rounded-md">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-left">Date</th>
              <th className="px-2 py-2 text-left">Medicine</th>
              <th className="px-2 py-2 text-left">Supplier</th>
              <th className="px-2 py-2 text-right">Packs</th>
              <th className="px-2 py-2 text-right">Units/Pack</th>
              <th className="px-2 py-2 text-right">Total Items</th>
              <th className="px-2 py-2 text-right">Buy/Pack</th>
              <th className="px-2 py-2 text-right">Buy/Unit</th>
              <th className="px-2 py-2 text-right">Total Amount</th>
              <th className="px-2 py-2 text-right">Sale/Pack</th>
              <th className="px-2 py-2 text-right">Sale/Unit</th>
              <th className="px-2 py-2 text-left">Invoice #</th>
              <th className="px-2 py-2 text-left">Expiry</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(p => (
              <tr key={p._id} className="border-t">
                <td className="px-2 py-2">{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : '-'}</td>
                <td className="px-2 py-2">{p.medicineName}</td>
                <td className="px-2 py-2">{p.supplierName}</td>
                <td className="px-2 py-2 text-right">{Number(p.quantity || 0)}</td>
                <td className="px-2 py-2 text-right">{Number(p.packQuantity || 0)}</td>
                <td className="px-2 py-2 text-right">{Number(p.totalItems || (p.quantity * p.packQuantity))}</td>
                <td className="px-2 py-2 text-right">{Number(p.buyPricePerPack || 0).toFixed(2)}</td>
                <td className="px-2 py-2 text-right">{unitBuy(p).toFixed(2)}</td>
                <td className="px-2 py-2 text-right">{Number(p.totalPurchaseAmount || 0).toFixed(2)}</td>
                <td className="px-2 py-2 text-right">{Number(p.salePricePerPack || 0).toFixed(2)}</td>
                <td className="px-2 py-2 text-right">{unitSale(p).toFixed(2)}</td>
                <td className="px-2 py-2">{p.invoiceNumber || '-'}</td>
                <td className="px-2 py-2">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '-'}</td>
                <td className="px-2 py-2">{p.status}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 border rounded inline-flex items-center gap-1" onClick={()=>setSelected(p)}>
                      <Printer className="h-4 w-4" /> Print
                    </button>
                    <button className="px-2 py-1 border rounded text-white bg-red-600 hover:bg-red-700 inline-flex items-center gap-1" onClick={()=>remove(p._id)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && !loading && (
              <tr><td className="px-2 py-6 text-center text-gray-500" colSpan={15}>No purchases</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div>Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Previous</button>
          <button className="px-3 py-1 border rounded" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>Next</button>
        </div>
      </div>

      {selected && (
        <IndoorPurchaseSlipModal open={!!selected} onClose={()=>setSelected(null)} settings={settings as any} purchase={selected} />
      )}
    </div>
  );
};

export default IndoorPurchaseHistory;
