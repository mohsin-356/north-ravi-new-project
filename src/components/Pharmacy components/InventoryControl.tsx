import React, {
  // ... existing imports
 useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Pharmacy components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/Pharmacy components/ui/alert-dialog';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Badge } from '@/components/Pharmacy components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/Pharmacy components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/Pharmacy components/ui/dialog';
import { Label } from '@/components/Pharmacy components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Pharmacy components/ui/select';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Barcode,
  Printer,
  Trash2
} from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';
import UpdateStockDialog from './UpdateStockDialog';
import { format } from 'date-fns';
import { useToast } from '@/components/Pharmacy components/ui/use-toast';
import { DoubleConfirmDialog } from './ui/DoubleConfirmDialog';
import { InventoryItem, getInventoryPaged, clearInventoryCache } from '@/pharmacy utilites/inventoryService';
import axios from 'axios';
import { useInventory } from '@/Pharmacy contexts/InventoryContext';
import InventoryTable, { InventoryRow } from './InventoryTable';

interface InventoryControlProps {}

interface AddStockDialogProps {
  onStockAdded: () => void;
  onCancel: () => void;
}

export type SupplierType = { _id?: string; id?: string; name: string };

import { getMedicines, searchMedicines } from '@/pharmacy utilites/medicineService';

import { getSuppliers } from '@/pharmacy utilites/supplierService';

