import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Pharmacy components/ui/card';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Label } from '@/components/Pharmacy components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Pharmacy components/ui/select';
import { useToast } from '@/components/Pharmacy components/ui/use-toast';
import { useSettings } from '@/Pharmacy contexts/PharmacySettingsContext';
import { getInventory } from '@/pharmacy utilites/inventoryService';
import { returnService } from '@/Pharmacy services/returnService';
import { Printer } from 'lucide-react';
import { printHtmlOverlay } from '@/utils/printOverlay';

interface Props { isUrdu: boolean }

interface Supplier {
  _id: string;
  name: string;
}

interface PurchaseItem {
  _id: string;
  medicineName: string;
  medicine: string;
  quantity: number;
  packQuantity: number;
  totalItems: number;
  buyPricePerUnit: number;
}

interface Purchase {
  _id: string;
  purchaseDate: string;
  items: PurchaseItem[];
}

const SupplierReturnPage: React.FC<Props> = ({ isUrdu }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const today = new Date().toISOString().slice(0,10);
  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { settings } = useSettings();

  // load suppliers
  useEffect(()=>{
    fetch('/api/suppliers').then(r=>r.json()).then(setSuppliers).catch(()=>{});
  },[]);

  // load purchases when supplier selected
  useEffect(()=>{
    if(!supplierId) return;
    const params = new URLSearchParams({ status: 'approved' });
    if (dateRange.from) {
      const start = new Date(dateRange.from + 'T00:00:00');
      params.set('startDate', start.toISOString());
    }
    if (dateRange.to) {
      const end = new Date(dateRange.to + 'T23:59:59.999');
      params.set('endDate', end.toISOString());
    }
    fetch(`/api/purchases?supplier=${supplierId}&${params.toString()}`)
      .then(r=>r.json())
      .then(setPurchases)
      .catch(()=>{});
  },[supplierId, dateRange.from, dateRange.to]);

  const refund = () => {
    if(!selectedPurchase) return 0;
    return Object.entries(selection).reduce((sum,[id,qty])=>{
      const item= selectedPurchase.items.find(i=>i._id===id);
      return sum + (item? qty*item.buyPricePerUnit:0);
    },0);
  };

  const processReturn = async () => {
    if(!selectedPurchase) return;
    const items = Object.entries(selection)
      .filter(([, q]) => q > 0)
      .map(([purchaseItemId, quantity]) => ({ purchaseItemId, quantity }));
    if(items.length===0) return;

    // --- Send to backend ---
    try {
      await fetch('/api/supplier-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: selectedPurchase._id, items }),
      });
    } catch (err) {
      console.error('Failed to record supplier return on server', err);
    }

    // local inventory fallback / optimistic update
    const inventory = await getInventory();
    items.forEach(({ purchaseItemId, quantity }) => {
      const purchaseItem = selectedPurchase.items.find(i => i._id === purchaseItemId);
      if (!purchaseItem) return;
      const idx = inventory.findIndex((inv: any) => inv.name === purchaseItem.medicineName);
      if(idx>=0){
        inventory[idx].stock = Math.max(0, (inventory[idx].stock || 0) - quantity);
      }
    });
    localStorage.setItem('pharmacy_inventory',JSON.stringify(inventory));

    returnService.addReturn({
      type:'supplier',
      medicineId:'bulk',
      medicineName:'supplier bulk',
      quantity:refund(),
      reason:'Supplier return',
      reasonCategory:'other',
      processedBy:'admin'
    });
    window.dispatchEvent(new Event('inventoryUpdated'));
    window.dispatchEvent(new Event('supplierUpdated'));
    window.dispatchEvent(new Event('returnProcessed'));
    window.dispatchEvent(new Event('storage'));
    toast({title:'Supplier return processed',description:`Refund ${refund()}`});
    setSupplierId('');
    setSelectedPurchase(null);
    setPurchases([]);
    setSelection({});
  };

  // Wrap footer note into lines similar to BillingSlip
  const getFooterLines = (text: string, maxChars = 28): string[] => {
    if (!text) return [];
    const parts = text.split(/\r?\n/);
    const lines: string[] = [];
    for (const part of parts) {
      const words = part.trim().split(/\s+/);
      let cur = '';
      for (const w of words) {
        if (!cur) { cur = w; continue; }
        if ((cur + ' ' + w).length <= maxChars) {
          cur += ' ' + w;
        } else {
          lines.push(cur);
          cur = w;
        }
      }
      if (cur) lines.push(cur);
    }
    return lines;
  };

  // Print a supplier return slip for current selection
  const printSupplierSlip = () => {
    if (!selectedPurchase) return;
    const supplier = suppliers.find(s => s._id === supplierId);
    const chosen = Object.entries(selection)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([id, qty]) => {
        const it = selectedPurchase.items.find(i => i._id === id);
        return it ? { name: it.medicineName, qty: Number(qty), price: Number(it.buyPricePerUnit||0) } : null;
      })
      .filter(Boolean) as { name: string; qty: number; price: number }[];
    if (!chosen.length) return;
    const total = chosen.reduce((s, r) => s + r.qty * r.price, 0);
    const rows = chosen.map(r => `
      <tr>
        <td class="col-item">${r.name}</td>
        <td class="col-qty">${r.qty}</td>
        <td class="col-amt">${(r.qty*r.price).toFixed(2)}</td>
      </tr>`).join('');
    const title = 'Supplier Return';
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const hours12 = ((now.getHours() + 11) % 12) + 1;
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    const formatted = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}, ${pad(hours12)}:${pad(now.getMinutes())} ${ampm}`;
    const footerLines = getFooterLines(settings.footerText || '');
    const html = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @media print { @page { size: 80mm auto; margin: 0; } }
          html,body { margin:0; padding:0; background:#fff; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          html, body, * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: geometricPrecision; -webkit-text-size-adjust: 100%; }
          .thermal-slip { width: 76mm; margin: 0 auto; font-family: Arial, Tahoma, sans-serif; font-size: 14px; line-height: 1.3; color:#000; padding: 0 2mm; }
          .print-left{ text-align:left; }
          .print-right{ text-align:right; }
          .print-center{ text-align:center; }
          .print-bold{ font-weight:bold; }
          .print-small{ font-size:12px; }
          .print-table{ width:100%; border-collapse:collapse; }
          .print-dashed{ border-top:1px dashed #000; }
          .print-double{ border-top:3px double #000; }
          .company-header { text-align:center; margin:0 0 3mm 0; }
          .company-name-bold { font-weight:800; font-size:26px; letter-spacing:0.4px; text-transform:uppercase; }
          .invoice-title { text-align:center; font-weight:bold; margin:2mm 0; text-decoration:underline; }
          .meta-info { font-size:11px; margin:2mm 0; }
          .items-table { width:100%; border-collapse:collapse; }
          .items-table th { border-bottom:1px dashed #000; font-weight:bold; padding:1.25mm 0; }
          .items-table td { padding:1.25mm 0; }
          .col-item { width:50%; text-align:left; }
          .col-qty { width:15%; text-align:center; }
          .col-amt { width:35%; text-align:right; }
          .subtotal-row td { border-top:1px solid #000; font-weight:bold; }
          .divider { border-top:1px dashed #000; margin:2mm 0; }
          .double-divider { border-top:3px double #000; margin:2mm 0; }
          .total-row { display:flex; justify-content:space-between; font-size:13px; margin:1mm 0; }
          .grand-total { font-weight:bold; font-size:15px; }
          .thank-you { text-align:center; font-size:12px; margin-top:2mm; font-weight:bold; }
          .footer-note { text-align:left; font-size:12px; margin-top:1.5mm; white-space:normal; word-break:break-word; }
          .footer-note-line { text-align:left; }
        </style>
      </head>
      <body>
        <div class="thermal-slip">
          <div class="divider print-dashed"></div>
          <div class="company-header print-center print-bold">
            <div class="company-name-bold print-bold print-center">${settings.companyName || ''}</div>
            <div class="print-center">${settings.companyAddress || ''}</div>
            ${settings.companyPhone ? `<div class="print-center">PHONE : ${settings.companyPhone}</div>` : ''}
            ${settings.gstin ? `<div class="print-center">GSTIN : ${settings.gstin}</div>` : ''}
          </div>
          <div class="divider print-dashed"></div>
          <div class="invoice-title print-center print-bold">${title}</div>

          <div class="meta-info print-small">
            <div>Date : ${formatted}</div>
            <div>Supplier: <span class="print-bold">${supplier?.name || ''}</span></div>
            ${selectedPurchase._id ? `<div>Purchase: <span class="print-bold">${selectedPurchase._id}</span></div>` : ''}
          </div>

          <table class="items-table print-table">
            <thead>
              <tr>
                <th class="col-item print-bold print-left">Item</th>
                <th class="col-qty print-bold print-center">Qty</th>
                <th class="col-amt print-bold print-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="double-divider print-double"></div>
          <div class="total-row grand-total print-bold">
            <span class="print-left">REFUND</span>
            <span class="print-right">Rs ${total.toFixed(2)}</span>
          </div>
          <div class="divider print-dashed"></div>

          <div class="thank-you">Thank you for your purchase!</div>
          ${footerLines.length ? `<div class=\"footer-note print-left print-small\">${footerLines.map((ln) => `<div class=\\\"footer-note-line\\\">${ln}</div>`).join('')}</div>` : ''}
          <div class="divider print-dashed"></div>
        </div>
      </body>
      </html>`;
    // Use unified overlay (Ctrl+P to print, Ctrl+D to close)
    printHtmlOverlay(html, { title, width: 520, height: 740 });
  };

  // Process and then print using current selection snapshot
  const processReturnAndPrint = async () => {
    // print first (relies on current selection and purchase)
    printSupplierSlip();
    // then process and clear state
    await processReturn();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Select Supplier</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <Select value={supplierId} onValueChange={(v)=>{ setSupplierId(v); setPage(1); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Supplier"/></SelectTrigger>
              <SelectContent>
                {suppliers.map(s=><SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Invoice</Label>
            <Input placeholder="Search invoice/bill" value={invoiceQuery} onChange={(e)=>{ setInvoiceQuery(e.target.value); setPage(1); }} />
          </div>
          <div>
            <Label>From</Label>
            <Input type="date" value={dateRange.from} onChange={(e)=>{ setDateRange({...dateRange, from: e.target.value}); setPage(1); }} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={dateRange.to} onChange={(e)=>{ setDateRange({...dateRange, to: e.target.value}); setPage(1); }} />
          </div>
          <div>
            <Label>Rows</Label>
            <select className="border rounded-md p-2 text-sm w-full" value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)); setPage(1); }}>
              {[10,20,50].map(n=>(<option key={n} value={n}>{n}</option>))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>{ /* re-fetch via date effect */ }}>{'Search'}</Button>
          </div>
        </CardContent>
      </Card>

      {supplierId && !selectedPurchase && (
        <Card>
          <CardHeader><CardTitle>Purchases</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 whitespace-nowrap">Date/Time</th>
                  <th className="border px-2 py-1 whitespace-nowrap">Invoice/Bill</th>
                  <th className="border px-2 py-1">Supplier</th>
                  <th className="border px-2 py-1">Medicines</th>
                  <th className="border px-2 py-1">Qty</th>
                  <th className="border px-2 py-1">Buy Amount</th>
                  <th className="border px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {(()=>{
                  let list = purchases;
                  const q = invoiceQuery.trim().toLowerCase();
                  if(q) list = list.filter((p:any)=> `${p.invoiceNumber||p._id}`.toLowerCase().includes(q));
                  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
                  const start = (page-1)*pageSize; const end = start+pageSize;
                  const pageList = list.slice(start, end);
                  return pageList.map((p)=>{
                    const dt = new Date((p as any).purchaseDate || (p as any).date || Date.now());
                  const invoice = (p as any).invoiceNumber || p._id;
                  const supplierName = (p as any).supplierName || (suppliers.find(s=>s._id===supplierId)?.name) || '';
                  const meds = (p.items||[]).map((it:any)=>it.medicineName).join(', ') || ((p as any).medicineName || '');
                  const qty = (p.items||[]).reduce((s:number,it:any)=> s + (Number(it.totalItems||it.quantity||0)), 0) || (p as any).totalItems || (p as any).quantity || 0;
                  const buyAmount = (p as any).totalPurchaseAmount ?? (p.items||[]).reduce((s:number,it:any)=> s + (Number(it.totalItems||0)*Number(it.buyPricePerUnit||0)), 0);
                  return (
                    <tr key={p._id} className="odd:bg-gray-50">
                      <td className="border px-2 py-1 whitespace-nowrap">{dt.toLocaleDateString()} {dt.toLocaleTimeString()}</td>
                      <td className="border px-2 py-1 whitespace-nowrap">{invoice}</td>
                      <td className="border px-2 py-1">{supplierName}</td>
                      <td className="border px-2 py-1">{meds}</td>
                      <td className="border px-2 py-1 text-center">{qty}</td>
                      <td className="border px-2 py-1 text-right">Rs {Number(buyAmount||0).toLocaleString()}</td>
                      <td className="border px-2 py-1 text-center">
                        <Button size="sm" onClick={async()=>{
                          try{
                            const res=await fetch(`/api/purchases/${p._id}`);
                            let full= res.ok? await res.json(): p;
                            if(!full.items){
                              full = { ...full, items: [{
                                _id: full._id,
                                medicineName: full.medicineName || full.name || 'Medicine',
                                totalItems: full.totalItems || full.quantity || 0,
                                buyPricePerUnit: full.buyPricePerUnit || full.unitBuyPrice || 0,
                              }]};
                            }
                            setSelectedPurchase(full);
                          }catch{setSelectedPurchase(p);} }}>Select</Button>
                      </td>
                    </tr>
                  );
                });})()}
              </tbody>
            </table>
            {/* Pagination controls */}
            <div className="flex items-center justify-end gap-2 mt-3 text-sm">
              <Button variant="outline" size="sm" onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
              <Button variant="outline" size="sm" onClick={()=>setPage(p=>p+1)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPurchase && (
        <Card>
          <CardHeader><CardTitle>Return Items</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto space-y-4">
            <table className="min-w-full text-sm border"><thead><tr><th className="border px-2">Product</th><th className="border px-2">Qty Purchased</th><th className="border px-2">Buy Price</th><th className="border px-2">Qty Return</th></tr></thead><tbody>
              {selectedPurchase.items?.length ? selectedPurchase.items.map(it=>(
                <tr key={it._id} className="odd:bg-gray-50"><td className="border px-2">{it.medicineName}</td><td className="border px-2 text-center">{it.totalItems}</td><td className="border px-2 text-right">{it.buyPricePerUnit}</td><td className="border px-2"><Input type="number" className="w-24" min={0} max={it.totalItems} value={selection[it._id]||0} onChange={e=>setSelection({...selection,[it._id]:Number(e.target.value)})}/></td></tr>
              )) : <tr><td colSpan={4} className="text-center p-4">No item list available</td></tr>}
            </tbody></table>
            <div className="flex justify-between items-center pt-4">
              <p>Refund: {refund()}</p>
              <div className="space-x-2">
                <Button variant="outline" onClick={()=>setSelectedPurchase(null)}>Back</Button>
                <Button variant="outline" onClick={printSupplierSlip} disabled={refund()<=0} title="Print">
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
                <Button onClick={processReturn} disabled={refund()<=0}>Process Return</Button>
                <Button onClick={processReturnAndPrint} disabled={refund()<=0} className="bg-green-600 hover:bg-green-700">
                  <Printer className="h-4 w-4 mr-1" /> Process & Print
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
export default SupplierReturnPage;