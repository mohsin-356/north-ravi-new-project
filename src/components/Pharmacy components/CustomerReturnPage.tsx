import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Pharmacy components/ui/card';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Pharmacy components/ui/select';
import { Label } from '@/components/Pharmacy components/ui/label';
import { RefreshCw, Printer } from 'lucide-react';
import { useToast } from '@/components/Pharmacy components/ui/use-toast';
import { useSettings } from '@/Pharmacy contexts/PharmacySettingsContext';
import { getInventory, updateItemUnits, clearInventoryCache } from '@/pharmacy utilites/inventoryService';
import { returnService, ReturnReason } from '@/Pharmacy services/returnService';
import { printHtmlOverlay } from '@/utils/printOverlay';

interface CustomerReturnPageProps {
  isUrdu: boolean;
}

interface SaleItem {
  _id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  price: number; // price per unit
}

interface SaleRecord {
  _id: string;
  customerName?: string;
  customerId?: string;
  date: string;
  totalAmount: number;
  items: SaleItem[];
  paymentMethod?: 'cash' | 'credit';
}

const RETURN_WINDOW_DAYS = 14;

const reasonOptions: { value: ReturnReason; label: string }[] = [
  { value: 'expired', label: 'Expired' },
  { value: 'wrong-item', label: 'Wrong Item' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'other', label: 'Other' },
];

