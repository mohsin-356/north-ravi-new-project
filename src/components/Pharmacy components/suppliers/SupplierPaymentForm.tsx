import React from 'react';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Label } from '@/components/Pharmacy components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Pharmacy components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/Pharmacy components/ui/popover';
import { Calendar } from '@/components/Pharmacy components/ui/calendar';
import { format } from 'date-fns';
import { toast } from '@/components/Pharmacy components/ui/use-toast';
import { supplierService } from '@/Pharmacy services/supplierService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Pharmacy components/ui/card';

type SupplierPaymentFormProps = {
  supplierId: string;
  onPaymentComplete?: () => void;
};

export function SupplierPaymentForm({ supplierId, onPaymentComplete }: SupplierPaymentFormProps) {
  const [amount, setAmount] = React.useState<string>('');
  const [date, setDate] = React.useState<Date>(new Date());
  const [method, setMethod] = React.useState<'cash' | 'bank_transfer' | 'cheque' | 'credit' | 'other'>('bank_transfer');
  const [reference, setReference] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid payment amount',
        variant: 'destructive'
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await supplierService.recordPayment({
        supplierId,
        amount: parseFloat(amount),
        date,
        method,
        reference: reference || undefined,
        status: 'completed'
      });

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });

      // Reset form
      setAmount('');
      setReference('');
      setDate(new Date());
      
      if (onPaymentComplete) {
        onPaymentComplete();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter payment amount"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {format(date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional reference number"
              />
            </div>
          </div>
          
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Processing...' : 'Record Payment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
