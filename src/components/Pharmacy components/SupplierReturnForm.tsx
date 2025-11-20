import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/Pharmacy components/ui/dialog';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Label } from '@/components/Pharmacy components/ui/label';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Building, User, Package, DollarSign, X, Info, Plus, Trash2 } from 'lucide-react';
import { removeInventoryOnSupplierReturn } from '@/pharmacy utilites/inventoryUtils';

interface SupplierReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    companyName: string;
    supplierName: string;
    medicineName: string;
    totalStockPrice: string;
    totalStockQuantity: string;
  }) => void;
  isUrdu: boolean;
}

export function SupplierReturnForm({ isOpen, onClose, onSave, isUrdu }: SupplierReturnFormProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    supplierName: '',
    medicineName: '',
    medicinePrice: '',
    medicineQuantity: '1',
    totalStockPrice: '0',
    totalStockQuantity: '0',
  });
  
  const [inventory, setInventory] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<Array<{name: string, price: string, quantity: number}>>([]);
  
  // Load inventory when form opens
  useEffect(() => {
    if (isOpen) {
      try {
        const storedInventory = JSON.parse(localStorage.getItem('inventory') || '[]');
        setInventory(storedInventory);
      } catch (error) {
        console.error('Error loading inventory:', error);
      }
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Update total price based on quantity if needed
      ...(name === 'totalStockQuantity' && {
        totalStockPrice: (parseFloat(prev.totalStockPrice || '0') * (parseFloat(value) || 1)).toString()
      })
    }));
  };

  const handleAddMedicine = () => {
    if (!formData.medicineName || !formData.medicinePrice) {
      alert('Please enter medicine name and price');
      return;
    }
    
    const quantity = parseInt(formData.medicineQuantity) || 1;
    const price = parseFloat(formData.medicinePrice) || 0;
    
    setMedicines([...medicines, {
      name: formData.medicineName,
      price: formData.medicinePrice,
      quantity: quantity
    }]);
    
    // Reset medicine inputs
    setFormData(prev => ({
      ...prev,
      medicineName: '',
      medicinePrice: '',
      medicineQuantity: '1',
      totalStockPrice: (parseFloat(prev.totalStockPrice || '0') + (price * quantity)).toFixed(2),
      totalStockQuantity: (parseInt(prev.totalStockQuantity || '0') + quantity).toString()
    }));
  };
  
  const handleRemoveMedicine = (index: number) => {
    const newMedicines = [...medicines];
    const removedItem = newMedicines[index];
    const removedPrice = parseFloat(removedItem.price) * removedItem.quantity || 0;
    newMedicines.splice(index, 1);
    setMedicines(newMedicines);
    
    // Update totals
    setFormData(prev => ({
      ...prev,
      totalStockPrice: (parseFloat(prev.totalStockPrice || '0') - removedPrice).toFixed(2),
      totalStockQuantity: Math.max(0, parseInt(prev.totalStockQuantity || '0') - removedItem.quantity).toString()
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.companyName || !formData.supplierName || medicines.length === 0) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Process the return
    const updatedInventory = [...inventory];
    const totalItems = medicines.reduce((sum, med) => sum + 1, 0);
    
    // Calculate total price and quantity
    const totalPrice = medicines
      .reduce((sum, med) => sum + (parseFloat(med.price) * med.quantity || 0), 0)
      .toFixed(2);
    
    // Create a single entry with all medicines
    const medicinesList = medicines
      .map(med => `${med.quantity}x ${med.name} (${(parseFloat(med.price) * med.quantity).toFixed(2)})`)
      .join(', ');
    
    try {
      // Call onSave with a single entry containing all medicines
      onSave({
        companyName: formData.companyName,
        supplierName: formData.supplierName,
        medicineName: medicinesList, // Combine all medicine names and prices
        totalStockPrice: totalPrice,
        totalStockQuantity: totalItems.toString()
      });
      
      // Reset form
      setFormData({
        companyName: formData.companyName,
        supplierName: formData.supplierName,
        medicineName: '',
        medicinePrice: '',
        medicineQuantity: '1',
        totalStockPrice: '0',
        totalStockQuantity: '1',
      });
      setMedicines([]);
      
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Error processing return');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2 text-green-600" />
            Supplier Return Form
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700 flex items-center">
              <Info className="h-4 w-4 mr-2 flex-shrink-0" />
              Note: Medicines returned to supplier will be automatically removed from inventory.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center">
              <Building className="h-4 w-4 mr-1" />
              Company Name
            </Label>
            <Input
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
              placeholder={'Enter company name'}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="supplierName" className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              Supplier Name
            </Label>
            <Input
              id="supplierName"
              name="supplierName"
              value={formData.supplierName}
              onChange={handleChange}
              required
              placeholder={'Enter supplier name'}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="block mb-2">
              Medicine Details
            </Label>
            
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div className="col-span-5">
                <Input
                  id="medicineName"
                  name="medicineName"
                  value={formData.medicineName}
                  onChange={handleChange}
                  placeholder={'Enter medicine name'}
                  className="w-full"
                />
              </div>
              <div className="col-span-2">
                <Input
                  id="medicinePrice"
                  name="medicinePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.medicinePrice}
                  onChange={handleChange}
                  placeholder={'Price'}
                  className="w-full"
                />
              </div>
              <div className="col-span-2">
                <Input
                  id="medicineQuantity"
                  name="medicineQuantity"
                  type="number"
                  min="1"
                  value={formData.medicineQuantity}
                  onChange={handleChange}
                  placeholder={'Qty'}
                  className="w-full"
                />
              </div>
              <div className="col-span-2">
                <Button 
                  type="button" 
                  onClick={handleAddMedicine}
                  className="bg-blue-600 hover:bg-blue-700 h-10 w-full flex items-center justify-center"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {medicines.length > 0 && (
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                {medicines.map((medicine, index) => (
                  <div key={index} className="flex justify-between items-center py-1 px-2 hover:bg-gray-50 rounded">
                    <span className="text-sm">
                      {medicine.quantity}x {medicine.name} - {(parseFloat(medicine.price) * medicine.quantity).toFixed(2)}
                    </span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveMedicine(index)}
                      className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="pt-2 border-t mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Total Amount:
                </span>
                <span className="font-semibold">
                  {parseFloat(formData.totalStockPrice || '0').toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
