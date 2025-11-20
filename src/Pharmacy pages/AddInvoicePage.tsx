import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Label } from '@/components/Pharmacy components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Pharmacy components/ui/card';
import { useToast } from '@/components/Pharmacy components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Pharmacy components/ui/select';
import axios from 'axios';
import { getSuppliers } from '@/pharmacy utilites/supplierService';
import { getMedicines } from '@/pharmacy utilites/medicineService';
import { PanelLeft, PanelLeftClose, Percent, IndianRupee } from 'lucide-react';
import Sidebar from '@/components/Pharmacy components/Sidebar';
import { useAuth } from '@/Pharmacy contexts/AuthContext';

// Types
interface LineTax {
  id: string;
  name: string;
  amount: number; // rupees per line (absolute)
}

interface InvoiceRow {
  id: string;
  item: string;
  expiry?: string; // yyyy-mm-dd
  qty: number; // packs
  packQty?: number; // units per pack
  tradePrice: number; // buy price per pack
  salePricePerPack?: number; // sale price per pack
  discountPct: number; // % per line
  salesTaxMode?: 'percent' | 'rupee';
  salesTaxValue?: number; // percent or rupee depending on mode
  lineTaxes: LineTax[]; // multiple taxes in rupee per item line
  category?: string;
  minStock?: number;
}

type TaxApplyOn = 'gross' | 'afterDiscount' | 'postLineTaxes';

