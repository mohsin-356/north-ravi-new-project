import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { customerService } from '@/Pharmacy services/customerService';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/Pharmacy components/ui/data-table';
import { Customer } from '@/types/customer';

type CustomerListProps = {
  onSelectCustomer: (mrNumber: string) => void;
};

const CustomerList: React.FC<CustomerListProps> = ({ onSelectCustomer }) => {
  const [customers, setCustomers] = React.useState<Customer[]>(customerService.getCustomers());
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');

  const columns = [
    {
      accessorKey: 'mrNumber',
      header: 'MR Number',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
    },
    {
      accessorKey: 'totalCredit',
      header: 'Total Credit',
      cell: ({ row }) => `Rs. ${row.original.totalCredit.toFixed(2)}`,
    },
    {
      accessorKey: 'creditRemaining',
      header: 'Credit Remaining',
      cell: ({ row }) => (
        <span className={row.original.creditRemaining < 0 ? 'text-red-500' : ''}>
          Rs. {row.original.creditRemaining.toFixed(2)}
        </span>
      )
    },
    {
      accessorKey: 'lastVisit',
      header: 'Last Visit',
      cell: ({ row }) => {
        const visits = customerService.getVisitHistory(row.original.mrNumber);
        const lastVisit = visits.length > 0 ? new Date(visits[visits.length - 1].date).toLocaleDateString() : '-';
        return <span className="text-gray-500 text-xs">{lastVisit}</span>;
      },
    },
    {
      accessorKey: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onSelectCustomer(row.original.mrNumber)}
          >
            View
          </Button>
          <button
            className="bg-green-100 hover:bg-green-200 text-green-700 rounded px-2 py-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              customerService.logVisit(row.original.mrNumber);
              toast({ title: 'Visit logged', description: `Visit for ${row.original.name} (${row.original.mrNumber}) logged.` });
            }}
            title="Log Visit"
          >
            Log Visit
          </button>
        </div>
      ),
    },
  ];

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mrNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        emptyMessage="No customers found"
      />
    </div>
  );
};

export default CustomerList;
