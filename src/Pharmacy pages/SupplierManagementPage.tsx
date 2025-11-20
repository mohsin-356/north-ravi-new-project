import React from 'react';
import { SupplierList } from '@/components/Pharmacy components/suppliers/SupplierList';

export function SupplierManagementPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Supplier Management</h1>
      <SupplierList />
    </div>
  );
}