const AddStockDialog: React.FC<AddStockDialogProps> = ({ onStockAdded, onCancel }) => {
  const [minStock, setMinStock] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [medicines, setMedicines] = useState<any[]>([]);
  const [excelMedicineNames, setExcelMedicineNames] = useState<string[]>([]);
  const [medicineInput, setMedicineInput] = useState<string>('');
  const [suppliers, setSuppliers] = useState<SupplierType[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<any | null>(null);
  const [medicineDropdownOpen, setMedicineDropdownOpen] = useState(false);
  const [medicineSuggestions, setMedicineSuggestions] = useState<string[]>([]);
  // number of packs being added
  const [numPacks, setNumPacks] = useState<string>('');
  // units in one pack (e.g. 10 tablets per strip)
  const [packQuantity, setPackQuantity] = useState<string>('');
  // buy & sale price per pack
  const [buyPricePerPack, setBuyPricePerPack] = useState<string>('');
  const [salePricePerPack, setSalePricePerPack] = useState<string>('');
  // derived unit price (sale price per unit) read-only preview
  // derived total items (quantity * units per pack)
  const totalItems = React.useMemo(()=>{
    const packs = parseInt(numPacks);
    const pq = parseInt(packQuantity);
    if(!isNaN(packs)&&!isNaN(pq)) return packs * pq;
    return '';
  }, [numPacks, packQuantity]);

  const unitPrice = React.useMemo(()=>{
    const pq = parseFloat(packQuantity);
    const sp = parseFloat(salePricePerPack);
    if(!isNaN(pq) && pq>0 && !isNaN(sp)) return (sp / pq).toFixed(2);
    return '';
  }, [packQuantity, salePricePerPack]);
  // derived unit price (buy price per unit) read-only preview
  const unitBuyPrice = React.useMemo(()=>{
    const pq = parseFloat(packQuantity);
    const bp = parseFloat(buyPricePerPack);
    if(!isNaN(pq)&&pq>0&&!isNaN(bp)) return (bp/pq).toFixed(2);
    return '';
  },[packQuantity,buyPricePerPack]);
  const [lastPurchasePrice, setLastPurchasePrice] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [showNewSupplierField, setShowNewSupplierField] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meds = await getMedicines();
        setMedicines(meds);
        const sups = await getSuppliers();

        // Load medicine names from CSV (column B)
        try {
          // Use relative path so it resolves next to index.html inside dist when loaded via file://
          const resCsv = await fetch('./medicine-database.csv');
          const csvText = await resCsv.text();
          const lines = csvText.split(/\r?\n/).slice(1); // skip header row
          const names = lines.map(line => {
            const cols = line.split(',');
            return (cols[1] || '').replace(/"/g, '').trim();
          }).filter(Boolean);
          setExcelMedicineNames(names);
        } catch (err) {
          console.error('Failed to load medicine-database.csv', err);
        }

        setSuppliers(sups as SupplierType[]);
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to fetch medicines or suppliers', variant: 'destructive' });
      }
    };
    fetchData();
  }, []);

  // Debounced backend search for medicine suggestions
  useEffect(() => {
    const query = medicineInput.trim();
    if (!query) {
      setMedicineSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const results = await searchMedicines(query, 50);
        const serverNames = Array.from(new Set(results.map((r: any) => r.name).filter(Boolean)));
        // client-side fallback from already-loaded medicines
        const localMatches = medicines
          .map((m: any) => m.name)
          .filter((n: string) => n?.toLowerCase().includes(query.toLowerCase()));
        const combined = Array.from(new Set([...serverNames, ...localMatches])).slice(0, 50);
        setMedicineSuggestions(combined);
      } catch (err) {
        // silent fail; keep previous suggestions
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [medicineInput, medicines]);

  const createPurchaseRecord = async (purchaseData: any) => {
    try {
      // Find supplier by ID or name
      const supplier = suppliers.find(s => 
        s._id === purchaseData.supplier || 
        s.id === purchaseData.supplier || 
        s.name === purchaseData.supplier
      );
      
      if (supplier) {
        const supplierId = supplier._id || supplier.id;
        
        // Create purchase record using the new Purchase model
        const purchasePayload = {
          ...purchaseData,
          supplier: supplierId
        };
        
        await axios.post('/api/purchases', purchasePayload);
        console.log('Purchase record created successfully');
      }
    } catch (error) {
      console.error('Failed to create purchase record:', error);
      // Don't show error to user as this is secondary functionality
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const res = await axios.post('/api/suppliers', { name: newSupplierName });
      setSuppliers((prev: SupplierType[]) => [...prev, res.data]);
      setSelectedSupplier(res.data._id || res.data.id);
      setShowNewSupplierField(false);
      setNewSupplierName('');
      toast({ title: 'Success', description: 'Supplier added' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to add supplier', variant: 'destructive' });
    }
  };



  const ensureMedicineExists = async () => {
    const name = medicineInput.trim();
    if (!name) return null;
    const existing = medicines.find((m: any) => m.name?.toLowerCase() === name.toLowerCase());
    if (existing) {
      setSelectedMedicine(existing);
      return existing;
    }
    try {
      const res = await axios.post('/api/medicines', { name });
      setMedicines((prev) => [...prev, res.data]);
      setSelectedMedicine(res.data);
      toast({ title: 'Success', description: 'Medicine added' });
      return res.data;
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to add medicine', variant: 'destructive' });
      return null;
    }
  };

  const handleAddStock = async () => {
    console.log("handleAddStock called", { selectedMedicine, numPacks, packQuantity });
    // If medicine is not selected yet, attempt to create/find it from typed input
    if (!selectedMedicine && medicineInput.trim()) {
      await ensureMedicineExists();
    }

    if (!selectedMedicine || !numPacks || !packQuantity || !buyPricePerPack) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const supplier = showNewSupplierField ? newSupplierName : selectedSupplier;
      const medicineId = selectedMedicine._id || selectedMedicine.id;

      const payload = {
        medicine: medicineId,
        quantity: parseInt(numPacks),
        packQuantity: parseInt(packQuantity),
        buyPricePerPack: parseFloat(buyPricePerPack),
        salePricePerPack: salePricePerPack ? parseFloat(salePricePerPack) : undefined,
        totalItems: typeof totalItems==='number'? totalItems : undefined,
        category: category || undefined,
        supplier,
        minStock: minStock ? parseInt(minStock) : undefined,
        invoiceNumber: invoiceNumber || undefined,
        expiryDate: expiryDate || undefined,
        status: 'pending'
      };
      console.log('POST-payload', payload);
      await axios.post('/api/add-stock', payload);
      console.log('POST-success');
      // reset fields
      setNumPacks('');
      setPackQuantity('');
      setBuyPricePerPack('');
      setSalePricePerPack('');
      setMinStock('');
      setExpiryDate('');
      setCategory('');
      setMedicineInput('');
      setSelectedMedicine(null);
      onStockAdded();
      
      toast({
        title: 'Success',
        description: 'Stock added successfully',
      });
      // Notify dashboard and other listeners to refresh metrics
      try {
        window.dispatchEvent(new Event('inventoryUpdated'));
      } catch {}
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add inventory',
        variant: 'destructive',
      });
    }
  };

  // medicineSuggestions now populated via debounced backend search

  // removed inline Add Medicine suggestions and state

  // derived total price (packs * buy price per pack)
  const totalPrice = React.useMemo(() => {
    const packs = parseFloat(numPacks);
    const buyPrice = parseFloat(buyPricePerPack);
    if (!isNaN(packs) && !isNaN(buyPrice)) return (packs * buyPrice).toFixed(2);
    return '';
  }, [numPacks, buyPricePerPack]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Inventory
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-w-[900px] max-h-[85vh] overflow-y-auto bg-white rounded-2xl border border-blue-100 shadow-xl p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent flex items-center gap-2"><Package className="w-7 h-7" /> Add Inventory</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Medicine field with text + suggestions */}
          <div className="md:col-span-2 relative">
            <Label htmlFor="medicineInput">Medicine</Label>
            <Input
            id="medicineInput"
            value={medicineInput}
            onFocus={()=>setMedicineDropdownOpen(true)}
              onBlur={()=> {
                setTimeout(()=>setMedicineDropdownOpen(false),100);
                // After dropdown closes, ensure medicine exists based on typed name
                setTimeout(()=>{ ensureMedicineExists(); },120);
              }}
              onChange={e=>{
                setMedicineInput(e.target.value);
                const med = medicines.find(m=> m.name.toLowerCase() === e.target.value.toLowerCase());
                setSelectedMedicine(med || null);
              }}
            placeholder="Type medicine name"
            autoComplete="off"
          />
            {medicineDropdownOpen && medicineSuggestions.length > 0 && (
              <div className="absolute z-50 bg-white border rounded w-full max-h-60 overflow-y-auto shadow">
                {medicineSuggestions.map(name=> (
                  <div
                    key={name}
                    className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={(e) => {
                      // Use onMouseDown to prevent input blur before selection inside dialogs
                      e.preventDefault();
                      setMedicineInput(name);
                      const med = medicines.find(m => m.name.toLowerCase() === name.toLowerCase());
                      setSelectedMedicine(med || null);
                      if (!med) {
                        // If not present locally, ensure it's created on backend
                        ensureMedicineExists();
                      }
                      // Close suggestions dropdown after selection to prevent it from covering other UI elements
                      setMedicineDropdownOpen(false);
                    }}
                  >{name}</div>
                ))}
              </div>
            )}
            {/* Removed "+ Add Medicine" button; medicine is auto-created on blur if not found */}
          </div>

          {/* Removed inline new medicine form */}

          {/* Category field */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Input
              id="category"
              className="sm:col-span-3"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Enter category"
            />
          </div>
          {/* Packs (quantity) field */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="numPacks"
              type="number"
              min="1"
              className="sm:col-span-3"
              value={numPacks}
              onChange={e => {
                setNumPacks(e.target.value);
              }}
              placeholder="Number of packs"
              required
            />
          </div>
          {/* Minimum Stock field */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="minStock" className="text-right">
              Minimum Stock
            </Label>
            <Input
              id="minStock"
              type="number"
              min="0"
              className="sm:col-span-3"
              value={minStock}
              onChange={e => setMinStock(e.target.value)}
              placeholder="Enter minimum stock"
            />
          </div>
          {/* Expiry Date field */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="expiryDate" className="text-right">
              Expiry Date
            </Label>
            <Input
              id="expiryDate"
              type="date"
              className="sm:col-span-3"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              placeholder="Select expiry date"
            />
          </div>
          {/* Pack & pricing info */}
          {/* Pack size (units in one pack) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="packQuantity" className="text-right">Units / Pack</Label>
            <Input
              id="packQuantity"
              type="number"
              min="1"
              className="sm:col-span-3"
              value={packQuantity}
              onChange={e => setPackQuantity(e.target.value)}
              placeholder="Units per pack"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="buyPrice" className="text-right">Buy Price</Label>
            <Input
              id="buyPrice"
              type="number"
              min="0"
              step="0.01"
              className="sm:col-span-3"
              value={buyPricePerPack}
              onChange={e => setBuyPricePerPack(e.target.value)}
              placeholder="Enter buy price"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="salePrice" className="text-right">Sale Price</Label>
            <Input
              id="salePrice"
              type="number"
              min="0"
              step="0.01"
              className="sm:col-span-3"
              value={salePricePerPack}
              onChange={e => setSalePricePerPack(e.target.value)}
              placeholder="Enter sale price"
            />
          </div>
          {/* Total Price field */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="totalPrice" className="text-right">Total Price</Label>
            <Input
              id="totalPrice"
              type="text"
              readOnly
              className="sm:col-span-3 bg-gray-100"
              value={totalPrice}
              placeholder="Total price"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="totalItems" className="text-right">Total Quantity</Label>
            <Input
              id="totalItems"
              type="text"
              readOnly
              className="sm:col-span-3"
              value={totalItems}
              placeholder="Total items"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="unitPrice" className="text-right">Sell Unit Price</Label>
            <Input
              id="unitPrice"
              type="text"
              readOnly
              className="sm:col-span-3"
              value={unitPrice}
              placeholder="Unit price"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="unitBuyPrice" className="text-right">Unit Buy Price</Label>
            <Input
              id="unitBuyPrice"
              type="text"
              readOnly
              className="sm:col-span-3"
              value={unitBuyPrice}
              placeholder="Unit buy price"
            />
          </div>
          {/* Invoice Number field */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="invoiceNumber" className="text-right">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              className="sm:col-span-3"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              placeholder="Invoice number"
            />
          </div>
          {/* Supplier selection */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
            <Label htmlFor="supplier" className="text-right">
              Supplier
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              {!showNewSupplierField ? (
                <>
                  <Select onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => {
                        const value = supplier._id ? String(supplier._id) : String(supplier.id);
                        return (
                          <SelectItem key={value} value={value}>
                            {supplier.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewSupplierField(true)}
                  >
                    + New
                  </Button>
                </>
              ) : (
                <div className="flex gap-2 w-full">
                  <Input
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Enter new supplier name"
                  />
                  <Button size="sm" variant="default" onClick={handleAddSupplier}>
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewSupplierField(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={handleAddStock}>Add Inventory</Button>
          </DialogClose>
        </div>
      </DialogContent>
      <DialogClose />
    </Dialog>
  );
};

const InventoryControl: React.FC = () => {
  // --- Add Medicine Dialog State ---
  const [isAddMedicineDialogOpen, setIsAddMedicineDialogOpen] = useState(false);
  const [isUpdateStockOpen, setIsUpdateStockOpen] = useState(false);
  const [medicineForm, setMedicineForm] = useState({ name: '' });
  const { toast } = useToast();

  // Handler for submitting new medicine
  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineForm.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    try {
      await axios.post('/api/medicines', { name: medicineForm.name.trim() });
      toast({ title: 'Success', description: 'Medicine added successfully' });
      setMedicineForm({ name: '' });
      setIsAddMedicineDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.error || 'Failed to add medicine', variant: 'destructive' });
    }
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Edit dialog state
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({
    stock: '',                 // packs
    packQuantity: '',          // units per pack
    unitPrice: '',             // unit sale price
    salePricePerPack: '',      // sale price per pack
    buyPricePerPack: '',       // buy price per pack
    category: '',              // category
    invoiceNumber: '',         // invoice number
    minStock: '',
    expiryDate: '',
    // medicine fields
    name: '',
    barcode: '',
    genericName: '',
    manufacturer: '',
  });

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // Reference for printing
  const tableRef = useRef<HTMLDivElement>(null);
  // Initialize all state at the top
  const [searchTerm, setSearchTerm] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  // Loose items dialog state
  const [isLooseDialogOpen, setIsLooseDialogOpen] = useState(false);
  const [looseMedicine, setLooseMedicine] = useState<string>('');
  const [looseUnits, setLooseUnits] = useState<string>('');
  const [looseBuyUnit, setLooseBuyUnit] = useState<string>('');
  const [looseSaleUnit, setLooseSaleUnit] = useState<string>('');
  // Use inventory from context
  const { inventory, addItemToInventory, refreshInventory, lastRefreshedAt } = useInventory();
  // Server-side pagination state for approved inventory views
  const [invPage, setInvPage] = useState(1);
  const [invLimit, setInvLimit] = useState(10);
  const [invTotal, setInvTotal] = useState<number | null>(null);
  const [invFetching, setInvFetching] = useState(false);
  const [pagedApproved, setPagedApproved] = useState<InventoryItem[]>([]);

  // Pending inventory state (status = 'pending')
  const [pendingInventory, setPendingInventory] = useState<InventoryItem[]>([]);

  // Ensure latest data when opening the Loose Items dialog
  useEffect(() => {
    if (isLooseDialogOpen) {
      refreshAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLooseDialogOpen]);

  // Build selectable medicine list from approved (context), paged, and pending
  const selectableInventory = React.useMemo(() => {
    const all = [...(inventory || []), ...(pagedApproved || []), ...(pendingInventory || [])];
    const byKey = new Map<string, { value: string; name: string }>();
    for (const it of all) {
      const value = String((it as any).medicineId || (it as any)._id || (it as any).id || (it as any).name || '').trim();
      const name = String((it as any).name || '').trim();
      if (!value || !name) continue;
      const key = value.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, { value, name });
    }
    return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, pagedApproved, pendingInventory]);

  // Resolve selected medicine and auto-fill pricing for loose items
  const handleLooseMedicineChange = (value: string) => {
    setLooseMedicine(value);
    const allSources = [...(inventory as any[]), ...(pagedApproved as any[]), ...(pendingInventory as any[])];
    const it: any = allSources.find((m:any) => m.id === value || m._id === value || m.medicineId === value || m.name === value);
    if (!it) return;
    const pq = (it.packQuantity ?? (it.totalItems && it.quantity ? Math.round(Number(it.totalItems) / Number(it.quantity)) : undefined)) || 1;
    const unitSale = (it.unitSalePrice ?? it.price ?? it.unitPrice ?? (typeof it.salePricePerPack === 'number' && pq ? (it.salePricePerPack / pq) : undefined));
    const unitBuy = (it.unitBuyPrice ?? it.purchasePrice ?? it.unitPrice ?? (typeof it.buyPricePerPack === 'number' && pq ? (it.buyPricePerPack / pq) : undefined));
    if (typeof unitBuy === 'number' && isFinite(unitBuy)) setLooseBuyUnit(String(unitBuy.toFixed(2)));
    if (typeof unitSale === 'number' && isFinite(unitSale)) setLooseSaleUnit(String(unitSale.toFixed(2)));
  };

  // Fetch approved inventory page when on approved-like tabs
  useEffect(() => {
    const isApprovedTab = !['review','pending'].includes(activeTab);
    if (!isApprovedTab) return; // skip when viewing pending/review
    let cancelled = false;
    const run = async () => {
      setInvFetching(true);
      try {
        const { items, total } = await getInventoryPaged(invPage, invLimit, searchTerm.trim() || undefined);
        if (!cancelled) {
          setPagedApproved(items);
          setInvTotal(total);
        }
      } catch (err) {
        // silent fail; UI keeps old page
      } finally {
        if (!cancelled) setInvFetching(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [activeTab, invPage, invLimit, searchTerm]);

  // Transform backend AddStock record into InventoryItem
  const mapRecord = (record: any): InventoryItem => {
    const packQty = record.packQuantity || (record.totalItems && record.quantity ? Math.round(record.totalItems / record.quantity) : 1);
    const status = record.status ?? 'approved';
    const totalUnits = typeof record.totalItems === 'number' ? Number(record.totalItems) : (typeof record.items === 'number' ? Number(record.items) : (typeof record.stock === 'number' ? Number(record.stock) : undefined));
    const stockUnits = totalUnits !== undefined ? totalUnits : (status === 'pending' ? (Number(record.quantity || 0) * Number(packQty || 1)) : 0);
    return {
      id: record._id,
      name: record.medicine?.name || record.name || '',
      genericName: record.medicine?.genericName || record.genericName || '',
      price: record.unitSalePrice ?? record.salePrice ?? 0, // legacy unit price for compatibility
      unitSalePrice: record.unitSalePrice ?? record.salePrice ?? record.unitPrice ?? record.price ?? (record.salePricePerPack && (record.packQuantity || (record.totalItems && record.quantity ? Math.round(record.totalItems / record.quantity) : undefined)) ? record.salePricePerPack / (record.packQuantity || Math.round((record.totalItems ?? 0)/(record.quantity || 1))) : undefined),
      unitBuyPrice: record.unitBuyPrice ?? record.unitPrice ?? (record.buyPricePerPack && (record.packQuantity || (record.totalItems && record.quantity ? Math.round(record.totalItems / record.quantity) : undefined)) ? record.buyPricePerPack / (record.packQuantity || Math.round((record.totalItems ?? 0)/(record.quantity || 1))) : undefined),
      quantity: record.quantity || 0,
      packQuantity: packQty,
      stock: Number(stockUnits || 0),
      barcode: record.medicine?.barcode || record.barcode,
      category: record.medicine?.category || record.category,
      manufacturer: record.medicine?.manufacturer || record.manufacturer,
      minStock: record.minStock,
      maxStock: record.maxStock,
      buyPricePerPack: record.buyPricePerPack ?? (record.unitBuyPrice && (record.packQuantity || (record.totalItems && record.quantity)) ? record.unitBuyPrice * (record.packQuantity || Math.round(record.totalItems / record.quantity)) : undefined),
      salePricePerPack: record.salePricePerPack ?? (record.unitSalePrice && (record.packQuantity || (record.totalItems && record.quantity)) ? record.unitSalePrice * (record.packQuantity || Math.round(record.totalItems / record.quantity)) : undefined),
      purchasePrice: record.unitBuyPrice ?? record.unitPrice,
      profitPerUnit: record.profitPerUnit ?? undefined,
      totalItems: typeof record.totalItems === 'number' ? Number(record.totalItems) : undefined,
      salePrice: record.unitSalePrice ?? record.salePrice ?? record.unitPrice ?? record.price,
      batchNo: record.batchNo || record.batchNumber,
      expiryDate: record.expiryDate,
      manufacturingDate: undefined,
      invoiceNumber: record.invoiceNumber,
      supplierName: record.supplier?.name || 'Unknown Supplier',
      status: status,
      date: record.date ?? record.createdAt ?? (record._id ? new Date(parseInt(String(record._id).substring(0,8),16)*1000).toISOString() : undefined)
    };
  };

  const loadPending = async () => {
    try {
      const res = await axios.get('/api/add-stock/pending');
      setPendingInventory(res.data.map(mapRecord));
    } catch (err) {
      console.error('Failed to load pending inventory', err);
    }
  };

  // initial load
  useEffect(() => {
    loadPending();
  }, []);

  // (removed old print helper to avoid duplication)
  // deprecated helper
  const generatePrintTableAll = (rows: InventoryRow[]) => {
    const cells = (content: string | number | undefined) => `<td>${content ?? '-'}</td>`;
    const header = `
      <thead><tr>
        <th>Medicine</th><th>Packs</th><th>Units/Pack</th><th>Buy/Pack</th><th>Sale/Pack</th>
        <th>Unit Buy</th><th>Unit Sale</th><th>Total Items</th><th>Min Stock</th>
        <th>Expiry</th><th>Invoice #</th><th>Supplier</th><th>Status</th><th>Date</th>
      </tr></thead>`;
    const bodyRows = rows.map(r => `
      <tr>
        ${cells(r.name)}
        ${cells(r.quantity)}
        ${cells(r.packQuantity)}
        ${cells(r.buyPricePerPack?.toFixed?.(2))}
        ${cells(r.salePricePerPack?.toFixed?.(2))}
        ${cells(r.unitBuyPrice?.toFixed?.(2))}
        ${cells(((r as any).unitSalePrice ?? (r as any).price)?.toFixed?.(2))}
        ${cells(r.totalItems ?? (r.quantity && r.packQuantity ? r.quantity * r.packQuantity : undefined))}
        ${cells(r.minStock)}
        ${cells(r.expiryDate ? new Date(r.expiryDate).toISOString().split('T')[0] : undefined)}
        ${cells(r.invoiceNumber)}
        ${cells(r.supplierName)}
        ${cells(r.status)}
        ${cells(r.date ? new Date(r.date).toLocaleDateString() : undefined)}
      </tr>`).join('');
    return `<table>${header}<tbody>${bodyRows}</tbody></table>`;
  };


  const handlePrintAll = () => {
    // Combine approved and pending so user gets everything
    const allRows = [...inventory, ...pendingInventory] as any[];
    const tableHtml = generatePrintTableAll(allRows);
    const printWin = window.open('', '', 'width=900,height=650');
    if (!printWin) return;

    printWin.document.open();
    printWin.document.write(`<!DOCTYPE html><html><head><title>Inventory</title>
      <style>
        @media print { body { margin:0; } }
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px; text-align: left; font-size: 12px; }
        thead { background: #f3f3f3; }
      </style>
    </head><body>${tableHtml}</body></html>`);
    printWin.document.close();

    printWin.onload = () => {
      printWin.focus();
      printWin.print();
    };
  };

  const refreshAll = async () => {
    try { clearInventoryCache(); } catch {}
    await refreshInventory();
    await loadPending();
    try {
      const { items, total } = await getInventoryPaged(invPage, invLimit, searchTerm.trim() || undefined);
      setPagedApproved(items);
      setInvTotal(total);
    } catch {}
  };

  // Submit loose items to backend
  const submitLooseItems = async () => {
    try {
      const allSources = [...(inventory as any[]), ...(pagedApproved as any[]), ...(pendingInventory as any[])];
      const med = allSources.find((it:any) => it.id === looseMedicine || it._id === looseMedicine || it.medicineId === looseMedicine || it.name === looseMedicine);
      const body: any = {
        units: Number(looseUnits),
        buyPricePerUnit: Number(looseBuyUnit),
      };
      if (med?.medicineId) body.medicine = med.medicineId; else if (med?._id) body.medicine = med._id; else if (med?.id) body.medicine = med.id; else body.medicineName = looseMedicine;
      if (looseSaleUnit !== '') body.salePricePerUnit = Number(looseSaleUnit);

      if (!body.medicine && !body.medicineName) {
        toast({ title: 'Select medicine', description: 'Please choose a valid medicine', variant: 'destructive' });
        return;
      }
      if (!Number.isFinite(body.units) || body.units <= 0 || !Number.isFinite(body.buyPricePerUnit)) {
        toast({ title: 'Invalid input', description: 'Units must be > 0 and prices must be valid numbers', variant: 'destructive' });
        return;
      }

      const res = await fetch('/api/add-stock/loose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to add loose items');
      }
      toast({ title: 'Added', description: 'Loose items saved to Pending Review. Approve to reflect in stock.' });
      setIsLooseDialogOpen(false);
      setLooseMedicine(''); setLooseUnits(''); setLooseBuyUnit(''); setLooseSaleUnit('');
      await refreshAll();
      try { setActiveTab('review'); } catch {}
    } catch (err:any) {
      toast({ title: 'Error', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const loadInventory = async () => {
    await refreshAll();
    toast({
      title: 'Inventory Refreshed',
      description: `Refreshed at ${format(new Date(), 'PPpp')}`,
    });
  };

  const approveInventory = async (id: string) => {
    try {
      await axios.patch(`/api/add-stock/${id}/approve`);
      toast({ title: 'Approved', description: 'Item moved to inventory' });
      await refreshAll();
      // Notify listeners that inventory has changed
      try { window.dispatchEvent(new Event('inventoryUpdated')); } catch {}
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to approve item', variant: 'destructive' });
    }
  };

  // Reject confirmation state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  const rejectInventory = (id: string) => {
    setRejectTargetId(id);
    setShowRejectDialog(true);
  };

  const confirmRejectInventory = async () => {
    if (!rejectTargetId) return;
    try {
      await axios.patch(`/api/add-stock/${rejectTargetId}/reject`);
      toast({ title: 'Rejected', description: 'Pending item removed' });
      await refreshAll();
      setShowRejectDialog(false);
      setRejectTargetId(null);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to reject item', variant: 'destructive' });
    }
  };

  // Bulk actions for Pending Review
  const approveAllPending = async () => {
    const pending = filteredInventory.filter(i => (i.status ?? 'approved') === 'pending');
    if (!pending.length) return;
    try {
      await Promise.all(pending.map(i => axios.patch(`/api/add-stock/${i.id}/approve`)));
      toast({ title: 'Approved', description: `Approved ${pending.length} pending item(s)` });
      await refreshAll();
      try { window.dispatchEvent(new Event('inventoryUpdated')); } catch {}
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to approve all', variant: 'destructive' });
    }
  };

  const rejectAllPending = async () => {
    const pending = filteredInventory.filter(i => (i.status ?? 'approved') === 'pending');
    if (!pending.length) return;
    const ok = window.confirm(`Reject all ${pending.length} pending item(s)? This cannot be undone.`);
    if (!ok) return;
    try {
      await Promise.all(pending.map(i => axios.patch(`/api/add-stock/${i.id}/reject`)));
      toast({ title: 'Rejected', description: `Rejected ${pending.length} pending item(s)` });
      await refreshAll();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to reject all', variant: 'destructive' });
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    category: '',
    batchNo: '',
    stock: '0',
    minStock: '10',
    maxStock: '100',
    purchasePrice: '0',
    salePrice: '0',
    totalStockPrice: '0',
    barcode: '',
    manufacturer: '',
    supplierName: '',
    expiryDate: '',
    manufacturingDate: '',
    _lastChanged: '', // tracks which field was last edited for auto-calc
  });

  // Supplier state for dropdown and add-new
  const [suppliers, setSuppliers] = useState<SupplierType[]>([]);
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  // Load suppliers for dropdown on mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        // Replace with actual supplier fetching logic
        const suppliersData = await fetch('/api/suppliers').then(res => res.json());
        setSuppliers(suppliersData);
      } catch (error) {
        console.error('Failed to fetch suppliers:', error);
      }
    };
    
    fetchSuppliers();
  }, []);

  const [showBarcodeScannerInForm, setShowBarcodeScannerInForm] = useState(false);
  
  // No need to fetch inventory here; handled by context

  
  // Auto-calculate totalStockPrice or purchasePrice based on user input
  useEffect(() => {
    const stock = Number(formData.stock) || 0;
    const purchasePrice = Number(formData.purchasePrice) || 0;
    // Only auto-calculate if user is editing stock or purchasePrice directly
    if (formData._lastChanged === 'stock' || formData._lastChanged === 'purchasePrice') {
      const totalStockPrice = (stock * purchasePrice).toFixed(2);
      if (formData.totalStockPrice !== totalStockPrice) {
        setFormData(prev => ({
          ...prev,
          totalStockPrice,
        }));
      }
    }
    // If user is editing totalStockPrice directly, update purchasePrice
    if (formData._lastChanged === 'totalStockPrice') {
      if (stock > 0) {
        const calculatedPurchasePrice = (Number(formData.totalStockPrice) / stock).toFixed(2);
        if (formData.purchasePrice !== calculatedPurchasePrice) {
          setFormData(prev => ({
            ...prev,
            purchasePrice: calculatedPurchasePrice,
          }));
        }
      }
    }
  }, [formData.stock, formData.purchasePrice, formData.totalStockPrice, formData._lastChanged]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Handle auto-calculation triggers
    if (name === 'stock' || name === 'purchasePrice') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        _lastChanged: name
      }));
    } else if (name === 'totalStockPrice') {
      setFormData(prev => ({
        ...prev,
        totalStockPrice: value,
        _lastChanged: 'totalStockPrice'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Add new inventory item via backend API
  const handleSaveInventory = async (item: InventoryItem) => {
    try {
      await axios.post('/api/inventory', item);
      await loadInventory();
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add inventory', variant: 'destructive' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: formData.name,
      genericName: formData.genericName,
      category: formData.category,
      batchNo: formData.batchNo,
      stock: Number(formData.stock) || 0,
      minStock: Number(formData.minStock) || 10,
      maxStock: Number(formData.maxStock) || 100,
      purchasePrice: Number(formData.purchasePrice) || 0,
      salePrice: Number(formData.salePrice) || 0,
      price: Number(formData.salePrice) || 0, // For compatibility
      barcode: formData.barcode,
      manufacturer: formData.manufacturer,
      supplierName: formData.supplierName,
      expiryDate: formData.expiryDate,
      manufacturingDate: formData.manufacturingDate
    };

    handleSaveInventory(newItem);
    
    // Reset form
    setFormData({
      name: '',
      genericName: '',
      category: '',
      batchNo: '',
      stock: '0',
      minStock: '10',
      maxStock: '100',
      purchasePrice: '0',
      salePrice: '0',
      totalStockPrice: '0',
      barcode: '',
      manufacturer: '',
      supplierName: '',
      expiryDate: '',
      manufacturingDate: '',
      _lastChanged: '',
    });
    
    setIsAddDialogOpen(false);
  };

  // Add new supplier handler
  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    const newSup = { id: Date.now().toString(), name: newSupplierName.trim() };
    setSuppliers((prev) => [...prev, newSup]);
    setFormData(prev => ({ ...prev, supplierName: newSup.name }));
    setShowAddSupplierDialog(false);
    setNewSupplierName('');
  };

  const handleBarcodeScanned = (barcode: string) => {
    setSearchTerm(barcode);
    setShowBarcodeScanner(false);
    
    // If we find a matching product, select it
    const matchingItem = inventory.find(item => 
      item.barcode?.toLowerCase() === barcode.toLowerCase()
    );
    
    if (matchingItem) {
      // You might want to handle the matching item (e.g., select it in the UI)
      console.log('Found matching item:', matchingItem);
      
      // Show a toast notification
      toast({
        title: 'Product Found',
        description: `${matchingItem.name} - ${matchingItem.stock || 0} in stock`,
        variant: 'default' as const
      });
    } else {
      // If no matching item found, offer to add it
      if (confirm('No matching product found. Would you like to add it as a new item?')) {
        setFormData(prev => ({
          ...prev,
          barcode: barcode,
          name: '',
          stock: '0',
          price: '0',
          purchasePrice: '0',
          minStock: '0',
          maxStock: '0'
        }));
        setIsAddDialogOpen(true);
      }
    }
  };

  // Open edit dialog and populate form
  const handleEditItem = (row: InventoryRow) => {
    // find full item with extra fields if available
    const full = inventory.find(i => String(i.id) === String(row.id)) as InventoryItem | undefined;
    const item = full ?? (row as unknown as InventoryItem);
    setEditItem(item);
    const derivedPq = (item.packQuantity ?? (item.totalItems && item.quantity ? Math.round((item.totalItems as any)/(item.quantity as any)) : undefined)) || undefined;
    const unitSale = (item.unitSalePrice ?? item.price ?? (item as any).unitPrice) as number | undefined;
    const salePerPack = item.salePricePerPack !== undefined
      ? item.salePricePerPack
      : (unitSale !== undefined && derivedPq ? unitSale * derivedPq : undefined);
    const buyPerPack = (item.buyPricePerPack != null)
      ? item.buyPricePerPack
      : ((item.unitBuyPrice != null && derivedPq) ? Number(item.unitBuyPrice) * Number(derivedPq) : undefined);
    setEditForm({
      stock: String(item.quantity ?? item.stock ?? ''), // packs
      packQuantity: String(item.packQuantity ?? ''), // units per pack
      unitPrice: unitSale !== undefined ? String(Number(unitSale).toFixed(2)) : '', // unit sale price
      salePricePerPack: salePerPack !== undefined ? String(Number(salePerPack).toFixed(2)) : '',
      buyPricePerPack: buyPerPack !== undefined ? String(Number(buyPerPack).toFixed(2)) : '',
      category: String(item.category ?? ''),
      invoiceNumber: String((item as any).invoiceNumber ?? ''),
      minStock: String(item.minStock ?? ''),
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
      name: String(item.name || ''),
      barcode: String((item as any).barcode || ''),
      genericName: String((item as any).genericName || ''),
      manufacturer: String((item as any).manufacturer || ''),
    });
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => {
      const next = { ...prev, [name]: value } as any;
      const pq = Number(next.packQuantity) || 0;
      if ((name === 'salePricePerPack' || name === 'packQuantity') && pq > 0) {
        const spp = Number(next.salePricePerPack);
        if (Number.isFinite(spp)) {
          next.unitPrice = (spp / pq).toFixed(2);
        }
      }
      if (name === 'unitPrice' && pq > 0) {
        const up = Number(value);
        if (Number.isFinite(up)) {
          next.salePricePerPack = (up * pq).toFixed(2);
        }
      }
      return next;
    });
  };

  const handleUpdateItem = async () => {
    if (!editItem) return;
    try {
      // 1) Update Medicine base fields if changed
      try {
        const medId = (editItem as any).medicineId || (editItem as any).medicine?._id;
        if (medId) {
          await axios.put(`/api/medicines/${medId}`, {
            name: editForm.name?.trim() || undefined,
            barcode: editForm.barcode?.trim() || undefined,
            genericName: editForm.genericName?.trim() || undefined,
            manufacturer: editForm.manufacturer?.trim() || undefined,
            category: editForm.category?.trim() || undefined,
          });
        }
      } catch (err) {
        console.warn('Medicine update failed (skipping):', err);
      }

      // derive totalItems and optional unit price
      const packs = Number(editForm.stock);
      const pq = Number(editForm.packQuantity) || 1;
      const totalItems = packs * pq;
      const round2 = (n: number) => Number(n.toFixed(2));
      const unitSale = Number(editForm.unitPrice);
      const salePerPack = editForm.salePricePerPack ? Number(editForm.salePricePerPack) : (Number.isFinite(unitSale) ? unitSale * pq : undefined);
      const buyPerPack = editForm.buyPricePerPack ? Number(editForm.buyPricePerPack) : undefined;

      await axios.put(`/api/add-stock/${editItem.id}`, {
        quantity: Number(editForm.stock), // number of packs
        packQuantity: Number(editForm.packQuantity) || undefined,
        totalItems,
        unitSalePrice: Number.isFinite(unitSale) ? round2(unitSale) : undefined,
        salePricePerPack: salePerPack != null && Number.isFinite(Number(salePerPack)) ? round2(Number(salePerPack)) : undefined,
        buyPricePerPack: buyPerPack != null && Number.isFinite(Number(buyPerPack)) ? round2(Number(buyPerPack)) : undefined,
        minStock: editForm.minStock ? Number(editForm.minStock) : undefined,
        expiryDate: editForm.expiryDate || undefined,
        category: editForm.category?.trim() ? editForm.category.trim() : undefined,
        invoiceNumber: editForm.invoiceNumber?.trim() ? editForm.invoiceNumber.trim() : undefined,
      });
      toast({ title: 'Success', description: 'Item updated' });
      setEditItem(null);
      try { clearInventoryCache(); } catch {}
      await refreshInventory();
      try { localStorage.setItem('inventory_sync', String(Date.now())); } catch {}
      try { window.dispatchEvent(new Event('inventoryUpdated')); } catch {}
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update item', variant: 'destructive' });
    }
  };

  const categories = [
    'Tablets',
    'Syrups',
    'Capsules',
    'Injections',
    'Ointments',
    'Drops',
    'Inhalers',
    'Suppositories',
    'Analgesic',
    'Antibiotic',
    'Antacid',
    'Antihistamine',
    'Antidepressant',
    'Antidiabetic',
    'Antihypertensive',
    'Antiviral',
    'Antiseptic',
    'Antipyretic',
    'Other'
  ];

  const text = {
    en: {
      title: 'Inventory Control',
      searchPlaceholder: 'Search inventory...',
      all: 'All Items',
      lowStock: 'Low Stock',
      expiring: 'Expiring Soon',
      outOfStock: 'Out of Stock',
      review: 'Pending Review',
      stockValue: 'Total Stock Value',
      lowStockItems: 'Low Stock Items',
      expiringItems: 'Expiring Soon',
      outOfStockItems: 'Out of Stock',
      refresh: 'Refresh',
      export: 'Export',
      filter: 'Filter',
      medicine: 'Medicine',
      category: 'Category',
      stock: 'Stock',
      expiry: 'Expiry',
      value: 'Value',
      status: 'Status'
    }
  };

  const t = text.en;

  // Helper functions
  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days
    return expiry <= threeDaysFromNow;
  };

  const isOutOfStock = (item: any) => (item?.stock ?? 0) === 0;
  const isLowStock = (item: any) => {
    const stock = Number(item?.stock ?? 0);
    const min = Number(item?.minStock ?? 0);
    return stock > 0 && stock <= min;
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { status: 'Out of Stock', color: 'destructive', icon: AlertTriangle };
    if (stock <= minStock) return { status: 'Low Stock', color: 'secondary', icon: TrendingDown };
    return { status: 'In Stock', color: 'default', icon: Package };
  };

  // Calculate inventory metrics
  const inventoryValue = inventory.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0);
  const lowStockCount = inventory.filter(isLowStock).length;
  const expiringCount = inventory.filter(item => isExpiringSoon(item.expiryDate)).length;
  const outOfStockCount = inventory.filter(isOutOfStock).length;

  const filterInventory = () => {
    // Choose base list
    // For special filters (lowStock/expiring/outOfStock), always use the full inventory to match widget counts
    const specialTabs = new Set(['lowStock','expiring','outOfStock']);
    const isApprovedTab = !['review','pending'].includes(activeTab);
    const baseApproved = (pagedApproved && pagedApproved.length) || invFetching ? pagedApproved : inventory;
    const baseList = activeTab === 'review' ? pendingInventory : (specialTabs.has(activeTab) ? inventory : baseApproved);
    const filteredItems = baseList.filter(item => {
      const lowerSearch = searchTerm.trim().toLowerCase();
      const matchesSearch = lowerSearch === '' || (
        (item.name ?? '').toLowerCase().includes(lowerSearch) ||
        (item.genericName ?? '').toLowerCase().includes(lowerSearch) ||
        (item.category ?? '').toLowerCase().includes(lowerSearch) ||
        (item.barcode ?? '').toLowerCase().includes(lowerSearch) ||
        (((item as any).invoiceNumber ?? '').toLowerCase().includes(lowerSearch))
      );
      
      if (activeTab === 'review') return matchesSearch && (item.status ?? 'approved') === 'pending';
      if (activeTab === 'lowStock') return matchesSearch && isLowStock(item);
      if (activeTab === 'expiring') return matchesSearch && isExpiringSoon(item.expiryDate ?? '');
      if (activeTab === 'outOfStock') return matchesSearch && isOutOfStock(item);
      if (activeTab === 'pending') return matchesSearch && (item.status ?? 'approved') === 'pending';
      
      return matchesSearch;
    });
    // For non-review views, collapse duplicates by medicine (single row per medicine)
    if (activeTab !== 'review' && activeTab !== 'pending') {
      const byKey = new Map<string, any>();
      for (const it of filteredItems) {
        const key = String((it as any).medicineId || it.id || it.name).toLowerCase();
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, { ...it });
        } else {
          // sum fields
          const sum = (a?: number, b?: number) => (Number(a || 0) + Number(b || 0));
          prev.quantity = sum(prev.quantity as any, (it as any).quantity);
          prev.totalItems = sum(prev.totalItems as any, (it as any).totalItems);
          prev.stock = sum(prev.stock as any, (it as any).stock);
          // choose latest expiry and keep minStock max
          const prevExp = prev.expiryDate ? new Date(prev.expiryDate) : null;
          const curExp = it.expiryDate ? new Date(it.expiryDate as any) : null;
          prev.expiryDate = prevExp && curExp ? (curExp > prevExp ? it.expiryDate : prev.expiryDate) : (prevExp ? prev.expiryDate : it.expiryDate);
          prev.minStock = Math.max(Number(prev.minStock || 0), Number((it as any).minStock || 0));
          // preserve a representative invoiceNumber for grouped rows:
          // choose the latest non-empty invoice number based on date/createdAt
          try {
            const prevDt = prev.date ? new Date(prev.date as any) : (prev.createdAt ? new Date(prev.createdAt as any) : null);
            const curDt = (it as any).date ? new Date((it as any).date) : ((it as any).createdAt ? new Date((it as any).createdAt) : null);
            const prevInv = (prev as any).invoiceNumber;
            const curInv = (it as any).invoiceNumber;
            if (!prevInv && curInv) {
              (prev as any).invoiceNumber = curInv;
            } else if (curInv && prevDt && curDt && curDt > prevDt) {
              (prev as any).invoiceNumber = curInv;
              (prev as any).date = (it as any).date || (it as any).createdAt || (prev as any).date;
              // Carry forward latest batch characteristics for display
              (prev as any).packQuantity = (it as any).packQuantity ?? (prev as any).packQuantity;
              (prev as any).unitSalePrice = (it as any).unitSalePrice ?? (prev as any).unitSalePrice;
              (prev as any).salePricePerPack = (it as any).salePricePerPack ?? (prev as any).salePricePerPack;
            }
            // Initialize missing fields once
            if ((prev as any).packQuantity == null && (it as any).packQuantity != null) (prev as any).packQuantity = (it as any).packQuantity;
            if ((prev as any).unitSalePrice == null && (it as any).unitSalePrice != null) (prev as any).unitSalePrice = (it as any).unitSalePrice;
            if ((prev as any).salePricePerPack == null && (it as any).salePricePerPack != null) (prev as any).salePricePerPack = (it as any).salePricePerPack;
          } catch {}
          byKey.set(key, prev);
        }
      }
      return Array.from(byKey.values());
    }
    return filteredItems;
  };

  const filteredInventory = filterInventory();

  // Bulk Add Invoice Form (multi-row)
  const AddInvoiceForm: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
    const [rows, setRows] = useState<Array<{
      id: string;
      medicineInput: string;
      selectedMedicine: any | null;
      packs: string;
      bonusPacks: string;
      packQuantity: string;
      buyPricePerPack: string;
      salePricePerPack: string;
      taxPercent: string;
      expiry: string;
      suggestionsOpen: boolean;
    }>>([{ id: `${Date.now()}-0`, medicineInput: '', selectedMedicine: null, packs: '', bonusPacks: '0', packQuantity: '', buyPricePerPack: '', salePricePerPack: '', taxPercent: '0', expiry: '', suggestionsOpen: false }]);
    const [allMedicines, setAllMedicines] = useState<any[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<SupplierType[]>([]);
    const [supplierId, setSupplierId] = useState<string>('');
    const [invoiceNumber, setInvoiceNumber] = useState<string>('');
    const normalizeInvoiceNumber = (raw: string) => {
      if (!raw) return '';
      let s = String(raw).trim().toUpperCase();
      s = s.replace(/\s+/g, '');
      // If pattern PREFIX-<digits>
      const m = s.match(/^(.*?)-?(\d+)$/);
      if (m) {
        const prefix = (m[1] || 'INV').replace(/[^A-Z0-9]/g, '') || 'INV';
        const digits = m[2].replace(/\D/g, '');
        const padded = digits.padStart(6, '0');
        return `${prefix}-${padded}`;
      }
      // Only digits
      if (/^\d+$/.test(s)) return `INV-${s.padStart(6, '0')}`;
      // Fallback keep A-Z0-9-
      s = s.replace(/[^A-Z0-9-]/g, '');
      return s || '';
    };
    const { toast } = useToast();

    useEffect(() => {
      (async () => {
        try {
          const meds = await getMedicines();
          setAllMedicines(meds);
        } catch {}
        try {
          const sups = await getSuppliers();
          setAllSuppliers(sups as SupplierType[]);
        } catch {}
      })();
    }, []);

    // Load autosaved draft on mount
    useEffect(() => {
      try {
        const raw = localStorage.getItem('add_invoice_autosave');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.rows && Array.isArray(parsed.rows)) setRows(parsed.rows);
          if (typeof parsed?.supplierId === 'string') setSupplierId(parsed.supplierId);
          if (typeof parsed?.invoiceNumber === 'string') setInvoiceNumber(parsed.invoiceNumber);
        }
      } catch {}
    }, []);

    // Autosave whenever fields change
    useEffect(() => {
      try {
        const payload = JSON.stringify({ rows, supplierId, invoiceNumber, ts: Date.now() });
        localStorage.setItem('add_invoice_autosave', payload);
      } catch {}
    }, [rows, supplierId, invoiceNumber]);

    const updateRow = (idx: number, patch: Partial<(typeof rows)[number]>) => {
      setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };
    const addRow = () =>
      setRows(prev => ([...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, medicineInput: '', selectedMedicine: null, packs: '', bonusPacks: '0', packQuantity: '', buyPricePerPack: '', salePricePerPack: '', taxPercent: '0', expiry: '', suggestionsOpen: false }]));
    const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));
    const resetRows = () => setRows([{ id: `${Date.now()}-0`, medicineInput: '', selectedMedicine: null, packs: '', bonusPacks: '0', packQuantity: '', buyPricePerPack: '', salePricePerPack: '', taxPercent: '0', expiry: '', suggestionsOpen: false }]);

    const clearAutosave = () => {
      try { localStorage.removeItem('add_invoice_autosave'); } catch {}
    };

    // Save Draft (Pending Review)
    const saveDraft = () => {
      const valid = rows.filter(r => (r.medicineInput || r.selectedMedicine) && r.packQuantity && r.packs);
      if (valid.length === 0) {
        toast({ title: 'Nothing to save', description: 'Please fill at least one valid row', variant: 'destructive' });
        return;
      }
      const draft = {
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        createdAt: Date.now(),
        supplierId,
        invoiceNumber,
        rows,
      };
      try {
        const raw = localStorage.getItem('pending_invoices');
        const list = raw ? JSON.parse(raw) : [];
        list.unshift(draft);
        localStorage.setItem('pending_invoices', JSON.stringify(list));
        toast({ title: 'Saved to Pending Review', description: `Draft #${draft.invoiceNumber || draft.id} saved.` });
        // Clear current form and autosave so it doesn’t reload immediately
        resetRows();
        setSupplierId('');
        setInvoiceNumber('');
        clearAutosave();
      } catch {
        toast({ title: 'Error', description: 'Failed to save draft', variant: 'destructive' });
      }
    };

    const suggestionsFor = (text: string) => {
      if (!text.trim()) return [] as string[];
      const lower = text.toLowerCase();
      const names = Array.from(new Set(allMedicines.map((m: any) => m.name)));
      return names.filter(n => n.toLowerCase().includes(lower)).slice(0, 50);
    };

    const handleSave = async () => {
      const valid = rows.filter(r => (r.selectedMedicine || r.medicineInput.trim()) && r.packs && r.packQuantity && r.buyPricePerPack);
      if (valid.length === 0) {
        toast({ title: 'Error', description: 'Please complete at least one row', variant: 'destructive' });
        return;
      }
      try {
        await Promise.all(
          valid.map(async r => {
            const packs = parseInt(r.packs) || 0;
            const bonus = parseInt(r.bonusPacks) || 0;
            const packQty = parseInt(r.packQuantity) || 1;
            const taxP = parseFloat(r.taxPercent) || 0;
            const buyPerPackRaw = parseFloat(r.buyPricePerPack) || 0;
            const buyPerPack = +(buyPerPackRaw * (1 + taxP / 100)).toFixed(2);
            const salePerPack = r.salePricePerPack ? parseFloat(r.salePricePerPack) : undefined;
            const totalItems = (packs + bonus) * packQty;
            const medicineId = r.selectedMedicine ? (r.selectedMedicine._id || r.selectedMedicine.id) : undefined;
            await axios.post('/api/add-stock', {
              ...(medicineId ? { medicine: medicineId } : { medicineName: r.medicineInput }),
              quantity: packs + bonus,
              packQuantity: packQty,
              buyPricePerPack: buyPerPack,
              salePricePerPack: salePerPack,
              totalItems,
              supplier: supplierId || undefined,
              invoiceNumber: invoiceNumber || undefined,
              expiryDate: r.expiry || undefined,
              status: 'pending'
            });
          })
        );
        toast({ title: 'Success', description: 'Invoice items added' });
        onSaved();
        resetRows();
        clearAutosave();
        // Notify listeners that inventory has changed
        try { window.dispatchEvent(new Event('inventoryUpdated')); } catch {}
      } catch (e: any) {
        const msg = e?.response?.data?.error || e?.message || 'Failed to save invoice';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    };

    // Totals for footer
    const totals = rows.reduce(
      (acc, r) => {
        const packs = parseInt(r.packs) || 0;
        const bonus = parseInt(r.bonusPacks) || 0;
        const packQty = parseInt(r.packQuantity) || 0;
        const buyPerPack = parseFloat(r.buyPricePerPack) || 0;
        acc.packs += packs;
        acc.bonus += bonus;
        acc.items += (packs + bonus) * packQty;
        acc.cost += packs * buyPerPack; // cost excludes bonus packs
        return acc;
      },
      { packs: 0, bonus: 0, items: 0, cost: 0 }
    );

    return (
      <form
        className="space-y-4"
        onSubmit={e => e.preventDefault()}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        }}
      >
        {/* Top controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {allSuppliers.map(s => (
                  <SelectItem key={s._id || s.id || s.name} value={(s._id || s.id || s.name) as string}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Invoice Number</Label>
            <Input
              autoComplete="off"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              onBlur={e => setInvoiceNumber(normalizeInvoiceNumber(e.target.value))}
              placeholder="e.g. INV-000001"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" onClick={addRow}>Add Row</Button>
            <Button type="button" variant="outline" onClick={resetRows}>Reset</Button>
            <Button type="button" variant="secondary" onClick={saveDraft}>Save Draft</Button>
            <Button type="button" onClick={handleSave}>Save Invoice</Button>
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-4">
          {rows.map((r, idx) => {
            const packs = parseInt(r.packs) || 0;
            const bonus = parseInt(r.bonusPacks) || 0;
            const packQty = parseInt(r.packQuantity) || 1;
            const taxP = parseFloat(r.taxPercent) || 0;
            const buyPerPackRaw = parseFloat(r.buyPricePerPack) || 0;
            const buyPerPack = +(buyPerPackRaw * (1 + taxP / 100)).toFixed(2);
            const unitBuy = packQty > 0 && buyPerPack ? (buyPerPack / packQty).toFixed(2) : '-';
            const unitSale = packQty > 0 && r.salePricePerPack ? (parseFloat(r.salePricePerPack) / packQty).toFixed(2) : '-';
            const totalItems = (packs + bonus) * packQty;
            const suggs = suggestionsFor(r.medicineInput);
            return (
              <div key={r.id} className="border rounded-md p-3 bg-white shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium">Row #{idx + 1}</div>
                  <Button size="sm" variant="destructive" onClick={() => removeRow(idx)} disabled={rows.length === 1}>Remove</Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-10 gap-3">
                  {/* Medicine with suggestions */}
                  <div className="col-span-2 md:col-span-2 lg:col-span-3 relative">
                    <Label>Medicine</Label>
                    <Input
                      autoComplete="off"
                      value={r.medicineInput}
                      onChange={e => updateRow(idx, { medicineInput: e.target.value, selectedMedicine: null, suggestionsOpen: true })}
                      onFocus={() => updateRow(idx, { suggestionsOpen: true })}
                      onBlur={() => setTimeout(() => updateRow(idx, { suggestionsOpen: false }), 150)}
                      placeholder="Type to search or enter new"
                    />
                    {r.suggestionsOpen && r.medicineInput.trim() && suggs.length > 0 && (
                      <div className="absolute z-50 mt-1 max-h-56 overflow-auto w-full bg-white border rounded shadow">
                        {suggs.map(name => (
                          <div
                            key={name}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            onMouseDown={e => {
                              e.preventDefault();
                              const match = allMedicines.find(m => m.name === name);
                              updateRow(idx, { medicineInput: name, selectedMedicine: match || null, suggestionsOpen: false });
                            }}
                          >
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Packs</Label>
                    <Input autoComplete="off" onWheel={e => (e.currentTarget as HTMLInputElement).blur()} className="text-center" type="number" min="0" value={r.packs} onChange={e => updateRow(idx, { packs: e.target.value })} />
                  </div>
                  <div>
                    <Label>Bonus</Label>
                    <Input autoComplete="off" onWheel={e => (e.currentTarget as HTMLInputElement).blur()} className="text-center" type="number" min="0" value={r.bonusPacks} onChange={e => updateRow(idx, { bonusPacks: e.target.value })} />
                  </div>
                  <div>
                    <Label>Units/Pack</Label>
                    <Input autoComplete="off" onWheel={e => (e.currentTarget as HTMLInputElement).blur()} className="text-center" type="number" min="1" value={r.packQuantity} onChange={e => updateRow(idx, { packQuantity: e.target.value })} />
                  </div>
                  <div>
                    <Label>Buy/Pack</Label>
                    <Input autoComplete="off" onWheel={e => (e.currentTarget as HTMLInputElement).blur()} className="text-center" type="number" min="0" step="0.01" value={r.buyPricePerPack} onChange={e => updateRow(idx, { buyPricePerPack: e.target.value })} />
                  </div>
                  <div>
                    <Label>Sale/Pack</Label>
                    <Input autoComplete="off" onWheel={e => (e.currentTarget as HTMLInputElement).blur()} className="text-center" type="number" min="0" step="0.01" value={r.salePricePerPack} onChange={e => updateRow(idx, { salePricePerPack: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tax %</Label>
                    <Input autoComplete="off" onWheel={e => (e.currentTarget as HTMLInputElement).blur()} className="text-center" type="number" min="0" step="0.01" value={r.taxPercent} onChange={e => updateRow(idx, { taxPercent: e.target.value })} />
                  </div>
                  <div>
                    <Label>Expiry</Label>
                    <Input autoComplete="off" className="text-center" type="date" value={r.expiry} onChange={e => updateRow(idx, { expiry: e.target.value })} />
                  </div>
                  <div>
                    <Label>Unit Buy</Label>
                    <div className="h-9 border rounded flex items-center justify-center bg-gray-50">{unitBuy}</div>
                  </div>
                  <div>
                    <Label>Unit Sale</Label>
                    <div className="h-9 border rounded flex items-center justify-center bg-gray-50">{unitSale}</div>
                  </div>
                  <div className="col-span-2">
                    <Label>Total Items</Label>
                    <div className="h-9 border rounded flex items-center justify-center bg-gray-50">{totalItems}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer totals */}
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="p-2 rounded border bg-gray-50">Total Packs: <span className="font-medium">{totals.packs}</span></div>
          <div className="p-2 rounded border bg-gray-50">Bonus Packs: <span className="font-medium">{totals.bonus}</span></div>
          <div className="p-2 rounded border bg-gray-50">Total Items: <span className="font-medium">{totals.items}</span></div>
          <div className="p-2 rounded border bg-gray-50">Estimated Cost: <span className="font-medium">{totals.cost.toFixed(2)}</span></div>
        </div>
      </form>
    );
  };

  // Pending Review List component
  const PendingInvoicesList: React.FC = () => {
    const [, force] = useState(0);
    const { toast } = useToast();
    const list: Array<any> = (() => {
      try {
        const raw = localStorage.getItem('pending_invoices');
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();

    const loadDraft = (draft: any) => {
      try {
        localStorage.setItem('add_invoice_autosave', JSON.stringify({
          rows: draft.rows || [],
          supplierId: draft.supplierId || '',
          invoiceNumber: draft.invoiceNumber || ''
        }));
        toast({ title: 'Draft loaded', description: 'Open Add Invoice to continue editing.' });
      } catch {
        toast({ title: 'Error', description: 'Failed to load draft', variant: 'destructive' });
      }
    };

    const deleteDraft = (id: string) => {
      try {
        const raw = localStorage.getItem('pending_invoices');
        const arr = raw ? JSON.parse(raw) : [];
        const next = arr.filter((d: any) => d.id !== id);
        localStorage.setItem('pending_invoices', JSON.stringify(next));
        toast({ title: 'Deleted', description: 'Draft removed from Pending Review' });
        force(x => x + 1);
      } catch {
        toast({ title: 'Error', description: 'Failed to delete draft', variant: 'destructive' });
      }
    };

    if (!list.length) return <div className="text-sm text-muted-foreground">No pending invoices.</div>;

    return (
      <div className="space-y-3">
        {list.map((d: any) => (
          <div key={d.id} className="border rounded-md p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{d.invoiceNumber || d.id}</div>
              <div className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleString()} • {d.rows?.length || 0} rows</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => loadDraft(d)}>Load</Button>
              <Button size="sm" variant="destructive" onClick={() => deleteDraft(d.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Build a printable HTML table from currently filtered rows with full detail columns
  const buildPrintTable = (rows: typeof filteredInventory) => {
    const header = `
      <thead>
        <tr>
          <th>Medicine</th><th>Packs</th><th>Units/Pack</th><th>Buy/Pack</th><th>Sale/Pack</th>
          <th>Unit Buy</th><th>Unit Sale</th><th>Profit/Unit</th><th>Total Items</th><th>Unit Price</th>
          <th>Invoice #</th><th>Category</th><th>Supplier</th><th>Expiry</th><th>Min Stock</th><th>Date</th>
        </tr>
      </thead>`;
    const body = rows.map(r => {
      const expiry = r.expiryDate ? new Date(r.expiryDate).toISOString().split('T')[0] : '-';
      return `<tr>
        <td>${r.name}</td>
        <td style="text-align:center">${r.quantity ?? '-'}</td>
        <td style="text-align:center">${r.packQuantity ?? '-'}</td>
        <td style="text-align:center">${r.buyPricePerPack ?? '-'}</td>
        <td style="text-align:center">${r.salePricePerPack ?? '-'}</td>
        <td style="text-align:center">${r.unitBuyPrice ?? '-'}</td>
        <td style="text-align:center">${r.unitSalePrice ?? (r.price ?? '-') }</td>
        <td style="text-align:center">${r.profitPerUnit ?? '-'}</td>
        <td style="text-align:center">${r.totalItems ?? '-'}</td>
        <td style="text-align:center">${(r.unitSalePrice ?? r.price ?? (r.salePricePerPack && r.packQuantity ? (r.salePricePerPack / r.packQuantity).toFixed?.(2) : '-'))}</td>
        <td>${r.invoiceNumber ?? '-'}</td>
        <td>${r.category ?? '-'}</td>
        <td>${r.supplierName ?? '-'}</td>
        <td style="text-align:center">${expiry}</td>
        <td style="text-align:center">${r.minStock ?? '-'}</td>
        <td>${r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>
      </tr>`;}).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:12px">${header}<tbody>${body}</tbody></table>`;
  };

  const handlePrint = () => {
    const htmlContent = `<!DOCTYPE html><html><head><title>Inventory Print</title>
      <style>@media print { body{ margin:0 } table{ border-collapse:collapse; width:100% } th,td{ border:1px solid #ddd; padding:4px; font-size:12px; } th{ background:#f3f4f6; } }</style>
    </head><body>${buildPrintTable(filteredInventory)}</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=600');
    if (!w) return;

    // Write content and wait for the new window to finish loading before printing
    w.document.open();
    w.document.write(htmlContent);
    w.document.close();

    w.onload = () => {
      w.focus();
      w.print();
      // Give the browser some time to show the print dialog before closing the tab
      setTimeout(() => w.close(), 500);
    };
  };

  // Double confirmation dialog for deletion
  const deleteChecklist = [
    'I understand this action cannot be undone.',
    'I have reviewed the item and wish to permanently delete it.'
  ];

  const handleDeleteInventory = (id: string | number) => {
    setDeleteTargetId(String(id));
    setShowDeleteDialog(true);
  };

  const confirmDeleteInventory = () => {
    if (deleteTargetId === null) return;
    const updatedInventory = inventory.filter(item => String(item.id) !== String(deleteTargetId));
    
    // Delete inventory item via backend API
    axios.delete(`/api/add-stock/${deleteTargetId}`)
      .then(() => {
        loadInventory();
        setShowDeleteDialog(false);
        setDeleteTargetId(null);
        toast({
          title: 'Success',
          description: 'Inventory item deleted successfully',
        });
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
      });
  };

  const cancelDeleteInventory = () => {
    setShowDeleteDialog(false);
    setDeleteTargetId(null);
  };



  return (
    <React.Fragment>
      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this pending item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRejectDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRejectInventory}>
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center">
  <h1 className="text-3xl font-bold text-gray-900">Inventory Control</h1>
  <div className="flex space-x-2">
    {/* Add New Stock Button */}
    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setIsUpdateStockOpen(true)}>
      Update Stock
    </Button>

    {/* Add New Stock Dialog */}
    <Dialog open={isAddMedicineDialogOpen} onOpenChange={setIsAddMedicineDialogOpen}>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Medicine</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddMedicine} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="medicineName">Medicine Name <span className="text-red-500">*</span></Label>
            <Input
              id="medicineName"
              name="medicineName"
              value={medicineForm.name}
              onChange={e => setMedicineForm({ ...medicineForm, name: e.target.value })}
              placeholder={'Enter medicine name'}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsAddMedicineDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {/* Add Inventory Button */}
    <AddStockDialog 
      onStockAdded={loadInventory}
      onCancel={() => setIsAddDialogOpen(false)}
    />
    {/* Add Loose Items */}
    <Dialog open={isLooseDialogOpen} onOpenChange={setIsLooseDialogOpen}>
      <DialogTrigger asChild>
        <Button className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground">Add Loose Items</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl border shadow-xl">
        <DialogHeader>
          <DialogTitle>Add Loose Items</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Select Medicine</Label>
            <select
              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={looseMedicine}
              onChange={(e)=> handleLooseMedicineChange(e.target.value)}
            >
              <option value="">-- choose --</option>
              {selectableInventory.map((it)=> (
                <option key={it.value} value={it.value}>{it.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Units (loose)</Label>
              <Input type="number" min="1" value={looseUnits} onChange={e=>setLooseUnits(e.target.value)} placeholder="e.g. 12" />
            </div>
            <div>
              <Label>Buy Price / Unit</Label>
              <Input type="number" min="0" step="0.01" value={looseBuyUnit} onChange={e=>setLooseBuyUnit(e.target.value)} placeholder="e.g. 5.50" />
            </div>
          </div>
          <div>
            <Label>Sale Price / Unit (optional)</Label>
            <Input type="number" min="0" step="0.01" value={looseSaleUnit} onChange={e=>setLooseSaleUnit(e.target.value)} placeholder="e.g. 10.00" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={submitLooseItems}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Add Invoice Button -> navigates to dedicated pharmacy page */}
    <Link to="/pharmacy/invoices/new">
      <Button className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground">Add Invoice</Button>
    </Link>
    <Button onClick={loadInventory} className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground">
      <RefreshCw className="h-4 w-4 mr-2" />
      Refresh
    </Button>
    <Button 
      className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground"
      onClick={async () => {
        try {
                  // Get the button element to update its state
                  const exportButton = document.querySelector('button:has(> svg.download-icon)') as HTMLButtonElement;
                  if (exportButton) {
                    exportButton.disabled = true;
                    const originalContent = exportButton.innerHTML;
                    exportButton.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-current inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download h-4 w-4 mr-1"><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Exporting...';
                
                  // Get the current date for the filename
                  const today = new Date().toISOString().split('T')[0];
                  
                  // Fetch full AddStock collection from backend (approved + pending)
                  const [approvedRes, pendingRes] = await Promise.all([
                    fetch('/api/add-stock'),
                    fetch('/api/add-stock/pending')
                  ]);
                  if (!approvedRes.ok) throw new Error('Failed to fetch approved add-stock');
                  if (!pendingRes.ok) throw new Error('Failed to fetch pending add-stock');
                  const approved = await approvedRes.json();
                  const pending = await pendingRes.json();
                  const all = [...approved, ...pending];

                  // Define CSV headers to mirror AddStock model fields
                  const headers = [
                    'ID','Status','Date',
                    'Medicine ID','Medicine Name','Category',
                    'Quantity (Packs)','Pack Quantity','Total Items',
                    'Buy Price/Pack','Sale Price/Pack','Unit Buy','Unit Sale','Profit/Unit','Unit Price',
                    'Invoice #','Supplier ID','Supplier Name','Expiry Date','Min Stock'
                  ];

                  const safe = (v: any) => {
                    if (v === null || v === undefined) return '';
                    const s = String(v);
                    // wrap in quotes and escape quotes
                    return '"' + s.replace(/"/g, '""') + '"';
                  };

                  const rows = all.map((r: any) => {
                    const medName = r.medicine?.name ?? r.medicineName ?? '';
                    const category = r.category ?? r.medicine?.category ?? '';
                    const supplierName = r.supplier?.name ?? r.supplierName ?? '';
                    const totalItems = r.totalItems ?? ((Number(r.quantity||0)) * (Number(r.packQuantity||0)) || '');
                    return [
                      r._id ?? r.id ?? '',
                      r.status ?? '',
                      r.date ? new Date(r.date).toLocaleDateString() : '',
                      r.medicine?._id ?? r.medicine ?? '',
                      safe(medName),
                      safe(category),
                      r.quantity ?? '',
                      r.packQuantity ?? '',
                      totalItems,
                      r.buyPricePerPack ?? '',
                      r.salePricePerPack ?? '',
                      r.unitBuyPrice ?? '',
                      r.unitSalePrice ?? '',
                      r.profitPerUnit ?? '',
                      r.unitPrice ?? '',
                      safe(r.invoiceNumber ?? ''),
                      r.supplier?._id ?? r.supplier ?? '',
                      safe(supplierName),
                      r.expiryDate ? new Date(r.expiryDate).toISOString().split('T')[0] : '',
                      r.minStock ?? ''
                    ].join(',');
                  });

                  // Create CSV content with BOM for Excel
                  const csvContent = [
                    '\uFEFF' + headers.join(','),
                    ...rows
                  ].join('\r\n');

                  // Create and trigger download
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `addstock_export_${today}.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  
                  // Clean up
                  setTimeout(() => URL.revokeObjectURL(url), 100);

                  // Show success message
                  toast({
                    title: 'Export Successful',
                    description: `Exported ${all.length} Add Stock records`,
                    duration: 3000
                  });

                  // Reset button state
                  if (exportButton) {
                    setTimeout(() => {
                      if (exportButton) {
                        exportButton.disabled = false;
                        exportButton.innerHTML = originalContent;
                      }
                    }, 500);
                  }
                }
              } catch (error) {
                console.error('Export failed:', error);
                toast({
                  title: 'Export Failed',
                  description: 'Failed to export inventory data',
                  variant: 'destructive',
                  duration: 3000
                });
                
                // Reset button state on error
                const exportButton = document.querySelector<HTMLButtonElement>('button:has(> svg.download-icon)');
                if (exportButton) {
                  exportButton.disabled = false;
                  exportButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download h-4 w-4 mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>Export';
                }
              }
            }}
          >
            <Download className="h-4 w-4 mr-2 download-icon" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Value</p>
                <p className="text-2xl font-bold text-green-600">PKR {inventoryValue.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Items</p>
                <p className="text-2xl font-bold text-orange-600">{expiringCount}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="relative flex items-center w-full">
          <Input
            id="inventory-search-input"
            placeholder={'Search medicines or scan barcode...'}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setInvPage(1); }}
            className="w-full pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 h-8 w-8"
            onClick={() => setShowBarcodeScanner(!showBarcodeScanner)}
            title={'Scan Barcode'}
          >
            <Barcode className="h-4 w-4" />
          </Button>
        </div>
        {showBarcodeScanner && (
          <div className="mt-2 p-3 border rounded-md bg-muted/20">
            <BarcodeScanner 
              onScan={handleBarcodeScanned}
              onClose={() => setShowBarcodeScanner(false)}
            />
          </div>
        )}
        <Button variant="outline" onClick={handlePrint}>
           <Printer className="h-4 w-4 mr-2" />
           Print
         </Button>
         <Button variant="outline">
           <Filter className="h-4 w-4 mr-2" />
          {t.filter}
        </Button>
      </div>
      {showBarcodeScanner && (
        <div className="mt-2 p-3 border rounded-md bg-muted/20">
          <BarcodeScanner 
            onScan={handleBarcodeScanned}
            onClose={() => setShowBarcodeScanner(false)}
          />
        </div>
      )}
      <Button variant="outline">
        <Filter className="h-4 w-4 mr-2" />
        {t.filter}
      </Button>
    </div>
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        {[
          { id: 'all', label: t.all },
          { id: 'review', label: t.review },
          { id: 'lowStock', label: t.lowStock },
          { id: 'expiring', label: t.expiring },
          { id: 'outOfStock', label: t.outOfStock }
        ].map(tab => (
          <TabsTrigger 
            key={`tab-${tab.id}`} 
            value={tab.id}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={activeTab} className="mt-6">
        {/* Pagination controls for approved inventory views */}
        {(!['review','pending'].includes(activeTab)) && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page</span>
              <select className="border rounded h-8 px-2" value={invLimit} onChange={e=>{ setInvPage(1); setInvLimit(parseInt(e.target.value)||10); }}>
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={invPage<=1 || invFetching} onClick={()=> setInvPage(p => Math.max(1, p-1))}>Prev</Button>
              <div className="text-sm">Page {invPage}{invTotal!=null ? ` of ${Math.max(1, Math.ceil(invTotal/invLimit))}` : ''}</div>
              <Button variant="outline" disabled={invFetching || (invTotal!=null ? (invPage*invLimit)>=invTotal : false)} onClick={()=> setInvPage(p => p+1)}>Next</Button>
            </div>
          </div>
        )}
        {activeTab === 'review' && (
          <div className="flex items-center justify-end mb-3 gap-2">
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={approveAllPending}>Approve All</Button>
            <Button variant="destructive" onClick={rejectAllPending}>Reject All</Button>
          </div>
        )}
        <div ref={tableRef}>
          <InventoryTable
          items={filteredInventory.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity ?? item.packs ?? item.stock ?? 0,
            totalItems: item.totalItems ?? item.stock ?? 0,
            minStock: item.minStock,
            price: item.price,
            unitSalePrice: item.unitSalePrice, // pass correct sell unit price
            expiryDate: item.expiryDate, // pass expiry date
            invoiceNumber: item.invoiceNumber,
            category: item.category,
             supplierName: item.supplier?.name ?? item.supplierName ?? '',
            status: item.status
          }))}
          {...(activeTab === 'review'
            ? { onApprove: approveInventory, onReject: rejectInventory }
            : { onEdit: handleEditItem, onDelete: handleDeleteInventory })}
        />
        </div>
         
      </TabsContent>

    </Tabs>
    
    {/* Edit Item Dialog */}
      {editItem && (
        <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
          <DialogContent className="w-[95vw] sm:max-w-3xl max-w-[900px] max-h-[85vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Medicine basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
                <div className="flex flex-col space-y-1">
                  <Label>Medicine Name</Label>
                  <Input
                    name="name"
                    type="text"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    placeholder="Enter medicine name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
                {/* Packs */}
                <div className="flex flex-col space-y-1">
                  <Label>Packs</Label>
                  <Input
                    name="stock"
                    type="number"
                    min="0"
                    value={editForm.stock}
                    onChange={handleEditFormChange}
                  />
                </div>
                {/* Units per Pack */}
                <div className="flex flex-col space-y-1">
                  <Label>Units / Pack</Label>
                  <Input
                    name="packQuantity"
                    type="number"
                    min="1"
                    value={editForm.packQuantity}
                    onChange={handleEditFormChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
                <Label className="text-right">Unit Price</Label>
                <Input name="unitPrice" type="number" min="0" step="0.01" value={editForm.unitPrice} onChange={handleEditFormChange} className="sm:col-span-3" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
                <Label className="text-right">Sale Price / Pack</Label>
                <Input name="salePricePerPack" type="number" min="0" step="0.01" value={editForm.salePricePerPack} onChange={handleEditFormChange} className="sm:col-span-3" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
                <Label className="text-right">Buy Price / Pack</Label>
                <Input name="buyPricePerPack" type="number" min="0" step="0.01" value={editForm.buyPricePerPack} onChange={handleEditFormChange} className="sm:col-span-3" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
                <Label className="text-right">Min Stock</Label>
                <Input name="minStock" type="number" min="0" value={editForm.minStock} onChange={handleEditFormChange} className="sm:col-span-3" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
                <Label className="text-right">Category</Label>
                <Input name="category" type="text" value={editForm.category} onChange={handleEditFormChange} className="sm:col-span-3" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
                <Label className="text-right">Invoice Number</Label>
                <Input name="invoiceNumber" type="text" value={editForm.invoiceNumber} onChange={handleEditFormChange} className="sm:col-span-3" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4 bg-gray-50 rounded-md p-3 hover:bg-gray-100 transition">
                <Label className="text-right">Expiry Date</Label>
                <Input name="expiryDate" type="date" value={editForm.expiryDate} onChange={handleEditFormChange} className="sm:col-span-3" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={handleUpdateItem}>Save</Button>
            </div>
          </DialogContent>
          <DialogClose />
        </Dialog>
      )}

      {/* Update Stock Dialog */}
      <UpdateStockDialog open={isUpdateStockOpen} onOpenChange={setIsUpdateStockOpen} onStockUpdated={refreshAll} />

      {/* Add Supplier Dialog */}
    <Dialog open={showAddSupplierDialog} onOpenChange={setShowAddSupplierDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddSupplier}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newSupplierName">Supplier Name <span className="text-red-500">*</span></Label>
              <Input
                id="newSupplierName"
                name="newSupplierName"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder={'Enter supplier name'}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setShowAddSupplierDialog(false)}>Cancel</Button>
            <Button type="submit">Add Supplier</Button>
          </div>
        </form>
      </DialogContent>
      <DialogClose />
    </Dialog>
    {/* Double Confirm Dialog for Deletion */}
    <DoubleConfirmDialog
      open={showDeleteDialog}
      title={'Are you sure you want to delete this inventory item?'}
      description={'This action is irreversible. Please confirm you want to permanently delete this inventory item.'}
      checklist={deleteChecklist}
      confirmLabel={'Delete'}
      cancelLabel={'Cancel'}
      onConfirm={confirmDeleteInventory}
      onCancel={cancelDeleteInventory}
    />
  </React.Fragment>
  );
};

export default InventoryControl;
