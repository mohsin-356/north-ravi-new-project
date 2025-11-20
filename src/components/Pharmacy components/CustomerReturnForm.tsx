import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Package, DollarSign } from 'lucide-react';

interface CustomerReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  isUrdu: boolean;
  onSave: (data: { customerName: string; companyName: string; medicineName: string; price: string }) => void;
}

const CustomerReturnForm: React.FC<CustomerReturnFormProps> = ({
  isOpen,
  onClose,
  isUrdu,
  onSave
}) => {
  const [formData, setFormData] = useState({
    customerName: '',
    companyName: '',
    medicineName: '',
    price: '',
    quantity: '1'
  });
  
  const [medicines, setMedicines] = useState<Array<{name: string, price: string, quantity: number}>>([]);

  const text = {
    en: {
      title: 'Customer Return',
      customerName: 'Customer Name',
      companyName: 'Company Name',
      medicineName: 'Medicine Name',
      price: 'Price',
      save: 'Save',
      cancel: 'Cancel'
    },
    ur: {
      title: 'گاہک کی واپسی',
      customerName: 'گاہک کا نام',
      companyName: 'کمپنی کا نام',
      medicineName: 'دوا کا نام',
      price: 'قیمت',
      save: 'محفوظ کریں',
      cancel: 'منسوخ کریں'
    }
  };

  const t = text.en;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddMedicine = () => {
    if (!formData.medicineName || !formData.price) {
      alert('Please enter medicine name and price');
      return;
    }
    
    const quantity = parseInt(formData.quantity) || 1;
    
    setMedicines([...medicines, {
      name: formData.medicineName,
      price: formData.price,
      quantity: quantity
    }]);
    
    // Reset medicine inputs
    setFormData(prev => ({
      ...prev,
      medicineName: '',
      price: '',
      quantity: '1'
    }));
  };
  
  const handleRemoveMedicine = (index: number) => {
    const newMedicines = [...medicines];
    newMedicines.splice(index, 1);
    setMedicines(newMedicines);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (medicines.length === 0) {
      alert('Please add at least one medicine');
      return;
    }
    
    // Create a single entry with all medicines
    const medicinesList = medicines.map(med => 
      `${med.quantity}x ${med.name} (${(parseFloat(med.price) * med.quantity).toFixed(2)})`
    ).join(', ');
    
    const totalPrice = medicines.reduce((sum, med) => 
      sum + (parseFloat(med.price || '0') * med.quantity), 0
    ).toFixed(2);
    
    onSave({
      customerName: formData.customerName,
      companyName: formData.companyName,
      medicineName: medicinesList,
      price: totalPrice
    });
    
    // Reset form
    setFormData({
      customerName: formData.customerName,
      companyName: formData.companyName,
      medicineName: '',
      price: '',
      quantity: '1'
    });
    setMedicines([]);
    onClose();
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{t.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">{t.customerName}</Label>
            <Input
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              placeholder={t.customerName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">{t.companyName}</Label>
            <Input
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              placeholder={t.companyName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="block mb-2">Medicine Details</Label>
            
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-5">
                <Input
                  id="medicineName"
                  name="medicineName"
                  value={formData.medicineName}
                  onChange={handleInputChange}
                  placeholder={'Medicine name'}
                  className="w-full"
                />
              </div>
              <div className="col-span-2">
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder={'Price'}
                  className="w-full"
                />
              </div>
              <div className="col-span-2">
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
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
                <span className="text-sm font-medium">Total Amount:</span>
                <span className="font-semibold">
                  {medicines.reduce((sum, med) => sum + parseFloat(med.price || '0'), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit">
              {t.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerReturnForm;
