import React, { useEffect, useState, useRef } from 'react';
import { printHtmlOverlay } from '@/utils/printOverlay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, Filter, Download } from 'lucide-react';
import { useSettings } from '@/Pharmacy contexts/PharmacySettingsContext';
import { reportExporter } from '@/pharmacy utilites/reportExporter';
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

interface SummaryReportProps {
  isUrdu: boolean;
}

interface KPIValues {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalProfit: number;
}

const SummaryReport: React.FC<SummaryReportProps> = ({ isUrdu }) => {
  const printSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;
    const content = ref.current.innerHTML;
    const htmlDoc = `<!doctype html><html><head><meta charset=\"utf-8\"/>
      <style>@media print { body { margin:0 } }</style>
      <link href=\"https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css\" rel=\"stylesheet\">
    </head><body>${content}</body></html>`;
    printHtmlOverlay(htmlDoc, { title: 'Section', width: 900, height: 600 });
  };
  const downloadSection = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(h => (typeof item[h]==='object'? JSON.stringify(item[h]): item[h])));
    reportExporter.exportToCSV({title: filename, headers, data: rows});
  };
  const salesRef = useRef<HTMLDivElement>(null);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const expenseRef = useRef<HTMLDivElement>(null);

  const [details, setDetails] = useState<{ sales: any[]; purchases: any[]; expenses: any[] }>({
    sales: [],
    purchases: [],
    expenses: [],
  });
  const [purchases, setPurchases] = useState<any[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  const todayStr = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ from: todayStr, to: todayStr });
  const [kpi, setKpi] = useState<KPIValues>({
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    totalProfit: 0,
  });

  const text = {
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
      printSection: 'Print',
      purchaseDetails: 'Purchase Details',
      expenseDetails: 'Expense Details',
      date: 'Date',
      amount: 'Amount',
      reference: 'Reference',
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
      purchaseDetails: 'خریداری کی تفصیل',
      expenseDetails: 'اخراجات کی تفصیل',
      printSection: 'پرنٹ',
      date: 'تاریخ',
      amount: 'رقم',
      reference: 'حوالہ',
    },
  }[isUrdu ? 'ur' : 'en'];

  const isWithinRange = (dateISO: string) => {
    if (!dateISO) return false;
    return dateISO >= dateRange.from && dateISO <= dateRange.to;
  };

  const recalculate = async () => {
    try {
      const fetchOrFallback = async (url: string, localKey: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Network');
          return await res.json();
        } catch {
          return JSON.parse(localStorage.getItem(localKey) || '[]');
        }
      };
      const sales: any[] = await fetchOrFallback(`${API_BASE}/api/sales`, 'pharmacy_sales');
      const filteredSales = sales.filter((s) => isWithinRange((s.date || s.createdAt || s.saleDate || '').slice(0, 10)));
      const totalSales = filteredSales.reduce((sum, s) => sum + (s.total || s.totalAmount || 0), 0);
      const purchaseOrders: any[] = await fetchOrFallback(`${API_BASE}/api/purchases`, 'pharmacy_purchase_orders');
      // Normalize to YYYY-MM-DD and include purchaseDate
      const filteredPO = purchaseOrders.filter((po) =>
        isWithinRange((po.purchaseDate || po.date || po.createdAt || po.orderDate || '').slice(0, 10))
      );
      // Use totalPurchaseAmount if available, fallback to total/amount
      const totalPurchases = filteredPO.reduce((sum, po) => sum + (po.totalPurchaseAmount || po.total || po.amount || 0), 0);
      const expenses: any[] = await fetchOrFallback(`${API_BASE}/api/pharmacy/expenses`, 'pharmacy_expenses');
      const filteredExpenses = expenses.filter((e) => isWithinRange((e.date || e.createdAt || '').slice(0, 10)));
      const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalProfit = totalSales - totalExpenses - totalPurchases;
      setKpi({ totalSales, totalPurchases, totalExpenses, totalProfit });
      setDetails({ sales: filteredSales, purchases: filteredPO, expenses: filteredExpenses });
    } catch (err) {
      console.error('Failed to calculate KPIs', err);
    }
  };

  useEffect(() => {
    recalculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => {
    const handleRealtimeUpdate = () => recalculate();
    window.addEventListener('saleCompleted', handleRealtimeUpdate);
    window.addEventListener('storage', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('saleCompleted', handleRealtimeUpdate);
      window.removeEventListener('storage', handleRealtimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async () => {
    const exportData = {
      title: `Summary_Report_${dateRange.from}_${dateRange.to}`,
      headers: ['Metric', 'Amount'],
      data: [
        [text.totalSales, `PKR ${kpi.totalSales.toLocaleString()}`],
        [text.totalPurchases, `PKR ${kpi.totalPurchases.toLocaleString()}`],
        [text.totalExpenses, `PKR ${kpi.totalExpenses.toLocaleString()}`],
        [text.totalProfit, `PKR ${kpi.totalProfit.toLocaleString()}`],
      ],
      metadata: {
        Pharmacy: settings.companyName,
        Period: `${dateRange.from} → ${dateRange.to}`,
        GeneratedAt: new Date().toLocaleString(),
      },
    };
    reportExporter.exportToPDF(exportData);
  };

  const handlePrint = () => {
    const bodyHtml = reportRef.current ? reportRef.current.innerHTML : '<div />';
    const htmlDoc = `<!doctype html><html><head><meta charset=\"utf-8\"/>
      <style>@media print { body { margin:0 } } body{ font-family: Arial, sans-serif; padding:20px; }</style>
    </head><body>${bodyHtml}</body></html>`;
    printHtmlOverlay(htmlDoc, { title: text.title, width: 900, height: 640 });
  };

  return (
    <div className="p-6 space-y-6" ref={reportRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            {settings.logo && (
              <img src={settings.logo} alt="logo" className="h-8 w-8 object-contain" />
            )}
            <span>{settings.companyName}</span>
          </h1>
          <h2 className="text-lg text-gray-600 dark:text-gray-300 font-semibold mt-1">
            {text.title}
          </h2>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" /> {text.download}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> {text.print}
          </Button>
        </div>
      </div>
      {/* Filter */}
      <div className="flex items-center space-x-4">
        <Filter className="h-4 w-4 text-gray-500" />
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700 dark:text-gray-200" htmlFor="from-date">
            {text.from}
          </label>
          <Input
            id="from-date"
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700 dark:text-gray-200" htmlFor="to-date">
            {text.to}
          </label>
          <Input
            id="to-date"
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="w-40"
          />
        </div>
        <Button variant="outline" onClick={recalculate}>
          {text.apply}
        </Button>
      </div>
      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-2">
        <Card className="shadow-md">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">{text.totalSales}</p>
            <p className="text-2xl font-bold text-green-600">PKR {kpi.totalSales.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">{text.totalPurchases}</p>
            <p className="text-2xl font-bold text-blue-600">PKR {kpi.totalPurchases.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">{text.totalExpenses}</p>
            <p className="text-2xl font-bold text-red-600">PKR {kpi.totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">{text.totalProfit}</p>
            <p className="text-2xl font-bold text-purple-600">PKR {kpi.totalProfit.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
      {/* Detailed Tables */}
      <div className="space-y-10 print:space-y-6">
         {/* Sales */}
<div ref={salesRef}>
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-lg font-semibold">{text.salesDetails}</h3>
    <Button size="sm" variant="outline" onClick={() => printSection(salesRef)}>
      <Printer className="h-4 w-4 mr-1" /> {text.printSection}
    </Button>
  </div>

  <div className="overflow-x-auto">
    <table className="min-w-max border text-sm">
      <thead>
        <tr className="bg-gray-100 dark:bg-gray-800">
          <th className="px-4 py-2 border">{text.date}</th>
          <th className="px-4 py-2 border">{text.customer}</th>
          <th className="px-4 py-2 border">{text.medicines}</th>
          <th className="px-4 py-2 border">{text.quantity}</th>
          <th className="px-4 py-2 border">{text.reference}</th>
          <th className="px-4 py-2 border text-right">{text.amount}</th>
        </tr>
      </thead>

      <tbody>
        {details.sales.length === 0 ? (
          <tr>
            <td className="px-4 py-2 border text-center" colSpan={6}>
              –
            </td>
          </tr>
        ) : (
          details.sales.map((s, idx) => {
            const meds = (s.items || []).map(
              (it: any) => it.medicineName || it.medicineId?.name || 'Unknown'
            );
            const qty = (s.items || []).reduce(
              (sum: number, it: any) => sum + (it.quantity || 0),
              0
            );
            const payment = s.paymentMethod || 'cash';
            const price = s.total || s.totalAmount || 0;

            return (
              <tr key={idx} className="odd:bg-gray-50 dark:odd:bg-gray-900">
                <td className="px-4 py-2 border whitespace-nowrap">
                  {new Date(s.date || s.createdAt || s.saleDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 border whitespace-nowrap">
                  {s.customerName || s.customer?.name || 'Walk-in'}
                </td>
                <td
                  className="px-4 py-2 border max-w-xs truncate"
                  title={meds.join(', ')}
                >
                  {meds.join(', ')}
                </td>
                <td className="px-4 py-2 border text-center">{qty}</td>
                <td className="px-4 py-2 border capitalize">{payment}</td>
                <td className="px-4 py-2 border text-right">
                  PKR {price.toLocaleString()}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
</div>
        {/* Purchases */}
        <div ref={purchaseRef}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{text.purchaseDetails}</h3>
            <Button size="sm" variant="outline" onClick={() => printSection(purchaseRef)}> 
              <Printer className="h-4 w-4 mr-1"/>{text.printSection}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-max border text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  {details.purchases.length > 0 ? (
                    Object.keys(details.purchases[0]).map((key) => (
                      <th key={key} className="px-4 py-2 border">{key}</th>
                    ))
                  ) : (
                    <th className="px-4 py-2 border">No Data</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {details.purchases.length === 0 ? (
                  <tr>
                    <td className="px-4 py-2 border text-center" colSpan={1}>
                      -
                    </td>
                  </tr>
                ) : (
                  details.purchases.map((p, idx) => (
                    <tr key={idx} className="odd:bg-gray-50 dark:odd:bg-gray-900">
                      {Object.keys(details.purchases[0]).map((key) => (
                        <td key={key} className="px-4 py-2 border whitespace-nowrap">
                          {typeof p[key] === 'object' ? JSON.stringify(p[key]) : String(p[key])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Expenses */}
        <div ref={expenseRef}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{text.expenseDetails}</h3>
            <Button size="sm" variant="outline" onClick={() => printSection(expenseRef)}> 
              <Printer className="h-4 w-4 mr-1"/>{text.printSection}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-max border text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="px-4 py-2 border">{text.date}</th>
                  <th className="px-4 py-2 border">{text.reference}</th>
                  <th className="px-4 py-2 border">{text.amount}</th>
                </tr>
              </thead>
              <tbody>
                {details.expenses.length === 0 ? (
                  <tr>
                    <td className="px-4 py-2 border text-center" colSpan={3}>
                      -
                    </td>
                  </tr>
                ) : (
                  details.expenses.map((e, idx) => (
                    <tr key={idx} className="odd:bg-gray-50 dark:odd:bg-gray-900">
                      <td className="px-4 py-2 border whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 border whitespace-nowrap">{e.description || e.category || '—'}</td>
                      <td className="px-4 py-2 border text-right">PKR {(e.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryReport;
