import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useInventory } from '@/Pharmacy contexts/InventoryContext';
import { SupplierType } from './InventoryControl';
import { getSuppliers } from '@/pharmacy utilites/supplierService';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';

interface UpdateStockDialogProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  onStockUpdated: () => void;
}

const UpdateStockDialog: React.FC<UpdateStockDialogProps> = ({ open, onOpenChange, onStockUpdated }) => {
  const { inventory } = useInventory();
  // Ensure only one option per medicine name (case-insensitive)
  const uniqueInventory = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of inventory) {
      const key = (item.name || '').trim().toLowerCase();
      if (!map.has(key)) map.set(key, item);
    }
    return Array.from(map.values());
  }, [inventory]);
  const [suppliers, setSuppliers] = useState<SupplierType[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [packsToAdd, setPacksToAdd] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [minStock, setMinStock] = useState<string>('');
  // new fields
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [packQuantity, setPackQuantity] = useState<string>('');
  const [buyPricePerPack, setBuyPricePerPack] = useState<string>('');
  // category
  const [category, setCategory] = useState<string>('');
  // new supplier inline
  const [showNewSupplierField, setShowNewSupplierField] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [salePricePerPack, setSalePricePerPack] = useState<string>('');
  // Keep reference if needed later; not used for PUT anymore
  const [existingRecord, setExistingRecord] = useState<any | null>(null);
  const normalizeInvoiceNumber = (raw: string) => {
    if (!raw) return '';
    let s = String(raw).trim().toUpperCase();
    s = s.replace(/\s+/g, '');
    const m = s.match(/^(.*?)-?(\d+)$/);
    if (m) {
      const prefix = (m[1] || 'INV').replace(/[^A-Z0-9]/g, '') || 'INV';
      const digits = m[2].replace(/\D/g, '');
      return `${prefix}-${digits.padStart(6, '0')}`;
    }
    if (/^\d+$/.test(s)) return `INV-${s.padStart(6, '0')}`;
    s = s.replace(/[^A-Z0-9-]/g, '');
    return s || '';
  };

  // derived helpers
  const totalUnits = useMemo(() => {
    const packs = parseInt(packsToAdd);
    const pq = parseInt(packQuantity);
    return !isNaN(packs) && !isNaN(pq) ? packs * pq : '';
  }, [packsToAdd, packQuantity]);

  const unitPurchasePrice = useMemo(() => {
    const bp = parseFloat(buyPricePerPack);
    const pq = parseFloat(packQuantity);
    return !isNaN(bp) && !isNaN(pq) && pq > 0 ? (bp / pq).toFixed(2) : '';
  }, [buyPricePerPack, packQuantity]);

  const unitSalePrice = useMemo(() => {
    const sp = parseFloat(salePricePerPack);
    const pq = parseFloat(packQuantity);
    return !isNaN(sp) && !isNaN(pq) && pq > 0 ? (sp / pq).toFixed(2) : '';
  }, [salePricePerPack, packQuantity]);
  const { toast } = useToast();

  // load suppliers on mount
  useEffect(() => {
    (async () => {
      try {
        const list = await getSuppliers();
        setSuppliers(list as SupplierType[]);
      } catch (e) {
        console.error('Failed to fetch suppliers');
      }
    })();
  }, []);

  // derive selected medicine record
  const selectedMedicine = useMemo(() => uniqueInventory.find(i => String(i.id) === String(selectedItemId)), [uniqueInventory, selectedItemId]);

  // auto-fill minStock if available
  useEffect(() => {
    if (selectedMedicine) {
      if (selectedMedicine.minStock) setMinStock(String(selectedMedicine.minStock));
      if (selectedMedicine.expiryDate) setExpiryDate(selectedMedicine.expiryDate.split('T')[0]);
      // category
      if (selectedMedicine.category) setCategory(selectedMedicine.category);
      // pack quantity
      if (selectedMedicine.packQuantity) setPackQuantity(String(selectedMedicine.packQuantity));
      // sale price per pack
      if (selectedMedicine.price && selectedMedicine.packQuantity) {
        setSalePricePerPack(String((selectedMedicine.price * selectedMedicine.packQuantity).toFixed(2)));
      }
      // buy price per pack
      if (selectedMedicine.unitBuyPrice && selectedMedicine.packQuantity) {
        setBuyPricePerPack(String((selectedMedicine.unitBuyPrice * selectedMedicine.packQuantity).toFixed(2)));
      }
      // supplier
      if (selectedMedicine.supplier?._id) {
        setSelectedSupplier(selectedMedicine.supplier._id as string);
      } else if (selectedMedicine.supplierName) {
        const match = suppliers.find(s => s.name.toLowerCase() === (selectedMedicine.supplierName || '').toLowerCase());
        if (match) setSelectedSupplier(match._id || match.id || '');
      }
    } else {
      setMinStock('');
      setExpiryDate('');
      setCategory('');
      setPackQuantity('');
      setSalePricePerPack('');
      setBuyPricePerPack('');
    }
  }, [selectedMedicine, suppliers]);

  // Load latest approved AddStock record for the selected medicine (for invoice prefill only)
  useEffect(() => {
    (async () => {
      try {
        setExistingRecord(null);
        if (!selectedMedicine) return;
        const medId = (selectedMedicine as any).medicineId || (selectedMedicine as any).id;
        if (!medId) return;
        const { data } = await axios.get('/api/add-stock'); // approved list
        const list: any[] = Array.isArray(data) ? data : [];
        // find latest by createdAt/date matching this medicine id
        const matches = list.filter(r => {
          const mid = (r.medicine && (r.medicine._id || r.medicine)) || r.medicine;
          return String(mid) === String(medId);
        });
        if (matches.length > 0) {
          matches.sort((a,b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
          setExistingRecord(matches[0]);
          // prefill invoice if empty
          if (!invoiceNumber && matches[0].invoiceNumber) {
            setInvoiceNumber(normalizeInvoiceNumber(String(matches[0].invoiceNumber)));
          }
        }
      } catch (e) {
        // silent fail
      }
    })();
  }, [selectedMedicine]);

  // reset helper
  const resetFields = () => {
    setSelectedItemId('');
    setPacksToAdd('');
    setExpiryDate('');
    setMinStock('');
    setInvoiceNumber('');
    setPurchaseDate('');
    setPackQuantity('');
    setBuyPricePerPack('');
    setSalePricePerPack('');
    setSelectedSupplier('');
    setCategory('');
    setShowNewSupplierField(false);
    setNewSupplierName('');
  };

  // reset when dialog closed
  useEffect(()=>{ if(!open){ resetFields(); } },[open]);

  // Prefill last invoice number and purchase date from backend purchases
  useEffect(() => {
    const fetchLastInvoice = async () => {
      try {
        if (!selectedMedicine) return;
        const medId = (selectedMedicine as any).medicineId || (selectedMedicine as any).id;
        if (!medId) return;
        const supId = selectedSupplier || '';
        const q = `/api/purchases/last-invoice?medicine=${encodeURIComponent(medId)}${supId ? `&supplier=${encodeURIComponent(supId)}` : ''}`;
        const { data } = await axios.get(q);
        if (data?.invoiceNumber && !invoiceNumber) {
          setInvoiceNumber(normalizeInvoiceNumber(String(data.invoiceNumber)));
        }
        if (data?.purchaseDate && !purchaseDate) {
          try {
            const d = new Date(data.purchaseDate);
            if (!isNaN(d.getTime())) setPurchaseDate(d.toISOString().split('T')[0]);
          } catch {}
        }
      } catch (e) {
        // silent fail; prefill is best-effort
      }
    };
    fetchLastInvoice();
  }, [selectedMedicine, selectedSupplier]);

  const handleAddSupplier = async () => {
    if(!newSupplierName.trim()) return;
    try{
      const res = await axios.post('/api/suppliers',{name:newSupplierName});
      setSuppliers(prev=>[...prev,res.data]);
      setSelectedSupplier(res.data._id || res.data.id);
      setShowNewSupplierField(false);
      setNewSupplierName('');
      toast({title:'Success',description:'Supplier added'});
    }catch(e){
      toast({title:'Error',description:'Failed to add supplier',variant:'destructive'});
    }
  };

  const handleSubmit = async () => {
    if (!selectedMedicine) {
      toast({ title: 'Error', description: 'Select a medicine', variant: 'destructive' });
      return;
    }
    if (!packsToAdd) {
      toast({ title: 'Error', description: 'Enter packs to add', variant: 'destructive' });
      return;
    }

    const supplierId = selectedSupplier || (selectedMedicine.supplier && (selectedMedicine.supplier._id || selectedMedicine.supplier.id));
    if (!supplierId) {
      toast({ title: 'Error', description: 'Select supplier', variant: 'destructive' });
      return;
    }

    try {
      const invNo = normalizeInvoiceNumber(invoiceNumber || '');
      const supplierId = selectedSupplier || (selectedMedicine.supplier && (selectedMedicine.supplier._id || selectedMedicine.supplier.id));
      const basePackQty = packQuantity ? parseInt(packQuantity) : (selectedMedicine.packQuantity || 1);
      const bpPerPack = buyPricePerPack ? parseFloat(buyPricePerPack) : (selectedMedicine.unitBuyPrice && selectedMedicine.packQuantity ? (selectedMedicine.unitBuyPrice * selectedMedicine.packQuantity) : undefined);
      const spPerPack = salePricePerPack ? parseFloat(salePricePerPack) : undefined;

      const packsInt = parseInt(packsToAdd);
      const medId = selectedMedicine.medicineId || selectedMedicine.id;

      // Always create/update a PENDING record via POST (backend will upsert pending by medicine+invoice)
      const postPayload = {
        medicine: medId,
        quantity: packsInt,
        packQuantity: basePackQty,
        buyPricePerPack: bpPerPack != null ? bpPerPack : ((selectedMedicine.price || 0) * (selectedMedicine.packQuantity || 1)),
        salePricePerPack: spPerPack,
        supplier: supplierId,
        category: category || undefined,
        invoiceNumber: invNo || undefined,
        purchaseDate: purchaseDate || undefined,
        minStock: minStock ? parseInt(minStock) : undefined,
        expiryDate: expiryDate || undefined,
        status: 'pending'
      } as any;
      await axios.post('/api/add-stock', postPayload);
      toast({ title: 'Success', description: 'Stock update created. Pending approval.' });
      // reset
      setPacksToAdd('');
      setPackQuantity('');
      setBuyPricePerPack('');
      setSalePricePerPack('');
      setInvoiceNumber('');
      setPurchaseDate('');
      onStockUpdated();
      resetFields();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update stock', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-auto sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <DialogHeader>
          <DialogTitle>Update Stock</DialogTitle>
        </DialogHeader>
        <div className="p-6 md:p-8 bg-white/90 backdrop-blur-sm rounded-lg space-y-6">
          {/* Medicine Selector */}
          <div>
            <Label htmlFor="medicineSelect">Medicine</Label>
            <select
              id="medicineSelect"
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
              className="w-full border rounded px-3 py-2 mt-1"
            >
              <option value="">Select medicine...</option>
              {uniqueInventory.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          {/* Category Field */}
          <div>
            <Label>Category</Label>
            <Input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Enter category" />
          </div>

          {/* Packs to add */}
          <div>
            <Label>Packs to Add</Label>
            <Input type="number" min="1" value={packsToAdd} onChange={e => setPacksToAdd(e.target.value)} />
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label>Min Stock</Label>
              <Input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </div>
          </div>

          {/* Additional stock details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label>Units in One Pack</Label>
              <Input type="number" min="1" value={packQuantity} onChange={e => setPackQuantity(e.target.value)} />
            </div>
            <div>
              <Label>Invoice Number</Label>
              <Input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                onBlur={e => setInvoiceNumber(normalizeInvoiceNumber(e.target.value))}
                placeholder="e.g. INV-000001"
              />
            </div>
            <div>
              <Label>Purchase Price / Pack</Label>
              <Input type="number" min="0" step="0.01" value={buyPricePerPack} onChange={e => setBuyPricePerPack(e.target.value)} />
            </div>
            <div>
              <Label>Sale Price / Pack</Label>
              <Input type="number" min="0" step="0.01" value={salePricePerPack} onChange={e => setSalePricePerPack(e.target.value)} />
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <Label>Total Units (auto)</Label>
              <Input type="number" value={totalUnits} readOnly />
            </div>
            <div>
              <Label>Unit Purchase Price (auto)</Label>
              <Input type="number" value={unitPurchasePrice} readOnly />
            </div>
            <div>
              <Label>Unit Sale Price (auto)</Label>
              <Input type="number" value={unitSalePrice} readOnly />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <Label>Supplier</Label>
            <div className="flex gap-2 items-end">
              <select
                id="supplierSelect"
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
                className="w-full border rounded px-3 py-2 mt-1"
              >
                <option value="">Select supplier...</option>
                {suppliers.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                ))}
              </select>
              <Button type="button" size="sm" onClick={() => setShowNewSupplierField(p => !p)}>+ New</Button>
            </div>
            {showNewSupplierField && (
              <div className="mt-2 flex gap-2">
                <Input value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Supplier name" />
                <Button size="sm" onClick={handleAddSupplier}>Save</Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateStockDialog;
