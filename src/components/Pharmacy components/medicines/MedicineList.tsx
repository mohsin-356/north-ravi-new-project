import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddStockModal } from './AddStockModal';
import { medicineService } from '@/services/medicineService';

type Medicine = {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  price: number;
  lastPurchasePrice?: number;
  lastSupplierId?: string;
  lastPurchaseDate?: string;
  batchNumber?: string;
};

export function MedicineList() {
  const [medicines, setMedicines] = React.useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  // TODO: Fetch medicines from API/service
  React.useEffect(() => {
    setMedicines([
      { 
        id: '1', 
        name: 'Paracetamol', 
        category: 'Pain Relief', 
        currentStock: 50, 
        price: 10,
        lastPurchasePrice: 8,
        lastSupplierId: 'supplier-1',
        lastPurchaseDate: '2023-10-15',
        batchNumber: 'BATCH-001'
      },
      { 
        id: '2', 
        name: 'Ibuprofen', 
        category: 'Pain Relief', 
        currentStock: 30, 
        price: 15,
        lastPurchasePrice: 12,
        lastSupplierId: 'supplier-2',
        lastPurchaseDate: '2023-10-10',
        batchNumber: 'BATCH-002'
      },
      { 
        id: '3', 
        name: 'Amoxicillin', 
        category: 'Antibiotic', 
        currentStock: 20, 
        price: 25,
        lastPurchasePrice: 20,
        lastSupplierId: 'supplier-1',
        lastPurchaseDate: '2023-10-05',
        batchNumber: 'BATCH-003'
      },
    ]);
  }, []);

  const handleAddStock = async (medicineId: string, data: {
    quantity: number;
    purchasePrice: number;
    invoiceNumber: string;
    supplierId: string;
    batchNumber: string;
  }) => {
    try {
      await medicineService.addStock(medicineId, data);
      
      // Update local state optimistically
      setMedicines(prev => prev.map(med => {
        if (med.id === medicineId) {
          return {
            ...med,
            currentStock: med.currentStock + data.quantity,
            lastPurchasePrice: data.purchasePrice,
            lastSupplierId: data.supplierId,
            lastPurchaseDate: new Date().toISOString(),
            batchNumber: data.batchNumber
          };
        }
        return med;
      }));
    } catch (error) {
      console.error('Failed to add stock:', error);
      // TODO: Show error toast
    }
  };

  const filteredMedicines = medicines.filter(medicine =>
    medicine.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search medicines..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Medicine
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Last Purchase</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMedicines.map(medicine => (
              <tr key={medicine.id} className="border-b">
                <td className="p-3">{medicine.name}</td>
                <td className="p-3">{medicine.category}</td>
                <td className="p-3">{medicine.currentStock}</td>
                <td className="p-3">Rs. {medicine.price.toFixed(2)}</td>
                <td className="p-3">
                  {medicine.lastPurchasePrice ? `Rs. ${medicine.lastPurchasePrice.toFixed(2)}` : 'N/A'}
                </td>
                <td className="p-3">
                  <AddStockModal 
                    medicines={[medicine as any]}
                    suppliers={[]}
                    onAddStock={async (data) => {
                      await handleAddStock(data.medicineId, {
                        quantity: data.quantity,
                        purchasePrice: data.purchasePrice,
                        invoiceNumber: data.invoiceNumber || '',
                        supplierId: data.supplierId,
                        batchNumber: 'BATCH-' + Date.now()
                      });
                    }}
                  >
                    <Button variant="ghost" size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Stock
                    </Button>
                  </AddStockModal>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