interface AdditionalTax {
  id: string;
  name: string;
  mode: 'percent' | 'rupee';
  ratePct: number; // used when mode = percent
  fixedAmount: number; // used when mode = rupee
  applyOn: TaxApplyOn;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function AddInvoicePage() {
  const nav = useNavigate();
  const { toast } = useToast();
  const { user: currentUser, logout } = useAuth();

  // Header fields
  const [supplier, setSupplier] = useState('');
  const [suppliers, setSuppliers] = useState<{ _id?: string; id?: string; name: string }[]>([]);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0,10));
  // removed remarks

  // Rows
  const [rows, setRows] = useState<InvoiceRow[]>([
    { id: uid(), item: '', qty: 1, packQty: 1, tradePrice: 0, salePricePerPack: 0, discountPct: 0, lineTaxes: [], category: '', minStock: undefined }
  ]);
  const [medicines, setMedicines] = useState<string[]>([]);
  const [rowSuggestOpen, setRowSuggestOpen] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Invoice-level Additional Taxes
  const [additionalTaxes, setAdditionalTaxes] = useState<AdditionalTax[]>([
    { id: uid(), name: '', mode: 'percent', ratePct: 0, fixedAmount: 0, applyOn: 'afterDiscount' }
  ]);
  const addAdditionalTax = () => setAdditionalTaxes(prev => ([...prev, { id: uid(), name: '', mode: 'percent', ratePct: 0, fixedAmount: 0, applyOn: 'afterDiscount' }]));
  const updateAdditionalTax = (id: string, patch: Partial<AdditionalTax>) =>
    setAdditionalTaxes(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  const removeAdditionalTax = (id: string) =>
    setAdditionalTaxes(prev => prev.filter(t => t.id !== id));

  const addRow = () => setRows(prev => [...prev, { id: uid(), item: '', qty: 1, packQty: 1, tradePrice: 0, salePricePerPack: 0, discountPct: 0, salesTaxMode: 'percent', salesTaxValue: 0, lineTaxes: [], category: '', minStock: undefined }]);
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  // (handlers above)

  // Sidebar local toggle for this page
  const toggleSidebar = () => setSidebarOpen(v => !v);

  // Ensure sidebar is open by default on mount
  useEffect(() => {
    setSidebarOpen(true);
  }, []);

  // Load suppliers and medicines
  useEffect(() => {
    (async () => {
      try {
        const sup = await getSuppliers();
        setSuppliers(sup as any);
      } catch (e) {
        console.error('Failed to load suppliers', e);
      }
      try {
        const meds = await getMedicines();
        const names = Array.from(new Set((meds as any[]).map(m => m.name).filter(Boolean)));
        setMedicines(names);
      } catch (e) {
        console.error('Failed to load medicines', e);
      }
    })();
  }, []);

  const saveNewSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const res = await axios.post('/api/suppliers', { name: newSupplierName.trim() });
      const s = res.data;
      setSuppliers(prev => [...prev, s]);
      setSupplier(s._id || s.id || s.name);
      setAddingSupplier(false);
      setNewSupplierName('');
      toast({ title: 'Supplier added' });
    } catch (e) {
      toast({ title: 'Failed to add supplier', variant: 'destructive' });
    }
  };

  // Calculations
  const totals = useMemo(() => {
    // Per-line derived
    let gross = 0; // sum of qty*trade
    let discountTotal = 0; // sum of line discounts
    let lineTaxesTotal = 0; // sum of rupee taxes per line (excluding sales tax)
    let salesTaxTotal = 0; // sum of per-line sales tax

    rows.forEach(r => {
      const base = (Number(r.qty) || 0) * (Number(r.tradePrice) || 0);
      const disc = base * ((Number(r.discountPct) || 0) / 100);
      const taxable = Math.max(0, base - disc);
      const thisLineTaxes = (r.lineTaxes || []).reduce((s, lt) => s + (Number(lt.amount) || 0), 0);
      let thisSalesTax = 0;
      if ((r.salesTaxMode || 'percent') === 'percent') {
        const rate = (Number(r.salesTaxValue) || 0) / 100;
        thisSalesTax = taxable * rate;
      } else {
        thisSalesTax = Number(r.salesTaxValue) || 0;
      }
      gross += base;
      discountTotal += disc;
      lineTaxesTotal += thisLineTaxes;
      salesTaxTotal += thisSalesTax;
    });

    const taxableBase = Math.max(0, gross - discountTotal);

    // Additional taxes total based on selected base
    const additionalTaxesTotal = additionalTaxes.reduce((sum, t) => {
      let base = 0;
      if (t.applyOn === 'gross') base = gross;
      else if (t.applyOn === 'afterDiscount') base = taxableBase; // gross - discount
      else if (t.applyOn === 'postLineTaxes') base = taxableBase + lineTaxesTotal; // optional third mode
      const add = t.mode === 'percent' ? (base * ((Number(t.ratePct) || 0) / 100)) : (Number(t.fixedAmount) || 0);
      return sum + (isFinite(add) ? add : 0);
    }, 0);

    const net = taxableBase + lineTaxesTotal + salesTaxTotal + additionalTaxesTotal;

    return {
      gross,
      discountTotal,
      taxableBase,
      lineTaxesTotal,
      salesTaxTotal,
      net,
      additionalTaxesTotal,
    };
  }, [rows, additionalTaxes]);

  const saveInvoice = async () => {
    // Minimal validation
    if (!supplier.trim()) {
      toast({ title: 'Supplier required', variant: 'destructive' });
      return;
    }
    const itemsValid = rows.some(r => r.item && r.qty > 0 && r.tradePrice >= 0);
    if (!itemsValid) {
      toast({ title: 'Add at least one valid line item', variant: 'destructive' });
      return;
    }

    // Validate expiry format for any provided expiry values (YYYY-MM-DD)
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    for (const r of rows) {
      if (r.expiry && !dateRe.test(r.expiry)) {
        toast({ title: 'Invalid expiry format', description: `Use YYYY-MM-DD for ${r.item || 'item'}`, variant: 'destructive' });
        return;
      }
    }

    // Normalize supplier to id if selected by id or by exact name
    const supplierObj = suppliers.find(s => s._id === supplier || s.id === supplier || s.name === supplier);
    const supplierIdOrName = supplierObj ? (supplierObj._id || supplierObj.id || supplierObj.name) : supplier;

    const payload = {
      supplier: supplierIdOrName,
      invoiceNo,
      invoiceDate,
      rows,
      totals: { ...totals, additionalTaxes, additionalTaxesTotal: totals.additionalTaxesTotal },
      status: 'pending',
    };

    try {
      // Save as a purchase/invoice record
      await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Also create pending AddStock records so they appear in Inventory -> Pending (medicine view)
      try {
        const supplierForAddStock = (supplierObj?._id || supplierObj?.id) || undefined;
        const addStockPayloads = rows.map(r => ({
          medicineName: r.item,
          quantity: Number(r.qty) || 0,
          packQuantity: Number(r.packQty) || 1,
          buyPricePerPack: Number(r.tradePrice) || 0,
          salePricePerPack: r.salePricePerPack != null ? Number(r.salePricePerPack) : undefined,
          // IMPORTANT: backend expects supplier to be an ObjectId; if we don't have one, omit to use 'Unknown Supplier'
          supplier: supplierForAddStock,
          expiryDate: r.expiry || undefined,
          invoiceNumber: invoiceNo || undefined,
          category: r.category || undefined,
          minStock: r.minStock != null ? Number(r.minStock) : undefined,
          status: 'pending'
        }));
        await Promise.all(addStockPayloads
          .filter(p => p.medicineName && p.quantity > 0 && p.packQuantity > 0)
          .map(p => fetch('/api/add-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p),
          }))
        );
      } catch (e) {
        console.warn('Failed to create pending add-stock records from invoice rows', e);
      }

      // Also save a lightweight draft into localStorage for Pending Review list in InventoryControl
      try {
        const raw = localStorage.getItem('pending_invoices');
        const list = raw ? JSON.parse(raw) : [];
        const draft = {
          id: uid(),
          createdAt: new Date().toISOString(),
          supplierId: supplierIdOrName,
          invoiceNumber: invoiceNo,
          rows,
        };
        list.unshift(draft);
        localStorage.setItem('pending_invoices', JSON.stringify(list));
      } catch {}
      toast({ title: 'Invoice saved', description: 'Saved as Pending Review.' });
      try { localStorage.setItem('activeModule', 'inventory'); } catch {}
      nav('/pharmacy');
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to save invoice', variant: 'destructive' });
    }
  };

  const setActiveModule = (module: string) => {
    localStorage.setItem('activeModule', module);
    nav('/pharmacy');
  };

  const onLogout = () => {
    logout();
    nav('/login');
    setTimeout(() => window.location.reload(), 50);
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Collapsible Sidebar */}
      <div className={`transition-all duration-200 ease-linear ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700`}
        aria-hidden={!sidebarOpen}
      >
        <Sidebar
          activeModule={"invoices"}
          setActiveModule={setActiveModule}
          currentUser={currentUser}
          onLogout={onLogout}
          isUrdu={false}
        />
      </div>
      {/* Content */}
      <div className="flex-1 p-2 md:p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-md px-3 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </Button>
            <h1 className="text-2xl font-bold">Add Invoice</h1>
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => nav('/pharmacy')}>Back</Button>
            <Button onClick={saveInvoice}>Save Invoice</Button>
          </div>
        </div>

      {/* Items (with Invoice Details merged here) */}
      <Card className="shadow-md border">
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {/* Invoice Details inline */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              {!addingSupplier ? (
                <>
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s._id || s.id || s.name} value={(s._id || s.id || s.name) as string}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => setAddingSupplier(true)}>+ Add New Supplier</Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <Input value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Supplier name" />
                  <Button size="sm" onClick={saveNewSupplier}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingSupplier(false); setNewSupplierName(''); }}>Cancel</Button>
                </div>
              )}
            </div>
            <div>
              <Label>Invoice No</Label>
              <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
            </div>
            <div>
              <Label>Invoice Date</Label>
              <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
          </div>
          <div className="h-px bg-gray-200/70 my-2" />
          <div className="max-h-[480px] overflow-y-auto pr-1 space-y-3">
          {rows.map((r, idx) => {
            const base = (Number(r.qty)||0)*(Number(r.tradePrice)||0);
            const disc = base*((Number(r.discountPct)||0)/100);
            const taxable = Math.max(0, base - disc);
            const lineTaxesSum = (r.lineTaxes||[]).reduce((s, lt)=> s + (Number(lt.amount)||0), 0);
            const thisSalesTax = (r.salesTaxMode||'percent') === 'percent'
              ? taxable * (((Number(r.salesTaxValue)||0)/100))
              : (Number(r.salesTaxValue)||0);
            const lineTotal = taxable + lineTaxesSum + thisSalesTax; 
            const packQty = Math.max(1, Number(r.packQty) || 1);
            const totalItems = (Number(r.qty) || 0) * packQty;
            const unitBuy = packQty ? (Number(r.tradePrice) || 0) / packQty : 0;
            const unitSale = packQty ? (Number(r.salePricePerPack) || 0) / packQty : 0;
            return (
              <div key={r.id} className="border rounded-md p-3 bg-white shadow-sm space-y-3">
                {/* Row 1: Item, Expiry, Qty */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <Label>Item</Label>
                    <Input value={r.item} placeholder="Medicine"
                      onFocus={() => setRowSuggestOpen(prev => ({ ...prev, [r.id]: true }))}
                      onBlur={() => setTimeout(() => setRowSuggestOpen(prev => ({ ...prev, [r.id]: false })), 100)}
                      onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, item:e.target.value}:x))} />
                    {rowSuggestOpen[r.id] && r.item && (
                      <div className="absolute z-50 bg-white border rounded w-full max-h-60 overflow-y-auto shadow">
                        {medicines.filter(n => n.toLowerCase().includes(r.item.toLowerCase())).slice(0,50).map(name => (
                          <div key={name} className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
                            onMouseDown={e => {
                              e.preventDefault();
                              setRows(prev => prev.map(x => x.id===r.id?{...x, item:name}:x));
                              setRowSuggestOpen(prev => ({ ...prev, [r.id]: false }));
                            }}
                          >{name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Expiry</Label>
                    <Input type="date" value={r.expiry||''}
                      onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, expiry:e.target.value}:x))} />
                  </div>
                  <div>
                    <Label>Qty</Label>
                    <Input type="number" value={r.qty}
                      onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, qty: Number(e.target.value)}:x))} />
                  </div>
                </div>

                {/* Row 2: Units/Pack, Category, Min Stock */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Units/Pack</Label>
                    <Input type="number" value={r.packQty || 1}
                      onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, packQty: Number(e.target.value)}:x))} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={r.category || ''} placeholder="Category"
                      onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, category: e.target.value}:x))} />
                  </div>
                  <div>
                    <Label>Min Stock</Label>
                    <Input type="number" min={0} value={r.minStock ?? ''} placeholder="Min"
                      onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, minStock: e.target.value === '' ? undefined : Number(e.target.value)}:x))} />
                  </div>
                </div>

                {/* Row 3: Buy/Pack, Sale/Pack, Disc % */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Buy/Pack</Label>
                    <Input type="number" value={r.tradePrice}
                      onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, tradePrice: Number(e.target.value)}:x))} />
                  </div>
                  <div>
                    <Label>Sale/Pack</Label>
                    <Input type="number" value={r.salePricePerPack || 0}
                      onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, salePricePerPack: Number(e.target.value)}:x))} />
                  </div>
                  <div>
                    <Label>Disc %</Label>
                    <Input type="number" value={r.discountPct}
                      onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, discountPct: Number(e.target.value)}:x))} />
                  </div>
                </div>

                {/* Row 4: Sales Tax and Line Taxes editor + Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Sales Tax</Label>
                    <div className="flex items-center gap-2">
                      <select className="border rounded px-2 py-2"
                        value={r.salesTaxMode || 'percent'}
                        onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, salesTaxMode: e.target.value as 'percent'|'rupee'}:x))}>
                        <option value="percent">%</option>
                        <option value="rupee">Rs</option>
                      </select>
                      <div className="relative">
                        <Input className="w-28 pr-6" type="number" placeholder={r.salesTaxMode==='percent'?'%':'Rs'} value={r.salesTaxValue ?? 0}
                          onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, salesTaxValue: Number(e.target.value)}:x))} />
                        <IndianRupee className={`w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 ${r.salesTaxMode==='rupee'?'opacity-100':'opacity-0'}`} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Line Taxes (Rs)</Label>
                    <div className="space-y-1">
                      {(r.lineTaxes||[]).map(lt => (
                        <div key={lt.id} className="flex items-center gap-1">
                          <Input className="flex-1" placeholder="Tax name" value={lt.name}
                            onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, lineTaxes: (x.lineTaxes||[]).map(t=> t.id===lt.id?{...t, name:e.target.value}:t)}:x))} />
                          <Input className="w-28" type="number" placeholder="Rs" value={lt.amount}
                            onChange={e=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, lineTaxes: (x.lineTaxes||[]).map(t=> t.id===lt.id?{...t, amount: Number(e.target.value)}:t)}:x))} />
                          <Button size="sm" variant="ghost" onClick={()=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, lineTaxes: (x.lineTaxes||[]).filter(t=> t.id!==lt.id)}:x))}>✕</Button>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" onClick={()=> setRows(prev=> prev.map(x=> x.id===r.id?{...x, lineTaxes: [...(x.lineTaxes||[]), { id: uid(), name: '', amount: 0 }]}:x))}>+ Add Tax</Button>
                    </div>
                  </div>
                  <div>
                    <Label>Summary</Label>
                    <div className="rounded-md border p-2 text-right bg-white/60 dark:bg-gray-900/60">
                      <div className="text-lg font-semibold tabular-nums">{lineTotal.toFixed(2)}</div>
                      <div className="mt-1 grid gap-0.5 text-[11px] text-gray-600 tabular-nums">
                        <div className="flex items-center justify-between"><span className="text-gray-500">Units</span><span className="font-medium">{totalItems}</span></div>
                        <div className="flex items-center justify-between"><span className="text-gray-500">UB</span><span className="font-medium">{unitBuy.toFixed(2)}</span></div>
                        <div className="flex items-center justify-between"><span className="text-gray-500">US</span><span className="font-medium">{unitSale.toFixed(2)}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <Button size="sm" variant="ghost" onClick={()=> removeRow(r.id)}>Remove</Button>
                </div>
              </div>
            );
          })}
          </div>
          <Button variant="outline" onClick={addRow}>+ Add Row</Button>
        </CardContent>
      </Card>

      {/* Additional Taxes */}
      <Card className="shadow-md border">
        <CardHeader>
          <CardTitle>Additional Taxes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">Add invoice-level taxes such as Advance WHT, Delivery, etc.</div>

          <div className="space-y-2">
            {additionalTaxes.map(t => (
              <div key={t.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <div className="md:col-span-4">
                  <Input placeholder="Tax name (e.g., Advance WHT)" value={t.name}
                    onChange={e => updateAdditionalTax(t.id, { name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Select value={t.mode}
                    onValueChange={(v: 'percent'|'rupee') => updateAdditionalTax(t.id, { mode: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent %</SelectItem>
                      <SelectItem value="rupee">Fixed (Rs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Input type="number" inputMode="decimal" step="0.01"
                    placeholder={t.mode==='percent' ? '0' : '0.00'}
                    value={t.mode==='percent' ? (t.ratePct ?? 0) : (t.fixedAmount ?? 0)}
                    onChange={e => t.mode==='percent'
                      ? updateAdditionalTax(t.id, { ratePct: Number(e.target.value) })
                      : updateAdditionalTax(t.id, { fixedAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-3">
                  <Select value={t.applyOn}
                    onValueChange={(v: 'gross'|'afterDiscount'|'postLineTaxes') => updateAdditionalTax(t.id, { applyOn: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Apply on" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gross">Apply on Gross</SelectItem>
                      <SelectItem value="afterDiscount">Apply on Gross - Discount</SelectItem>
                      <SelectItem value="postLineTaxes">Apply after Line Taxes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <Button type="button" variant="ghost" onClick={() => removeAdditionalTax(t.id)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addAdditionalTax}>+ Add More Tax</Button>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="shadow-md border">
        <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <div className="flex justify-between"><span>Gross</span><span className="tabular-nums">{totals.gross.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span className="tabular-nums">{totals.discountTotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Taxable (Gross - Discount)</span><span className="tabular-nums">{totals.taxableBase.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Line Taxes (Rs)</span><span className="tabular-nums">{totals.lineTaxesTotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Sales Tax</span><span className="tabular-nums">{(totals.salesTaxTotal || 0).toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold text-lg border-t pt-2"><span>Net Total</span><span className="tabular-nums">{totals.net.toFixed(2)}</span></div>
        </CardContent>
      </Card>
      {/* End Content */}
      </div>
    </div>
  );
}
