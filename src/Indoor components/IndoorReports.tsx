import React from 'react';
import { indoorApi } from '../Indoor lib/api';
import { Download, Printer } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';

const Tile: React.FC<{ title: string; value: React.ReactNode; bg: string }> = ({ title, value, bg }) => (
  <div className={`rounded-lg p-4 ${bg}`}>
    <div className="text-sm text-gray-700">{title}</div>
    <div className="text-xl font-bold">{value}</div>
  </div>
);

const fmtPKR = (n: number) => `PKR ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}`;

const dateOnly = (d: Date | string) => {
  const x = new Date(d);
  if (isNaN(x.getTime())) return '';
  return x.toISOString().split('T')[0];
};

const IndoorReports: React.FC = () => {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = React.useState(dateOnly(first));
  const [to, setTo] = React.useState(dateOnly(today));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [overview, setOverview] = React.useState<any | null>(null);
  const [cashTotal, setCashTotal] = React.useState(0);
  const [monthSales, setMonthSales] = React.useState(0);
  const [inventoryStats, setInventoryStats] = React.useState({ totalInventory: 0, lowStock: 0, outOfStock: 0, stockValue: 0 });
  const [trend, setTrend] = React.useState<{ date: string; sales: number }[]>([]);

  const apply = async () => {
    setLoading(true); setError(null);
    try {
      const [ov, cashRes, invRes, tr, sum, addRes] = await Promise.all([
        indoorApi.get('/analytics/overview', { params: { from, to } }),
        indoorApi.get('/sales', { params: { from, to, payment: 'cash', limit: 0 } }),
        indoorApi.get('/inventory'),
        indoorApi.get('/analytics/sales-trend', { params: { from, to } }),
        indoorApi.get('/sales/summary'),
        indoorApi.get('/add-stock', { params: { page: 1, limit: 200 } }),
      ]);

      setOverview(ov.data || {});
      const cash = Array.isArray(cashRes.data) ? cashRes.data.reduce((s: number, r: any) => s + Number(r.totalAmount || 0), 0) : 0;
      setCashTotal(cash);

      const inv = Array.isArray(invRes.data) ? invRes.data : [];
      const lowStock = inv.filter((it: any) => Number(it.stock || 0) > 0 && Number(it.stock || 0) <= Number((it.minStock ?? 5))).length;
      const outOfStock = inv.filter((it: any) => Number(it.stock || 0) <= 0).length;
      const addItems = Array.isArray(addRes?.data?.items) ? addRes.data.items : (Array.isArray(addRes?.data) ? addRes.data : []);
      const totalInventory = addItems.reduce((sum: number, r: any) => {
        const units = (r?.totalItems != null) ? Number(r.totalItems) : Number(r.quantity || 0) * Number(r.packQuantity || 1);
        return sum + units;
      }, 0);
      const stockValue = addItems.reduce((sum: number, r: any) => {
        const units = (r?.totalItems != null) ? Number(r.totalItems) : Number(r.quantity || 0) * Number(r.packQuantity || 1);
        const unit = (r?.unitSalePrice != null) ? Number(r.unitSalePrice) : (r?.salePricePerPack && r?.packQuantity ? Number(r.salePricePerPack)/Number(r.packQuantity) : Number(r?.unitBuyPrice || 0));
        return sum + units * unit;
      }, 0);
      setInventoryStats({ totalInventory, lowStock, outOfStock, stockValue });

      const daily = Array.isArray(tr.data) ? tr.data.map((d: any) => ({ date: d.date, sales: Number(d.sales || 0) })) : [];
      setTrend(daily);

      const monthAmt = Number(sum?.data?.month?.totalAmount || 0);
      setMonthSales(monthAmt);
    } catch (e: any) {
      setError(e?.message || 'Failed to load report');
    } finally { setLoading(false); }
  };

  React.useEffect(() => { apply(); }, []);

  const downloadCsv = () => {
    const lines: string[] = [];
    const o = overview || {};
    lines.push('Metric,Value');
    lines.push(`Total Sales,${o.totalRevenue || 0}`);
    lines.push(`Total Purchases,${o.totalPurchases || 0}`);
    lines.push(`Total Expenses,${o.totalExpenses || 0}`);
    lines.push(`Total Profit,${o.netProfit || 0}`);
    lines.push(`Monthly Profit (Sales Margin),${o.netProfit || 0}`);
    lines.push(`Cash Sales,${cashTotal}`);
    lines.push(`This Month's Sales,${monthSales}`);
    lines.push(`Total Inventory,${inventoryStats.totalInventory}`);
    lines.push(`Low Stock Items,${inventoryStats.lowStock}`);
    lines.push(`Out of Stock Items,${inventoryStats.outOfStock}`);
    lines.push(`Total Stock Value,${inventoryStats.stockValue}`);
    lines.push('');
    lines.push('Date,Sales');
    trend.forEach(d => lines.push(`${d.date},${d.sales}`));
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report_${from}_to_${to}.csv`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Daily Summary Report</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 border rounded inline-flex items-center gap-2" onClick={downloadCsv}><Download className="h-4 w-4" /> Download</button>
          <button className="px-3 py-2 border rounded inline-flex items-center gap-2" onClick={()=>window.print()}><Printer className="h-4 w-4" /> Print</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="date" className="border rounded px-3 py-2" value={from} onChange={e=>setFrom(e.target.value)} />
        <span className="text-gray-500">-</span>
        <input type="date" className="border rounded px-3 py-2" value={to} onChange={e=>setTo(e.target.value)} />
        <button className="px-3 py-2 border rounded" onClick={apply}>Apply</button>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile title="Total Sales" value={fmtPKR(overview?.totalRevenue || 0)} bg="bg-green-100" />
        <Tile title="Total Purchases" value={fmtPKR(overview?.totalPurchases || 0)} bg="bg-indigo-100" />
        <Tile title="Total Expenses" value={fmtPKR(overview?.totalExpenses || 0)} bg="bg-rose-100" />
        <Tile title="Total Profit" value={fmtPKR(overview?.netProfit || 0)} bg="bg-purple-100" />

        <Tile title="Monthly Profit (Sales Margin)" value={fmtPKR(overview?.netProfit || 0)} bg="bg-yellow-100" />
        <Tile title="Cash Sales" value={fmtPKR(cashTotal)} bg="bg-green-100" />
        <Tile title="This Month's Sales" value={fmtPKR(monthSales)} bg="bg-purple-100" />

        <Tile title="Total Inventory" value={Number(inventoryStats.totalInventory).toLocaleString()} bg="bg-indigo-100" />
        <Tile title="Low Stock Items" value={inventoryStats.lowStock} bg="bg-yellow-100" />
        <Tile title="Out of Stock Items" value={inventoryStats.outOfStock} bg="bg-rose-100" />
        <Tile title="Total Stock Value" value={fmtPKR(inventoryStats.stockValue)} bg="bg-teal-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-3 bg-white border rounded-md">
          <div className="font-semibold mb-2">Monthly Sales</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="sales" fill="#60a5fa" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="p-3 bg-white border rounded-md">
          <div className="font-semibold mb-2">Comparison: Sales, Purchases, Expenses</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Sales', value: Number(overview?.totalRevenue || 0) }, { name: 'Purchases', value: Number(overview?.totalPurchases || 0) }, { name: 'Expenses', value: Number(overview?.totalExpenses || 0) }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndoorReports;
