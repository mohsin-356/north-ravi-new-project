import React from 'react';
import { indoorApi } from '../Indoor lib/api';

type Row = {
  id: string;
  medicine: string;
  expiry?: string;
  unitsPerPack: string;
  category: string;
  qtyPacks: string;
  minStock: string;
  buyPerPack: string;
  salePerPack: string;
  salesTaxPct: string;
};

interface Props {
  onClose?: () => void;
  onSubmitted?: () => void;
}

const IndoorAddInvoicePage: React.FC<Props> = ({ onClose, onSubmitted }) => {
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [supplierId, setSupplierId] = React.useState('');
  const [invoiceNo, setInvoiceNo] = React.useState('');
  const [invoiceDate, setInvoiceDate] = React.useState('');
  const [rows, setRows] = React.useState<Row[]>([{ id: crypto.randomUUID(), medicine: '', expiry: '', unitsPerPack: '1', category: '', qtyPacks: '1', minStock: '', buyPerPack: '', salePerPack: '', salesTaxPct: '' }]);
  const [busy, setBusy] = React.useState(false);
  const [addTaxes, setAddTaxes] = React.useState<{ id: string; name: string; percent: string; applyOn: string }[]>([]);

  React.useEffect(() => { (async()=>{ try{ const {data}=await indoorApi.get('/suppliers'); setSuppliers(Array.isArray(data)?data:[]);}catch{}})(); },[]);

  const totals = React.useMemo(() => {
    const gross = rows.reduce((s, r) => s + (parseFloat(r.qtyPacks)||0) * (parseFloat(r.buyPerPack)||0), 0);
    const lineTaxes = rows.reduce((s, r) => s + ((parseFloat(r.salesTaxPct)||0)/100) * ((parseFloat(r.qtyPacks)||0) * (parseFloat(r.buyPerPack)||0)), 0);
    const taxable = gross; // no discount UI for now
    const addTaxAmt = addTaxes.reduce((s, t) => s + ((parseFloat(t.percent)||0)/100) * taxable, 0);
    return { gross, discount: 0, taxable, lineTaxes, addTaxAmt, net: gross + lineTaxes + addTaxAmt };
  }, [rows, addTaxes]);

  const addRow = () => setRows(prev => [...prev, { id: crypto.randomUUID(), medicine: '', expiry: '', unitsPerPack: '1', category: '', qtyPacks: '1', minStock: '', buyPerPack: '', salePerPack: '', salesTaxPct: '' }]);
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const update = (id: string, patch: Partial<Row>) => setRows(prev => prev.map(r => r.id===id?{...r, ...patch}:r));
  const addTaxRow = () => setAddTaxes(prev => [...prev, { id: crypto.randomUUID(), name: '', percent: '', applyOn: 'Gross - Discount' }]);
  const updateTax = (id: string, patch: Partial<{ name: string; percent: string; applyOn: string }>) => setAddTaxes(prev => prev.map(t => t.id===id?{...t, ...patch}:t));
  const removeTax = (id: string) => setAddTaxes(prev => prev.filter(t => t.id !== id));

  const submitAll = async () => {
    const payloads = rows
      .filter(r => r.medicine && r.qtyPacks && r.unitsPerPack && r.buyPerPack)
      .map(r => ({
        medicineName: r.medicine.trim(),
        quantity: parseFloat(r.qtyPacks),
        packQuantity: parseFloat(r.unitsPerPack),
        buyPricePerPack: parseFloat(r.buyPerPack),
        salePricePerPack: r.salePerPack?parseFloat(r.salePerPack):undefined,
        supplier: supplierId || undefined,
        expiryDate: r.expiry || undefined,
        minStock: r.minStock?parseFloat(r.minStock):undefined,
        invoiceNumber: invoiceNo || undefined,
        category: r.category || undefined,
        purchaseDate: invoiceDate || undefined,
        status: 'pending'
      }));
    if (!payloads.length) return;
    setBusy(true);
    try {
      await Promise.all(payloads.map(p => indoorApi.post('/add-stock', p)));
      onSubmitted && onSubmitted();
      onClose && onClose();
    } catch {}
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Items</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded border" onClick={onClose}>Close</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={submitAll} disabled={busy}>Submit</button>
        </div>
      </div>
      <div className="bg-white border rounded-md p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-sm mb-1">Supplier</label>
            <select className="w-full border rounded px-3 py-2" value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Invoice No</label>
            <input className="w-full border rounded px-3 py-2" value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Invoice Date</label>
            <input className="w-full border rounded px-3 py-2" type="date" value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)} />
          </div>
        </div>

        <div className="border rounded-md">
          <div className="p-3 grid grid-cols-12 gap-2 text-sm font-medium bg-gray-50">
            <div className="col-span-3">Medicine</div>
            <div className="col-span-1 text-center">Units/Pack</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Min</div>
            <div className="col-span-1">Buy/Pack</div>
            <div className="col-span-1">Sale/Pack</div>
            <div className="col-span-1">Tax %</div>
          </div>
          {rows.map(r => (
            <div key={r.id} className="p-3 grid grid-cols-12 gap-2 border-t items-center">
              <input className="col-span-3 border rounded px-2 py-1" placeholder="Medicine" value={r.medicine} onChange={e=>update(r.id,{medicine:e.target.value})} />
              <input className="col-span-1 border rounded px-2 py-1 text-center" type="number" value={r.unitsPerPack} onChange={e=>update(r.id,{unitsPerPack:e.target.value})} />
              <input className="col-span-1 border rounded px-2 py-1 text-center" type="number" value={r.qtyPacks} onChange={e=>update(r.id,{qtyPacks:e.target.value})} />
              <input className="col-span-2 border rounded px-2 py-1" placeholder="Category" value={r.category} onChange={e=>update(r.id,{category:e.target.value})} />
              <input className="col-span-1 border rounded px-2 py-1 text-center" type="number" placeholder="Min" value={r.minStock} onChange={e=>update(r.id,{minStock:e.target.value})} />
              <input className="col-span-1 border rounded px-2 py-1 text-center" type="number" step="0.01" value={r.buyPerPack} onChange={e=>update(r.id,{buyPerPack:e.target.value})} />
              <input className="col-span-1 border rounded px-2 py-1 text-center" type="number" step="0.01" value={r.salePerPack} onChange={e=>update(r.id,{salePerPack:e.target.value})} />
              <input className="col-span-1 border rounded px-2 py-1 text-center" type="number" step="0.01" value={r.salesTaxPct} onChange={e=>update(r.id,{salesTaxPct:e.target.value})} />
              <div className="col-span-12 flex justify-end"><button className="px-2 py-1 rounded border text-red-600" onClick={()=>removeRow(r.id)}>Remove</button></div>
            </div>
          ))}
          <div className="p-3"><button className="px-3 py-2 rounded border" onClick={addRow}>+ Add Row</button></div>
        </div>
      </div>

      <div className="bg-white border rounded-md p-4 space-y-3">
        <div className="text-lg font-semibold">Additional Taxes</div>
        <div className="space-y-2">
          {addTaxes.map(t => (
            <div key={t.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div>
                <label className="block text-sm mb-1">Tax name (e.g., Advance WHT)</label>
                <input className="w-full border rounded px-3 py-2" value={t.name} onChange={e=>updateTax(t.id,{name:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Percent %</label>
                <input className="w-full border rounded px-3 py-2" type="number" value={t.percent} onChange={e=>updateTax(t.id,{percent:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Apply on</label>
                <select className="w-full border rounded px-3 py-2" value={t.applyOn} onChange={e=>updateTax(t.id,{applyOn:e.target.value})}>
                  <option>Gross - Discount</option>
                </select>
              </div>
              <div>
                <button className="px-3 py-2 rounded border text-red-600" onClick={()=>removeTax(t.id)}>Remove</button>
              </div>
            </div>
          ))}
          <button className="px-3 py-2 rounded border" onClick={addTaxRow}>+ Add More Tax</button>
        </div>
      </div>

      <div className="bg-white border rounded-md p-4 space-y-3">
        <div className="text-lg font-semibold">Totals</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="p-2 rounded border bg-gray-50">Gross: <span className="font-medium">{totals.gross.toFixed(2)}</span></div>
          <div className="p-2 rounded border bg-gray-50">Discount: <span className="font-medium">0.00</span></div>
          <div className="p-2 rounded border bg-gray-50">Taxable (Gross - Discount): <span className="font-medium">{totals.taxable.toFixed(2)}</span></div>
          <div className="p-2 rounded border bg-gray-50">Line Taxes (Rs): <span className="font-medium">{totals.lineTaxes.toFixed(2)}</span></div>
          <div className="p-2 rounded border bg-gray-50">Additional Taxes (Rs): <span className="font-medium">{totals.addTaxAmt.toFixed(2)}</span></div>
          <div className="p-2 rounded border bg-gray-50">Net Total: <span className="font-medium">{totals.net.toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
};

export default IndoorAddInvoicePage;
