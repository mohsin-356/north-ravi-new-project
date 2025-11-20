import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Pharmacy components/ui/card';
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from '@/components/Pharmacy components/ui/table';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Button } from '@/components/Pharmacy components/ui/button';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/Pharmacy components/ui/dialog';
import api from '@/Pharmacy services/api';

interface CreditedCustomer {
  customerId: string;
  name: string;
  company: string;
  totalCreditSale: number;
  salesCount: number;
  lastSaleDate: string;
}

interface Sale {
  _id: string;
  invoiceNo: string;
  date: string;
  totalAmount: number;
  paidAmount?: number;
}

interface Props { tableId?: string }

// Printable sales table component – forwards ref directly to the wrapper div so
// react-to-print always receives a DOM node.
const SalesPrintable = React.forwardRef<HTMLDivElement, { sales: Sale[] }>(
  ({ sales }, ref) => (
    <div ref={ref} className="print:bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((s) => (
            <TableRow key={s._id}>
              <TableCell>{new Date(s.date).toLocaleDateString()}</TableCell>
              <TableCell>{s.invoiceNo || s._id.slice(-6)}</TableCell>
              <TableCell className="text-right">{s.totalAmount.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
);
SalesPrintable.displayName = 'SalesPrintable';

const CreditedCustomersSection: React.FC<Props> = ({ tableId }) => {
  // Ref for main customers list
  const customersTableRef = React.useRef<HTMLTableElement>(null);
  // Ref for printable sales area in dialog
  // not needed anymore for window.print, keep for future but unused
  const salesPrintRef = React.useRef<HTMLDivElement>(null);
  const PRINT_AREA_ID = 'sales-print-area';

  // Simplified comment
  // @ts-ignore – ignore outdated @types/react-to-print option mismatch
  const handlePrint = useReactToPrint({ content: () => customersTableRef.current });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – older @types/react-to-print lacks some options
  const printSales = () => window.print();

  // State
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CreditedCustomer[]>([]);
  // Search
  const [searchName, setSearchName] = useState('');
  const [searchCompany, setSearchCompany] = useState('');
  const [selected, setSelected] = useState<CreditedCustomer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/credit/customers', {
        params: {
          search: searchName,
          company: searchCompany,
        },
      });
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch credited customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchName, searchCompany]);

  // Listen for global credit settlement events to auto-refresh
  useEffect(() => {
    const onSettled = () => {
      fetchCustomers();
      if (selected) {
        // refresh selected customer's sales as well
        openCustomer(selected);
      }
    };
    window.addEventListener('credit-settled', onSettled as EventListener);
    return () => window.removeEventListener('credit-settled', onSettled as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const openCustomer = async (c: CreditedCustomer) => {
    setSelected(c);
    try {
      setSalesLoading(true);
      const res = await api.get(`/credit/customer/${c.customerId}/sales`);
      setSales(res.data || []);
    } catch (err) {
      console.error('Failed to fetch sales for customer', err);
    } finally {
      setSalesLoading(false);
    }
  };

  return (
    <Card id={tableId}>
      <CardHeader>
        <CardTitle>Credited Customers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-52"
          />
          <Input
            placeholder="Search company..."
            value={searchCompany}
            onChange={(e) => setSearchCompany(e.target.value)}
            className="w-52"
          />
          <Button variant="secondary" onClick={fetchCustomers} disabled={loading}>
            Refresh
          </Button>
        </div>

        <Table ref={customersTableRef}>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Credit Sale</TableHead>
              <TableHead className="text-right">Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  No customers
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.customerId} className="cursor-pointer hover:bg-muted" onClick={() => openCustomer(c)}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.company}</TableCell>
                  <TableCell className="text-right">{c.totalCreditSale.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{c.salesCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Sales Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-4xl print:block">
          {/* Header hidden in print */}
          <DialogHeader className="print:hidden">
            <DialogTitle>
              {selected?.name} - Sales ({sales.length})
            </DialogTitle>
          </DialogHeader>

          {/* Printable area */}
          <div className="no-print relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell>{new Date(s.date).toLocaleDateString()}</TableCell>
                      <TableCell>{s.invoiceNo || s._id.slice(-6)}</TableCell>
                      <TableCell className="text-right">{s.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(s.paidAmount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">{Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0)).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

          {/* Print button hidden when printing */}
          <div className="flex justify-end mt-4 print:hidden">
            <Button onClick={printSales}>Print</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden printable copy always mounted for print */}
      {sales.length > 0 && (
        <div className="sales-print hidden print:block">
          <SalesPrintable sales={sales} />
        </div>
      )}

      

    </Card>
  );
};

export default CreditedCustomersSection;
