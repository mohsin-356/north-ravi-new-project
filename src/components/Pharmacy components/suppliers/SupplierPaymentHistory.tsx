import React from 'react';
import { SupplierPayment } from '@/types/supplier';
import { supplierService } from '@/services/supplierService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type SupplierPaymentHistoryProps = {
  supplierId: string;
};

export function SupplierPaymentHistory({ supplierId }: SupplierPaymentHistoryProps) {
  const [payments, setPayments] = React.useState<SupplierPayment[]>([]);

  React.useEffect(() => {
    const loadedPayments = supplierService.getPaymentsBySupplier(supplierId);
    setPayments(loadedPayments);
  }, [supplierId]);

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <Badge variant="default">Cash</Badge>;
      case 'bank_transfer':
        return <Badge variant="secondary">Bank Transfer</Badge>;
      case 'cheque':
        return <Badge variant="outline">Cheque</Badge>;
      case 'credit':
        return <Badge variant="outline">Credit</Badge>;
      case 'other':
        return <Badge variant="outline">Other</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline">Refunded</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Payment History</h3>
        <Button variant="outline">Export</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{format(new Date(payment.date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>Rs. {payment.amount.toFixed(2)}</TableCell>
              <TableCell>{getMethodBadge(payment.method)}</TableCell>
              <TableCell>{getStatusBadge(payment.status || 'completed')}</TableCell>
              <TableCell>{payment.reference || '-'}</TableCell>
              <TableCell>{payment.notes || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
