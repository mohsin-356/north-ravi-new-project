import React, { useState, useEffect, FC, ReactNode, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/Pharmacy components/ui/card';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Plus, User, Truck, X, Download, RefreshCw, ScanLine, Barcode, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/Pharmacy components/ui/dialog';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Label } from '@/components/Pharmacy components/ui/label';
import { getInventory, updateItemUnits, clearInventoryCache } from '@/pharmacy utilites/inventoryService';
import { saveSaleToRecent } from '@/pharmacy utilites/salesService';
// Define SaleItem interface locally since it's not found in @/types/sale
interface SaleItem {
  id: string;
  medicine: string;
  customer: string;
  amount: number;
  time: string;
  date: string;
}
import { useToast } from '@/components/Pharmacy components/ui/use-toast';
import BarcodeScanner from './BarcodeScanner';

interface MedicineEntry {
  id: string;
  medicineName: string;
  quantity: number;
  price: number;
  timestamp: string;
  batchNo?: string;
  expiryDate?: string;
  reason?: string;
  addStockId?: string;
}

interface SubmittedReturn {
  id: string;
  type: 'customer' | 'supplier';
  name: string;
  companyName?: string;
  medicines: MedicineEntry[];
  date: string;
  time: string;
  originalBillNo?: string;
}

interface ReturnsPageProps {
  isUrdu: boolean;
  initialBillNo?: string;
}

