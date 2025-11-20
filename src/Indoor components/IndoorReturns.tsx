import React from 'react';
import { indoorApi } from '../Indoor lib/api';
import { Search, RotateCcw } from 'lucide-react';

type SaleItem = { _id: string; medicineId: string; medicineName?: string; quantity: number; price: number };

type Sale = { _id: string; billNo?: string; items: SaleItem[]; totalAmount: number; paymentMethod?: string; customerName?: string; date: string };

type ReturnLine = { saleItemId: string; quantity: number; reason?: string };

const IndoorReturns: React.FC = () => {
  const today = new Date();
  const dateOnly = (d: Date | string) => { const x = new Date(d); if (isNaN(x.getTime())) return ''; return x.toISOString().split('T')[0]; };

  const [tab, setTab] = React.useState<'customer' | 'supplier'>('customer');

  const [invoiceId, setInvoiceId] = React.useState('');
  const [customerQ, setCustomerQ] = React.useState('');
  const [from, setFrom] = React.useState(dateOnly(today));
  const [to, setTo] = React.useState(dateOnly(today));
  const [rows, setRows] = React.useState(20);
  const [page, setPage] = React.useState(1);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = React.useState(false);
  const [salesErr, setSalesErr] = React.useState<string | null>(null);
  const [selectedSale, setSelectedSale] = React.useState<Sale | null>(null);
  const [lines, setLines] = React.useState<Record<string, ReturnLine>>({});
  const [msg, setMsg] = React.useState<string | null>(null);

  const loadSales = async () => {
    setSalesLoading(true); setSalesErr(null); setSelectedSale(null); setMsg(null);
    try {
      const params: any = { limit: rows, page };
      if (invoiceId.trim()) params.billNo = invoiceId.trim();
      if (from) params.from = from; if (to) params.to = to;
      const { data } = await indoorApi.get('/sales', { params });
      let list: Sale[] = Array.isArray(data) ? data : [];
      if (customerQ.trim()) { const q = customerQ.trim().toLowerCase(); list = list.filter(s => (s.customerName || 'walk-in').toLowerCase().includes(q)); }
      setSales(list);
    } catch (e: any) { setSalesErr(e?.response?.data?.error || e?.message || 'Failed to load sales'); }
    finally { setSalesLoading(false); }
  };

  const onSelectSale = (s: Sale) => {
    setSelectedSale(s);
    const base: Record<string, ReturnLine> = {};
    (s?.items || []).forEach((it: SaleItem) => { base[it._id] = { saleItemId: it._id, quantity: 0 }; });
    setLines(base);
  };

  const setQty = (id: string, qty: number, max: number) => { setLines(prev => ({ ...prev, [id]: { ...(prev[id] || { saleItemId: id, quantity: 0 }), quantity: Math.max(0, Math.min(qty, max)) } })); };
  const setReason = (id: string, reason: string) => { setLines(prev => ({ ...prev, [id]: { ...(prev[id] || { saleItemId: id, quantity: 0 }), reason } })); };

  const submitReturn = async () => {
    if (!selectedSale) return;
    const items = Object.values(lines).filter(l => Number(l.quantity) > 0);
    if (items.length === 0) { setMsg('Please enter return quantity'); return; }
    setSalesLoading(true); setSalesErr(null); setMsg(null);
    try {
      const payload = { saleId: selectedSale._id, items };
      const { data } = await indoorApi.post('/returns', payload);
      setMsg(`Returned PKR ${Number(data?.refunded || 0).toFixed(2)}`);
      try { window.dispatchEvent(new Event('returnProcessed')); window.dispatchEvent(new Event('inventoryUpdated')); } catch {}
      await loadSales();
      setSelectedSale(null);
      setLines({});
    } catch (e:any) { setSalesErr(e?.response?.data?.error || e?.message || 'Return failed'); }
    finally { setSalesLoading(false); }
  };

  type Supplier = { _id: string; name: string };
  type Purchase = { _id: string; invoiceNumber?: string; supplier?: string; supplierName?: string; medicine?: string; medicineName?: string; quantity?: number; packQuantity?: number; totalItems?: number; totalPurchaseAmount?: number; purchaseDate?: string };

  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = React.useState('');
  const [invQ, setInvQ] = React.useState('');
  const [sf, setSf] = React.useState('');
  const [st, setSt] = React.useState('');
  const [sRows, setSRows] = React.useState(20);
  const [sPage, setSPage] = React.useState(1);
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [pLoading, setPLoading] = React.useState(false);
  const [pErr, setPErr] = React.useState<string | null>(null);
  const [selectedPurchase, setSelectedPurchase] = React.useState<Purchase | null>(null);
  const [supQty, setSupQty] = React.useState<number>(0);
  const [supMsg, setSupMsg] = React.useState<string | null>(null);

  const loadSuppliers = async () => {
    try { const { data } = await indoorApi.get('/suppliers'); setSuppliers(Array.isArray(data) ? data : []); } catch {}
  };
  React.useEffect(() => { loadSuppliers(); }, []);

  const loadPurchases = async () => {
    setPLoading(true); setPErr(null); setSupMsg(null); setSelectedPurchase(null);
    try {
      const params: any = { status: 'approved' };
      if (supplierId) params.supplier = supplierId;
      if (sf) params.startDate = sf; if (st) params.endDate = st;
      const { data } = await indoorApi.get('/purchases', { params });
      let list: Purchase[] = Array.isArray(data) ? data : [];
      if (invQ.trim()) {
        const q = invQ.trim().toLowerCase();
        list = list.filter(p => (
          (p.invoiceNumber || '').toLowerCase().includes(q) ||
          (p.medicineName || '').toLowerCase().includes(q) ||
          (p.supplierName || '').toLowerCase().includes(q)
        ));
      }
      list.sort((a,b)=> new Date(b.purchaseDate||'').getTime() - new Date(a.purchaseDate||'').getTime());
      setPurchases(list);
    } catch (e:any) { setPErr(e?.response?.data?.error || e?.message || 'Failed to load purchases'); }
    finally { setPLoading(false); }
  };

  React.useEffect(() => {
    if (tab === 'supplier') { loadPurchases(); }
  }, [tab]);

  const processSupplierReturn = async () => {
    if (!selectedPurchase) return;
    const available = (selectedPurchase.totalItems != null)
      ? Number(selectedPurchase.totalItems)
      : (Number(selectedPurchase.quantity||0) * Number(selectedPurchase.packQuantity||0));
    const qty = Math.max(0, Math.min(Number(supQty||0), available));
    if (!qty) { setSupMsg('Enter a quantity > 0 and <= available units'); return; }
    setPLoading(true); setPErr(null); setSupMsg(null);
    try {
      await indoorApi.post('/supplier-returns', { purchaseId: selectedPurchase._id, items: [{ quantity: qty }] });
      setSupMsg('Supplier return processed');
      try { window.dispatchEvent(new Event('returnProcessed')); window.dispatchEvent(new Event('inventoryUpdated')); } catch {}
      setSelectedPurchase(null);
      setSupQty(0);
      await loadPurchases();
    } catch (e:any) { setPErr(e?.response?.data?.error || e?.message || 'Failed to process supplier return'); }
    finally { setPLoading(false); }
  };

  const custResults = (
    <div className="space-y-3">
      <div className="p-3 bg-white border rounded-md">
        <div className="text-base font-semibold mb-3">Search</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="text-sm block">Invoice ID</label>
            <input className="border rounded px-3 py-2 w-full" placeholder="Exact bill/invoice" value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block">Customer</label>
            <input className="border rounded px-3 py-2 w-full" value={customerQ} onChange={e=>setCustomerQ(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block">From</label>
            <input type="date" className="border rounded px-3 py-2 w-full" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block">To</label>
            <input type="date" className="border rounded px-3 py-2 w-full" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block">Rows</label>
            <select className="border rounded px-3 py-2 w-full" value={rows} onChange={e=>setRows(parseInt(e.target.value))}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 border rounded inline-flex items-center gap-2" onClick={()=>{ setPage(1); loadSales(); }}><Search className="h-4 w-4" /> Search</button>
            <button className="px-3 py-2 border rounded" onClick={loadSales}><RotateCcw className="h-4 w-4" /></button>
          </div>
        </div>
        {salesLoading && <div className="text-sm text-gray-500 mt-2">Loading…</div>}
        {salesErr && <div className="text-sm text-red-600 mt-2">{salesErr}</div>}
        {msg && <div className="text-sm text-green-700 mt-2">{msg}</div>}
      </div>

      <div className="p-3 bg-white border rounded-md">
        <div className="text-base font-semibold mb-2">Results</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-2 text-left">Date/Time</th>
                <th className="px-2 py-2 text-left">Bill No</th>
                <th className="px-2 py-2 text-left">Customer</th>
                <th className="px-2 py-2 text-left">Medicines</th>
                <th className="px-2 py-2 text-left">Qty (each)</th>
                <th className="px-2 py-2 text-left">Qty</th>
                <th className="px-2 py-2 text-left">Amount</th>
                <th className="px-2 py-2 text-left">Payment</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => {
                const meds = (s.items || []).map(i => i.medicineName || '').filter(Boolean).join(', ');
                const qtyEach = (s.items || []).map(i => String(i.quantity)).join(',');
                const qtyTotal = (s.items || []).reduce((a,b)=>a + Number(b.quantity||0), 0);
                return (
                  <tr key={s._id} className="border-t">
                    <td className="px-2 py-2">{new Date(s.date).toLocaleString()}</td>
                    <td className="px-2 py-2">{s.billNo || '-'}</td>
                    <td className="px-2 py-2">{s.customerName || 'Walk-in'}</td>
                    <td className="px-2 py-2">{meds || '-'}</td>
                    <td className="px-2 py-2">{qtyEach}</td>
                    <td className="px-2 py-2">{qtyTotal}</td>
                    <td className="px-2 py-2">Rs {Number(s.totalAmount||0).toLocaleString()}</td>
                    <td className="px-2 py-2">{s.paymentMethod || '-'}</td>
                    <td className="px-2 py-2 text-right"><button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={()=>onSelectSale(s)}>Select</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button className="px-3 py-1 border rounded" disabled={page<=1} onClick={()=>{ setPage(p=>Math.max(1,p-1)); loadSales(); }}>Prev</button>
          <button className="px-3 py-1 border rounded" disabled={sales.length < rows} onClick={()=>{ setPage(p=>p+1); loadSales(); }}>Next</button>
        </div>
      </div>

      {selectedSale && (
        <div className="p-3 bg-white border rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm">Customer: <b>{selectedSale.customerName || 'Walk-in'}</b> • Date: {new Date(selectedSale.date).toLocaleString()}</div>
            <div className="text-sm">Bill: <b>{selectedSale.billNo || '-'}</b></div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left">Item</th>
                  <th className="px-2 py-1 text-right">Sold Qty</th>
                  <th className="px-2 py-1 text-right">Return Qty</th>
                  <th className="px-2 py-1 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items.map(it => {
                  const l = lines[it._id] || { saleItemId: it._id, quantity: 0 };
                  return (
                    <tr key={it._id} className="border-t">
                      <td className="px-2 py-1">{it.medicineName || it.medicineId}</td>
                      <td className="px-2 py-1 text-right">{it.quantity}</td>
                      <td className="px-2 py-1 text-right">
                        <input type="number" min={0} max={it.quantity} value={l.quantity}
                          onChange={e=>setQty(it._id, parseInt(e.target.value)||0, it.quantity)}
                          className="border rounded px-2 py-1 w-24 text-right" />
                      </td>
                      <td className="px-2 py-1">
                        <input value={l.reason || ''} onChange={e=>setReason(it._id, e.target.value)} placeholder="Optional"
                          className="border rounded px-2 py-1 w-full" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button
              className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-50"
              onClick={submitReturn}
              disabled={salesLoading || Object.values(lines).every(l => !Number(l.quantity))}
            >
              Process Return
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const suppResults = (
    <div className="space-y-3">
      <div className="p-3 bg-white border rounded-md">
        <div className="text-base font-semibold mb-3">Select Supplier</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-sm block">Supplier</label>
            <select className="border rounded px-3 py-2 w-full" value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
              <option value="">Select</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm block">Invoice</label>
            <input className="border rounded px-3 py-2 w-full" placeholder="Search invoice/bill" value={invQ} onChange={e=>setInvQ(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block">From</label>
            <input type="date" className="border rounded px-3 py-2 w-full" value={sf} onChange={e=>setSf(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block">To</label>
            <input type="date" className="border rounded px-3 py-2 w-full" value={st} onChange={e=>setSt(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block">Rows</label>
            <select className="border rounded px-3 py-2 w-full" value={sRows} onChange={e=>setSRows(parseInt(e.target.value))}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div>
            <button className="px-3 py-2 border rounded inline-flex items-center gap-2" onClick={()=>{ setSPage(1); loadPurchases(); }}><Search className="h-4 w-4" /> Search</button>
          </div>
        </div>
        {pLoading && <div className="text-sm text-gray-500 mt-2">Loading…</div>}
        {pErr && <div className="text-sm text-red-600 mt-2">{pErr}</div>}
        {supMsg && <div className="text-sm text-green-700 mt-2">{supMsg}</div>}
      </div>

      <div className="p-3 bg-white border rounded-md">
        <div className="text-base font-semibold mb-2">Purchases</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-2 text-left">Date/Time</th>
                <th className="px-2 py-2 text-left">Invoice/Bill</th>
                <th className="px-2 py-2 text-left">Supplier</th>
                <th className="px-2 py-2 text-left">Medicines</th>
                <th className="px-2 py-2 text-left">Qty</th>
                <th className="px-2 py-2 text-left">BUY Amount</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {purchases.slice((sPage-1)*sRows, (sPage-1)*sRows + sRows).map(p => {
                const units = (p.totalItems != null) ? Number(p.totalItems) : (Number(p.quantity||0) * Number(p.packQuantity||0));
                return (
                  <tr key={p._id} className="border-t">
                    <td className="px-2 py-2">{p.purchaseDate ? new Date(p.purchaseDate).toLocaleString() : '-'}</td>
                    <td className="px-2 py-2">{p.invoiceNumber || '-'}</td>
                    <td className="px-2 py-2">{p.supplierName || '-'}</td>
                    <td className="px-2 py-2">{p.medicineName || '-'}</td>
                    <td className="px-2 py-2">{units || 0}</td>
                    <td className="px-2 py-2">Rs {Number(p.totalPurchaseAmount||0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-right"><button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={()=>{ setSelectedPurchase(p); setSupQty(0); }}>Select</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button className="px-3 py-1 border rounded" disabled={sPage<=1} onClick={()=>setSPage(p=>Math.max(1,p-1))}>Prev</button>
          <button className="px-3 py-1 border rounded" disabled={purchases.length <= sPage*sRows} onClick={()=>setSPage(p=>p+1)}>Next</button>
        </div>
      </div>

      {selectedPurchase && (
        <div className="p-3 bg-white border rounded-md space-y-3">
          <div className="text-sm">Invoice <b>{selectedPurchase.invoiceNumber || '-'}</b> • Supplier <b>{selectedPurchase.supplierName || '-'}</b></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-sm block">Quantity to Return (units)</label>
              <input type="number" min={0} className="border rounded px-3 py-2 w-full" value={supQty} onChange={e=>setSupQty(parseInt(e.target.value)||0)} />
              <div className="text-xs text-gray-500 mt-1">Available: {(selectedPurchase.totalItems != null ? selectedPurchase.totalItems : (Number(selectedPurchase.quantity||0) * Number(selectedPurchase.packQuantity||0))) || 0}</div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-50" onClick={processSupplierReturn} disabled={pLoading || !supQty}>Process Return</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className={`px-3 py-1 rounded border ${tab==='customer' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}`} onClick={()=>setTab('customer')}>Customer Return</button>
        <button className={`px-3 py-1 rounded border ${tab==='supplier' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}`} onClick={()=>setTab('supplier')}>Supplier Return</button>
      </div>
      {tab === 'customer' ? custResults : suppResults}
    </div>
  );
};

export default IndoorReturns;
