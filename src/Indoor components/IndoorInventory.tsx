import React from 'react';
import { indoorApi } from '../Indoor lib/api';
import IndoorInventoryTable, { type InventoryFilter } from './IndoorInventoryTable';
import { Package, TrendingDown, Calendar, AlertTriangle, RotateCcw, Plus, FilePlus2, RefreshCw, Download, Filter, Search } from 'lucide-react';
import IndoorAddInventoryDialog from './IndoorAddInventoryDialog';
import IndoorUpdateStockDialog from './IndoorUpdateStockDialog';
import IndoorAddLooseItemsDialog from './IndoorAddLooseItemsDialog';
import IndoorAddInvoicePage from './IndoorAddInvoicePage';

const StatBox: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode; valueClass?: string }> = ({ title, value, icon, valueClass }) => (
  <div className="p-4 rounded-md border bg-white">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-600">{title}</div>
        <div className={`text-2xl font-bold ${valueClass || ''}`}>{value}</div>
      </div>
      <div className="opacity-90 text-gray-700">{icon}</div>
    </div>
  </div>
);

const IndoorInventory: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [filter, setFilter] = React.useState<InventoryFilter>('all');
  const [stockValue, setStockValue] = React.useState(0);
  const [lowCount, setLowCount] = React.useState(0);
  const [expiringCount, setExpiringCount] = React.useState(0);
  const [outCount, setOutCount] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  const [showAddStock, setShowAddStock] = React.useState(false);
  const [showUpdateStock, setShowUpdateStock] = React.useState(false);
  const [showAddInvoice, setShowAddInvoice] = React.useState(false);
  const [showAddLoose, setShowAddLoose] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refreshStats = async () => {
    setBusy(true);
    try {
      const [invRes, outRes, addRes] = await Promise.all([
        indoorApi.get('/inventory'),
        indoorApi.get('/inventory/outofstock'),
        indoorApi.get('/add-stock', { params: { page: 1, limit: 200 } })
      ]);
      const items = Array.isArray(addRes?.data?.items) ? addRes.data.items : (Array.isArray(addRes?.data) ? addRes.data : []);
      // Stock Value = sum of (approved lot remaining units * unit sale price)
      const unitPrice = (r: any) => {
        if (r?.unitSalePrice != null) return Number(r.unitSalePrice);
        if (r?.salePricePerPack != null && r?.packQuantity) return Number(r.salePricePerPack) / Number(r.packQuantity);
        return Number(r?.unitBuyPrice || 0);
      };
      const units = (r: any) => (r?.totalItems != null) ? Number(r.totalItems) : Number(r.quantity || 0) * Number(r.packQuantity || 1);
      const value = items.reduce((sum: number, r: any) => sum + units(r) * unitPrice(r), 0);
      setStockValue(value);
      setOutCount(Number(outRes?.data?.count || 0));
      const now = new Date(); const soon = new Date(); soon.setDate(soon.getDate() + 30);
      const totalItems = (r: any) => (r.totalItems != null) ? Number(r.totalItems) : Number(r.quantity || 0) * Number(r.packQuantity || 1);
      setLowCount(items.filter((r: any) => totalItems(r) > 0 && Number(r.minStock || 0) > 0 && totalItems(r) <= Number(r.minStock || 0)).length);
      setExpiringCount(items.filter((r: any) => r.expiryDate && new Date(r.expiryDate) >= now && new Date(r.expiryDate) <= soon).length);
    } catch {}
    finally { setBusy(false); }
  };

  React.useEffect(() => { refreshStats(); }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
      if (!isTyping && (e.key === '/' || (e.shiftKey && (e.key.toLowerCase() === 'f')))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const exportCsv = async () => {
    try {
      const { data } = await indoorApi.get('/add-stock', { params: { page: 1, limit: 1000, q: search } });
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      const headers = ['Invoice','Medicine','Category','Packs','Units/Pack','UnitSale','TotalItems','MinStock','Expiry','Supplier','Status'];
      const lines = [headers.join(',')];
      items.forEach((r: any) => {
        const unit = r.unitSalePrice ?? (r.salePricePerPack && r.packQuantity ? r.salePricePerPack / r.packQuantity : 0);
        const tot = (r.totalItems != null) ? r.totalItems : (Number(r.quantity||0) * Number(r.packQuantity||1));
        const sup = typeof r.supplier === 'string' ? r.supplier : (r.supplier?.name || '');
        lines.push([
          r.invoiceNumber || '', r.medicine?.name || '', r.category || r.medicine?.category || '', r.quantity || 0, r.packQuantity || 0, unit, tot, r.minStock || 0, r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '', sup, r.status || ''
        ].join(','));
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'indoor_inventory.csv'; a.click(); URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Inventory</h2>
        <div className="text-sm text-gray-500">{busy ? 'Updating…' : ''}</div>
      </div>

      <div className="bg-white border rounded-md p-4 space-y-4">
        <div className="text-2xl font-bold">Inventory Control</div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBox title="Stock Value" value={`PKR ${stockValue.toLocaleString()}`} icon={<Package className="h-8 w-8 text-green-600" />} valueClass="text-green-600" />
          <StatBox title="Low Stock Items" value={lowCount} icon={<TrendingDown className="h-8 w-8 text-amber-500" />} valueClass="text-amber-600" />
          <StatBox title="Expiring Items" value={expiringCount} icon={<Calendar className="h-8 w-8 text-orange-500" />} valueClass="text-orange-600" />
          <StatBox title="Out of Stock Items" value={outCount} icon={<AlertTriangle className="h-8 w-8 text-red-600" />} valueClass="text-red-600" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2" onClick={()=>setShowUpdateStock(true)}><RotateCcw className="h-4 w-4" /> Update Stock</button>
          <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2" onClick={()=>setShowAddStock(true)}><Plus className="h-4 w-4" /> Add Inventory</button>
          <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2" onClick={()=>setShowAddLoose(true)}><Plus className="h-4 w-4" /> Add Loose Items</button>
          <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2" onClick={()=>setShowAddInvoice(true)}><FilePlus2 className="h-4 w-4" /> Add Invoice</button>
          <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2" onClick={refreshStats}><RefreshCw className="h-4 w-4" /> Refresh</button>
          <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2" onClick={exportCsv}><Download className="h-4 w-4" /> Export</button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full">
            <input ref={searchInputRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search medicines or scan barcode..." className="border rounded px-3 py-2 w-full pr-9" />
            <Search className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
          <button className="px-3 py-2 rounded border inline-flex items-center gap-2"><Filter className="h-4 w-4" /> Filter</button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className={`px-3 py-1 rounded border ${filter==='all'?'bg-gray-900 text-white':''}`} onClick={()=>setFilter('all')}>All Items</button>
          <button className={`px-3 py-1 rounded border ${filter==='pending'?'bg-gray-900 text-white':''}`} onClick={()=>setFilter('pending')}>Pending Review</button>
          <button className={`px-3 py-1 rounded border ${filter==='low'?'bg-gray-900 text-white':''}`} onClick={()=>setFilter('low')}>Low Stock</button>
          <button className={`px-3 py-1 rounded border ${filter==='expiring'?'bg-gray-900 text-white':''}`} onClick={()=>setFilter('expiring')}>Expiring Soon</button>
          <button className={`px-3 py-1 rounded border ${filter==='out'?'bg-gray-900 text-white':''}`} onClick={()=>setFilter('out')}>Out of Stock</button>
        </div>

        <IndoorInventoryTable filter={filter} search={search} refreshKey={refreshKey} />
      </div>

      {showAddStock && (
        <IndoorAddInventoryDialog
          open={showAddStock}
          onOpenChange={(o)=>{ setShowAddStock(o); if(!o){ setRefreshKey(k=>k+1); refreshStats(); } }}
          onDone={()=>{ setRefreshKey(k=>k+1); refreshStats(); }}
        />
      )}
      {showUpdateStock && (
        <IndoorUpdateStockDialog
          open={showUpdateStock}
          onOpenChange={(o)=>{ setShowUpdateStock(o); if(!o){ setRefreshKey(k=>k+1); refreshStats(); } }}
          onDone={()=>{ setRefreshKey(k=>k+1); refreshStats(); }}
        />
      )}
      {showAddInvoice && (
        <div className="fixed inset-0 bg-black/40 z-50 overflow-auto">
          <div className="min-h-full p-6">
            <div className="bg-white border rounded-lg p-4 max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xl font-semibold">Add Invoice</div>
                <button className="px-3 py-1 border rounded" onClick={()=>setShowAddInvoice(false)}>Close</button>
              </div>
              <IndoorAddInvoicePage onClose={()=>setShowAddInvoice(false)} onSubmitted={()=>{ setRefreshKey(k=>k+1); refreshStats(); }} />
            </div>
          </div>
        </div>
      )}
      {showAddLoose && (
        <IndoorAddLooseItemsDialog
          open={showAddLoose}
          onOpenChange={(o)=>{ setShowAddLoose(o); if(!o){ setRefreshKey(k=>k+1); refreshStats(); } }}
          onDone={()=>{ setRefreshKey(k=>k+1); refreshStats(); }}
        />
      )}
    </div>
  );
};

export default IndoorInventory;