const ReturnsPage: FC<ReturnsPageProps> = ({ isUrdu, initialBillNo }) => {
  // State for dialogs
  const [showCustomerReturn, setShowCustomerReturn] = useState(false);
  const [showSupplierReturn, setShowSupplierReturn] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [currentMedicines, setCurrentMedicines] = useState<MedicineEntry[]>([]);
  const [reason, setReason] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [activeScannerFor, setActiveScannerFor] = useState<'customer' | 'supplier' | null>(null);
  // Bill linking
  const [billNo, setBillNo] = useState<string>('');
  const [linkedSale, setLinkedSale] = useState<any | null>(null);
  
  // Data state
  const [submittedReturns, setSubmittedReturns] = useState<SubmittedReturn[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'supplier'>('all');
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();
  
  // Helper: find and link sale by bill number
  const findSaleByBillNo = async (bill: string) => {
    const trimmed = (bill || '').trim();
    if (!trimmed) return null;
    let sale: any | null = null;
    try {
      // Try local first
      try {
        const local = JSON.parse(localStorage.getItem('pharmacy_sales') || '[]');
        sale = Array.isArray(local) ? local.find((s: any) => (s.billNo || '').toLowerCase() === trimmed.toLowerCase()) : null;
      } catch {}
      // Fallback to backend
      if (!sale) {
        const res = await fetch(`/api/sales/by-bill/${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          sale = await res.json();
        }
      }
      return sale;
    } catch {
      return null;
    }
  };

  // Prefill and auto-link if initialBillNo provided
  useEffect(() => {
    (async () => {
      if (initialBillNo && !billNo) {
        setBillNo(initialBillNo);
        const sale = await findSaleByBillNo(initialBillNo);
        if (sale) {
          setLinkedSale(sale);
          toast({ title: 'Bill Found', description: 'Prices will auto-fill from bill where possible' });
        } else {
          setLinkedSale(null);
          toast({ title: 'Bill Not Found', variant: 'destructive' });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBillNo]);

  // Add medicine to current return
  const addMedicineEntry = () => {
    // Try to auto-fill price from linked sale if present
    let priceToUse = Number(price) || 0;
    if (linkedSale && medicineName.trim()) {
      try {
        const match = (linkedSale.items || []).find((it: any) =>
          (it.medicineName || it.name || '').toLowerCase() === medicineName.trim().toLowerCase()
        );
        if (match && Number(match.price) > 0 && priceToUse === 0) {
          priceToUse = Number(match.price);
          setPrice(priceToUse);
        }
      } catch {}
    }

    if (!medicineName.trim() || !quantity || !priceToUse) {
      toast({ title: 'Missing Fields', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    const newMedicine: MedicineEntry = {
      id: Date.now().toString(),
      medicineName: medicineName.trim(),
      quantity: Number(quantity),
      price: Number(priceToUse),
      timestamp: new Date().toISOString()
    };

    setCurrentMedicines([...currentMedicines, newMedicine]);
    setMedicineName('');
    setQuantity(1);
    setPrice(0);
  };

  // Remove medicine from current return
  const removeMedicineEntry = (id: string) => {
    setCurrentMedicines(currentMedicines.filter(med => med.id !== id));
  };

  // Update inventory with returned items
  const updateInventoryWithReturn = async (medicines: MedicineEntry[]): Promise<boolean> => {
    try {
      if (!medicines || medicines.length === 0) return false;
      const inventory = await getInventory();
      let updated = false;
      for (const returnedItem of medicines) {
        try {
          const name = (returnedItem?.medicineName || '').trim();
          if (!name) continue;
          const invItem = (inventory as any[]).find((it: any) => String(it?.name || '').toLowerCase() === name.toLowerCase() && String((it as any).status || 'approved') !== 'pending');
          if (!invItem) continue;
          await updateItemUnits(String(invItem.id || invItem._id), Number(returnedItem.quantity || 0));
          updated = true;
        } catch (error) {
          console.error('Error updating inventory for returned item:', error);
        }
      }
      if (updated) {
        try { clearInventoryCache(); } catch {}
        try { window.dispatchEvent(new Event('inventoryUpdated')); } catch {}
        try { window.dispatchEvent(new Event('storage')); } catch {}
      }
      return updated;
    } catch (error) {
      console.error('Failed to update inventory with return:', error);
      return false;
    }
  };

  // Add this function to handle inventory updates
  const updateInventoryOnReturn = async (medicines: MedicineEntry[], returnType: 'customer' | 'supplier') => {
    try {
      const inventory = await getInventory();
      let updated = false;
      for (const returnItem of medicines) {
        const name = (returnItem?.medicineName || '').trim();
        if (!name) continue;
        const stockChange = returnType === 'customer' ? Number(returnItem.quantity || 0) : -Number(returnItem.quantity || 0);
        try {
          // Prefer explicit AddStock id from linked sale
          if (returnItem.addStockId) {
            await updateItemUnits(String(returnItem.addStockId), stockChange);
            updated = true;
            continue;
          }
          // Otherwise resolve by name but skip pending rows
          const invItem = (inventory as any[]).find((it: any) => String(it?.name || '').toLowerCase() === name.toLowerCase() && String((it as any).status || 'approved') !== 'pending');
          if (!invItem) continue;
          await updateItemUnits(String(invItem.id || invItem._id), stockChange);
          updated = true;
        } catch (error) {
          console.error('Failed to update inventory:', error);
        }
      }
      if (updated) {
        try { clearInventoryCache(); } catch {}
        try { window.dispatchEvent(new Event('inventoryUpdated')); } catch {}
        try { window.dispatchEvent(new Event('storage')); } catch {}
        toast({ title: 'Inventory Updated', description: 'Inventory has been successfully updated after return', variant: 'default' });
      }
      return updated;
    } catch (error) {
      console.error('Failed to update inventory:', error);
      toast({ title: 'Inventory Update Failed', description: 'Failed to update inventory on return', variant: 'destructive' });
      return false;
    }
  };

  // Load saved returns on component mount
  useEffect(() => {
    try {
      const savedReturns = localStorage.getItem('submittedReturns');
      if (savedReturns) {
        setSubmittedReturns(JSON.parse(savedReturns));
      }
    } catch (error) {
      console.error('Failed to load saved returns:', error);
    }
  }, []);

  // Helper function to safely serialize returns data
  const serializeReturns = (returns: SubmittedReturn[]) => {
    return returns.map(returnItem => ({
      ...returnItem,
      date: returnItem.date || new Date().toISOString(),
      time: returnItem.time || new Date().toISOString(),
      medicines: returnItem.medicines.map(med => ({
        ...med,
        // Ensure all properties are serializable
        id: String(med.id || ''),
        medicineName: String(med.medicineName || ''),
        quantity: Number(med.quantity) || 0,
        price: Number(med.price) || 0,
        timestamp: med.timestamp && !isNaN(new Date(med.timestamp).getTime()) 
          ? new Date(med.timestamp).toISOString() 
          : new Date().toISOString(),
        ...(med.reason && { reason: String(med.reason) }),
        ...(med.batchNo && { batchNo: String(med.batchNo) }),
        ...(med.expiryDate && { 
          expiryDate: !isNaN(new Date(med.expiryDate).getTime())
            ? new Date(med.expiryDate).toISOString()
            : String(med.expiryDate)
        })
      }))
    }));
  };

  // Save returns to localStorage whenever they change
  useEffect(() => {
    if (submittedReturns.length > 0) {
      try {
        const serializedReturns = serializeReturns(submittedReturns);
        localStorage.setItem('pharmacyReturns', JSON.stringify(serializedReturns));
        localStorage.setItem('submittedReturns', JSON.stringify(serializedReturns));
      } catch (error) {
        console.error('Error saving returns to localStorage:', error);
      }
    }
  }, [submittedReturns]);

  // Load saved returns from localStorage on component mount and update inventory
  useEffect(() => {
    try {
      const savedReturns = localStorage.getItem('pharmacyReturns');
      if (savedReturns) {
        const parsedReturns = JSON.parse(savedReturns);
        if (Array.isArray(parsedReturns)) {
          // Migrate old return entries to the new format if needed
          const migratedReturns = parsedReturns.map(returnItem => {
            // If this is an old return entry without medicines array, create one
            if (!returnItem.medicines) {
              return {
                ...returnItem,
                medicines: [{
                  id: returnItem.id || Date.now().toString(),
                  medicineName: returnItem.medicineName || '',
                  quantity: returnItem.quantity || 0,
                  price: returnItem.price || 0,
                  timestamp: returnItem.time || new Date().toISOString()
                }]
              };
            }
            return returnItem;
          });
          
          setSubmittedReturns(migratedReturns);
          // Save migrated data back to localStorage
          localStorage.setItem('pharmacyReturns', JSON.stringify(migratedReturns));
          
          // Update inventory with all customer returns
          const customerReturns = migratedReturns.filter((item: SubmittedReturn) => item.type === 'customer');
          if (customerReturns.length > 0) {
            // Get all medicines from customer returns
            const allReturnedMedicines = customerReturns.flatMap((returnItem: SubmittedReturn) => returnItem.medicines);
            if (allReturnedMedicines.length > 0) {
              updateInventoryWithReturn(allReturnedMedicines);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load saved returns:', error);
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (type: 'customer' | 'supplier', medicine: { name: string; quantity: number; price: number }) => {
    if (!medicine.name.trim() || !medicine.quantity || !medicine.price) {
      toast({ title: 'Missing Fields', description: 'Please fill in all fields', variant: 'destructive' });
      return false;
    }

    try {
      const now = new Date();
      const nameToUse = type === 'customer' 
        ? (customerName.trim() || 'Unknown Customer')
        : (supplierName.trim() || 'Unknown Supplier');
      
      const companyNameToUse = type === 'supplier' && companyName.trim() === '' 
        ? 'Unknown Company'
        : companyName;

      // Try to resolve AddStock record id from linked sale (bill)
      let addStockId: string | undefined = undefined;
      try {
        if (linkedSale && Array.isArray(linkedSale.items)) {
          const norm = (s: string) => (s || '').trim().toLowerCase();
          const match = (linkedSale.items || []).find((it: any) => norm(it.medicineName || it.name) === norm(medicine.name));
          if (match && (match.medicineId || match.addStockId || match.id)) {
            addStockId = String(match.medicineId || match.addStockId || match.id);
          }
        }
      } catch {}

      // Create a single medicine entry
      const medicineEntry: MedicineEntry = {
        id: Date.now().toString(),
        medicineName: medicine.name.trim(),
        quantity: Number(medicine.quantity),
        price: Number(medicine.price),
        timestamp: now.toISOString(),
        ...(addStockId ? { addStockId } : {})
      };

      // For customer returns, update inventory and POS
      if (type === 'customer') {
        const success = await updateInventoryOnReturn([medicineEntry], type);
        if (!success) {
          throw new Error('Failed to update inventory');
        }
      }

      const newReturn: SubmittedReturn = {
        id: Date.now().toString(),
        type,
        name: nameToUse,
        companyName: type === 'supplier' ? companyNameToUse : undefined,
        medicines: [medicineEntry],
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        originalBillNo: type === 'customer' && billNo.trim() ? billNo.trim() : undefined
      };

      // Update state and localStorage
      const updatedReturns = [{
        ...newReturn,
        medicines: newReturn.medicines.map(med => ({
          ...med,
          // Ensure all properties are serializable
          id: String(med.id),
          medicineName: String(med.medicineName),
          quantity: Number(med.quantity),
          price: Number(med.price),
          timestamp: med.timestamp || new Date().toISOString(),
          ...(med.reason && { reason: String(med.reason) }),
          ...(med.batchNo && { batchNo: String(med.batchNo) }),
          ...(med.expiryDate && { expiryDate: String(med.expiryDate) })
        }))
      }, ...submittedReturns];
      
      setSubmittedReturns(updatedReturns);
      try {
        const serializedReturns = serializeReturns(updatedReturns);
        localStorage.setItem('pharmacyReturns', JSON.stringify(serializedReturns));
      } catch (error) {
        console.error('Error saving returns to localStorage:', error);
      }

      // Reset form and close dialog
      setMedicineName('');
      setQuantity(1);
      setPrice(0);
      
      if (type === 'customer') {
        setCustomerName('');
        setShowCustomerReturn(false);
      } else {
        setSupplierName('');
        setCompanyName('');
        setShowSupplierReturn(false);
      }

      // Show success message
      toast({ title: 'Success', description: type === 'customer' ? 'Customer return saved successfully' : 'Supplier return saved successfully' });
    } catch (error) {
      console.error('Error processing return:', error);
      toast({ title: 'Error', description: 'Error processing return', variant: 'destructive' });
    }
  };

  // Handle delete return
  const handleDeleteReturn = (id: string) => {
    setSubmittedReturns(prevReturns => 
      prevReturns.filter(returnItem => returnItem.id !== id)
    );
    
    toast({ title: 'Success', description: 'Return record has been deleted' });
  };

  // Handle process return
  const handleProcessReturn = async (returnItem: SubmittedReturn) => {
    if (returnItem.type === 'customer') {
      // For customer returns, we need to add the items back to inventory
      const success = await updateInventoryWithReturn(returnItem.medicines);
      
      if (success) {
        // Remove the processed return from the list
        setSubmittedReturns(prevReturns => 
          prevReturns.filter(item => item.id !== returnItem.id)
        );
        
        toast({ title: 'Success', description: 'Returned items have been added back to inventory' });
      } else {
        toast({ title: 'Error', description: 'Error updating inventory', variant: 'destructive' });
      }
    } else {
      // For supplier returns, we just need to remove the return record
      // as the items have already been returned to the supplier
      setSubmittedReturns(prevReturns => 
        prevReturns.filter(item => item.id !== returnItem.id)
      );
      
      toast({ title: 'Success', description: 'Supplier return has been confirmed' });
    }
  };

  // Export returns to CSV
  const exportReturnsToCSV = () => {
    try {
      if (!submittedReturns.length) {
        toast({ title: 'Warning', description: 'Please add some returns first.', variant: 'destructive' });
        return;
      }

      // Filter returns based on active tab
      let returnsToExport = submittedReturns;
      if (activeTab === 'customer') {
        returnsToExport = submittedReturns.filter(returnItem => returnItem.type === 'customer');
      } else if (activeTab === 'supplier') {
        returnsToExport = submittedReturns.filter(returnItem => returnItem.type === 'supplier');
      }

      if (!returnsToExport.length) {
        toast({ title: 'Warning', description: 'No returns available in the selected category.', variant: 'destructive' });
        return;
      }

      // Create CSV content
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Add header row
      const headers = [
        'ID',
        'Type',
        'Name',
        'Company',
        'Date',
        'Time',
        'Medicine Name',
        'Quantity',
        'Price',
        'Reason'
      ];
      csvContent += headers.join(',') + '\r\n';

      // Add data rows
      returnsToExport.forEach(returnItem => {
        returnItem.medicines.forEach(medicine => {
          const row = [
            `"${returnItem.id}"`,
            `"${returnItem.type}"`,
            `"${returnItem.name}"`,
            `"${returnItem.companyName || ''}"`,
            `"${returnItem.date}"`,
            `"${returnItem.time}"`,
            `"${medicine.medicineName}"`,
            `"${medicine.quantity}"`,
            `"${medicine.price}"`,
            `"${medicine.reason || ''}"`
          ];
          csvContent += row.join(',') + '\r\n';
        });
      });

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `returns_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      toast({ title: 'Success', description: 'Returns have been exported to CSV file.' });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({ title: 'Error', description: 'An error occurred while exporting data', variant: 'destructive' });
    }
  };

  // Function to refresh the page
  const refreshPage = () => {
    window.location.reload();
  };

  // Print supplier return slip
  const printSupplierReturn = (returnItem: SubmittedReturn) => {
    try {
      const title = 'Supplier Return Slip';
      const rows = returnItem.medicines.map((m) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${m.medicineName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${m.quantity}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">PKR ${Number(m.price||0).toFixed(2)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">PKR ${(Number(m.price||0)*Number(m.quantity||0)).toFixed(2)}</td>
        </tr>`).join('');
      const total = returnItem.medicines.reduce((s, m) => s + (Number(m.price||0)*Number(m.quantity||0)), 0);
      const html = `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            @media print { @page { size: 80mm auto; margin: 8mm; } body { font-family: Arial, sans-serif; } }
            h1 { font-size: 16px; margin: 0 0 8px; }
            .muted { color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .tot { text-align: right; font-weight: bold; padding-top: 8px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="muted">Date: ${returnItem.date} &nbsp; â€¢ &nbsp; Time: ${returnItem.time}</div>
          <div class="muted">Supplier: ${returnItem.name}${returnItem.companyName ? ` â€¢ Company: ${returnItem.companyName}` : ''}</div>
          <hr style="margin:8px 0;border:none;border-top:1px solid #ddd;"/>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;">Medicine</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;">Qty</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;">Price</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="tot">Total: PKR ${total.toFixed(2)}</div>
        </body>
        </html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
      }
    } catch (e) {
      console.error('Failed to print supplier return:', e);
      toast({ title: 'Print Failed', variant: 'destructive' });
    }
  };

  // Render return card for the list view
  const renderReturnCard = (returnItem: SubmittedReturn) => {
    const totalItems = returnItem.medicines.reduce((sum, med) => sum + (Number(med.quantity) || 0), 0);
    const totalAmount = returnItem.medicines.reduce(
      (sum, med) => sum + ((Number(med.price) || 0) * (Number(med.quantity) || 0)),
      0
    );

    return (
      <Card key={returnItem.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg flex items-center">
                {returnItem.type === 'customer' ? (
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                ) : (
                  <Truck className="h-5 w-5 mr-2 text-green-600" />
                )}
                {returnItem.type === 'customer' ? 'Customer Return' : 'Supplier Return'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {returnItem.name} 
                {returnItem.companyName && ` â€¢ ${returnItem.companyName}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {returnItem.date} â€¢ {returnItem.time}
              </p>
              <p className="text-sm font-medium">
                {totalItems} items â€¢ PKR {totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {returnItem.medicines.map((med, index) => (
              <div key={`${returnItem.id}-${index}`} className="flex justify-between py-1 border-b last:border-0">
                <div>
                  <p className="font-medium">{med.medicineName}</p>
                  <p className="text-sm text-muted-foreground">
                    {med.quantity} x PKR {Number(med.price || 0).toFixed(2)}
                    {med.batchNo && ` â€¢ Batch: ${med.batchNo}`}
                    {med.expiryDate && ` â€¢ Expiry: ${med.expiryDate}`}
                  </p>
                  {med.reason && (
                    <p className="text-sm text-amber-500 mt-1">
                      <span className="font-medium">Reason:</span> {med.reason}
                    </p>
                  )}
                </div>
                <p className="font-medium">PKR {(med.price * med.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 pt-2">
          {returnItem.type === 'supplier' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => printSupplierReturn(returnItem)}
              title={'Print'}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this return?')) {
                handleDeleteReturn(returnItem.id);
              }
            }}
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Handle barcode scan result
  const handleBarcodeScanned = async (barcode: string) => {
    if (!barcode) return;
    
    // Update the appropriate field based on which form is active
    if (activeScannerFor === 'customer' || activeScannerFor === 'supplier') {
      setMedicineName(barcode);
      setShowBarcodeScanner(false);
      
      // Find the medicine in inventory to auto-fill price if available
      const inventory = await getInventory();
      const foundItem = (inventory as any[]).find((item: any) => 
        item.barcode === barcode || (item.name || '').toLowerCase().includes(barcode.toLowerCase())
      );
      
      if (foundItem) {
        setPrice(Number(foundItem.price) || 0);
        toast({ title: 'Success', description: 'Medicine details have been auto-filled' });
      }
    }
  };

  // Open barcode scanner for the specified form type
  const openBarcodeScanner = (formType: 'customer' | 'supplier') => {
    setActiveScannerFor(formType);
    setShowBarcodeScanner(true);
  };


  // Render customer return form dialog
  const renderCustomerReturnForm = () => {
    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit('customer', {
        name: medicineName,
        quantity: quantity,
        price: price
      });
    };

    return (
      <Dialog open={showCustomerReturn} onOpenChange={setShowCustomerReturn}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Customer Return
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customerName" className="text-right">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              {/* Bill number linkage */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="billNo" className="text-right">Bill No</Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="billNo"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    placeholder={'Bill number from receipt'}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const trimmed = billNo.trim();
                      if (!trimmed) {
                        toast({ title: 'Bill number required', variant: 'destructive' });
                        return;
                      }
                      const sale = await findSaleByBillNo(trimmed);
                      if (sale) {
                        setLinkedSale(sale);
                        toast({ title: 'Bill Found', description: 'Prices will auto-fill from bill where possible' });
                      } else {
                        setLinkedSale(null);
                        toast({ title: 'Bill Not Found', variant: 'destructive' });
                      }
                    }}
                  >
                    Find
                  </Button>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3">Medicine Details</h4>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-5">
                    <Label htmlFor="medicineName" className="text-sm block mb-1">Medicine Name</Label>
                    <div className="flex gap-2">
                      <Input
                        id="medicineName"
                        value={medicineName}
                        onChange={(e) => setMedicineName(e.target.value)}
                        className="flex-1"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => openBarcodeScanner('customer')}
                        title={'Scan Barcode'}
                      >
                        <Barcode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="quantity" className="text-sm block mb-1">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                      className="w-full"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="price" className="text-sm block mb-1">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value) || 0)}
                      className="w-full"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCustomerReturn(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Process Return
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Render supplier return form dialog
  const renderSupplierReturnForm = () => {
    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit('supplier', {
        name: medicineName,
        quantity: quantity,
        price: price
      });
    };

    return (
      <Dialog open={showSupplierReturn} onOpenChange={setShowSupplierReturn}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2 text-blue-600" />
              Supplier Return
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="supplierName" className="text-right">
                  {isUrdu ? 'Ø³Ù¾Ù„Ø§Ø¦Ø± Ú©Ø§ Ù†Ø§Ù…' : 'Supplier Name'}
                </Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="companyName" className="text-right">
                  {isUrdu ? 'Ú©Ù…Ù¾Ù†ÛŒ Ú©Ø§ Ù†Ø§Ù…' : 'Company Name'}
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3">
                  {isUrdu ? 'Ø¯ÙˆØ§Ø¦ÛŒ Ú©ÛŒ ØªÙØµÛŒÙ„Ø§Øª' : 'Medicine Details'}
                </h4>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-5">
                    <Label htmlFor="supplierMedicineName" className="text-sm block mb-1">
                      {isUrdu ? 'Ø¯ÙˆØ§ Ú©Ø§ Ù†Ø§Ù…' : 'Medicine Name'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="supplierMedicineName"
                        value={medicineName}
                        onChange={(e) => setMedicineName(e.target.value)}
                        className="flex-1"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => openBarcodeScanner('supplier')}
                        title={isUrdu ? 'Ø¨Ø§Ø± Ú©ÙˆÚˆ Ø§Ø³Ú©ÛŒÙ† Ú©Ø±ÛŒÚº' : 'Scan Barcode'}
                      >
                        <Barcode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="supplierQuantity" className="text-sm block mb-1">
                      {isUrdu ? 'ØªØ¹Ø¯Ø§Ø¯' : 'Quantity'}
                    </Label>
                    <Input
                      id="supplierQuantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                      className="w-full"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="supplierPrice" className="text-sm block mb-1">
                      {isUrdu ? 'Ù‚ÛŒÙ…Øª' : 'Price'}
                    </Label>
                    <Input
                      id="supplierPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value) || 0)}
                      className="w-full"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSupplierReturn(false)}>Cancel</Button>
              <Button 
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Process Return
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };
  // Main component return
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Customer Return Dialog */}
      <Dialog open={showCustomerReturn} onOpenChange={setShowCustomerReturn}>
        {renderCustomerReturnForm()}
      </Dialog>
      
      {/* Supplier Return Dialog */}
      <Dialog open={showSupplierReturn} onOpenChange={setShowSupplierReturn}>
        {renderSupplierReturnForm()}
      </Dialog>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Returns</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={refreshPage} title={'Refresh'}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportReturnsToCSV} disabled={submittedReturns.length === 0} title={'Export'} ref={exportButtonRef}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Customer Return Card */}
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setShowCustomerReturn(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <User className="h-6 w-6 mr-2" />
              Customer Return
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Medicines returned by customer</p>
          </CardContent>
        </Card>

        {/* Supplier Return Card */}
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setShowSupplierReturn(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Truck className="h-6 w-6 mr-2" />
              {isUrdu ? 'Ø³Ù¾Ù„Ø§Ø¦Ø± Ú©Ùˆ ÙˆØ§Ù¾Ø³ÛŒ' : 'Supplier Return'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Medicines returned to supplier</p>
          </CardContent>
        </Card>
      </div>

      {/* Submitted Returns Section */}
      {submittedReturns.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Submitted Information</h3>
          
          {/* Tabs */}
          <div className="flex border-b mb-4">
            <button
              className={`py-2 px-4 font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('all')}
            >
              All Returns
            </button>
            <button
              className={`py-2 px-4 font-medium ${activeTab === 'customer' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('customer')}
            >
              Customer Returns
            </button>
            <button
              className={`py-2 px-4 font-medium ${activeTab === 'supplier' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('supplier')}
            >
              Supplier Returns
            </button>
          </div>
          
          {/* All Returns */}
          <div className={activeTab === 'all' ? 'block' : 'hidden'}>
            {submittedReturns.length > 0 ? (
              <div className="space-y-4">
                {submittedReturns.map((item) => (
                  <div key={item.id}>
                    {renderReturnCard(item)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No returns available</p>
            )}
          </div>
          
          {/* Customer Returns */}
          <div className={activeTab === 'customer' ? 'block' : 'hidden'}>
            {submittedReturns.filter(item => item.type === 'customer').length > 0 ? (
              <div className="space-y-4">
                {submittedReturns
                  .filter(item => item.type === 'customer')
                  .map((item) => (
                    <div key={item.id}>
                      {renderReturnCard(item)}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No customer returns available</p>
            )}
          </div>
          
          {/* Supplier Returns */}
          <div className={activeTab === 'supplier' ? 'block' : 'hidden'}>
            {submittedReturns.filter(item => item.type === 'supplier').length > 0 ? (
              <div className="space-y-4">
                {submittedReturns
                  .filter(item => item.type === 'supplier')
                  .map((item) => (
                    <div key={item.id}>
                      {renderReturnCard(item)}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No supplier returns available</p>
            )}
          </div>
        </div>
      )}
      
      {/* Barcode Scanner Dialog */}
      <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Barcode className="h-5 w-5 mr-2" />
              Barcode Scanner
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <BarcodeScanner 
              onScan={handleBarcodeScanned} 
              onClose={() => setShowBarcodeScanner(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReturnsPage;

