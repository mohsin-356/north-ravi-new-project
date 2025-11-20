import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  MapPin,
  Edit,
  Trash2,
  Eye,
  Download,
  Building,
  CreditCard
} from 'lucide-react';
import CustomerForm from './CustomerForm';
import { useToast } from '@/components/ui/use-toast';
import { customerApi } from '@/Pharmacy api/customerApi';
import { reportExporter } from '@/pharmacy utilites/reportExporter';

interface CustomerManagementProps {
  isUrdu: boolean;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ isUrdu }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [payingCustomer, setPayingCustomer] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [creditSales, setCreditSales] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [loadingSales, setLoadingSales] = useState<boolean>(false);
// Customers will be fetched from backend on mount
  const { toast } = useToast();

  const text = {
    en: {
      title: 'Customer Management',
      searchPlaceholder: 'Search customers...',
      addCustomer: 'Add Customer',
      exportReport: 'Export Report',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
      cnic: 'CNIC',
      notes: 'Notes',
      edit: 'Edit',
      delete: 'Delete',
      view: 'View',
      customerSince: 'Customer Since',
      loyaltyPoints: 'Loyalty Points',
      totalPurchases: 'Total Purchases',
      viewLoyalty: 'View Loyalty',
      mrNumber: 'MR Number',
      payBill: 'Pay Bill',
      amount: 'Amount',
      recordPayment: 'Record Payment',
      receipts: 'Receipts',
      billNo: 'Bill No',
      date: 'Date',
      total: 'Total',
      paid: 'Paid',
      remaining: 'Remaining',
      payThis: 'Pay this',
      notesPlaceholder: 'Add notes (optional)'
    },
    ur: {
      title: 'کسٹمر منیجمنٹ',
      searchPlaceholder: 'کسٹمر تلاش کریں...',
      addCustomer: 'کسٹمر شامل کریں',
      exportReport: 'رپورٹ ایکسپورٹ',
      name: 'نام',
      phone: 'فون',
      email: 'ای میل',
      address: 'پتہ',
      cnic: 'شناختی کارڈ',
      notes: 'نوٹس',
      edit: 'تبدیل کریں',
      delete: 'حذف کریں',
      view: 'دیکھیں',
      customerSince: 'کسٹمر بننے کی تاریخ',
      loyaltyPoints: 'لائلٹی پوائنٹس',
      totalPurchases: 'کل خریداریاں',
      viewLoyalty: 'لائلٹی دیکھیں',
      mrNumber: 'ایم آر نمبر',
      payBill: 'بل ادا کریں',
      amount: 'رقم',
      recordPayment: 'ادائیگی محفوظ کریں',
      receipts: 'رسیدیں',
      billNo: 'بل نمبر',
      date: 'تاریخ',
      total: 'کل',
      paid: 'ادا',
      remaining: 'بقیہ',
      payThis: 'ادائیگی',
      notesPlaceholder: 'نوٹس شامل کریں (اختیاری)'
    }
  };

  const t = text.en;

  // Load customers from offline storage on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await customerApi.getAll();
        setCustomers(data.map((c: any) => ({ ...c, id: c._id })));
      } catch (err) {
        console.error('Error fetching customers', err);
      }
    };

    // initial load
    fetchCustomers();

    // refresh on return/customer updates
    const handler = () => fetchCustomers();
    window.addEventListener('customerUpdated', handler);
    window.addEventListener('returnProcessed', handler);

    return () => {
      window.removeEventListener('customerUpdated', handler);
      window.removeEventListener('returnProcessed', handler);
    };
  }, []);

  // Save customers to offline storage whenever customers change
  
  // Ensure currency-like numbers show 2 decimal places in Pay Bill dialog
  const format2 = (n: number) => Number(n ?? 0).toFixed(2);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone || '').includes(searchTerm) ||
    ((customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => { setPage(1); }, [searchTerm, customers.length]);
  const total = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginatedCustomers = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  const handleSaveCustomer = async (customerData: any) => {
    try {
      if (editingCustomer) {
        await customerApi.update(editingCustomer._id || editingCustomer.id, customerData);
        toast({ title: 'Customer updated' });
      } else {
        await customerApi.create(customerData);
        toast({ title: 'Customer added' });
      }
      const data = await customerApi.getAll();
      setCustomers(data.map((c: any) => ({ ...c, id: c._id })));
      setEditingCustomer(null);
      setShowForm(false);
    } catch (err: any) {
      console.error('Error saving customer', err);
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to save customer', variant: 'destructive' });
      // Keep form open for correction
    }
  };

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await customerApi.remove(customerId);
      setCustomers(customers.filter(c => c.id !== customerId));
    } catch (err) {
      console.error('Error deleting customer', err);
    }
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(null);
    }
  };

  // Open payment modal for selected customer and fetch their credit sales
  const handleOpenPay = async (customer: any) => {
    setPayingCustomer(customer);
    setPayAmount('');
    setPaymentNotes('');
    setAllocations({});
    setCreditSales([]);
    setShowPayModal(true);
    try {
      setLoadingSales(true);
      const sales = await customerApi.getCreditSales(customer._id || customer.id);
      setCreditSales(sales);
      // Prefill allocations with 0
      const initial: Record<string, string> = {};
      sales.forEach((s: any) => { initial[s._id] = ''; });
      setAllocations(initial);
    } catch (e) {
      console.error('Failed to load credit sales', e);
      toast({ title: 'Error', description: 'Failed to load credit receipts', variant: 'destructive' });
    } finally {
      setLoadingSales(false);
    }
  };

  // Record allocated payments via API and close modal
  const handleRecordPayment = async () => {
    if (!payingCustomer) return;
    const entries = Object.entries(allocations)
      .map(([saleId, amt]) => ({ saleId, amount: Number(amt) }))
      .filter(x => x.amount && isFinite(x.amount) && x.amount > 0);

    if (entries.length === 0) {
      // allow quick single amount entry to distribute as general payment
      const amountNum = Number(payAmount);
      if (!amountNum || !isFinite(amountNum) || amountNum <= 0) {
        toast({ title: 'Error', description: 'Enter a valid amount', variant: 'destructive' });
        return;
      }
      // fallback to simple payment endpoint
      try {
        await customerApi.payCredit(payingCustomer._id || payingCustomer.id, { amount: amountNum, date: new Date().toISOString() });
        toast({ title: 'Payment recorded' });
        // notify other widgets to refresh
        window.dispatchEvent(new Event('credit-settled'));
      } catch (err: any) {
        console.error('Failed to record payment', err);
        toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to record payment', variant: 'destructive' });
        return;
      }
    } else {
      try {
        await customerApi.settleCredit(payingCustomer._id || payingCustomer.id, { allocations: entries, notes: paymentNotes });
        toast({ title: 'Payments settled' });
        // notify other widgets to refresh
        window.dispatchEvent(new Event('credit-settled'));
      } catch (err: any) {
        console.error('Failed to settle payments', err);
        toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to settle payments', variant: 'destructive' });
        return;
      }
    }

    // Refresh list to reflect updated totals/notes
    try {
      const data = await customerApi.getAll();
      setCustomers(data.map((c: any) => ({ ...c, id: c._id })));
    } catch {}
    setShowPayModal(false);
    setPayingCustomer(null);
    setPayAmount('');
    setPaymentNotes('');
    setCreditSales([]);
    setAllocations({});
  };

  const handleExportReport = () => {
    const exportData = reportExporter.exportCustomerReport(customers);
    reportExporter.exportToExcel(exportData);
  };

  const getLoyaltyTier = (points: number) => {
    if (points >= 2000) return { tier: 'Platinum', color: 'bg-purple-500' };
    if (points >= 1000) return { tier: 'Gold', color: 'bg-yellow-500' };
    if (points >= 500) return { tier: 'Silver', color: 'bg-gray-400' };
    return { tier: 'Bronze', color: 'bg-orange-600' };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-headline font-poppins text-gray-900">{t.title}</h1>
        <div className="flex space-x-2">
          <Button onClick={handleExportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t.exportReport}
          </Button>
          <Button onClick={() => setShowForm(true)} className="touch-target">
            <Plus className="h-4 w-4 mr-2" />
            {t.addCustomer}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 font-poppins"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedCustomers.map((customer) => {
          
          
          return (
            <Card key={customer.id} className="hover:shadow-md transition-all animate-slide-in">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg font-poppins">{customer.name}</h3>
                      <p className="text-sm text-gray-600">{customer.cnic}</p>
                      
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="font-poppins">{customer.phone}</span>
                  </div>
                  {/* Email removed from profile card */}
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="font-poppins">{customer.companyName || '-'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="truncate font-poppins">{customer.address}</span>
                  </div>
                  {/* Customer Since removed from profile card */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600 font-poppins">{t.mrNumber}:</span>
                    <span className="font-poppins">{customer.mrNumber}</span>
                  </div>
                </div>

                {/* Purchase Stats (Loyalty removed) */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 font-poppins">{t.totalPurchases}:</span>
                      <p className="font-semibold font-poppins">{format2(customer.totalPurchases)}</p>
                    </div>
                  </div>
                </div>

                {customer.notes && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                    <strong className="font-poppins">{t.notes}:</strong> 
                    <span className="font-poppins">{customer.notes}</span>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="text-xs text-gray-500 font-poppins">ID: {customer.id}</span>
                  <div className="flex space-x-1">
                    <Button size="sm" onClick={() => handleOpenPay(customer)} className="touch-target">
                      <CreditCard className="h-3 w-3 mr-1" />
                      Pay Bill
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedCustomer(customer)} className="touch-target">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)} className="touch-target">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteCustomer(customer.id)} className="touch-target">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-muted-foreground">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</div>
        <div className="flex items-center gap-2">
          <select className="border rounded px-2 py-1 text-sm" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
            <option value={6}>6</option>
            <option value={9}>9</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
          </select>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
            <span className="text-sm px-2">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </div>

      {selectedCustomer && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{selectedCustomer.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{t.mrNumber}:</span>
            <span>{selectedCustomer.mrNumber}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span>{selectedCustomer.phone}</span>
          </div>
        </div>
      )}

      {showForm && (
        <CustomerForm
          isUrdu={isUrdu}
          onClose={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
          onSave={handleSaveCustomer}
          customer={editingCustomer}
        />
      )}

      {showPayModal && payingCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg">
            <h3 className="text-lg font-semibold mb-4 font-poppins flex items-center">
              <CreditCard className="h-4 w-4 mr-2" /> Pay Bill
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2 font-poppins">{t.receipts}</div>
                <div className="max-h-72 overflow-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">{t.billNo}</th>
                        <th className="text-left p-2">{t.date}</th>
                        <th className="text-right p-2">{t.total}</th>
                        <th className="text-right p-2">{t.paid}</th>
                        <th className="text-right p-2">{t.remaining}</th>
                        <th className="text-right p-2">{t.payThis}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingSales ? (
                        <tr><td colSpan={6} className="p-3 text-center text-gray-500">Loading...</td></tr>
                      ) : creditSales.length === 0 ? (
                        <tr><td colSpan={6} className="p-3 text-center text-gray-500">No credit receipts</td></tr>
                      ) : (
                        creditSales.map((s) => {
                          const paid = s.paidAmount || 0;
                          const remaining = Math.max(0, (s.totalAmount || 0) - paid);
                          return (
                            <tr key={s._id} className="border-t">
                              <td className="p-2">{s.billNo || '-'}</td>
                              <td className="p-2">{s.date ? new Date(s.date).toLocaleDateString() : '-'}</td>
                              <td className="p-2 text-right">{format2(s.totalAmount)}</td>
                              <td className="p-2 text-right">{format2(paid)}</td>
                              <td className="p-2 text-right">{format2(remaining)}</td>
                              <td className="p-2 text-right">
                                <div className="flex gap-2 justify-end">
                                  <input
                                    type="number"
                                    placeholder={t.amount}
                                    className="w-28 border rounded px-2 py-1"
                                    value={allocations[s._id] ?? ''}
                                    onChange={(e) => setAllocations(prev => ({ ...prev, [s._id]: e.target.value }))}
                                    min={0}
                                    step="0.01"
                                  />
                                  <Button size="sm" variant="outline" onClick={() => setAllocations(prev => ({ ...prev, [s._id]: String(format2(remaining)) }))}>Full</Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">{t.notes}</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  placeholder={t.notesPlaceholder}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 font-poppins">{t.amount} (General payment)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder={'Enter amount'}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleRecordPayment} className="flex-1">{t.recordPayment}</Button>
                <Button variant="outline" onClick={() => { setShowPayModal(false); setPayingCustomer(null); }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
