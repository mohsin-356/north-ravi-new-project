import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type Supplier = {
  id: string;
  name: string;
  contact: string;
  address: string;
};

export function SupplierList() {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);

  // TODO: Fetch suppliers from API/service
  React.useEffect(() => {
    setSuppliers([
      { id: '1', name: 'Pharma Distributors', contact: '03001234567', address: 'Lahore' },
      { id: '2', name: 'MediCare Suppliers', contact: '03111234567', address: 'Karachi' },
    ]);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Suppliers</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Contact</th>
              <th className="px-4 py-2 text-left">Address</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(supplier => (
              <tr key={supplier.id} className="border-t">
                <td className="px-4 py-2">{supplier.name}</td>
                <td className="px-4 py-2">{supplier.contact}</td>
                <td className="px-4 py-2">{supplier.address}</td>
                <td className="px-4 py-2 text-right">
                  <Button variant="ghost" size="sm" className="mr-2">Edit</Button>
                  <Button variant="ghost" size="sm" className="text-red-600">Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
