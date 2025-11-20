import React from 'react';
import { indoorApi } from '../Indoor lib/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

const IndoorUpdateStockDialog: React.FC<Props> = ({ open, onOpenChange, onDone }) => {
  const [medInput, setMedInput] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [packsToAdd, setPacksToAdd] = React.useState('');
  const [minStock, setMinStock] = React.useState('');
  const [expiryDate, setExpiryDate] = React.useState('');
  const [packQuantity, setPackQuantity] = React.useState('');
  const [invoiceNumber, setInvoiceNumber] = React.useState('');
  const [buyPricePerPack, setBuyPricePerPack] = React.useState('');
  const [salePricePerPack, setSalePricePerPack] = React.useState('');
  const [purchaseDate, setPurchaseDate] = React.useState('');
  const [supplierId, setSupplierId] = React.useState('');
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [showNewSupplier, setShowNewSupplier] = React.useState(false);
  const [newSupplierName, setNewSupplierName] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try { const { data } = await indoorApi.get('/suppliers'); setSuppliers(Array.isArray(data) ? data : []); } catch {}
    })();
  }, [open]);

  React.useEffect(() => {
    const q = medInput.trim();
    if (!q) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try { const { data } = await indoorApi.get('/inventory/search', { params: { q, limit: 20 } }); const names = Array.from(new Set((Array.isArray(data)?data:[]).map((x:any)=>x.name).filter(Boolean))); setSuggestions(names); } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [medInput]);

  const toNum = (s: string) => { const n = parseFloat(s); return isNaN(n) ? 0 : n; };
  const packs = toNum(packsToAdd);
  const pq = toNum(packQuantity);
  const buy = toNum(buyPricePerPack);
  const sale = toNum(salePricePerPack);
  const totalUnits = packs && pq ? packs * pq : 0;
  const unitPurchase = pq > 0 && buy ? (buy / pq) : 0;
  const unitSale = pq > 0 && sale ? (sale / pq) : 0;

  const addSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try { const { data } = await indoorApi.post('/suppliers', { name: newSupplierName.trim() }); setSuppliers(p => [...p, data]); setSupplierId(data._id || data.id); setShowNewSupplier(false); setNewSupplierName(''); } catch {}
  };

  const submit = async () => {
    if (!medInput.trim() || !packsToAdd || !packQuantity || !buyPricePerPack) return;
    setBusy(true);
    try {
      await indoorApi.post('/add-stock', {
        medicineName: medInput.trim(),
        quantity: packs,
        packQuantity: pq,
        buyPricePerPack: buy,
        salePricePerPack: sale || undefined,
        supplier: supplierId || undefined,
        expiryDate: expiryDate || undefined,
        minStock: minStock ? toNum(minStock) : undefined,
        invoiceNumber: invoiceNumber || undefined,
        category: category || undefined,
        purchaseDate: purchaseDate || undefined,
        status: 'pending'
      });
      onOpenChange(false);
      onDone && onDone();
    } catch {}
    finally { setBusy(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl shadow-lg">
        <div className="px-6 py-4 border-b"><div className="text-2xl font-bold">Update Stock</div></div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Medicine</label>
            <div className="relative">
              <input className="w-full border rounded px-3 py-2" placeholder="Select medicine..." value={medInput} onChange={e=>setMedInput(e.target.value)} />
              {suggestions.length>0 && (
                <div className="absolute z-10 bg-white border rounded mt-1 w-full max-h-48 overflow-auto">
                  {suggestions.map(n => (
                    <div key={n} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onMouseDown={() => setMedInput(n)}>{n}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Category</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Enter category" value={category} onChange={e=>setCategory(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Packs to Add</label>
            <input className="w-full border rounded px-3 py-2" value={packsToAdd} onChange={e=>setPacksToAdd(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Min Stock</label>
            <input className="w-full border rounded px-3 py-2" type="number" value={minStock} onChange={e=>setMinStock(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Expiry Date</label>
            <input className="w-full border rounded px-3 py-2" type="date" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Units in One Pack</label>
            <input className="w-full border rounded px-3 py-2" type="number" value={packQuantity} onChange={e=>setPackQuantity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Invoice Number</label>
            <input className="w-full border rounded px-3 py-2" placeholder="e.g. INV-000001" value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Purchase Price / Pack</label>
            <input className="w-full border rounded px-3 py-2" type="number" step="0.01" value={buyPricePerPack} onChange={e=>setBuyPricePerPack(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Sale Price / Pack</label>
            <input className="w-full border rounded px-3 py-2" type="number" step="0.01" value={salePricePerPack} onChange={e=>setSalePricePerPack(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Purchase Date</label>
            <input className="w-full border rounded px-3 py-2" type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Total Units (auto)</label>
            <input className="w-full border rounded px-3 py-2 bg-gray-50" value={totalUnits || ''} readOnly />
          </div>
          <div>
            <label className="block text-sm mb-1">Unit Purchase Price (auto)</label>
            <input className="w-full border rounded px-3 py-2 bg-gray-50" value={unitPurchase || ''} readOnly />
          </div>
          <div>
            <label className="block text-sm mb-1">Unit Sale Price (auto)</label>
            <input className="w-full border rounded px-3 py-2 bg-gray-50" value={unitSale || ''} readOnly />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Supplier</label>
            <div className="flex gap-2 items-center">
              <select className="flex-1 border rounded px-3 py-2" value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
                <option value="">Select supplier...</option>
                {suppliers.map(s => (<option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>))}
              </select>
              <button className="px-3 py-2 rounded border" onClick={()=>setShowNewSupplier(v=>!v)}>+ New</button>
            </div>
            {showNewSupplier && (
              <div className="mt-2 flex gap-2">
                <input className="flex-1 border rounded px-3 py-2" placeholder="Supplier name" value={newSupplierName} onChange={e=>setNewSupplierName(e.target.value)} />
                <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={addSupplier}>Save</button>
              </div>
            )}
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

export default IndoorUpdateStockDialog;
