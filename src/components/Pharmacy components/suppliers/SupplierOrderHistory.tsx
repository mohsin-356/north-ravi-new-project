import React from 'react';
import { SupplierOrder } from '@/types/supplier';
import { supplierService } from '@/services/supplierService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type SupplierOrderHistoryProps = {
  supplierId: string;
  onViewOrder?: (orderId: string) => void;
};

export function SupplierOrderHistory({ supplierId, onViewOrder }: SupplierOrderHistoryProps) {
  const [orders, setOrders] = React.useState<SupplierOrder[]>([]);

  React.useEffect(() => {
    const loadedOrders = supplierService.getOrdersBySupplier(supplierId);
    setOrders(loadedOrders);
  }, [supplierId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'delivered':
        return <Badge variant="default">Delivered</Badge>;
      case 'partially_delivered':
        return <Badge variant="default">Partially Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Order History</h3>
        <Button variant="outline">Export</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Medicine</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Unit Price</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Delivery Date</TableHead>
            <TableHead>Status</TableHead>
            {onViewOrder && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.invoiceNumber || '-'}</TableCell>
              <TableCell>{format(new Date(order.createdAt), 'MMM dd, yyyy')}</TableCell>
              <TableCell>{order.medicineName}</TableCell>
              <TableCell>{order.batchNumber}</TableCell>
              <TableCell>{order.quantity}</TableCell>
              <TableCell>{order.unitPrice.toLocaleString()}</TableCell>
              <TableCell>{order.totalCost.toLocaleString()}</TableCell>
              <TableCell>
                {order.expectedDelivery && format(new Date(order.expectedDelivery), 'MMM dd, yyyy')}
                {order.actualDelivery && (
                  <div className="text-xs text-muted-foreground">
                    Actual: {format(new Date(order.actualDelivery), 'MMM dd, yyyy')}
                  </div>
                )}
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              {onViewOrder && (
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewOrder(order.id)}
                  >
                    View
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
