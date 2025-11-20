import React from 'react';
import { indoorApi } from '../Indoor lib/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

const IndoorAddInventoryDialog: React.FC<Props> = ({ open, onOpenChange, onDone }) => {
  const [medicine, setMedicine] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [quantity, setQuantity] = React.useState('');
  const [minStock, setMinStock] = React.useState('');
  const [expiryDate, setExpiryDate] = React.useState('');
  const [packQuantity, setPackQuantity] = React.useState('');
  const [buyPricePerPack, setBuyPricePerPack] = React.useState('');
  const [salePricePerPack, setSalePricePerPack] = React.useState('');
  const [invoiceNumber, setInvoiceNumber] = React.useState('');
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [supplierId, setSupplierId] = React.useState('');
  const [showNewSupplier, setShowNewSupplier] = React.useState(false);
  const [newSupplierName, setNewSupplierName] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try { const { data } = await indoorApi.get('/suppliers'); setSuppliers(Array.isArray(data) ? data : []); } catch {}
    })();
  }, [open]);

  const toNum = (s: string) => { const n = parseFloat(s); return isNaN(n) ? 0 : n; };
  const q = toNum(quantity);
  const pq = toNum(packQuantity);
  const buy = toNum(buyPricePerPack);
  const sale = toNum(salePricePerPack);
  const totalPrice = q * buy;
  const totalQty = q * pq;
  const sellUnit = pq > 0 && sale ? (sale / pq) : 0;
  const unitBuy = pq > 0 && buy ? (buy / pq) : 0;

  const reset = () => {
    setMedicine(''); setCategory(''); setQuantity(''); setMinStock(''); setExpiryDate('');
    setPackQuantity(''); setBuyPricePerPack(''); setSalePricePerPack(''); setInvoiceNumber('');
    setSupplierId(''); setShowNewSupplier(false); setNewSupplierName('');
  };

  const addSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try { const { data } = await indoorApi.post('/suppliers', { name: newSupplierName.trim() }); setSuppliers(p => [...p, data]); setSupplierId(data._id || data.id); setShowNewSupplier(false); setNewSupplierName(''); } catch {}
  };

  const submit = async () => {
    if (!medicine.trim() || !quantity || !packQuantity || !buyPricePerPack) return;
    setBusy(true);
    try {
      await indoorApi.post('/add-stock', {
        medicineName: medicine.trim(),
        quantity: toNum(quantity),
        packQuantity: toNum(packQuantity),
        buyPricePerPack: toNum(buyPricePerPack),
        salePricePerPack: salePricePerPack ? toNum(salePricePerPack) : undefined,
        supplier: supplierId || undefined,
        expiryDate: expiryDate || undefined,
        minStock: minStock ? toNum(minStock) : undefined,
        invoiceNumber: invoiceNumber || undefined,
        category: category || undefined,
        status: 'pending'
      });
      reset();
      onOpenChange(false);
      onDone && onDone();
    } catch {} finally { setBusy(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl shadow-lg">
        <div className="px-6 py-4 border-b">
          <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">Add Inventory</div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Medicine</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Type medicine name" value={medicine} onChange={e=>setMedicine(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Category</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Enter category" value={category} onChange={e=>setCategory(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Quantity</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Number of packs" type="number" value={quantity} onChange={e=>setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Minimum Stock</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Enter minimum stock" type="number" value={minStock} onChange={e=>setMinStock(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Expiry Date</label>
            <input className="w-full border rounded px-3 py-2" placeholder="dd/mm/yyyy" type="date" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Units / Pack</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Units per pack" type="number" value={packQuantity} onChange={e=>setPackQuantity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Buy Price</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Enter buy price" type="number" step="0.01" value={buyPricePerPack} onChange={e=>setBuyPricePerPack(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Sale Price</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Enter sale price" type="number" step="0.01" value={salePricePerPack} onChange={e=>setSalePricePerPack(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Total Price</label>
            <input className="w-full border rounded px-3 py-2 bg-gray-50" placeholder="Total price" value={totalPrice || ''} readOnly />
          </div>
          <div>
            <label className="block text-sm mb-1">Total Quantity</label>
            <input className="w-full border rounded px-3 py-2 bg-gray-50" placeholder="Total items" value={totalQty || ''} readOnly />
          </div>
          <div>
            <label className="block text-sm mb-1">Sell Unit Price</label>
            <input className="w-full border rounded px-3 py-2 bg-gray-50" placeholder="Unit price" value={sellUnit || ''} readOnly />
          </div>
          <div>
            <label className="block text-sm mb-1">Unit Buy Price</label>
            <input className="w-full border rounded px-3 py-2 bg-gray-50" placeholder="Unit buy price" value={unitBuy || ''} readOnly />
          </div>
          <div>
            <label className="block text-sm mb-1">Invoice Number</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Invoice number" value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Supplier</label>
            <div className="flex gap-2 items-center">
              <select className="flex-1 border rounded px-3 py-2" value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
                <option value="">Select supplier</option>
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
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={submit} disabled={busy}>Add Inventory</button>
        </div>
      </div>
    </div>
  );
};

export default IndoorAddInventoryDialog;
