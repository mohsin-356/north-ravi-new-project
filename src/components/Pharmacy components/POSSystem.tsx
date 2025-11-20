import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/Pharmacy components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Pharmacy components/ui/card';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Label } from '@/components/Pharmacy components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/Pharmacy components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Pharmacy components/ui/select';
import { 
  Calculator, Receipt, Banknote,
  LayoutGrid, List, Eye, EyeOff, CheckCircle,
  Search, Plus, Minus, Trash2, Printer, ShoppingCart, User, CreditCard, DollarSign
} from 'lucide-react';
import { Badge } from '@/components/Pharmacy components/ui/badge';
import { InventoryItem, getInventory, getInventoryPaged, updateItemUnits, clearInventoryCache } from '@/pharmacy utilites/inventoryService';
import { offlineManager } from '@/pharmacy utilites/offlineManager';
import { customerApi } from '@/Pharmacy api/customerApi';
import { useSettings } from '@/Pharmacy contexts/PharmacySettingsContext';
 
import { Separator } from '@/components/Pharmacy components/ui/separator';
import { Textarea } from '@/components/Pharmacy components/ui/textarea';
import ReactDOMServer from 'react-dom/server';
import BillingSlip from './BillingSlip';
import { printHtmlOverlay } from '@/utils/printOverlay';

interface POSSystemProps {
  isUrdu: boolean;
}

// This should match the structure in BillingSlip.tsx
interface SaleDetailsForReceipt {
  billNo: string; // short, human-friendly bill number
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  loyaltyDiscount: number;
  taxDetails: { name: string; amount: number }[];
  total: number;
  paymentMethod: string;
  cashTendered: number;
  change: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
  genericName?: string;
  manufacturer?: string;
}

