import React, { useEffect, useRef, useState } from 'react';
import { printHtmlOverlay } from '@/utils/printOverlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Filter, Printer } from 'lucide-react';
import { getTotalInventory, getLowStockItems, getOutOfStockItems } from '@/pharmacy utilites/dashboardService';
import { getInventory } from '@/pharmacy utilites/inventoryService';
import { reportExporter } from '@/pharmacy utilites/reportExporter';
import { useSettings } from '@/Pharmacy contexts/PharmacySettingsContext';
import { API_URL } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend as RLegend, ResponsiveContainer } from 'recharts';

interface KPIValues {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalProfit: number;
  // New metrics
  cashSales: number;
  creditSales: number;
  monthSales: number;
  monthProfitMargin: number;
  totalInventory: number;
  lowStock: number;
  outOfStock: number;
  totalStockValue: number;
}

interface SummaryReportProps {
  isUrdu: boolean;
}

// Strict fetch: only use server responses; never fall back to localStorage
async function fetchStrict(urls: string | string[]): Promise<any[]> {
  const list = Array.isArray(urls) ? urls : [urls];
  for (const url of list) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch {
      // ignore and try next url
    }
  }
  return [];
}

const SummaryReportClean: React.FC<SummaryReportProps> = ({ isUrdu }) => {
  const salesRef = useRef<HTMLDivElement>(null);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const expenseRef = useRef<HTMLDivElement>(null);

  const printDiv = (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    const doc = `<!doctype html><html><head><meta charset=\"utf-8\"/>
      <link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css\" />
      <style>@media print{body{margin:0}}</style>
    </head><body class=\"p-4\">${html}</body></html>`;
    printHtmlOverlay(doc, { title: t.title, width: 900, height: 600 });
  };
  const reportRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  /* -------------------- i18n strings -------------------- */
  const t = {
    en: {
      title: 'Daily Summary Report',
      totalSales: 'Total Sales',
      totalPurchases: 'Total Purchases',
      totalExpenses: 'Total Expenses',
      totalProfit: 'Total Profit',
      download: 'Download',
      print: 'Print',
      from: 'From',
      to: 'To',
      apply: 'Apply',
      salesDetails: 'Sales Details',
          customer: 'Customer',
          medicines: 'Medicines',
          quantity: 'Quantity',
      monthProfitSalesMargin: 'Monthly Profit (Sales Margin)',
      purchaseDetails: 'Purchase Details',
      expenseDetails: 'Expense Details',
      date: 'Date',
      amount: 'Amount',
      ref: 'Reference',
      empty: '-',
      cashSales: 'Cash Sales',
      creditSales: 'Credit Sales',
      monthSales: "This Month's Sales",
      totalInventory: 'Total Inventory',
      lowStock: 'Low Stock Items',
      outOfStock: 'Out of Stock Items',
      totalStockValue: 'Total Stock Value',
    },
    ur: {
      title: 'یومیہ خلاصہ رپورٹ',
      totalSales: 'کل فروخت',
      totalPurchases: 'کل خریداری',
      totalExpenses: 'کل اخراجات',
      totalProfit: 'کل منافع',
      download: 'ڈاؤن لوڈ',
      print: 'پرنٹ',
      from: 'سے',
      to: 'تک',
      apply: 'لاگو کریں',
      salesDetails: 'فروخت کی تفصیل',
          customer: 'گاہک',
          medicines: 'دوائیں',
          quantity: 'مقدار',
      monthProfitSalesMargin: 'ماہانہ منافع (سیلز مارجن)',
      purchaseDetails: 'خریداری کی تفصیل',
      expenseDetails: 'اخراجات کی تفصیل',
      date: 'تاریخ',
      amount: 'رقم',
      ref: 'حوالہ',
      empty: '-',
      cashSales: 'نقد فروخت',
      creditSales: 'قسط وار فروخت',
      monthSales: 'مہینے کی فروخت',
      totalInventory: 'کل انوینٹری',
      lowStock: 'کم انوینٹری',
      outOfStock: 'ختم ہو چکی انوینٹری',
      totalStockValue: 'کل انوینٹری کی قیمت',
    },
  }['en'];

  /* -------------------- state -------------------- */
  const today = new Date().toISOString().split('T')[0];
  // Default to Month-To-Date so widgets don’t look empty when there’s no activity today
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const monthStart = new Date(firstOfMonth.getTime() - firstOfMonth.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
  const [range, setRange] = useState({ from: monthStart, to: today });
  const [kpi, setKpi] = useState<KPIValues>({
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    totalProfit: 0,
    cashSales: 0,
    creditSales: 0,
    monthSales: 0,
    monthProfitMargin: 0,
    totalInventory: 0,
    lowStock: 0,
    outOfStock: 0,
    totalStockValue: 0,
  });
  const [detail, setDetail] = useState<{ sales: any[]; purchases: any[]; expenses: any[] }>({
    sales: [],
    purchases: [],
    expenses: [],
  });

  // Chart data derived from filtered details and KPIs
  const monthlySalesData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const s of detail.sales) {
      const d = new Date(s.date || s.createdAt || s.saleDate || '');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const amt = Number(s.totalAmount || s.total || 0) || 0;
      map.set(key, (map.get(key) || 0) + amt);
    }
    return Array.from(map.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [detail.sales]);

  const comparisonData = React.useMemo(() => (
    [
      { name: 'Sales', amount: Number(kpi.totalSales || 0) },
      { name: 'Purchases', amount: Number(kpi.totalPurchases || 0) },
      { name: 'Expenses', amount: Number(kpi.totalExpenses || 0) },
    ]
  ), [kpi.totalSales, kpi.totalPurchases, kpi.totalExpenses]);

  /* -------------------- helpers -------------------- */
  const API_BASE = API_URL || '';
  // -------------------- API endpoints --------------------
  // Using dedicated Purchase model endpoint instead of legacy add-stock
  const endpoints = {
    sales: [`${API_BASE ? API_BASE : ''}/api/sales`],
    purchases: [`${API_BASE ? API_BASE : ''}/api/purchases`],
    expenses: [`${API_BASE ? API_BASE : ''}/api/pharmacy/expenses`],
  };

  // Robust inclusive date range check (treats `to` as end-of-day)
  const inRange = (isoLike: string) => {
    if (!isoLike) return false;
    try {
      const d = new Date(isoLike);
      const from = new Date(`${range.from}T00:00:00.000`);
      const to = new Date(`${range.to}T23:59:59.999`);
      return d >= from && d <= to;
    } catch {
      return false;
    }
  };

  const recalc = async () => {
    const sales = await fetchStrict(endpoints.sales);
    // -------------------- PURCHASES --------------------
    const purchaseRaw = await fetchStrict(endpoints.purchases);
    // Ensure we always have a numeric totalPurchaseAmount for aggregation
    const purchases = purchaseRaw.map((p: any) => ({
      ...p,
      totalPurchaseAmount: p.totalPurchaseAmount ?? p.total ?? p.amount ?? 0,
    }));
    const expenses = await fetchStrict(endpoints.expenses);

    const filtSales = sales.filter((s) => inRange(s.date || s.createdAt || s.saleDate || ''));
    const filtPurch = purchases.filter((p) => inRange(p.purchaseDate || p.date || p.createdAt || ''));
    const filtExp = expenses.filter((e) => inRange(e.date || e.createdAt || e.expenseDate || ''));

    const totalSales = filtSales.reduce((sum, s) => sum + (s.total || s.totalAmount || 0), 0);
    const totalPurch = filtPurch.reduce((sum, p) => sum + (p.totalPurchaseAmount || 0), 0);
    const totalExp = filtExp.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Minimal diagnostics for verification in browser console
    try {
      console.debug('[SummaryReport] range', range, {
        raw: { sales: sales.length, purchases: purchases.length, expenses: expenses.length },
        filtered: { sales: filtSales.length, purchases: filtPurch.length, expenses: filtExp.length },
        totals: { totalSales, totalPurch, totalExp },
      });
    } catch {}

    // Fetch extra KPI metrics in parallel
    let cashSales = 0,
      creditSales = 0,
      monthSales = 0,
      monthProfitMargin = 0,
      totalInventory = 0,
      lowStock = 0,
      outOfStock = 0,
      totalStockValue = 0;
    try {
      const [summaryRes, totalInv, lowStk, outStk, inventoryList] = await Promise.all([
        fetch(`${API_BASE ? API_BASE : ''}/api/sales/summary`),
        getTotalInventory(),
        getLowStockItems(),
        getOutOfStockItems(),
        getInventory(),
      ]);
      if (summaryRes.ok) {
        const s = await summaryRes.json();
        cashSales = s.cashToday ?? 0;
        creditSales = s.creditToday ?? 0;
        monthSales = s.month?.totalAmount ?? 0;
      }
      totalInventory = totalInv;
      lowStock = lowStk;
      outOfStock = outStk;
      totalStockValue = inventoryList.reduce((sum: number, item: any) => {
        const units = item.stock ?? item.totalItems ?? 0;
        const unitValue = item.salePrice ?? item.price ?? item.unitSalePrice ?? item.unitPrice ?? item.purchasePrice ?? 0;
        return sum + units * unitValue;
      }, 0);

      // Compute profit margin from sales within range: sum((sellUnit - buyUnit) * qty)
      try {
        // Create quick lookup for unit cost per medicine
        const costById = new Map<string, number>();
        for (const it of inventoryList as any[]) {
          const id = (it._id || it.id || '').toString();
          const unitCost = Number(it.purchasePrice ?? it.buyPricePerUnit ?? it.unitPurchasePrice ?? it.buyPrice ?? 0) || 0;
          if (id) costById.set(id, unitCost);
        }
        for (const s of filtSales) {
          for (const it of (s.items || [])) {
            const qty = Number(it.quantity || 0) || 0;
            const sellUnit = Number(it.price || 0) || 0;
            const mid = (it.medicineId?._id || it.medicineId || '').toString();
            const buyUnit = costById.get(mid) ?? 0;
            monthProfitMargin += (sellUnit - buyUnit) * qty;
          }
        }
      } catch {}
    } catch (err) {
      console.error('Extra KPI fetch failed', err);
    }

    setKpi({
      totalSales,
      totalPurchases: totalPurch,
      totalExpenses: totalExp,
      totalProfit: totalSales - totalPurch - totalExp,
      cashSales,
      creditSales,
      monthSales,
      monthProfitMargin,
      totalInventory,
      lowStock,
      outOfStock,
      totalStockValue,
    });
    setDetail({ sales: filtSales, purchases: filtPurch, expenses: filtExp });
    setKpi(prev => ({ ...prev, monthProfitMargin }));
  };

  /* -------------------- effects -------------------- */
  useEffect(() => {
    recalc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // realtime
  useEffect(() => {
    const fn = () => recalc();
    window.addEventListener('saleCompleted', fn);
    window.addEventListener('expenseChanged', fn);
    window.addEventListener('storage', fn);
    return () => {
      window.removeEventListener('saleCompleted', fn);
      window.removeEventListener('expenseChanged', fn);
      window.removeEventListener('storage', fn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------- actions -------------------- */
  const download = () => {
    reportExporter.exportToPDF({
      title: `Summary_Report_${range.from}_${range.to}`,
      headers: ['Metric', 'Amount'],
      data: [
        [t.totalSales, `PKR ${kpi.totalSales.toLocaleString()}`],
        [t.totalPurchases, `PKR ${kpi.totalPurchases.toLocaleString()}`],
        [t.totalExpenses, `PKR ${kpi.totalExpenses.toLocaleString()}`],
        [t.totalProfit, `PKR ${kpi.totalProfit.toLocaleString()}`],
      ],
      metadata: { Pharmacy: settings.companyName, Period: `${range.from} → ${range.to}` },
    });
  };

  const print = () => {
    const html = reportRef.current?.innerHTML || '';
    const doc = `<!doctype html><html><head><meta charset=\"utf-8\"/>
      <link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css\" />
      <style>@media print{body{margin:0;padding:0}}</style>
    </head><body class=\"p-6 bg-white\">${html}</body></html>`;
    printHtmlOverlay(doc, { title: t.title, width: 900, height: 640 });
  };

  /* -------------------- render helpers -------------------- */
  // Friendly reference resolver
  const getRef = (row: any): string => {
    // Expense -> show expense type / notes
    if (row.type) return row.type;
    // Purchase (add-stock) -> medicine name or invoice
    if (row.medicine?.name) return row.medicine.name;
    if (row.medicineName) return row.medicineName;
    if (row.invoiceNumber) return row.invoiceNumber;
    // Sale -> customer name or walk-in
    if (row.customerName) return row.customerName;
    if (row.customer?.name) return row.customer.name;
    if (row.customerId) return `Customer ${row.customerId}`;
    if (row.items) return 'Walk-in Customer';
    // fallback: description or short id
    if (row.description) return row.description;
    const id = row._id || row.id || '';
    return id ? id.toString().slice(0, 8) : t.empty;
  };

  // KPI card styled to match screenshot (pastel gradient, dark text)
  const Row = ({ label, value, bg }: { label: string; value: number; bg: string }) => (
    <Card className={`shadow-sm border bg-gradient-to-r ${bg}`}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <p className="text-xl font-extrabold text-gray-900">PKR {value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );

  const Table = ({ data, title }: { data: any[]; title: string }) => (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-max border text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="px-4 py-2 border">{t.date}</th>
              <th className="px-4 py-2 border">{t.ref}</th>
              <th className="px-4 py-2 border">{t.medicines}</th>
                  <th className="px-4 py-2 border">{t.quantity}</th>
                  <th className="px-4 py-2 border">{t.amount}</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td className="px-4 py-2 border text-center" colSpan={3}>
                  {t.empty}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="odd:bg-gray-50 dark:odd:bg-gray-900">
                  <td className="px-4 py-2 border whitespace-nowrap">{new Date(row.date || row.createdAt || row.saleDate || row.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2 border whitespace-nowrap">{getRef(row)}</td>
                  <td className="px-4 py-2 border text-right">PKR {(row.total || row.totalAmount || row.amount || 0).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* -------------------- JSX -------------------- */
  return (
    <div className="p-6 space-y-10 print:space-y-6" ref={reportRef}>
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {settings.logo && <img src={settings.logo} alt="logo" className="h-8 w-8 object-contain" />}
            {settings.companyName}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-semibold mt-1">{t.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={download}>
            <Download className="h-4 w-4 mr-2" /> {t.download}
          </Button>
          <Button variant="outline" onClick={print}>
            <Printer className="h-4 w-4 mr-2" /> {t.print}
          </Button>
        </div>
      </div>

      {/* filters */}
      <div className="flex items-center gap-4">
        <Filter className="h-4 w-4 text-gray-500" />
        <Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <span>—</span>
        <Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <Button variant="outline" onClick={recalc}>
          {t.apply}
        </Button>
      </div>

      {/* kpis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 print:grid-cols-2">
        <Row label={t.totalSales} value={kpi.totalSales} bg="from-green-100 to-green-200" />
        <Row label={t.totalPurchases} value={kpi.totalPurchases} bg="from-blue-100 to-blue-200" />
        <Row label={t.totalExpenses} value={kpi.totalExpenses} bg="from-rose-100 to-rose-200" />
        <Row label={t.totalProfit} value={kpi.totalProfit} bg="from-purple-100 to-purple-200" />
        <Row label={t.monthProfitSalesMargin} value={kpi.monthProfitMargin} bg="from-amber-100 to-amber-200" />
        <Row label={t.cashSales} value={kpi.cashSales} bg="from-green-100 to-green-200" />
        <Row label={t.creditSales} value={kpi.creditSales} bg="from-amber-100 to-amber-200" />
        <Row label={t.monthSales} value={kpi.monthSales} bg="from-purple-100 to-purple-200" />
        <Row label={t.totalInventory} value={kpi.totalInventory} bg="from-blue-100 to-blue-200" />
        <Row label={t.lowStock} value={kpi.lowStock} bg="from-yellow-100 to-yellow-200" />
        <Row label={t.outOfStock} value={kpi.outOfStock} bg="from-rose-100 to-rose-200" />
        <Row label={t.totalStockValue} value={kpi.totalStockValue} bg="from-teal-100 to-teal-200" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-2">Monthly Sales</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySalesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip formatter={(v: any) => [`PKR ${Number(v).toLocaleString()}`, 'Sales']} />
                  <Bar dataKey="value" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-2">Comparison: Sales, Purchases, Expenses</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip formatter={(v: any, _n: any, item: any) => [`PKR ${Number(v).toLocaleString()}`, item?.payload?.name || 'Amount']} />
                  <Bar dataKey="amount" fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* detail sections removed as requested */}
    </div>
  );
};

export default SummaryReportClean;
