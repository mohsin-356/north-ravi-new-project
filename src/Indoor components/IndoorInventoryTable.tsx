import React from 'react';
import { indoorApi } from '../Indoor lib/api';
import { Pencil, Trash2, Printer, Filter as FilterIcon, List } from 'lucide-react';
import IndoorEditInventoryDialog from './IndoorEditInventoryDialog';

export type InventoryFilter = 'all' | 'pending' | 'low' | 'expiring' | 'out';

type AddStockRow = {
  _id: string;
  invoiceNumber?: string;
  medicine?: { _id: string; name: string; category?: string };
  supplier?: { _id: string; name: string } | string;
  quantity: number;
  packQuantity: number;
  unitSalePrice?: number;
  salePricePerPack?: number;
  totalItems?: number;
  minStock?: number;
  expiryDate?: string;
  category?: string;
  status?: string;
  // Live inventory stock merged from /inventory if available
  currentStock?: number;
};

interface Props {
  filter: InventoryFilter;
  search: string;
  refreshKey?: number;
}

const IndoorInventoryTable: React.FC<Props> = ({ filter, search, refreshKey }) => {
  const [rows, setRows] = React.useState<AddStockRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editRow, setEditRow] = React.useState<AddStockRow | null>(null);

  const computeUnitSale = (r: AddStockRow) => {
    if (typeof r.unitSalePrice === 'number') return r.unitSalePrice;
    if (typeof r.salePricePerPack === 'number' && r.packQuantity) return r.salePricePerPack / r.packQuantity;
    return 0;
  };

  const computeSalePerPack = (r: AddStockRow) => {
    if (typeof r.salePricePerPack === 'number') return r.salePricePerPack;
    const unit = computeUnitSale(r);
    if (unit && r.packQuantity) return unit * r.packQuantity;
    return 0;
  };

  const getTotalItems = (r: AddStockRow) => {
    let val: number | undefined;
    if (typeof r.currentStock === 'number') val = Number(r.currentStock);
    else if (typeof r.totalItems === 'number') val = Number(r.totalItems);
    else val = (Number(r.quantity || 0) * Number(r.packQuantity || 1)) || 0;
    return Math.max(0, Number.isFinite(val as number) ? (val as number) : 0);
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      if (filter === 'pending') {
        const { data } = await indoorApi.get('/add-stock/pending');
        const list = Array.isArray(data) ? data : [];
        const filtered = list.filter((r: any) => !search ? true : (r.medicine?.name || '').toLowerCase().includes(search.toLowerCase()) || (r.invoiceNumber || '').toLowerCase().includes(search.toLowerCase()));
        setRows(filtered);
        setTotal(filtered.length);
      } else {
        const [addRes, invRes] = await Promise.all([
          indoorApi.get('/add-stock', { params: { page, limit, q: search || '' } }),
          indoorApi.get('/inventory')
        ]);
        const items = Array.isArray(addRes?.data?.items) ? addRes.data.items : (Array.isArray(addRes?.data) ? addRes.data : []);
        const invItems = Array.isArray(invRes?.data) ? invRes.data : [];

        // Build quick lookup maps from inventory
        const byInvoice = new Map<string, any>();
        const byName = new Map<string, any>();
        for (const it of invItems) {
          const invNo = it?.invoiceNumber ? String(it.invoiceNumber) : '';
          if (invNo) byInvoice.set(invNo, it);
          const nm = it?.name ? String(it.name).toLowerCase() : '';
          if (nm) byName.set(nm, it);
        }

        // Count how many rows per medicine (to avoid applying aggregated stock to multiple batches)
        const nameCounts = new Map<string, number>();
        for (const r of items as any[]) {
          const nm = r?.medicine?.name ? String(r.medicine.name).toLowerCase() : '';
          if (!nm) continue; nameCounts.set(nm, (nameCounts.get(nm) || 0) + 1);
        }

        // Merge current stock into rows with accurate rules
        let list = (items as AddStockRow[]).map((r: any) => {
          const nm = r?.medicine?.name ? String(r.medicine.name).toLowerCase() : '';
          const invByInv = r.invoiceNumber ? byInvoice.get(String(r.invoiceNumber)) : undefined;
          const invByNm = nm ? byName.get(nm) : undefined;
          let currentStock: number | undefined = undefined;
          if (invByInv && typeof invByInv.stock === 'number') {
            currentStock = Number(invByInv.stock);
          } else if (invByNm && nameCounts.get(nm) === 1 && typeof invByNm.stock === 'number') {
            currentStock = Number(invByNm.stock);
          }
          return { ...r, currentStock } as AddStockRow;
        });

        // Apply filters based on live stock where available
        const now = new Date(); const soon = new Date(); soon.setDate(soon.getDate() + 30);
        if (filter === 'low') list = list.filter(r => (getTotalItems(r) <= Number(r.minStock || 0)) && Number(r.minStock || 0) > 0);
        if (filter === 'expiring') list = list.filter(r => r.expiryDate && (new Date(r.expiryDate) >= now) && (new Date(r.expiryDate) <= soon));
        if (filter === 'out') list = list.filter(r => getTotalItems(r) <= 0);

        setRows(list);
        setTotal(Number(addRes?.data?.total || list.length));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load inventory');
    } finally { setLoading(false); }
  };

  React.useEffect(() => { setPage(1); }, [filter, search, limit, refreshKey]);
  React.useEffect(() => { load(); }, [filter, search, page, limit, refreshKey]);

  const approve = async (id: string) => {
    try { await indoorApi.patch(`/add-stock/${id}/approve`, {}); await load(); } catch {}
  };

  const removeRow = async (id: string) => {
    const ok = window.confirm('Delete this record? This will adjust stock if it is approved.');
    if (!ok) return;
    try { await indoorApi.delete(`/add-stock/${id}`); await load(); } catch {}
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows per page</span>
          <select value={limit} onChange={(e)=>setLimit(parseInt(e.target.value))} className="border rounded px-2 py-1">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded" title="List"><List className="h-4 w-4" /></button>
          <button className="px-2 py-1 border rounded inline-flex items-center gap-1" onClick={()=>window.print()}><Printer className="h-4 w-4" /> <span className="text-sm">Print</span></button>
          <button className="px-2 py-1 border rounded inline-flex items-center gap-1"><FilterIcon className="h-4 w-4" /> <span className="text-sm">Filter</span></button>
        </div>
      </div>
      <div className="overflow-auto border rounded bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-2 text-left">Invoice #</th>
              <th className="px-2 py-2 text-left">Medicine</th>
              <th className="px-2 py-2 text-left">Category</th>
              <th className="px-2 py-2 text-right">Packs</th>
              <th className="px-2 py-2 text-right">Units/Pack</th>
              <th className="px-2 py-2 text-right">Sale/Pack</th>
              <th className="px-2 py-2 text-right">Unit Sale</th>
              <th className="px-2 py-2 text-right">Total Items</th>
              <th className="px-2 py-2 text-right">Min Stock</th>
              <th className="px-2 py-2 text-left">Expiry</th>
              <th className="px-2 py-2 text-left">Supplier</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r._id} className="border-t">
                <td className="px-2 py-2">{r.invoiceNumber || '-'}</td>
                <td className="px-2 py-2">{r.medicine?.name || '-'}</td>
                <td className="px-2 py-2">{r.category || r.medicine?.category || '-'}</td>
                <td className="px-2 py-2 text-right">{Number(r.quantity || 0)}</td>
                <td className="px-2 py-2 text-right">{Number(r.packQuantity || 0)}</td>
                <td className="px-2 py-2 text-right">{computeSalePerPack(r).toFixed(2)}</td>
                <td className="px-2 py-2 text-right">{computeUnitSale(r).toFixed(2)}</td>
                <td className="px-2 py-2 text-right">{getTotalItems(r)}</td>
                <td className="px-2 py-2 text-right">{Number(r.minStock || 0)}</td>
                <td className="px-2 py-2">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '-'}</td>
                <td className="px-2 py-2">{typeof r.supplier === 'string' ? r.supplier : (r.supplier?.name || '-')}</td>
                <td className="px-2 py-2">{r.status || '-'}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    {r.status === 'pending' && (
                      <button className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white" onClick={()=>approve(r._id)}>Approve</button>
                    )}
                    <button className="px-2 py-1 rounded bg-orange-500 hover:bg-orange-600 text-white inline-flex items-center gap-1" onClick={()=>setEditRow(r)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <button className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-1" onClick={()=>removeRow(r._id)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td className="px-2 py-6 text-center text-gray-500" colSpan={12}>No items</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <div className="text-sm">Loading…</div>}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil(total / limit) || 1)}</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
          <button className="px-3 py-1 border rounded" onClick={()=>setPage(p=>p+1)} disabled={(page*limit)>=total}>Next</button>
        </div>
      </div>
      {editRow && (
        <IndoorEditInventoryDialog
          open={!!editRow}
          row={editRow}
          onOpenChange={(o)=>{ if(!o) setEditRow(null); }}
          onSaved={async ()=>{ setEditRow(null); await load(); }}
        />
      )}
    </div>
  );
};

export default IndoorInventoryTable;
