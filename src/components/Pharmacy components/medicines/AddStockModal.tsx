import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Medicine } from '@/types/medicine';

type AddStockModalProps = {
  medicines: Medicine[];
  suppliers: { _id: string; name: string }[];
  onAddStock: (data: {
    medicineId: string;
    quantity: number;
    purchasePrice: number;
    invoiceNumber?: string;
    supplierId: string;
    unitSalePrice: number;
    totalPrice: number;
    category?: string;
    minStock?: number;
    expiryDate?: string; // ISO date string (YYYY-MM-01)
  }) => Promise<void>;
  children: React.ReactNode;
};

export const AddStockModal: React.FC<AddStockModalProps> = ({
  medicines,
  suppliers,
  onAddStock,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [medicineId, setMedicineId] = useState(medicines[0]?.id || '');
  const [quantity, setQuantity] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierId, setSupplierId] = useState(suppliers[0]?._id || '');
  const [unitSalePrice, setUnitSalePrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState('');
  const [minStock, setMinStock] = useState<number | ''>('');
  const [expiryDate, setExpiryDate] = useState<string>(''); // YYYY-MM-DD
  const totalPrice = quantity > 0 && purchasePrice > 0 ? quantity * purchasePrice : 0;
  const { toast } = useToast();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0 || purchasePrice <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Quantity and price must be greater than zero',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const invNo = normalizeInvoiceNumber(invoiceNumber || '');
      await onAddStock({
        medicineId,
        quantity,
        purchasePrice,
        invoiceNumber: invNo || undefined,
        supplierId,
        unitSalePrice,
        totalPrice,
        category: category || undefined,
        minStock: minStock === '' ? undefined : Number(minStock),
        expiryDate: expiryDate || undefined,
      });

      toast({
        title: 'Stock Added',
        description: `${quantity} units added to ${medicines.find((m) => m.id === medicineId)?.name}`,
      });

      setOpen(false);
      setQuantity(0);
      setCategory('');
      setMinStock('');
      setExpiryDate('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add stock',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Stock</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Tablets, Syrup"
            />
          </div>

          <div>
            <Label htmlFor="medicine">Medicine</Label>
            <select
              id="medicine"
              className="w-full border rounded px-3 py-2"
              value={medicineId}
              onChange={(e) => setMedicineId(e.target.value)}
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="purchasePrice">Purchase Price (Rs.)</Label>
            <Input
              id="purchasePrice"
              type="number"
              min="0.01"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              onBlur={(e) => setInvoiceNumber(normalizeInvoiceNumber(e.target.value))}
              placeholder="e.g. INV-000001"
            />
          </div>

          <div>
            <Label htmlFor="minStock">Minimum Stock</Label>
            <Input
              id="minStock"
              type="number"
              min="0"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Alert threshold (units)"
            />
          </div>

          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <select
              id="supplier"
              className="w-full border rounded px-3 py-2"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="unitPrice">Unit Price (auto)</Label>
            <Input
              id="unitPrice"
              value={quantity > 0 ? (purchasePrice / quantity).toFixed(2) : ''}
              disabled
            />
          </div>

          <div>
            <Label htmlFor="unitSalePrice">Unit Sale Price</Label>
            <Input
              id="unitSalePrice"
              type="number"
              min="0"
              step="0.01"
              value={unitSalePrice}
              onChange={(e) => setUnitSalePrice(Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="totalPrice">Total Price</Label>
            <Input
              id="totalPrice"
              type="number"
              value={totalPrice}
              readOnly
              style={{ background: '#f3f3f3' }}
            />
          </div>

          
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Stock'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
