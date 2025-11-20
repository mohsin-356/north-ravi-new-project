import React, { useState } from 'react';
import { Customer, CustomerHistory } from '@/types/customer';
import { customerService } from '@/services/customerService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { CreditAdjustmentDialog } from './CreditAdjustmentDialog';

type CustomerDetailsProps = {
  mrNumber: string;
  onBack: () => void;
};

export function CustomerDetails({ mrNumber, onBack }: CustomerDetailsProps) {
  const [customer, setCustomer] = useState(customerService.getCustomer(mrNumber));
  const history = customerService.getCustomerHistory(mrNumber);

  if (!customer) {
    return <div>Customer not found</div>;
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>
        Back to List
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">MR Number: {customer.mrNumber}</p>
              <p>Name: {customer.name}</p>
              <p>Phone: {customer.phone}</p>
              {customer.address && <p>Address: {customer.address}</p>}
            </div>
            <div>
              <p className="font-medium">Credit Information</p>
              <p>Total Credit: Rs. {customer.totalCredit.toFixed(2)}</p>
              <p className={customer.creditRemaining < 0 ? 'text-red-500' : ''}>
                Credit Remaining: Rs. {customer.creditRemaining.toFixed(2)}
              </p>
              <p>Member Since: {format(customer.createdAt, 'MMM d, yyyy')}</p>
              <div className="mt-4">
                <CreditAdjustmentDialog 
                  mrNumber={customer.mrNumber}
                  onAdjustmentComplete={() => {
                    // Refresh customer data after adjustment
                    const updatedCustomer = customerService.getCustomer(mrNumber);
                    if (updatedCustomer) {
                      setCustomer(updatedCustomer);
                    }
                  }}
                >
                  <Button variant="outline">Adjust Credit</Button>
                </CreditAdjustmentDialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(entry.date, 'MMM d, yyyy')}</TableCell>
                  <TableCell>{entry.type === 'medicine' ? 'Purchase' : 'Payment'}</TableCell>
                  <TableCell>
                    {entry.type === 'medicine' 
                      ? `${entry.medicineDetails?.name} (${entry.medicineDetails?.quantity}x)` 
                      : entry.description}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.type === 'payment' ? '+' : '-'}Rs. {entry.amount.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
