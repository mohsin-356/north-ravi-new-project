import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';

interface PurchaseDoc {
  _id: string;
  purchaseDate?: string | Date;
  medicineName?: string;
  supplierName?: string;
  packQuantity?: number;
  quantity?: number; // packs
  totalItems?: number; // units
  buyPricePerPack?: number;
  buyPricePerUnit?: number;
  totalPurchaseAmount?: number;
  salePricePerPack?: number;
  salePricePerUnit?: number;
  invoiceNumber?: string;
  expiryDate?: string | Date;
}

const pageSizes = [10, 20, 50];

const PurchaseHistory: React.FC = () => {
  const [data, setData] = React.useState<PurchaseDoc[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('startDate', new Date(fromDate + 'T00:00:00').toISOString());
      if (toDate) params.set('endDate', new Date(toDate + 'T00:00:00').toISOString());
      // purchases.js doesn't have a text q filter; we'll fetch and filter client-side by q
      const res = await fetch(`/api/purchases?status=approved&${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load purchases');
      const json: PurchaseDoc[] = await res.json();
      setData(json || []);
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchData(); }, []);
  React.useEffect(() => { setPage(1); }, [fromDate, toDate, q, pageSize]);

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (data || []).filter((p) => {
      if (!qq) return true;
      const hay = [p.medicineName, p.supplierName, p.invoiceNumber].join(' ').toLowerCase();
      return hay.includes(qq);
    });
  }, [data, q]);

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Delete this purchase record? This cannot be undone.');
    if (!ok) return;
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      // optimistic update
      setData(prev => prev.filter(p => p._id !== id));
    } catch (e) {
      console.error(e);
      alert('Failed to delete purchase');
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const downloadCsv = () => {
    const headers = ['Date','Medicine','Supplier','Units/Pack','Total Items','Buy/Pack','Buy/Unit','Total Amount','Sale/Pack','Sale/Unit','Invoice #','Expiry'];
    const rows = filtered.map(p => [
      p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : '',
      p.medicineName || '',
      p.supplierName || '',
      String(p.packQuantity ?? ''),
      String(p.totalItems ?? ''),
      (p.buyPricePerPack ?? 0).toLocaleString(),
      (p.buyPricePerUnit ?? 0).toFixed(3),
      (p.totalPurchaseAmount ?? 0).toLocaleString(),
      (p.salePricePerPack ?? 0).toLocaleString(),
      (p.salePricePerUnit ?? 0).toFixed(3),
      p.invoiceNumber || '',
      p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(val => '"' + String(val).replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `purchase-history.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className="text-sm text-gray-600">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">Search</label>
              <Input placeholder="medicine, supplier, invoice" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={fetchData} disabled={loading}>{loading ? 'Loading...' : 'Apply'}</Button>
              <Button variant="outline" onClick={downloadCsv}>Download</Button>
              <select className="border rounded-md p-2 text-sm" value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value))}>
                {pageSizes.map(s => (<option key={s} value={s}>{s}</option>))}
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
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Medicine</th>
                  <th className="py-2 pr-4">Supplier</th>
                  <th className="py-2 pr-4">Units/Pack</th>
                  <th className="py-2 pr-4">Total Items</th>
                  <th className="py-2 pr-4">Buy/Pack</th>
                  <th className="py-2 pr-4">Buy/Unit</th>
                  <th className="py-2 pr-4">Total Amount</th>
                  <th className="py-2 pr-4">Sale/Pack</th>
                  <th className="py-2 pr-4">Sale/Unit</th>
                  <th className="py-2 pr-4">Invoice #</th>
                  <th className="py-2 pr-4">Expiry</th>
                  <th className="py-2 pr-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(p => (
                  <tr key={p._id} className="border-b">
                    <td className="py-2 pr-4">{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : ''}</td>
                    <td className="py-2 pr-4">{p.medicineName}</td>
                    <td className="py-2 pr-4">{p.supplierName}</td>
                    <td className="py-2 pr-4">{p.packQuantity}</td>
                    <td className="py-2 pr-4">{p.totalItems}</td>
                    <td className="py-2 pr-4">{(p.buyPricePerPack ?? 0).toLocaleString()}</td>
                    <td className="py-2 pr-4">{(p.buyPricePerUnit ?? 0).toFixed(3)}</td>
                    <td className="py-2 pr-4">{(p.totalPurchaseAmount ?? 0).toLocaleString()}</td>
                    <td className="py-2 pr-4">{(p.salePricePerPack ?? 0).toLocaleString()}</td>
                    <td className="py-2 pr-4">{(p.salePricePerUnit ?? 0).toFixed(3)}</td>
                    <td className="py-2 pr-4">{p.invoiceNumber}</td>
                    <td className="py-2 pr-4">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : ''}</td>
                    <td className="py-2 pr-0">
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(p._id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td className="py-8 text-center text-gray-500" colSpan={13}>No records</td></tr>
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
    </div>
  );
};

export default PurchaseHistory;