const POSSystem: React.FC<POSSystemProps> = ({ isUrdu }) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // IMPORTANT: Do not mutate inventory when editing the cart.
  // Stock should only be decremented after successful billing.
  const adjustInventoryUnits = (_id: string, _change: number) => {
    // No-op for backend. We keep inventory unchanged during cart ops.
    // Fire an event if other widgets rely on updates.
    window.dispatchEvent(new Event('inventoryUpdated'));
  };

  // Add to cart from grouped item (by name + price), allocating across underlying inventory entries
  const addToCartFromGroup = (name: string, price: number) => {
    const norm = (s: string) => (s || '').trim().toLowerCase();
    let candidates = allItems
      .filter(m => norm(m.name) === norm(name) && Number(m.price) === Number(price))
      .sort((a, b) => (new Date(a.expiryDate as any).getTime() || 0) - (new Date(b.expiryDate as any).getTime() || 0)); // FEFO
    // Fallback: if no exact price match, allow any price for this name
    if (candidates.length === 0) {
      candidates = allItems
        .filter(m => norm(m.name) === norm(name))
        .sort((a, b) => (new Date(a.expiryDate as any).getTime() || 0) - (new Date(b.expiryDate as any).getTime() || 0));
    }
    if (candidates.length === 0) return;

    // Try to put 1 unit into the first candidate with remaining capacity considering current cart
    for (const med of candidates) {
      const inCart = cartItems.find(ci => String(ci.id) === String(med.id));
      const qtyInCart = inCart ? inCart.quantity : 0;
      const available = Math.max(0, Number((med as any).stock || 0) - qtyInCart);
      if (available > 0) {
        // Reuse existing cart line for this batch or create new one
        if (inCart) {
          updateQuantity(String(med.id), 1);
        } else {
          setCartItems(prev => [...prev, { id: String(med.id), name: med.name, price: med.price, quantity: 1, barcode: med.barcode, genericName: med.genericName, manufacturer: med.manufacturer } as any]);
        }

        // Low stock warning (non-blocking): show yellow toast if remaining stock is at/below threshold
        try {
          const min = Number((med as any).minStock ?? 10);
          const remaining = available - 1; // after adding 1 unit
          if (Number.isFinite(min) && remaining <= min) {
            toast({
              title: 'Low stock',
              description: 'Product is in low stock, purchase again',
              className: 'bg-yellow-50 border border-yellow-300 text-yellow-900'
            });
          }
        } catch {}
        return;
      }
    }

    // If none available, notify
    toast({ title: 'Out of stock', description: 'Requested stock not available', variant: 'destructive' });
  };

  // Group items for receipt: merge same-name items (and same unit price) from different stock rows
  const groupItemsForReceipt = (items: CartItem[]): CartItem[] => {
    const map = new Map<string, CartItem>();
    for (const it of items) {
      const keyName = (it.name || '').trim().toLowerCase();
      const key = `${keyName}|${Number(it.price).toFixed(2)}`; // keep price-level separation if needed
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { ...it });
      } else {
        prev.quantity += it.quantity;
      }
    }
    return Array.from(map.values());
  };
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', id: '', mrNumber: '', email: '', address: '', cnic: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  // Removed: amount received input/logic; cash tendered assumed to equal total
  const [_amountReceived, _setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [discount, setDiscount] = useState<number | string>('');
  const [shortBillNo, setShortBillNo] = useState<string>('');
  const [lookupTimer, setLookupTimer] = useState<NodeJS.Timeout | null>(null);
  const [customerHistory, setCustomerHistory] = useState<{
    purchases: Array<{medicine: string, date: string, quantity: number, price: number}>,
    credit: {total: number, used: number, remaining: number}
  } | null>(null);
  
  // Handle search input change (server-side)
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setPage(1);
    if (term.trim()) setShowInventory(true);
  };
  
    // CNIC auto-lookup
  const handleCnicChange = (value: string) => {
    setCustomerInfo({ ...customerInfo, cnic: value });
    if (lookupTimer) clearTimeout(lookupTimer);
    setLookupTimer(setTimeout(async () => {
      const trimmed = value.trim();
      if (!trimmed) return;
      try {
        const data = await customerApi.searchByCNIC(trimmed);
        if (data) {
          setCustomerInfo({
            ...customerInfo,
            id: data._id,
            name: data.name,
            phone: data.phone,
            email: data.email,
            address: data.address,
            mrNumber: data.mrNumber,
            cnic: data.cnic
          });
          
        }
      } catch (err) {
        console.error('CNIC lookup failed', err);
      }
    }, 400) as unknown as NodeJS.Timeout);
  };

  // Handle barcode scan - this will be defined later in the component
  
  const fetchPage = React.useCallback(async () => {
    setIsFetching(true);
    try {
      const { items, total } = await getInventoryPaged(page, limit);
      setInventory(items);
      setFilteredItems(items);
      setTotal(total);
      try {
        const blanks = items.filter(i => !String(i.name || '').trim()).length;
        const zeroStock = items.filter(i => Number((i as any).stock || 0) <= 0).length;
        const pending = items.filter(i => (i as any).status === 'pending').length;
        console.debug('[POS] Inventory page summary', { page, limit, total, pageCount: total != null ? Math.ceil(total/limit) : null, items: items.length, blanks, zeroStock, pending });
      } catch {}
    } catch (error) {
      console.error('Failed to load inventory (paged):', error);
      toast({ title: 'Error', description: 'Failed to load inventory', variant: 'destructive' });
    } finally { setIsFetching(false); }
  }, [page, limit]);

  // Load inventory on component mount and whenever page/limit/search changes
  useEffect(() => {
    fetchPage();
    // Helper to import from localStorage payload
    const importFromPrescription = async () => {
      try {
        const raw = localStorage.getItem('pos_prescription_import');
        if (!raw) return false;
        const pl = JSON.parse(raw);
        if (!pl || !Array.isArray(pl.items) || pl.items.length === 0) return false;
        const invList = await getInventory();
        // Build next cart state and compute actual delta
        const norm = (s:string) => (s||'').trim().toLowerCase();
        const before = cartItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
        let next = [...cartItems];
        let matchedNames: string[] = [];
        let unmatchedNames: string[] = [];
        for (const it of pl.items) {
          const name = String(it.name || '').trim();
          const qty = Math.max(1, Number(it.quantity) || 1);
          const inv = invList.find(m => norm(m.name) === norm(name));
          if (inv) {
            matchedNames.push(name);
            const allowed = Math.max(0, Math.min(qty, Number((inv as any).stock || 0)));
            if (allowed > 0) {
              const existing = next.find(ci => String(ci.id) === String(inv.id));
              if (existing) {
                const newQty = Math.min(existing.quantity + allowed, Number((inv as any).stock || 0));
                existing.quantity = newQty;
              } else {
                next.push({ id: String(inv.id), name: inv.name, price: inv.price, quantity: allowed, barcode: inv.barcode, genericName: inv.genericName, manufacturer: inv.manufacturer } as any);
              }
            }
          } else {
            unmatchedNames.push(name);
          }
        }
        const after = next.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
        const addedUnits = Math.max(0, after - before);
        setCartItems(next);
        // Clear the import payload so it doesn't reapply
        localStorage.removeItem('pos_prescription_import');
        if (addedUnits > 0 || matchedNames.length > 0) {
          const partial = unmatchedNames.length > 0 ? ' (some items not found)' : '';
          toast({ title: 'Prescription imported', description: 'Items added to cart' + partial });
        } else {
          toast({ title: 'No matching items', description: 'Medicines not found in inventory', variant: 'destructive' });
        }
        return true;
      } catch (e) { console.warn('Failed to import prescription to POS', e); return false; }
    };

    // Try immediate import on mount
    setTimeout(() => { importFromPrescription(); }, 300);

    // Listen for explicit import event (if already on POS)
    const handler = () => { importFromPrescription(); };
    window.addEventListener('pos:import-prescription', handler as any);
    return () => window.removeEventListener('pos:import-prescription', handler as any);
  }, [fetchPage]);

  // Debounced server-side search using same paged endpoint as Inventory
  useEffect(() => {
    const term = searchTerm.trim();
    let cancelled = false;
    const controller = new AbortController();
    if (term.length < 2) {
      setFilteredItems(inventory);
      setTotal(total ?? null as any);
      return () => controller.abort();
    }
    const handle = setTimeout(async () => {
      setIsFetching(true);
      try {
        const { items, total: t } = await getInventoryPaged(1, limit, term, { signal: controller.signal });
        if (!cancelled) {
          setFilteredItems(items);
          setTotal(t);
          setPage(1);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('Search failed', e);
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); controller.abort(); };
  }, [searchTerm, limit, inventory]);
  
  const { settings, selectedPrinter } = useSettings(); // Get settings including tax rate and selected printer

  // Initialize discount from settings if not set locally
  useEffect(() => {
    try {
      setDiscount((prev) => {
        const prevStr = String(prev ?? '');
        if (prevStr === '' || prevStr === '0') {
          const s = String((settings as any)?.discountRate ?? '');
          return s;
        }
        return prev;
      });
    } catch {}
  }, [settings?.discountRate]);

  const text = {
    en: {
      title: 'Point of Sale (POS)',
      searchPlaceholder: 'Search medicine name...',
      scanBarcode: 'Scan Barcode',
      cart: 'Shopping Cart',
      customer: 'Customer Information',
      customerName: 'Customer Name',
      customerPhone: 'Phone Number',
      loyaltyPoints: 'Loyalty Points',
      availableRewards: 'Available Rewards',
      redeemReward: 'Redeem Reward',
      subtotal: 'Subtotal',
      discount: 'Discount',
      loyaltyDiscount: 'Loyalty Discount',
      tax: 'Sales Tax',
      total: 'Total Amount',
      processPayment: 'Process Payment',
      printReceipt: 'Print Receipt',
      clearCart: 'Clear Cart',
      qty: 'Qty',
      price: 'Sell Unit Price',
      amount: 'Amount',
      addToCart: 'Add to Cart',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      card: 'Card',
      amountReceived: 'Amount Received',
      change: 'Change',
      confirmPayment: 'Confirm Payment',
      cancel: 'Cancel',
      paymentSuccessful: 'Payment successful!',
      receiptPrinted: 'Receipt printed successfully!',
      processing: 'Processing...',
      saleCompleted: 'Sale completed successfully!',
      pointsEarned: 'Points Earned',
      tier: 'Tier'
    },
    ur: {
      title: 'پوائنٹ آف سیل',
      searchPlaceholder: 'دوا کا نام...',
      scanBarcode: 'بار کوڈ اسکین',
      cart: 'خرید کی ٹوکری',
      customer: 'کسٹمر کی معلومات',
      customerName: 'کسٹمر کا نام',
      customerPhone: 'فون نمبر',
      loyaltyPoints: 'لائلٹی پوائنٹس',
      availableRewards: 'دستیاب انعامات',
      redeemReward: 'انعام حاصل کریں',
      subtotal: 'ذیلی مجموعہ',
      discount: 'رعایت',
      loyaltyDiscount: 'لائلٹی رعایت',
      tax: 'سیلز ٹیکس',
      total: 'کل رقم',
      processPayment: 'ادائیگی کریں',
      printReceipt: 'رسید پرنٹ کریں',
      clearCart: 'ٹوکری صاف کریں',
      qty: 'تعداد',
      price: 'قیمت',
      amount: 'رقم',
      addToCart: 'ٹوکری میں شامل',
      paymentMethod: 'ادائیگی کا طریقہ',
      cash: 'نقد',
      card: 'کارڈ',
      amountReceived: 'وصول شدہ رقم',
      change: 'واپسی',
      confirmPayment: 'ادائیگی کی تصدیق',
      cancel: 'منسوخ',
      paymentSuccessful: 'ادائیگی کامیاب!',
      receiptPrinted: 'رسید کامیابی سے پرنٹ ہوئی!',
      processing: 'پروسیسنگ...',
      saleCompleted: 'فروخت کامیابی سے مکمل!',
      pointsEarned: 'پوائنٹس حاصل ہوئے',
      tier: 'درجہ'
    }
  };

  const t = text.en;

  // Use the shared inventory service for medicine data
  
  const [isLoading, setIsLoading] = useState(true);

  // Generate a short human-friendly bill number like B-YYMMDD-####
  const generateShortBillNo = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const key = `bill_seq_${yy}${mm}${dd}`;
    let seq = 1;
    try {
      const raw = localStorage.getItem(key);
      seq = raw ? Math.max(1, parseInt(raw) + 1) : 1;
    } catch {}
    try { localStorage.setItem(key, String(seq)); } catch {}
    return `B-${yy}${mm}${dd}-${String(seq).padStart(3, '0')}`;
  };

  // Prepare and open print dialog for receipt using unified overlay (Ctrl+P to print, Ctrl+D to close)
  const printReceiptNow = (details: SaleDetailsForReceipt) => {
    try {
      const body = ReactDOMServer.renderToString(
        <BillingSlip sale={{
          items: details.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
          billNo: details.billNo,
          customerName: details.customerName,
          paymentMethod: details.paymentMethod,
          subtotal: details.subtotal,
          discount: details.discount,
          taxDetails: details.taxDetails,
          total: details.total,
          cashTendered: details.cashTendered,
        }} settings={settings} />
      );
      const style = `
        <style>
          @media print { @page { size: 80mm auto; margin: 8mm; } body { margin: 0; } }
          body { font-family: Arial, sans-serif; margin: 0; }
        </style>
      `;
      const htmlDoc = `<!doctype html><html><head><meta charset="utf-8"/>${style}</head><body>${body}</body></html>`;
      printHtmlOverlay(htmlDoc, { title: `Receipt ${details.billNo}`, width: 520, height: 740 });
    } catch (e) {
      console.error('Print failed', e);
    }
  };

  // Load inventory data (secondary listener for storage events)
  useEffect(() => {
    const reload = () => { fetchPage(); };
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, [fetchPage]);

  // Removed unused async searchResults flow; rely on synchronous filtering

  // Grouping helper: one row per medicine name with combined stock
  const groupByName = useMemo(() => {
    return (items: InventoryItem[] = []) => {
      const map = new Map<string, InventoryItem & { stock: number }>();
      for (const it of items) {
        const baseName = String((it.name || (it as any).medicineName || it.genericName || '')).trim();
        const displayName = baseName || 'Unnamed Medicine';
        // If the item has no meaningful name, avoid merging different medicines together
        // by using a unique key (id) instead of the common placeholder name.
        const key = baseName ? displayName.toLowerCase() : String((it as any).id || (it as any)._id || Math.random());
        const prev = map.get(key);
        if (!prev) {
          // Keep original name as-is to allow addToCartFromGroup to match underlying inventory by name
          map.set(key, { ...it } as any);
        } else {
          // sum stock
          const prevStock = Number((prev as any).stock || 0);
          const curStock = Number((it as any).stock || 0);
          (prev as any).stock = prevStock + curStock;
          // keep earliest barcode if exists
          if (!prev.barcode && it.barcode) (prev as any).barcode = it.barcode;
          // keep highest minStock
          (prev as any).minStock = Math.max(Number((prev as any).minStock || 0), Number((it as any).minStock || 0));
          // prefer latest expiry date for display
          const prevExp = prev.expiryDate ? new Date(prev.expiryDate as any) : null;
          const curExp = it.expiryDate ? new Date(it.expiryDate as any) : null;
          (prev as any).expiryDate = prevExp && curExp ? (curExp > prevExp ? it.expiryDate : prev.expiryDate) : (prevExp ? prev.expiryDate : it.expiryDate);
        }
      }
      return Array.from(map.values());
    };
  }, []);

  const displayItems = useMemo(() => {
    const base = searchTerm.trim() ? filteredItems : inventory;
    return groupByName(base);
  }, [groupByName, filteredItems, inventory, searchTerm]);

  // Combined list of known items (paged inventory + current search results)
  const allItems = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const it of [...inventory, ...filteredItems]) {
      const id = String(it.id);
      if (!map.has(id)) map.set(id, it);
    }
    return Array.from(map.values());
  }, [inventory, filteredItems]);

  // Loyalty removed

  // Debounced phone lookup
  const handlePhoneChange = (value: string) => {
    setCustomerInfo({ ...customerInfo, phone: value });
    if (lookupTimer) clearTimeout(lookupTimer);
    setLookupTimer(setTimeout(async () => {
      const trimmed = value.trim();
      if (!trimmed) return;
      try {
        const data = await customerApi.searchByPhone(trimmed);
        if (data) {
          setCustomerInfo({
            ...customerInfo,
            id: data._id,
            name: data.name,
            phone: data.phone,
            email: data.email,
            address: data.address,
            mrNumber: data.mrNumber,
            cnic: data.cnic
          });
        }
      } catch (err) {
        console.error('Phone lookup failed', err);
      }
    }, 400) as unknown as NodeJS.Timeout);
  };

  // Debounced MR number lookup
  const handleMrNumberChange = (value: string) => {
    setCustomerInfo({ ...customerInfo, mrNumber: value });
    if (lookupTimer) clearTimeout(lookupTimer);
    setLookupTimer(setTimeout(async () => {
      const trimmed = value.trim();
      if (!trimmed) return;
      try {
        const data = await customerApi.searchByMR(trimmed);
        if (data) {
          setCustomerInfo({
            ...customerInfo,
            id: data._id,
            name: data.name,
            phone: data.phone,
            email: data.email,
            address: data.address,
            mrNumber: data.mrNumber,
            cnic: data.cnic
          });
        }
      } catch (err) {
        console.error('MR lookup failed', err);
      }
    }, 400) as unknown as NodeJS.Timeout);
  };

  // Removed duplicate CNIC handler and obsolete localStorage MR lookup useEffect.







  const calculateTotals = () => {
    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discountAmount = calculateDiscount();
    const discountedSubtotal = subtotal - discountAmount; // loyalty removed
    const taxRate = parseFloat(String(settings.taxRate)) || 0;
    const tax = discountedSubtotal * (taxRate / 100);
    const total = discountedSubtotal + tax;
    const taxDetails = [ { name: `GST (${taxRate}%)`, amount: tax } ];
    return { subtotal, discountAmount, tax, total, loyaltyDiscountAmount: 0, pointsEarned: 0, taxDetails };
  };

  const handlePrintReceipt = async (saleDetails: SaleDetailsForReceipt) => {
    // Always use overlay to keep behavior consistent (Ctrl+P / Ctrl+D)
    const body = ReactDOMServer.renderToStaticMarkup(
      <BillingSlip sale={saleDetails} settings={settings} />
    );
    const style = `
      <style>
        @media print { @page { size: 80mm auto; margin: 8mm; } body { margin: 0; } }
        body { font-family: Arial, sans-serif; margin: 0; }
      </style>
    `;
    const htmlDoc = `<!doctype html><html><head><meta charset="utf-8"/>${style}</head><body>${body}</body></html>`;
    printHtmlOverlay(htmlDoc, { title: `Receipt ${saleDetails.billNo}`, width: 520, height: 740 });
    toast({ title: t.receiptPrinted, duration: 2000 });
  };



  const addToCart = (medicine: InventoryItem) => {
    // Determine how many units of this medicine are already in the cart
    const existingItem = cartItems.find(cartItem => cartItem.id === medicine.id);
    const quantityInCart = existingItem ? existingItem.quantity : 0;

    // Prevent adding more than available stock
    if (quantityInCart >= medicine.stock) {
      toast({
        title: 'Out of stock',
        description: 'The desired quantity exceeds available stock',
        variant: 'destructive'
      });
      return;
    }

    // Update cart only (inventory will be decremented upon successful payment)
    if (existingItem) {
      setCartItems(cartItems.map(cartItem =>
        cartItem.id === medicine.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCartItems([...cartItems, { ...medicine, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, change: number) => {
    setCartItems(prevCart => prevCart
      .map(item => {
        if (String(item.id) === String(id)) {
          const medicine = allItems.find(m => String(m.id) === String(id));
          if (!medicine) return item;

          const newQuantity = Math.max(0, Math.min(item.quantity + change, medicine.stock));
          return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
        }
        return item;
      })
      .filter(item => Boolean(item))
    );
  };

  const removeFromCart = (id: string) => {
    // Simply remove from cart; do not touch inventory yet
    setCartItems(cartItems.filter(item => String(item.id) !== String(id)));
  };

  // --- Cart grouping and controls helpers (group by name + price) ---
  const groupItemsForCart = (items: CartItem[]) => groupItemsForReceipt(items);

  const getGroupUnderlying = (name: string, price: number) =>
    cartItems.filter(ci => (ci.name || '').trim().toLowerCase() === (name || '').trim().toLowerCase() && Number(ci.price) === Number(price));

  const getGroupMaxAllowed = (name: string, price: number) => {
    // Sum available stock across all underlying inventory entries for this group
    let sum = 0;
    for (const ci of getGroupUnderlying(name, price)) {
      const inv = allItems.find(m => String(m.id) === String(ci.id));
      sum += Math.max(0, Number(inv?.stock || (ci as any).stock || 0));
    }
    return sum || 0;
  };

  const getGroupCurrentQty = (name: string, price: number) =>
    getGroupUnderlying(name, price).reduce((acc, it) => acc + it.quantity, 0);

  // Apply a delta to the group, distributing across underlying items respecting stock caps
  const applyGroupDelta = (name: string, price: number, delta: number) => {
    if (delta === 0) return;
    setCartItems(prev => {
      let remaining = delta;
      let next = [...prev];
      const matches = next.filter(ci => (ci.name || '').trim().toLowerCase() === (name || '').trim().toLowerCase() && Number(ci.price) === Number(price));
      // Helper to find inventory stock for an item id
      const stockOf = (id: string) => {
        const m = allItems.find(mm => String(mm.id) === String(id));
        return Math.max(0, Number((m as any)?.stock || 0));
      };
      if (remaining > 0) {
        // Increase: allocate across items with remaining capacity
        for (const it of matches) {
          if (remaining <= 0) break;
          const cap = stockOf(String(it.id)) - it.quantity;
          const inc = Math.max(0, Math.min(remaining, cap));
          if (inc > 0) {
            it.quantity += inc;
            remaining -= inc;
          }
        }
      } else {
        // Decrease: reduce quantities across items
        for (const it of matches) {
          if (remaining >= 0) break;
          const dec = Math.min(it.quantity, Math.abs(remaining));
          if (dec > 0) {
            it.quantity -= dec;
            remaining += dec;
          }
        }
      }
      // Remove any zero-qty items
      next = next.filter(ci => ci.quantity > 0);
      return next;
    });
  };

  

  // Loyalty reward redemption removed

  // Totals should be computed via calculateTotals() to avoid name clashes with pagination `total` state.
  // Use calculateTotals() inside event handlers where needed.

  const handleProcessPayment = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty. Please add items before processing payment.",
        variant: "destructive"
      });
      return;
    }
    // Pre-generate short bill number so cashier can note it before printing
    setShortBillNo(generateShortBillNo());
    setShowPaymentDialog(true);
  };

  const confirmPayment = async (paymentMethod: string) => {
    setIsProcessing(true);
    
    try {
      const { subtotal, discountAmount, tax, total, loyaltyDiscountAmount, pointsEarned, taxDetails } = calculateTotals();

      // First validate stock
      const insufficientStockItem = cartItems.find(item => {
        const medicine = inventory.find(m => String(m.id) === String(item.id));
        return medicine && medicine.stock < item.quantity;
      });

      if (insufficientStockItem) {
        const medicine = inventory.find(m => String(m.id) === String(insufficientStockItem.id));
        throw new Error(`Insufficient stock for ${medicine?.name}. Only ${medicine?.stock} available.`);
      }
      
      // Process payment (removed artificial delay)


      // Compute human-friendly bill no up-front so backend can persist it
      const localBillNo = shortBillNo || generateShortBillNo();

      // Prepare payload for the backend (include billNo)
      const salePayload = {
        items: cartItems.map(item => ({
          medicineId: item.id,
          medicineName: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        discount: discountAmount,
        tax,
        totalAmount: total,
        loyaltyDiscount: loyaltyDiscountAmount,
        paymentMethod,
        customerId: customerInfo.id || null,
        customerName: customerInfo.name || 'Walk-in',
        date: new Date().toISOString(),
        amountTendered: total,
        billNo: localBillNo,
      };

      console.log('Sending sale payload:', salePayload);

      // Send sale to the backend
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(salePayload),
      });

      if (!response.ok) {
        let errorData: any = {};
        try { errorData = await response.json(); } catch {}
        console.error('Backend error:', errorData);
        const msg = errorData?.message || errorData?.error || `Failed to save sale (HTTP ${response.status})`;
        throw new Error(msg);
      }

      const savedSale = await response.json();

      // Deduct sold quantities from inventory now that payment is successful
      updateInventory(cartItems);
      // Persist deduction to backend (in UNITS)
      try {
        await Promise.all(cartItems.map(ci => updateItemUnits(String(ci.id), -ci.quantity)));
      } catch (err) {
        console.error('Failed to persist stock deduction:', err);
      }

      // Persist sale locally for reports/analytics (store short bill no for easy returns)
      try {
        const existingSales = JSON.parse(localStorage.getItem('pharmacy_sales') || '[]');
        existingSales.push({
          id: savedSale._id || Date.now().toString(),
          date: savedSale.date || new Date().toISOString(),
          items: cartItems.map(({ id, name, quantity, price }) => ({ medicineId: id, medicineName: name, quantity, price })),
          totalAmount: total,
          customerName: customerInfo.name || 'Walk-in',
          customerId: customerInfo.id || customerInfo.name || 'Walk-in',
          billNo: localBillNo,
        });
        localStorage.setItem('pharmacy_sales', JSON.stringify(existingSales));
      } catch (err) {
        console.error('Failed to save sale locally:', err);
      }

      // Dispatch custom event to signal sale completion for dashboard update
      window.dispatchEvent(new Event('saleCompleted'));
      try { clearInventoryCache(); } catch {}
      try { await fetchPage(); } catch {}

      toast({
        title: t.paymentSuccessful,
        description: `Total: PKR ${total.toFixed(2)}, Points Earned: ${pointsEarned}`,
      });

      // Prepare details for the new, enhanced receipt
      const saleDetailsForReceipt: SaleDetailsForReceipt = {
        billNo: localBillNo,
        customerName: customerInfo.name || 'Walk-in',
        customerPhone: customerInfo.phone,
        items: groupItemsForReceipt(cartItems),
        subtotal: subtotal,
        discount: discountAmount,
        loyaltyDiscount: loyaltyDiscountAmount,
        taxDetails: taxDetails,
        total: total,
        paymentMethod: paymentMethod,
        cashTendered: total,
        change: 0,
      };

      // Print receipt (overlay handles Ctrl+P / Ctrl+D)
      printReceiptNow(saleDetailsForReceipt);
      // Store last bill no for Returns page to optionally read later without opening a new window
      try { localStorage.setItem('pharmacy_last_bill_no', localBillNo); } catch {}

      // Reset POS state for next sale
      setShowPaymentDialog(false);
      setCartItems([]);
      setCustomerInfo({ name: '', phone: '', id: '', mrNumber: '', email: '', address: '', cnic: '' });
      // amount received removed; no reset needed
      setDiscount('');
      setLoyaltyDiscount(0);
      setSearchTerm('');
      setFilteredItems(inventory.slice(0, 20));

    } catch (error) {
      console.error('Payment processing failed:', error);
      toast({
        title: 'Payment Failed',
        description: (error as Error).message || 'Could not connect to the server.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateDiscount = () => {
    const discountString = String(discount || (settings as any)?.discountRate || '');
    if (!discountString) return 0;
    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    // Always interpret discount as a percentage of subtotal (0-100)
    const percentage = Math.max(0, Math.min(100, parseFloat(discountString)));
    if (!Number.isFinite(percentage)) return 0;
    return subtotal * (percentage / 100);
  };

  const updateInventory = (items: CartItem[]) => {
    try {
      const updatedInventory = [...inventory];
      items.forEach(cartItem => {
        const index = updatedInventory.findIndex(invItem => invItem.id === cartItem.id);
        if (index !== -1) {
          updatedInventory[index].stock -= cartItem.quantity;
        }
      });
      setInventory(updatedInventory);
    } catch (error) {
      console.error('Failed to update inventory:', error);
      toast({ title: 'Inventory Update Failed', variant: 'destructive' });
    }
  };

  const recommendedMedicines = inventory
    .filter(m => m.stock > 0)
    .sort((a, b) => b.stock - a.stock) // Simple sort by stock
    .slice(0, 5);

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [showInventory, setShowInventory] = useState(true);
  const isSearching = searchTerm.trim().length > 0;

  const { subtotal: billSubtotal, discountAmount: billDiscountAmount, tax: billTax, total: billTotal, loyaltyDiscountAmount: billLoyaltyDiscountAmount } = calculateTotals();
  const billTaxRate = parseFloat(String(settings.taxRate)) || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-headline font-poppins text-gray-900">{t.title}</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setViewMode('grid')} className="touch-target">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Grid View
          </Button>
          <Button variant="outline" onClick={() => setViewMode('list')} className="touch-target">
            <List className="h-4 w-4 mr-2" />
            List View
          </Button>
          <Button variant="outline" onClick={() => setShowInventory(!showInventory)} className="touch-target">
            {showInventory ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showInventory ? 'Hide Inventory' : 'Show Inventory'}
          </Button>
          
          <Button variant="outline" onClick={() => setCartItems([])} className="touch-target">
            <Trash2 className="h-4 w-4 mr-2" />
            {t.clearCart}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Medicine Search & Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="pos-search-input"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 font-poppins"
            />
          </div>

          {/* Recommendations if no stock match */}
          {recommendations.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
              <div className="font-semibold text-yellow-700 mb-2">{isUrdu ? 'متبادل دستیاب ادویات' : 'Available Alternatives (Generic Suggestions)'}</div>
              <div className="flex flex-wrap gap-3">
                {recommendations.map((rec: any) => (
                  <Card key={rec.id} className="cursor-pointer hover:shadow-md transition-all border-yellow-400">
                    <CardContent className="p-3">
                      <div className="font-bold text-yellow-800">{rec.name}</div>
                      <div className="text-xs text-yellow-700">{rec.genericName}</div>
                      <div className="text-xs text-yellow-600">{rec.manufacturer}</div>
                      <div className="text-xs text-gray-700">PKR {rec.price.toFixed(2)}</div>
                      <Button size="sm" className="mt-2" onClick={() => addToCart(rec)}>
                        <Plus className="h-4 w-4" />
                        {isUrdu ? 'کارٹ میں شامل کریں' : 'Add to Cart'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page</span>
              <select
                className="border rounded h-8 px-2"
                value={limit}
                onChange={(e)=>{ setPage(1); setLimit(parseInt(e.target.value) || 10); }}
              >
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={page<=1 || isFetching || isSearching} onClick={()=> setPage(p => Math.max(1, p-1))}>Prev</Button>
              <div className="text-sm">Page {page}{total!=null ? ` of ${Math.max(1, Math.ceil(total/limit))}` : ''}</div>
              <Button variant="outline" disabled={isFetching || isSearching || (total!=null ? (page*limit)>=total : filteredItems.length<limit)} onClick={()=> setPage(p => p+1)}>Next</Button>
            </div>
          </div>

          {/* Medicine Grid */}
          {showInventory && (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-2'}>
              {displayItems.map((medicine) => (
                viewMode === 'grid' ? (
                  <Card key={`${(medicine as any).id || (medicine as any)._id || medicine.name}-${medicine.price}`} className="cursor-pointer hover:shadow-md transition-all animate-slide-in">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 font-poppins">{medicine.name || (medicine as any).medicineName || medicine.genericName || 'Unnamed Medicine'}</h3>
                          <p className="text-sm text-gray-600 font-poppins">{medicine.genericName}</p>
                          <p className="text-xs text-gray-500 font-poppins">{medicine.manufacturer}</p>
                          {(() => {
                            const anyMed = medicine as any;
                            const pq = anyMed.packQuantity ?? (anyMed.totalItems && anyMed.quantity ? Math.round(Number(anyMed.totalItems) / Number(anyMed.quantity)) : undefined);
                            const unitSale = (anyMed.unitSalePrice ?? anyMed.price) as number | undefined;
                            const spp = (typeof pq === 'number' && typeof unitSale === 'number') ? unitSale * pq : undefined;
                            return (
                              <div className="text-xs text-gray-600 font-poppins mt-1">
                                <div>Sale/Pack: {spp !== undefined ? `PKR ${spp.toFixed(2)}` : '-'}</div>
                                <div>Units/Pack: {pq ?? '-'}</div>
                              </div>
                            );
                          })()}
                        </div>
                        <Badge variant={medicine.stock > 10 ? 'default' : 'secondary'} className="font-poppins">
                          Stock: {Number((medicine as any).stock || 0)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-primary font-poppins">PKR {medicine.price.toFixed(2)}</span>
                        <Button
                          size="sm"
                          className="touch-target font-poppins"
                          disabled={Number((medicine as any).stock || 0) === 0}
                          onClick={() => addToCartFromGroup(medicine.name, medicine.price)}
                        >
                          <Plus className="h-4 w-4 mr-2" /> {t.addToCart}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div key={`${(medicine as any).id || (medicine as any)._id || medicine.name}-${medicine.price}`} className="flex items-center gap-3 p-2 bg-white border border-gray-300 rounded hover:shadow-sm transition-all">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm font-poppins truncate block">{medicine.name || (medicine as any).medicineName || medicine.genericName || 'Unnamed Medicine'}</span>
                      {(() => {
                        const anyMed = medicine as any;
                        const pq = anyMed.packQuantity ?? (anyMed.totalItems && anyMed.quantity ? Math.round(Number(anyMed.totalItems) / Number(anyMed.quantity)) : undefined);
                        const unitSale = (anyMed.unitSalePrice ?? anyMed.price) as number | undefined;
                        const spp = (typeof pq === 'number' && typeof unitSale === 'number') ? unitSale * pq : undefined;
                        return (
                          <span className="text-[11px] text-gray-600 font-poppins truncate">Sale/Pack: {spp !== undefined ? `PKR ${spp.toFixed(2)}` : '-'} • Units/Pack: {pq ?? '-'}</span>
                        );
                      })()}
                    </div>
                    <span className="w-24 text-right text-sm font-poppins whitespace-nowrap">PKR {medicine.price.toFixed(2)}</span>
                    <Badge variant={medicine.stock > 10 ? 'default' : 'secondary'} className="px-2 py-0.5 text-[11px] font-poppins">
                      {Number((medicine as any).stock || 0)}
                    </Badge>
                    <Button
                      size="sm"
                      className="flex items-center gap-1 font-poppins whitespace-nowrap"
                      disabled={Number((medicine as any).stock || 0) === 0}
                      onClick={() => addToCartFromGroup(medicine.name, medicine.price)}
                    >
                      <Plus className="h-3 w-3" /> {t.addToCart}
                    </Button>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* Cart & Checkout */}
        <div className="space-y-4">
          {/* Customer Info removed as per requirements */}

          {customerHistory && (
            <div className="mt-4 space-y-2">
              <h3 className="font-medium">{isUrdu ? 'گزشتہ خریداریاں' : 'Purchase History'}</h3>
              <div className="space-y-1">
                {customerHistory.purchases.map((purchase, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{purchase.medicine}</span>
                    <span>{purchase.quantity} x {purchase.price.toFixed(2)} = {(purchase.quantity * purchase.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <h3 className="font-medium mt-2">{isUrdu ? 'کریڈٹ معلومات' : 'Credit Info'}</h3>
              <div className="flex justify-between text-sm">
                <span>{isUrdu ? 'کل کریڈٹ' : 'Total Credit'}:</span>
                <span>{customerHistory.credit.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{isUrdu ? 'استعمال شدہ' : 'Used'}:</span>
                <span>{customerHistory.credit.used}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>{isUrdu ? 'باقی' : 'Remaining'}:</span>
                <span>{customerHistory.credit.remaining}</span>
              </div>
            </div>
          )}

          {/* Shopping Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 font-poppins">
                <ShoppingCart className="h-5 w-5" />
                <span>{t.cart} ({cartItems.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cartItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4 font-poppins">Cart is empty</p>
              ) : (
                <div className="space-y-3">
                  {groupItemsForCart(cartItems).map((g, index) => {
                    const key = `${g.name.toLowerCase()}|${Number(g.price).toFixed(2)}`;
                    const groupQty = getGroupCurrentQty(g.name, g.price);
                    const maxAllowed = getGroupMaxAllowed(g.name, g.price) || groupQty || 1;
                    return (
                      <div key={`${key}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium text-sm font-poppins">{g.name}</p>
                          <p className="text-xs text-gray-600 font-poppins">PKR {g.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applyGroupDelta(g.name, g.price, -1)}
                            className="touch-target"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <input
                            type="number"
                            min={1}
                            max={maxAllowed}
                            value={groupQty}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value);
                              const next = isNaN(raw) ? 1 : Math.min(Math.max(raw, 1), maxAllowed);
                              applyGroupDelta(g.name, g.price, next - groupQty);
                            }}
                            className={`w-16 text-center font-poppins border rounded p-1 ${maxAllowed < 10 ? 'border-red-400' : ''}`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applyGroupDelta(g.name, g.price, 1)}
                            className="touch-target"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Remove the whole group
                              const qty = getGroupCurrentQty(g.name, g.price);
                              applyGroupDelta(g.name, g.price, -qty);
                            }}
                            className="touch-target"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bill Summary */}
          {cartItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 font-poppins">
                  <Calculator className="h-5 w-5" />
                  <span>Bill Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-poppins">{t.subtotal}:</span>
                  <span className="font-poppins">PKR {billSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-poppins">{t.discount}:</span>
                  <span className="font-poppins">PKR {calculateDiscount().toFixed(2)}</span>
                </div>
                {billLoyaltyDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="font-poppins">{t.loyaltyDiscount}:</span>
                    <span className="font-poppins">PKR {billLoyaltyDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">{t.tax} ({billTaxRate}%):</span>
                  <span className="font-medium">PKR {billTax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span className="font-poppins">{t.total}:</span>
                  <span className="font-poppins">PKR {Math.round(billTotal).toFixed(2)}</span>
                </div>
                
                <div className="space-y-2 mt-4">
                  <Button 
                    className="w-full touch-target font-poppins" 
                    onClick={handleProcessPayment}
                    disabled={isProcessing}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    {isProcessing ? t.processing : t.processPayment}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Enhanced Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-in">
            <CardHeader>
              <CardTitle className="font-poppins">{t.processPayment}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button 
                  variant={paymentMethod==='cash' ? 'default' : 'outline'}
                  onClick={()=>setPaymentMethod('cash')}
                  className="flex-1 font-poppins"
                >{isUrdu ? 'نقد' : 'Cash'}</Button>
                <Button 
                  variant={paymentMethod==='credit' ? 'default' : 'outline'}
                  onClick={()=>setPaymentMethod('credit')}
                  className="flex-1 font-poppins"
                >{isUrdu ? 'کریڈٹ' : 'Credit'}</Button>
              </div>

              {/* Amount Received field removed for simplified cash flow */}

              <div>
                <label className="block text-sm font-medium mb-2 font-poppins">{t.discount} (%)</label>
                <Input 
                  type="number" 
                  value={discount} 
                  onChange={(e) => setDiscount(e.target.value)}
                  min="0"
                  max="100"
                  className="font-poppins"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 font-poppins">{isUrdu ? 'کسٹمر کا نام' : 'Customer Name'}</label>
                <Input value={customerInfo.name} onChange={(e)=>setCustomerInfo({...customerInfo,name:e.target.value})} className="font-poppins" />
              </div>

              {paymentMethod === 'credit' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium mb-2 font-poppins">{isUrdu ? 'فون نمبر' : 'Phone Number'}</label>
                    <Input value={customerInfo.phone} onChange={(e)=>handlePhoneChange(e.target.value)} className="font-poppins" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 font-poppins">Email</label>
                    <Input value={customerInfo.email||''} onChange={(e)=>setCustomerInfo({...customerInfo,email:e.target.value})} className="font-poppins" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 font-poppins">{isUrdu ? 'پتہ' : 'Address'}</label>
                    <Textarea value={customerInfo.address||''} onChange={(e)=>setCustomerInfo({...customerInfo,address:e.target.value})} className="font-poppins" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 font-poppins">CNIC</label>
                    <Input value={customerInfo.cnic||''} onChange={(e)=>handleCnicChange(e.target.value)} className="font-poppins" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 font-poppins">MR #</label>
                    <Input value={customerInfo.mrNumber} onChange={(e)=>handleMrNumberChange(e.target.value)} className="font-poppins" />
                  </div>
                  {/* Credit Amount field removed by request */}
                </div>
              )}

              {/* Change preview removed as amount received input is removed */}
              {paymentMethod === 'credit' && customerHistory?.credit.remaining < total && (
                <div className="bg-red-50 p-4 rounded mt-2">
                  <div className="flex justify-between">
                    <span className="font-poppins">{isUrdu ? 'کریڈٹ ناکافی' : 'Insufficient Credit'}:</span>
                    <span className="font-bold text-red-600 font-poppins">
                      PKR {customerHistory.credit.remaining.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {paymentMethod !== 'cash' && (
                <div className="h-[120px]"></div>
              )}

              <div className="flex space-x-2 pt-2">
                <Button
                  onClick={() => confirmPayment(paymentMethod)}
                  className="flex-1 touch-target font-poppins"
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  {isProcessing ? t.processing : t.confirmPayment}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentDialog(false)}
                  disabled={isProcessing}
                  className="touch-target font-poppins"
                >
                  {t.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      
    </div>
  );
};

export default POSSystem;