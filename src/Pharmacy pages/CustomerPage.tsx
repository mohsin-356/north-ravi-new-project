import React from 'react';
import CustomerList from '@/components/Pharmacy components/customers/CustomerList';
import { CustomerDetails } from '@/components/Pharmacy components/customers/CustomerDetails';

export function CustomerPage() {
  const [selectedCustomer, setSelectedCustomer] = React.useState<string | null>(null);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Customer Management</h1>
      
      {selectedCustomer ? (
        <CustomerDetails 
          mrNumber={selectedCustomer} 
          onBack={() => setSelectedCustomer(null)} 
        />
      ) : (
        <CustomerList onSelectCustomer={setSelectedCustomer} />
      )}
    </div>
  );
}
