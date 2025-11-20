import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { MedicineSupplierTransaction, MedicineCustomerTransaction } from '@/types/medicine';

type MedicineTraceabilityProps = {
  supplierTransactions: MedicineSupplierTransaction[];
  customerTransactions: MedicineCustomerTransaction[];
};

const supplierColumns = [
  {
    accessorKey: 'supplierName',
    header: 'Supplier',
  },
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice #',
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }: any) => new Date(row.original.date).toLocaleDateString(),
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

const customerColumns = [
  {
    accessorKey: 'customerName',
    header: 'Customer',
  },
  {
    accessorKey: 'receiptNumber',
    header: 'Receipt #',
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }: any) => new Date(row.original.date).toLocaleDateString(),
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
  },
  {
    accessorKey: 'salePrice',
    header: 'Price',
    cell: ({ row }: any) => `Rs. ${row.original.salePrice.toFixed(2)}`,
  },
];

export const MedicineTraceability: React.FC<MedicineTraceabilityProps> = ({
  supplierTransactions,
  customerTransactions,
}) => {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="source">
        <TabsList>
          <TabsTrigger value="source">Source Tracking</TabsTrigger>
          <TabsTrigger value="distribution">Distribution Tracking</TabsTrigger>
        </TabsList>
        
        <TabsContent value="source">
          <DataTable 
            columns={supplierColumns} 
            data={supplierTransactions} 
            emptyMessage="No supplier transactions found"
          />
        </TabsContent>
        
        <TabsContent value="distribution">
          <DataTable 
            columns={customerColumns} 
            data={customerTransactions} 
            emptyMessage="No customer transactions found"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
