import React from 'react';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Label } from '@/components/Pharmacy components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Pharmacy components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/Pharmacy components/ui/popover';
import { Calendar } from '@/components/Pharmacy components/ui/calendar';
import { format } from 'date-fns';
import { Medicine } from '@/types/medicine';
import { supplierService } from '@/Pharmacy services/supplierService';
import { toast } from '@/components/Pharmacy components/ui/use-toast';

type SupplierOrderFormProps = {
  supplierId: string;
  medicines: Medicine[];
  onSubmit: (order: {
    medicineId: string;
    quantity: number;
    expectedDelivery: Date;
    cost: number;
  }) => void;
};

export function SupplierOrderForm({ supplierId, medicines, onSubmit }: SupplierOrderFormProps) {
  const [selectedMedicine, setSelectedMedicine] = React.useState<string>('');
  const [quantity, setQuantity] = React.useState<string>('1');
  const [cost, setCost] = React.useState<string>('');
  const [expectedDelivery, setExpectedDelivery] = React.useState<Date | undefined>(new Date());
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMedicine) {
      toast({
        title: 'Error',
        description: 'Please select a medicine',
        variant: 'destructive'
      });
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid quantity',
        variant: 'destructive'
      });
      return;
    }

    if (!cost || parseFloat(cost) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid cost',
        variant: 'destructive'
      });
      return;
    }

    if (!expectedDelivery) {
      toast({
        title: 'Error',
        description: 'Please select an expected delivery date',
        variant: 'destructive'
      });
      return;
    }

    try {
      const med = medicines.find(m => m.id === selectedMedicine);
      await supplierService.createOrder({
        supplierId,
        medicineId: selectedMedicine,
        medicineName: med?.name || '',
        batchNumber: '',
        quantity: parseInt(quantity),
        unitPrice: parseFloat(cost),
        expectedDelivery: expectedDelivery as Date,
        notes: undefined
      });

      toast({
        title: 'Success',
        description: 'Order placed successfully',
      });

      // Reset form
      setSelectedMedicine('');
      setQuantity('1');
      setCost('');
      setExpectedDelivery(new Date());

      if (onSubmit) {
        onSubmit({
          medicineId: selectedMedicine,
          quantity: parseInt(quantity),
          expectedDelivery,
          cost: parseFloat(cost)
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to place order',
        variant: 'destructive'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <div>
        <Label htmlFor="medicine">Medicine</Label>
        <Select value={selectedMedicine} onValueChange={setSelectedMedicine}>
          <SelectTrigger>
            <SelectValue placeholder="Select medicine" />
          </SelectTrigger>
          <SelectContent>
            {medicines.map(medicine => (
              <SelectItem key={medicine.id} value={medicine.id}>
                {medicine.name} ({medicine.category})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="cost">Unit Cost (Rs.)</Label>
          <Input
            id="cost"
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Expected Delivery</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              {expectedDelivery ? format(expectedDelivery, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={expectedDelivery}
              onSelect={setExpectedDelivery}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button type="submit" className="w-full">
        Place Order
      </Button>
    </form>
  );
}
