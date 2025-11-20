import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { InvoiceTracking } from '@/types/medicine';

export const InvoiceTrackingComponent: React.FC<{
  onTrack: (invoiceNumber: string) => Promise<InvoiceTracking | null>;
}> = ({ onTrack }) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [trackingData, setTrackingData] = useState<InvoiceTracking | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTrack = async () => {
    if (!invoiceNumber) return;
    
    setIsLoading(true);
    try {
      const result = await onTrack(invoiceNumber);
      setTrackingData(result);
    } catch (error) {
      console.error('Failed to track invoice:', error);
      setTrackingData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: 'medicineName',
      header: 'Medicine',
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
    },
    {
      accessorKey: 'purchasePrice',
      header: 'Price',
      cell: ({ row }: any) => `Rs. ${row.original.purchasePrice.toFixed(2)}`,
    },
    {
      accessorKey: 'batchNumber',
      header: 'Batch #',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter invoice number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
        />
        <Button onClick={handleTrack} disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Track Invoice'}
        </Button>
      </div>

      {trackingData && (
        <div>
          <div className="mb-4">
            <h3 className="font-medium">Invoice #{trackingData.invoiceNumber}</h3>
            <p className="text-sm text-gray-600">
              Supplier: {trackingData.supplierName} • Date: {new Date(trackingData.date).toLocaleDateString()}
            </p>
          </div>
          
          <DataTable 
            columns={columns} 
            data={trackingData.medicines} 
            emptyMessage="No medicines found for this invoice"
          />
        </div>
      )}

      {!trackingData && !isLoading && invoiceNumber && (
        <p className="text-sm text-gray-600">No invoice found with that number</p>
      )}
    </div>
  );
};
