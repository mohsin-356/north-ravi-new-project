import React from 'react';
import { indoorApi } from '../Indoor lib/api';
import { useCart } from '../Indoor contexts/CartContext';
import { Grid2x2, List, EyeOff, Trash2, Plus, Minus, Search as SearchIcon } from 'lucide-react';
import { useIndoorSettings } from '../Indoor contexts/SettingsContext';
import ReceiptModal from './IndoorReceiptModal';

type InventoryItem = {
  _id: string;
  name: string;
  price: number;
  stock: number;
  barcode?: string;
};

const IndoorPOS: React.FC = () => {
  const { items: cart, addItem, updateQty, removeItem, clear, subtotal } = useCart();
  const { settings } = useIndoorSettings();
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [view, setView] = React.useState<'grid' | 'list'>('grid');
  const [hideInv, setHideInv] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [stockMap, setStockMap] = React.useState<Record<string, number>>({});
  const [packMap, setPackMap] = React.useState<Record<string, { salePricePerPack?: number; packQuantity?: number }>>({});

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const search = async () => {
    setLoading(true);
    try {
      const { data } = await indoorApi.get('/add-stock', { params: { page: 1, limit: 200, q } });
      const rows: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      const list: InventoryItem[] = rows.map((r: any) => ({
        _id: r._id,
        name: r?.medicine?.name || r?.name || 'Unknown',
        price: Number(r?.unitSalePrice ?? r?.unitBuyPrice ?? r?.price ?? 0),
        stock: Number(r?.totalItems ?? (Number(r?.quantity || 0) * Number(r?.packQuantity || 1)))
      }));
      setItems(list);
      const sMap: Record<string, number> = {}; list.forEach(it => { sMap[it._id] = Number(it.stock || 0); }); setStockMap(sMap);
      const pmap: Record<string, { salePricePerPack?: number; packQuantity?: number }> = {};
      for (const r of rows) { pmap[r._id] = { salePricePerPack: r?.salePricePerPack, packQuantity: r?.packQuantity }; }
      setPackMap(pmap);
      setPage(1);
    } catch (e: any) {
      setItems([]);
      setStockMap({});
      setPackMap({});
    } finally { setLoading(false); }
  };

  const loadDefault = async () => {
    setLoading(true);
    try {
      const asRes = await indoorApi.get('/add-stock', { params: { page: 1, limit: 200 } });
      const rows: any[] = Array.isArray(asRes.data?.items) ? asRes.data.items : (Array.isArray(asRes.data) ? asRes.data : []);
      const list: InventoryItem[] = rows.map((r: any) => ({ _id: r._id, name: r?.medicine?.name || r?.name || 'Unknown', price: Number(r?.unitSalePrice ?? r?.unitBuyPrice ?? r?.price ?? 0), stock: Number(r?.totalItems ?? (Number(r?.quantity || 0) * Number(r?.packQuantity || 1))) }));
      setItems(list);
      const sMap: Record<string, number> = {}; list.forEach(it => { sMap[it._id] = Number(it.stock || 0); }); setStockMap(sMap);
      const pmap: Record<string, { salePricePerPack?: number; packQuantity?: number }> = {}; for (const r of rows) { pmap[r._id] = { salePricePerPack: r?.salePricePerPack, packQuantity: r?.packQuantity }; } setPackMap(pmap);
      setPage(1);
    } catch {
      setItems([]); setStockMap({});
    } finally { setLoading(false); }
  };

  React.useEffect(() => {
    const t = setTimeout(() => { if (q.trim().length >= 1) search(); else loadDefault(); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => { loadDefault(); }, []);

  const [selectedCartIndex, setSelectedCartIndex] = React.useState<number>(-1);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!saving) checkout();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        clearCart();
        setSelectedCartIndex(-1);
        return;
      }
      if (cart.length) {
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedCartIndex(i => Math.max(0, (i<0?0:i-1))); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCartIndex(i => Math.min(cart.length-1, Math.max(0,i)+1)); return; }
        const sel = (idx: number) => (idx>=0 && idx<cart.length) ? cart[idx] : null;
        if (['+','=','Add'].includes(e.key)) {
          const c = sel(selectedCartIndex);
          if (c) { e.preventDefault(); changeQty(c.id, +1); }
          return;
        }
        if (e.key === '-' || e.key === 'Subtract') {
          const c = sel(selectedCartIndex);
          if (c) { e.preventDefault(); changeQty(c.id, -1); }
          return;
        }
        if (e.key === 'Delete') {
          const c = sel(selectedCartIndex);
          if (c) { e.preventDefault(); removeItem(c.id); setSelectedCartIndex(i=>Math.max(0,i-1)); }
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart, saving]);

  const getUnitPrice = (it: InventoryItem) => {
    const p = packMap[it._id];
    if (p && p.packQuantity && p.salePricePerPack != null) {
      const up = Number(p.salePricePerPack) / Number(p.packQuantity);
      if (Number.isFinite(up)) return up;
    }
    return Number((it as any).unitSalePrice ?? it.price ?? 0);
  };

  const addToCart = (it: InventoryItem) => {
    const unitPrice = getUnitPrice(it);
    addItem({ id: it._id, name: it.name, price: Number(unitPrice) || 0 }, 1, it.stock);
    setSelectedCartIndex(Math.max(0, cart.length));
  };

  const changeQty = (id: string, delta: number) => {
    const curr = cart.find(c => c.id === id);
    if (!curr) return;
    const max = stockMap[id] ?? Number.POSITIVE_INFINITY;
    const next = Math.max(1, Math.min(curr.quantity + delta, max));
    updateQty(id, next);
  };

  const clearCart = () => { clear(); };

  const currency = settings?.currency || 'PKR';
  const taxRate = (settings?.taxEnabled ? (parseFloat(String(settings?.taxRate || '0')) || 0) : 0) / 100;
  const discountRate = (parseFloat(String(settings?.discountRate || '0')) || 0) / 100;
  const discount = React.useMemo(() => subtotal * discountRate, [subtotal, discountRate]);
  const tax = React.useMemo(() => Math.max(0, (subtotal - discount) * taxRate), [subtotal, discount, taxRate]);
  const total = React.useMemo(() => Math.max(0, subtotal - discount + tax), [subtotal, discount, tax]);

  const [showReceipt, setShowReceipt] = React.useState(false);
  const [receipt, setReceipt] = React.useState<{ billNo: string; lines: { name: string; qty: number; amt: number }[]; when: Date; payment: string; customer: string; subtotal: number; discount: number } | null>(null);

  const checkout = async () => {
    if (cart.length === 0) return;
    setSaving(true); setMsg(null); setErr(null);
    try {
      const snapshot = cart.map(i => ({ ...i }));
      const baseSub = snapshot.reduce((s, i) => s + i.price * i.quantity, 0);
      const discountAtSale = baseSub * discountRate;
      const payload = {
        items: snapshot.map(i => ({ medicineId: i.id, quantity: i.quantity, price: i.price, medicineName: i.name })),
        totalAmount: total,
        paymentMethod: 'cash',
        customerName: 'Walk-in'
      };
      const res = await indoorApi.post('/sales', payload);
      const billNo = res?.data?.billNo || '';
      setMsg('Sale completed');
      setReceipt({ billNo, when: new Date(), payment: 'cash', customer: 'Walk-in', subtotal: baseSub, discount: discountAtSale, lines: snapshot.map(i => ({ name: i.name, qty: i.quantity, amt: i.price * i.quantity })) });
      setShowReceipt(true);
      clear();
    } catch (e:any) { setErr(e?.response?.data?.error || e?.message || 'Sale failed'); }
    finally { setSaving(false); }
  };

  const pageCount = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const startIdx = (page - 1) * rowsPerPage;
  const paged = items.slice(startIdx, startIdx + rowsPerPage);

  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className={`space-y-3 xl:col-span-2 ${hideInv ? 'hidden xl:block xl:col-span-0' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Point of Sale (POS)</div>
          <div className="flex items-center gap-2">
            <button className={`px-3 py-2 border rounded inline-flex items-center gap-2 ${view==='grid'?'bg-gray-100':''}`} onClick={()=>setView('grid')}><Grid2x2 className="h-4 w-4" /> Grid View</button>
            <button className={`px-3 py-2 border rounded inline-flex items-center gap-2 ${view==='list'?'bg-gray-100':''}`} onClick={()=>setView('list')}><List className="h-4 w-4" /> List View</button>
            <button className="px-3 py-2 border rounded inline-flex items-center gap-2" onClick={()=>setHideInv(v=>!v)}><EyeOff className="h-4 w-4" /> Hide Inventory</button>
            <button className="px-3 py-2 border rounded inline-flex items-center gap-2" onClick={clearCart}><Trash2 className="h-4 w-4" /> Clear Cart</button>
          </div>
        </div>

        <div className="p-3 bg-white border rounded-md">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input ref={searchInputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search medicine name.." className="border rounded pl-8 pr-3 py-2 w-full" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page</label>
              <select className="border rounded px-2 py-2" value={rowsPerPage} onChange={e=>{ setRowsPerPage(parseInt(e.target.value)); setPage(1); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-2 text-sm">
            <button className="px-3 py-1 border rounded" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <div>Page {page} of {pageCount}</div>
            <button className="px-3 py-1 border rounded" disabled={page>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>Next</button>
          </div>
        </div>

        <div className="p-3 bg-white border rounded-md">
          {loading ? (
            <div className="text-sm text-gray-500">Searching…</div>
          ) : (
            <div className={`${view==='grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'divide-y'} max-h-[60vh] overflow-auto`}>
              {paged.map(it => (
                <div key={it._id} className={`border rounded-md ${view==='grid' ? 'p-3' : 'p-2 flex items-center justify-between'}`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold capitalize">{it.name}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Stock: {it.stock}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Sale/Pack: PKR {packMap[it._id]?.salePricePerPack != null ? Number(packMap[it._id]?.salePricePerPack).toFixed(2) : '—'}</div>
                    <div className="text-xs text-gray-500">Units/Pack: {packMap[it._id]?.packQuantity != null ? Number(packMap[it._id]?.packQuantity) : '—'}</div>
                    <div className="mt-2 font-bold">PKR {getUnitPrice(it).toFixed(2)}</div>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <button className="px-3 py-2 rounded bg-indigo-600 text-white inline-flex items-center gap-2" onClick={() => addToCart(it)}>
                      <Plus className="h-4 w-4" /> Add to Cart
                    </button>
                  </div>
                </div>
              ))}
              {paged.length === 0 && <div className="text-sm text-gray-500">No results</div>}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-white border rounded-md">
          <div className="text-lg font-semibold mb-2">Shopping Cart ({cart.length})</div>
          <div className="space-y-2 max-h-[42vh] overflow-auto">
            {cart.map((ci, idx) => (
              <div
                key={ci.id}
                className={`flex items-center justify-between border rounded px-2 py-2 ${idx===selectedCartIndex ? 'ring-2 ring-indigo-300 border-indigo-400 bg-indigo-50' : ''}`}
                onClick={()=>setSelectedCartIndex(idx)}
              >
                <div>
                  <div className="font-medium">{ci.name}</div>
                  <div className="text-xs text-gray-500">PKR {ci.price.toFixed(2)} each</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-1 border rounded" onClick={() => { setSelectedCartIndex(idx); changeQty(ci.id, -1); }}><Minus className="h-3 w-3" /></button>
                  <div className="min-w-[2rem] text-center font-semibold">{ci.quantity}</div>
                  <button className="px-2 py-1 border rounded" onClick={() => { setSelectedCartIndex(idx); changeQty(ci.id, 1); }}><Plus className="h-3 w-3" /></button>
                  <button className="px-2 py-1 border rounded text-red-600" onClick={() => { removeItem(ci.id); setSelectedCartIndex(i=>Math.max(0,i-1)); }}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {cart.length === 0 && <div className="text-sm text-gray-500">Cart is empty</div>}
          </div>
        </div>

        <div className="p-4 bg-white border rounded-md">
          <div className="font-semibold mb-2">Bill Summary</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between"><span>Subtotal:</span><span className="font-semibold">{currency} {subtotal.toFixed(2)}</span></div>
            <div className="flex items-center justify-between"><span>Discount:</span><span className="font-semibold">{currency} {discount.toFixed(2)}</span></div>
            <div className="flex items-center justify-between text-gray-500"><span>Sales Tax ({Math.round(taxRate*100)}%):</span><span className="font-semibold">{currency} {tax.toFixed(2)}</span></div>
          </div>
          <div className="mt-3 p-3 rounded bg-gray-50 flex items-center justify-between font-bold text-lg">
            <span>Total Amount:</span>
            <span>{currency} {total.toFixed(2)}</span>
          </div>
          <button className="mt-3 w-full px-4 py-3 rounded bg-indigo-700 text-white text-base disabled:opacity-50" onClick={checkout} disabled={cart.length===0 || saving}>{saving ? 'Processing…' : 'Process Payment'}</button>
          {msg && <div className="text-sm text-green-700 mt-2">{msg}</div>}
          {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
        </div>
      </div>
    </div>
    {showReceipt && receipt && (
      <ReceiptModal
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        settings={settings}
        billNo={receipt.billNo}
        date={receipt.when}
        customer={receipt.customer}
        payment={receipt.payment}
        lines={receipt.lines}
        subtotal={receipt.subtotal}
        discount={receipt.discount}
        taxRate={taxRate}
        currency={currency}
      />
    )}
    </>
  );
};

export default IndoorPOS;
