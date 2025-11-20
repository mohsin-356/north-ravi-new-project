import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// removed inline Calendar; using compact HTML date inputs
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import BillingSlip from '@/components/Pharmacy components/BillingSlip';
import { useSettings } from '@/Pharmacy contexts/PharmacySettingsContext';
import { printHtmlOverlay } from '@/utils/printOverlay';

interface SaleDocItem {
  medicineId?: { name?: string } | string;
  medicineName?: string;
  quantity: number;
  price: number;
}
interface SaleDoc {
  _id: string;
  billNo?: string;
  items: SaleDocItem[];
  totalAmount: number;
  paymentMethod?: string;
  customerName?: string;
  customerId?: string;
  date: string | Date;
}

const pageSizes = [10, 20, 50];

const SalesHistory: React.FC = () => {
  const { settings } = useSettings();
  const [allSales, setAllSales] = React.useState<SaleDoc[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [medicineQuery, setMedicineQuery] = React.useState('');
  const [billQuery, setBillQuery] = React.useState('');
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [payment, setPayment] = React.useState<string>('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  // Reprint modal
  const [printSale, setPrintSale] = React.useState<SaleDoc | null>(null);
  const printRef = React.useRef<HTMLDivElement>(null);

  const loadSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (billQuery) params.set('billNo', billQuery);
      if (medicineQuery) params.set('medicine', medicineQuery);
      if (fromDate) params.set('from', new Date(fromDate + 'T00:00:00').toISOString());
      if (toDate) params.set('to', new Date(toDate + 'T00:00:00').toISOString());
      if (payment) params.set('payment', payment);
      params.set('limit', String(pageSize));
      params.set('page', String(page));
      const url = `/api/sales${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load sales');
      const data: SaleDoc[] = await res.json();
      setAllSales(data || []);
    } catch (e) {
      console.error(e);
      setAllSales([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSales();
  }, []);

  // Server returns the page slice, so we render allSales directly
  const totalPages = Math.max(1, Math.ceil(allSales.length / pageSize));
  const paged = allSales;

  React.useEffect(() => {
    // Reset to first page on filter change
    setPage(1);
  }, [medicineQuery, billQuery, fromDate, toDate, pageSize]);

  // Auto reload when page or pageSize changes
  React.useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const openReprint = async (billNo?: string) => {
    try {
      if (!billNo) return;
      const res = await fetch(`/api/sales/by-bill/${encodeURIComponent(billNo)}`);
      if (!res.ok) throw new Error('Sale not found');
      const sale: SaleDoc = await res.json();
      setPrintSale(sale);
    } catch (e) {
      console.error('Failed to load bill for reprint', e);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-sm text-gray-600">Medicine name</label>
              <Input placeholder="e.g., Paracetamol" value={medicineQuery} onChange={(e) => setMedicineQuery(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Bill/Invoice #</label>
              <Input placeholder="B-YYYYMM-###" value={billQuery} onChange={(e) => setBillQuery(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Payment</label>
              <select className="border rounded-md p-2 text-sm w-full" value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="">Any</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={loadSales} disabled={loading} className="whitespace-nowrap">
                {loading ? 'Loading...' : 'Search'}
              </Button>
              <select
                className="border rounded-md p-2 text-sm"
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
              >
                {pageSizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-4">Date/Time</th>
                  <th className="py-2 pr-4">Bill No</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Medicines</th>
                  <th className="py-2 pr-4">Qty (each)</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Payment</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => {
                  const dt = new Date(s.date);
                  const meds = s.items.map(it => it.medicineName || (typeof it.medicineId === 'object' ? it.medicineId?.name : '') || 'Unknown').join(', ');
                  const qtyEach = s.items.map(it => it.quantity).join(', ');
                  const totalQty = s.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
                  return (
                    <tr key={s._id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 whitespace-nowrap">{dt.toLocaleDateString()} {dt.toLocaleTimeString()}</td>
                      <td className="py-2 pr-4">{s.billNo || '-'}</td>
                      <td className="py-2 pr-4">{s.customerName || 'Walk-in'}</td>
                      <td className="py-2 pr-4">{meds}</td>
                      <td className="py-2 pr-4">{qtyEach}</td>
                      <td className="py-2 pr-4">{totalQty}</td>
                      <td className="py-2 pr-4">Rs {Number(s.totalAmount || 0).toFixed(2)}</td>
                      <td className="py-2 pr-4 capitalize">{s.paymentMethod || 'cash'}</td>
                      <td className="py-2">
                        <Button variant="outline" size="sm" onClick={() => openReprint(s.billNo)}>
                          Reprint
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {paged.length === 0 && (
                  <tr>
                    <td className="py-8 text-center text-gray-500" colSpan={9}>No results</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>Page {page} of {totalPages}</div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e: any) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e: any) => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      {/* Reprint overlay dialog */}
      {printSale && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0 as any, background: 'rgba(15,23,42,0.35)',
            zIndex: 2147483647, display: 'grid', placeItems: 'center'
          }}
        >
          <div style={{
            width: 520, maxWidth: '96vw', height: 740, maxHeight: '92vh',
            background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10,
            boxShadow: '0 20px 50px rgba(2,6,23,0.35)', display: 'grid', gridTemplateRows: 'auto 1fr'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Receipt Preview</div>
              <div>
                <button onClick={() => { try { const html = `<!doctype html><html><head><meta charset=\"utf-8\"/></head><body>${printRef.current?.innerHTML || ''}</body></html>`; const t = `Receipt ${printSale?.billNo || ''}`; setPrintSale(null); setTimeout(()=>{ printHtmlOverlay(html, { title: t, width: 520, height: 740, autoPrint: true }); }, 10); } catch {} }} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Print (Ctrl+P)</button>
                <button onClick={() => setPrintSale(null)} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer', marginLeft: 8 }}>Close (Ctrl+D)</button>
              </div>
            </div>
            <div style={{ overflow: 'auto', padding: 12 }}>
              <div ref={printRef}>
                <BillingSlip
                  sale={{
                    items: (printSale.items || []).map(it => ({
                      name: it.medicineName || (typeof it.medicineId === 'object' ? it.medicineId?.name : '') || 'Item',
                      quantity: it.quantity,
                      price: it.price,
                    })),
                    billNo: printSale.billNo || '',
                    customerName: printSale.customerName || 'Walk-in',
                    paymentMethod: printSale.paymentMethod || 'cash',
                    subtotal: Number(printSale.totalAmount || 0),
                    discount: 0,
                    taxDetails: [],
                    total: Number(printSale.totalAmount || 0),
                    cashTendered: Number(printSale.totalAmount || 0),
                  }}
                  settings={settings}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
