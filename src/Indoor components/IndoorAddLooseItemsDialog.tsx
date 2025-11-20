import React from 'react';
import { indoorApi } from '../Indoor lib/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

const IndoorAddLooseItemsDialog: React.FC<Props> = ({ open, onOpenChange, onDone }) => {
  const [medicine, setMedicine] = React.useState('');
  const [units, setUnits] = React.useState('');
  const [buyUnit, setBuyUnit] = React.useState('');
  const [saleUnit, setSaleUnit] = React.useState('');
  const [options, setOptions] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try { const { data } = await indoorApi.get('/inventory'); const names = Array.from(new Set((Array.isArray(data)?data:[]).map((x:any)=>x.name).filter(Boolean))); setOptions(names); } catch {}
    })();
  }, [open]);

  const submit = async () => {
    if (!medicine.trim() || !units || !buyUnit) return;
    setBusy(true);
    try {
      await indoorApi.post('/add-stock', {
        medicineName: medicine.trim(),
        quantity: parseFloat(units),
        packQuantity: 1,
        buyPricePerPack: parseFloat(buyUnit),
        salePricePerPack: saleUnit ? parseFloat(saleUnit) : undefined,
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
      <div className="bg-white rounded-lg w-full max-w-md shadow-lg">
        <div className="px-6 py-4 border-b"><div className="text-2xl font-bold">Add Loose Items</div></div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm mb-1">Select Medicine</label>
            <select className="w-full border rounded px-3 py-2" value={medicine} onChange={e=>setMedicine(e.target.value)}>
              <option value="">-- choose --</option>
              {options.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Units (loose)</label>
              <input className="w-full border rounded px-3 py-2" placeholder="e.g. 12" type="number" value={units} onChange={e=>setUnits(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Buy Price / Unit</label>
              <input className="w-full border rounded px-3 py-2" placeholder="e.g. 5.50" type="number" step="0.01" value={buyUnit} onChange={e=>setBuyUnit(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Sale Price / Unit (optional)</label>
            <input className="w-full border rounded px-3 py-2" placeholder="e.g. 10.00" type="number" step="0.01" value={saleUnit} onChange={e=>setSaleUnit(e.target.value)} />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button className="px-4 py-2 rounded border" onClick={()=>onOpenChange(false)} disabled={busy}>Cancel</button>
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={submit} disabled={busy}>Add</button>
        </div>
      </div>
    </div>
  );
};

export default IndoorAddLooseItemsDialog;
