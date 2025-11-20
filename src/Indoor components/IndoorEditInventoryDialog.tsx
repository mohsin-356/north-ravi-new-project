import React from 'react';
import { indoorApi } from '../Indoor lib/api';

type Row = {
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
};

interface Props {
  open: boolean;
  row: Row;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const IndoorEditInventoryDialog: React.FC<Props> = ({ open, row, onOpenChange, onSaved }) => {
  const [quantity, setQuantity] = React.useState<string>('');
  const [packQuantity, setPackQuantity] = React.useState<string>('');
  const [salePricePerPack, setSalePricePerPack] = React.useState<string>('');
  const [minStock, setMinStock] = React.useState<string>('');
  const [expiryDate, setExpiryDate] = React.useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = React.useState<string>('');
  const [category, setCategory] = React.useState<string>('');
  const [supplierId, setSupplierId] = React.useState<string>('');
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setQuantity(String(row.quantity ?? ''));
    setPackQuantity(String(row.packQuantity ?? ''));
    setSalePricePerPack(String(row.salePricePerPack ?? ''));
    setMinStock(String(row.minStock ?? ''));
    setExpiryDate(row.expiryDate ? row.expiryDate.substring(0, 10) : '');
    setInvoiceNumber(String(row.invoiceNumber || ''));
    setCategory(String(row.category || row.medicine?.category || ''));
    setSupplierId(typeof row.supplier === 'string' ? row.supplier : (row.supplier?._id || ''));
    (async () => {
      try { const { data } = await indoorApi.get('/suppliers'); setSuppliers(Array.isArray(data) ? data : []); } catch {}
    })();
  }, [open, row]);

  const toNum = (s: string) => { const n = parseFloat(s); return isNaN(n) ? undefined : n; };

  const submit = async () => {
    setBusy(true);
    try {
      const payload: any = {
        quantity: toNum(quantity),
        packQuantity: toNum(packQuantity),
        salePricePerPack: toNum(salePricePerPack),
        minStock: toNum(minStock),
        expiryDate: expiryDate || undefined,
        invoiceNumber: invoiceNumber || undefined,
        category: category || undefined,
        supplier: supplierId || undefined,
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      await indoorApi.patch(`/add-stock/${row._id}`, payload);
      onOpenChange(false);
      onSaved && onSaved();
    } catch {}
    finally { setBusy(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl shadow-lg">
        <div className="px-6 py-4 border-b">
          <div className="text-2xl font-bold">Edit Inventory</div>
          <div className="text-sm text-gray-600">{row.medicine?.name || ''}</div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Packs</label>
            <input className="w-full border rounded px-3 py-2" type="number" value={quantity} onChange={e=>setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Units/Pack</label>
            <input className="w-full border rounded px-3 py-2" type="number" value={packQuantity} onChange={e=>setPackQuantity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Sale Price / Pack</label>
            <input className="w-full border rounded px-3 py-2" type="number" step="0.01" value={salePricePerPack} onChange={e=>setSalePricePerPack(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Minimum Stock</label>
            <input className="w-full border rounded px-3 py-2" type="number" value={minStock} onChange={e=>setMinStock(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Expiry Date</label>
            <input className="w-full border rounded px-3 py-2" type="date" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Invoice Number</label>
            <input className="w-full border rounded px-3 py-2" value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Category</label>
            <input className="w-full border rounded px-3 py-2" value={category} onChange={e=>setCategory(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Supplier</label>
            <select className="w-full border rounded px-3 py-2" value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {suppliers.map(s => (<option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>))}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button className="px-4 py-2 rounded border" onClick={()=>onOpenChange(false)} disabled={busy}>Cancel</button>
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={submit} disabled={busy}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default IndoorEditInventoryDialog;
