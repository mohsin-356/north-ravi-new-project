import React, { useEffect, useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent,
} from '@/components/Pharmacy components/ui/card';
import {
  Table, TableHead, TableHeader, TableRow, TableBody, TableCell,
} from '@/components/Pharmacy components/ui/table';
import { Button } from '@/components/Pharmacy components/ui/button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/Pharmacy components/ui/select';
import api from '@/Pharmacy services/api';
import CreditedCustomersSection from './CreditedCustomersSection';

interface CompanySummary {
  companyName: string;
  creditSale: number;
  outstanding: number;
  customerCount: number;
}

const ranges = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const printElement = (id: string) => {
  const node = document.getElementById(id);
  if (!node) return;
  const html = node.outerHTML;
  const win = window.open('', '', 'width=900,height=650');
  if (!win) return;
  win.document.write(`<html><head><title>Print</title><style>table { width:100%; border-collapse: collapse;} th,td{padding:4px;border:1px solid #ccc;text-align:left;} </style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
};

const CompanyCreditOverview: React.FC = () => {
  const [tab, setTab] = useState<'company' | 'customers'>('company');
  const [range, setRange] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [data, setData] = useState<CompanySummary[]>([]);

  const fetchData = async (r: string) => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/credit-company-summary', { params: { range: r } });
      setTotal(res.data.totalCreditSale ?? 0);
      setTotalOutstanding(res.data.totalOutstandingCredit ?? 0);
      setData(res.data.companies ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(range); }, [range]);
  // Refresh when a credit settlement occurs elsewhere in the app
  useEffect(() => {
    const onSettled = () => fetchData(range);
    window.addEventListener('credit-settled', onSettled as EventListener);
    return () => window.removeEventListener('credit-settled', onSettled as EventListener);
  }, [range]);

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Credit Sales by Company</h2>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ranges.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => fetchData(range)} disabled={loading}>Refresh</Button>
        </div>
      </div>

      {/* Total Credit Sale */}
      <Card>
        <CardHeader><CardTitle>Total Credit Sale</CardTitle></CardHeader>
        <CardContent className="text-3xl font-bold">
          {loading ? '...' : total.toLocaleString()}
        </CardContent>
      </Card>

      {/* Total Outstanding Credit */}
      <Card>
        <CardHeader><CardTitle>Outstanding Credit</CardTitle></CardHeader>
        <CardContent className="text-3xl font-bold text-red-600">
          {loading ? '...' : totalOutstanding.toLocaleString()}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-4">
        <button
          className={`px-4 py-1 rounded-t font-medium ${tab === 'company' ? 'bg-white border-x border-t' : 'bg-muted text-muted-foreground'}`}
          onClick={() => setTab('company')}
        >
          Company Breakdown
        </button>
        <button
          className={`px-4 py-1 rounded-t font-medium ${tab === 'customers' ? 'bg-white border-x border-t' : 'bg-muted text-muted-foreground'}`}
          onClick={() => setTab('customers')}
        >
          Credited Customers
        </button>
      </div>

      {tab === 'company' && (
        <>
          <div className="flex justify-end mb-2">
            <Button size="sm" variant="outline" onClick={() => printElement('company-breakdown-table')}>Print Table</Button>
          </div>
          <Card id="company-breakdown-table">
            <CardHeader><CardTitle>Company Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Credit Sale</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Customers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Loading…</TableCell></TableRow>
                  ) : data.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">No data</TableCell></TableRow>
                  ) : (
                    data.map((c) => (
                      <TableRow key={c.companyName}>
                        <TableCell>{c.companyName || 'Unspecified'}</TableCell>
                        <TableCell className="text-right">{c.creditSale.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">{c.outstanding.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{c.customerCount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'customers' && (
        <>
          <div className="flex justify-end mb-2">
            <Button size="sm" variant="outline" onClick={() => printElement('credited-customers-table')}>Print Table</Button>
          </div>
          <CreditedCustomersSection tableId="credited-customers-table" />
        </>
      )}
    </div>
  );
};

export default CompanyCreditOverview;