const CustomerReturnPage: React.FC<CustomerReturnPageProps> = ({ isUrdu }) => {
  /* ------------------------- search state ------------------------- */
  const [invoiceId, setInvoiceId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [searchResults, setSearchResults] = useState<SaleRecord[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  // removed secondary invoice quick search
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { toast } = useToast();
  const { settings } = useSettings();

  /* --------------------- item selection state --------------------- */
  type SelectedItem = {
    saleItemId: string;
    qtyReturn: number;
    reason: ReturnReason;
  };

  // Split footer text into multiple lines similar to BillingSlip
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
  const [selection, setSelection] = useState<SelectedItem[]>([]);

  /* ------------------------ helpers ------------------------ */
  const inWindow = (saleDate: string) => {
    const diff = Date.now() - new Date(saleDate).getTime();
    return diff <= RETURN_WINDOW_DAYS * 864e5;
  };

  const findSelected = (id: string) => selection.find((s) => s.saleItemId === id);

  const updateSelection = (id: string, patch: Partial<SelectedItem>) => {
    setSelection((prev) => {
      const existing = prev.find((s) => s.saleItemId === id);
      if (existing) {
        return prev.map((s) => (s.saleItemId === id ? { ...s, ...patch } : s));
      }
      return [...prev, { saleItemId: id, qtyReturn: 0, reason: 'other', ...patch }];
    });
  };

  const refundAmount = () => {
    if (!selectedSale) return 0;
    return selection.reduce((sum, sel) => {
      const item = selectedSale.items.find((i) => i._id === sel.saleItemId);
      if (!item) return sum;
      return sum + sel.qtyReturn * item.price;
    }, 0);
  };

  /* ------------------------- search logic ------------------------- */
  const sameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const inRange = (d: Date) => {
    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    // clear time for comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return d >= start && d <= end;
  };

  const handleRefresh = () => {
    searchSales();
    setSelectedSale(null);
    setSelection([]);
  };

  const searchSales = async () => {
    try {
      const query = invoiceId.trim();
      let data: SaleRecord[] = [];
      if (query) {
        // Try direct lookup by bill number first
        try {
          const byBill = await fetch(`/api/sales/by-bill/${encodeURIComponent(query)}`);
          if (byBill.ok) {
            const one = await byBill.json();
            data = one ? [one] : [];
          }
        } catch {}
      }
      if (data.length === 0) {
        // Fallback: fetch all and filter by billNo or _id
        const res = await fetch('/api/sales');
        if (!res.ok) throw new Error('Network');
        const all: any[] = await res.json();
        data = all as SaleRecord[];
        if (query) {
          const q = query.toLowerCase();
          data = data.filter((s: any) => `${s.billNo || ''}`.toLowerCase().includes(q) || `${s._id || ''}`.toLowerCase().includes(q));
        }
      }
      if (customerQuery.trim()) {
        const q = customerQuery.trim().toLowerCase();
        data = data.filter((s) => `${s.customerName || ''}`.toLowerCase().includes(q) || `${s.customerId || ''}`.toLowerCase().includes(q));
      }
      // Only apply date filter when no specific invoice query provided
      if (!query && dateRange.from && dateRange.to) {
        data = data.filter((s) => inRange(new Date(s.date)));
      }

      setSearchResults(data);
    } catch (err) {
      toast({ title: 'Search failed', description: 'Could not fetch sales', variant: 'destructive' });
    }
  };

  /* ---------------------- process return ---------------------- */
  const processReturn = async () => {
    if (!selectedSale) return;
    const itemsToReturn = selection.filter((s) => s.qtyReturn > 0);
    if (itemsToReturn.length === 0) return;

    let returnsOk = false;

    // --- Backend return processing ---
    try {
      // 1. Call backend /api/returns to handle sale, aggregates, inventory, customer profile
      try {
        const res = await fetch('/api/returns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            saleId: selectedSale._id,
            items: itemsToReturn.map((it) => ({ saleItemId: it.saleItemId, quantity: it.qtyReturn, reason: it.reason }))
          })
        });
        returnsOk = !!res?.ok;
      } catch (err) {
        console.error('Failed to record return on server', err);
      }

      // 2. If server did NOT handle inventory, adjust units once and only then
      if (!returnsOk) {
        const invList = await getInventory();
        await Promise.all(itemsToReturn.map(async (sel) => {
          const saleItem = selectedSale.items.find((i) => i._id === sel.saleItemId);
          if (!saleItem) return;
          const primaryId = String(saleItem.medicineId);
          try {
            // In saved sales, 'medicineId' usually holds the AddStock record id used by /add-stock/:id/items
            await updateItemUnits(primaryId, sel.qtyReturn);
          } catch (err1) {
            try {
              const norm = (s: string) => (s || '').trim().toLowerCase();
              const byId = (invList as any[]).find((it: any) => String(it.id) === primaryId || String(it._id) === primaryId || String(it.medicineId) === primaryId);
              const byName = (invList as any[]).find((it: any) => norm(it.name) === norm((saleItem as any).medicineName));
              const fallback = byId || byName;
              if (!fallback) throw err1;
              await updateItemUnits(String(fallback.id || fallback._id), sel.qtyReturn);
            } catch (err2) {
              console.error('Inventory update failed (with fallback)', err2);
            }
          }
        }));
      }
    } catch (err) {
      console.error('Bulk inventory adjustment failed', err);
    }

    // --- No second POST to /api/returns ---

    // No localStorage fallback here; inventory UI sources data from API via getInventory()

    // Record return locally
    itemsToReturn.forEach((sel) => {
      returnService.addReturn({
        type: 'customer',
        medicineId: sel.saleItemId,
        medicineName: selectedSale.items.find((i) => i._id === sel.saleItemId)?.medicineName || '',
        quantity: sel.qtyReturn,
        reason: reasonOptions.find((r) => r.value === sel.reason)?.label || '',
        reasonCategory: sel.reason,
        processedBy: 'admin',
      });
    });

    /* ----------- adjust cached sales & customer credit ---------- */
    try {
      const salesLS = JSON.parse(localStorage.getItem('pharmacy_sales') || '[]');
      const idx = salesLS.findIndex((s: any) => s._id === selectedSale._id);
      if (idx >= 0) {
        const saleRec = salesLS[idx];
        // decrement totals per return
        saleRec.items = saleRec.items.map((it: any) => {
          const sel = itemsToReturn.find((s) => s.saleItemId === it._id);
          if (sel) {
            it.quantity -= sel.qtyReturn;
          }
          return it;
        });
        saleRec.totalAmount -= refundAmount();
        if (saleRec.totalAmount < 0) saleRec.totalAmount = 0;
        salesLS[idx] = saleRec;
        localStorage.setItem('pharmacy_sales', JSON.stringify(salesLS));
      }

      // update customer credit if needed
      if (selectedSale.paymentMethod === 'credit' && selectedSale.customerId) {
        const customersLS = JSON.parse(localStorage.getItem('pharmacy_customers') || '[]');
        const cIdx = customersLS.findIndex((c: any) => c._id === selectedSale.customerId);
        if (cIdx >= 0) {
          customersLS[cIdx].totalPurchases -= refundAmount();
          if (customersLS[cIdx].totalPurchases < 0) customersLS[cIdx].totalPurchases = 0;
          localStorage.setItem('pharmacy_customers', JSON.stringify(customersLS));
        }
      }
    } catch (err) {
      console.error('Failed adjusting local sales/customer cache', err);
    }

    // notify other pages/widgets
    try { clearInventoryCache(); } catch {}
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('returnProcessed'));
    window.dispatchEvent(new Event('inventoryUpdated'));
    window.dispatchEvent(new Event('customerUpdated'));

    toast({ title: 'Return processed', description: `Refund PKR ${refundAmount().toLocaleString()}` });
    // reset flow
    setSelectedSale(null);
    setSelection([]);
  };

  // Print customer return slip for the currently selected items
  const printCustomerReturn = () => {
    if (!selectedSale) return;
    const itemsToReturn = selection.filter((s) => s.qtyReturn > 0);
    if (itemsToReturn.length === 0) return;
    try {
      const title = 'Customer Return';
      const rows = itemsToReturn.map((sel) => {
        const item = selectedSale.items.find((i) => i._id === sel.saleItemId);
        const name = item?.medicineName || '';
        const unit = item?.price || 0;
        const qty = sel.qtyReturn || 0;
        const amt = unit * qty;
        return `
          <tr>
            <td class="col-item">${name}</td>
            <td class="col-qty">${qty}</td>
            <td class="col-amt">${amt.toFixed(2)}</td>
          </tr>`;
      }).join('');
      const total = itemsToReturn.reduce((sum, sel) => {
        const item = selectedSale.items.find((i) => i._id === sel.saleItemId);
        return sum + (sel.qtyReturn * (item?.price || 0));
      }, 0);
      const bill = (selectedSale as any).billNo || selectedSale._id;
      const footerLines = getFooterLines(settings.footerText || '');
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const hours12 = ((now.getHours() + 11) % 12) + 1;
      const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
      const formatted = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}, ${pad(hours12)}:${pad(now.getMinutes())} ${ampm}`;
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
            .tax-row { font-size:12px; }
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
              <div class="print-bold">${selectedSale.customerName || selectedSale.customerId || 'Walk-in'}</div>
              <div>Bill No: <span class="print-bold">${bill}</span></div>
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
            ${footerLines.length ? `<div class="footer-note print-left print-small">${footerLines.map((ln) => `<div class=\"footer-note-line\">${ln}</div>`).join('')}</div>` : ''}
            <div class="divider print-dashed"></div>
          </div>
        </body>
        </html>`;
      // Use unified overlay so Ctrl+P prints and Ctrl+D closes
      printHtmlOverlay(html, { title, width: 520, height: 740 });
    } catch (e) {
      console.error('Failed to print customer return:', e);
      toast({ title: 'Print Failed', variant: 'destructive' });
    }
  };

  /* ------------------------- rendering ------------------------- */
  const t = {
    search: 'Search',
    invoice: 'Invoice ID',
    customer: 'Customer',
    from: 'From',
    to: 'To',
    select: 'Select',
    reason: 'Reason',
    qtyReturn: 'Qty to return',
    refund: 'Refund',
    process: 'Process Return',
    outOfWindow: 'Return period expired',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t.search}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="space-y-1">
            <Label>{t.invoice}</Label>
            <Input value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} placeholder="Exact bill/invoice" />
          </div>
          <div className="space-y-1">
            <Label>{t.customer}</Label>
            <Input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t.from}</Label>
            <Input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>{t.to}</Label>
            <Input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-6">
            <Button onClick={searchSales}>{t.search}</Button>
            <Button variant="outline" onClick={handleRefresh} title="Refresh">
              <RefreshCw size={16} />
            </Button>
          </div>
          <div className="space-y-1">
            <Label>Rows</Label>
            <select className="border rounded-md p-2 text-sm w-full" value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)); setPage(1); }}>
              {[10,20,50].map(n=> (<option key={n} value={n}>{n}</option>))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && !selectedSale && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 whitespace-nowrap">Date/Time</th>
                  <th className="border px-2 py-1 whitespace-nowrap">Bill No</th>
                  <th className="border px-2 py-1">Customer</th>
                  <th className="border px-2 py-1">Medicines</th>
                  <th className="border px-2 py-1 whitespace-nowrap">Qty (each)</th>
                  <th className="border px-2 py-1">Qty</th>
                  <th className="border px-2 py-1">Amount</th>
                  <th className="border px-2 py-1">Payment</th>
                  <th className="border px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const start = (page-1)*pageSize; const end = start+pageSize;
                  const pageList = searchResults.slice(start, end);
                  return pageList.map((s) => {
                  const dt = new Date(s.date);
                  const meds = (s.items || []).map(it => it.medicineName).join(', ');
                  const qtyEach = (s.items || []).map(it => it.quantity).join(', ');
                  const totalQty = (s.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
                  return (
                    <tr key={s._id} className="odd:bg-gray-50">
                      <td className="border px-2 py-1 whitespace-nowrap">{dt.toLocaleDateString()} {dt.toLocaleTimeString()}</td>
                      <td className="border px-2 py-1 whitespace-nowrap">{(s as any).billNo || '-'}</td>
                      <td className="border px-2 py-1 whitespace-nowrap">{s.customerName || s.customerId || 'Walk-in'}</td>
                      <td className="border px-2 py-1">{meds}</td>
                      <td className="border px-2 py-1 whitespace-nowrap">{qtyEach}</td>
                      <td className="border px-2 py-1">{totalQty}</td>
                      <td className="border px-2 py-1 text-right">Rs {s.totalAmount.toLocaleString()}</td>
                      <td className="border px-2 py-1 whitespace-nowrap">{s.paymentMethod || 'cash'}</td>
                      <td className="border px-2 py-1 text-center">
                        <Button size="sm" onClick={() => setSelectedSale(s)}>{t.select}</Button>
                      </td>
                    </tr>
                  );
                }); })()}
              </tbody>
            </table>
            {/* Pagination */}
            <div className="flex items-center justify-end gap-2 mt-3 text-sm">
              <Button variant="outline" size="sm" onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
              <Button variant="outline" size="sm" onClick={()=>setPage(p=>p+1)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sale & Return UI */}
      {selectedSale && (
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:justify-between gap-4">
              <div>
                <p>Invoice: <span className="font-semibold">{(selectedSale as any).billNo || selectedSale._id}</span></p>
                <p>Customer: <span className="font-semibold">{selectedSale.customerName || selectedSale.customerId}</span></p>
                <p>Date: {new Date(selectedSale.date).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p>Original Total: PKR {selectedSale.totalAmount.toLocaleString()}</p>
                {!inWindow(selectedSale.date) && (
                  <p className="text-red-600 font-semibold">{t.outOfWindow}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items table */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">Product</th>
                    <th className="border px-2 py-1">Qty Purchased</th>
                    <th className="border px-2 py-1">Unit Price</th>
                    <th className="border px-2 py-1">{t.qtyReturn}</th>
                    <th className="border px-2 py-1">{t.reason}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((it) => {
                    const sel = findSelected(it._id);
                    return (
                      <tr key={it._id} className="odd:bg-gray-50">
                        <td className="border px-2 py-1 whitespace-nowrap">{it.medicineName}</td>
                        <td className="border px-2 py-1 text-center">{it.quantity}</td>
                        <td className="border px-2 py-1 text-right">{it.price.toLocaleString()}</td>
                        <td className="border px-2 py-1">
                          <Input
                            type="number"
                            className="w-24"
                            min={0}
                            max={it.quantity}
                            value={sel?.qtyReturn ?? 0}
                            disabled={!inWindow(selectedSale.date)}
                            onChange={(e) => updateSelection(it._id, { qtyReturn: Number(e.target.value) })}
                          />
                        </td>
                        <td className="border px-2 py-1">
                          <Select
                            disabled={!inWindow(selectedSale.date)}
                            value={sel?.reason ?? 'other'}
                            onValueChange={(v) => updateSelection(it._id, { reason: v as ReturnReason })}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {reasonOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Summary & action */}
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
              <p className="text-lg font-semibold">Refund: PKR {refundAmount().toLocaleString()}</p>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => { setSelectedSale(null); setSelection([]); }}>Back</Button>
                <Button variant="outline" onClick={printCustomerReturn} disabled={refundAmount() <= 0}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
                <Button onClick={processReturn} disabled={refundAmount() <= 0 || !inWindow(selectedSale.date)}>
                  {t.process}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomerReturnPage;
