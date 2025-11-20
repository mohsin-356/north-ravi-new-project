import { useState, useEffect } from 'react';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Label } from '@/components/Pharmacy components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Pharmacy components/ui/select';
import { useToast } from '@/components/Pharmacy components/ui/use-toast';
import { medicineService } from '@/Pharmacy services/medicineService';
import { StockManager } from '@/pharmacy utilites/stockManager';
import { ReturnReason } from '@/Pharmacy services/returnService';
import BarcodeScanner from '@/components/Pharmacy components/BarcodeScanner';

type ReturnType = 'customer' | 'supplier';

type Medicine = {
  id: string;
  name: string;
  currentStock: number;
  barcode: string;
};

type ReturnFormProps = {
  type: ReturnType;
  onSuccess: (data: { medicine: { id: string; name: string }; quantity: number; reason: string; reasonCategory: ReturnReason }) => void;
};

export function ReturnForm({ type, onSuccess }: ReturnFormProps) {
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [reasonCategory, setReasonCategory] = useState<ReturnReason>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // TODO: Fetch medicines from API/service
    const mockMedicines: Medicine[] = [
      { id: '1', name: 'Paracetamol', currentStock: 50, barcode: '123456789' },
      { id: '2', name: 'Ibuprofen', currentStock: 30, barcode: '987654321' },
      { id: '3', name: 'Amoxicillin', currentStock: 20, barcode: '111111111' },
    ];
    setMedicines(mockMedicines);
  }, []);

  const filteredMedicines = medicines.filter(med => 
    med.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMedicine || quantity <= 0) return;
    
    try {
      setIsSubmitting(true);
      
      // Get current stock
      const medicine = medicines.find(m => m.id === selectedMedicine);
      if (!medicine) throw new Error('Medicine not found');
      
      // Update stock based on return type
      const currentStock = StockManager.getInstance().getStock(selectedMedicine);
      const newQuantity = type === 'customer' 
        ? currentStock + quantity // Customer return adds to stock
        : currentStock - quantity; // Supplier return removes from stock
      
      if (newQuantity < 0) {
        throw new Error('Insufficient stock for supplier return');
      }
      
      // Update stock
      const success = StockManager.getInstance().syncStock(selectedMedicine, newQuantity, 'inventory');
      if (!success) throw new Error('Failed to update inventory');
      
      toast({
        title: 'Return Processed',
        description: `${type === 'customer' ? 'Customer' : 'Supplier'} return completed. Stock updated.`,
      });
      
      onSuccess({
        medicine: { id: selectedMedicine, name: medicines.find(m => m.id === selectedMedicine)?.name || '' },
        quantity,
        reason,
        reasonCategory
      });
    } catch (error) {
      toast({
        title: 'Return Failed',
        description: error instanceof Error ? error.message : `Could not process ${type} return`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    // Find medicine by barcode (assuming barcode is stored in medicine data)
    const matchedMedicine = medicines.find(m => m.barcode === barcode);
    if (matchedMedicine) {
      setSelectedMedicine(matchedMedicine.id);
      toast({
        title: 'Medicine Found',
        description: `${matchedMedicine.name} selected`,
      });
    } else {
      toast({
        title: 'Not Found',
        description: 'No medicine found with this barcode',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="search">Search Medicine</Label>
        <Input 
          id="search" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search medicines..."
        />
      </div>

      <div className="mb-4">
        <BarcodeScanner 
          onScan={handleBarcodeScan} 
          onClose={() => {}}
        />
      </div>

      <div className="space-y-2">
        <Label>Medicine</Label>
        <Select 
          value={selectedMedicine} 
          onValueChange={setSelectedMedicine}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select medicine" />
          </SelectTrigger>
          <SelectContent>
            {filteredMedicines.map(medicine => (
              <SelectItem key={medicine.id} value={medicine.id}>
                {medicine.name} (Stock: {medicine.currentStock})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input 
          id="quantity" 
          type="number" 
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
        />
      </div>

      <div className="space-y-2">
        <Label>Reason Category</Label>
        <Select 
          value={reasonCategory}
          onValueChange={(value) => setReasonCategory(value as ReturnReason)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="damaged">Damaged</SelectItem>
            <SelectItem value="wrong-item">Wrong Item</SelectItem>
            <SelectItem value="customer-request">Customer Request</SelectItem>
            <SelectItem value="overstock">Overstock</SelectItem>
            <SelectItem value="recall">Recall</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason Details</Label>
        <Input 
          id="reason" 
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter return reason details"
        />
      </div>

      <Button type="submit" disabled={!selectedMedicine || isSubmitting}>
        {isSubmitting ? 'Processing...' : 'Process Return'}
      </Button>
    </form>
  );
}
