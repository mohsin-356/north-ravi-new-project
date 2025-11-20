import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { customerService } from '@/services/customerService'; // Assuming customerService is imported from this location

type CreditAdjustmentDialogProps = {
  mrNumber: string;
  onAdjustmentComplete: () => void;
  children: React.ReactNode;
};

export function CreditAdjustmentDialog({ mrNumber, onAdjustmentComplete, children }: CreditAdjustmentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [type, setType] = React.useState<'increase' | 'decrease'>('increase');
  const [description, setDescription] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      const adjustmentAmount = type === 'increase' ? numericAmount : -numericAmount;
      
      // Update customer credit
      customerService.updateCredit(mrNumber, adjustmentAmount);
      
      // Add to history
      customerService.addHistoryEntry({
        customerMr: mrNumber,
        type: 'payment',
        amount: numericAmount,
        description: description || `Credit ${type === 'increase' ? 'increase' : 'decrease'}`
      });
      
      setOpen(false);
      onAdjustmentComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Credit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Adjustment Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as 'increase' | 'decrease')}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Increase Credit</SelectItem>
                <SelectItem value="decrease">Decrease Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Apply Adjustment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
