import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTokens } from '@/hooks/useApi';

type MonthlyDetail = {
  date: string;
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
};

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ReportsTrend: React.FC = () => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => now.getFullYear() - i), [now]);

  const { data: tokensData = [] } = useTokens();
  const [yearExpensesByMonth, setYearExpensesByMonth] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  const [selectedMonthDetails, setSelectedMonthDetails] = useState<string | null>(null);
  const [monthlyDetails, setMonthlyDetails] = useState<MonthlyDetail[]>([]);

  useEffect(() => {
    const loadYearExpenses = async () => {
      setLoading(true);
      try {
        const fetches = Array.from({ length: 12 }, (_, i) => i + 1).map(async (m) => {
          const res = await fetch(`/api/expenses?month=${m}&year=${selectedYear}`);
          if (!res.ok) return { m: m - 1, total: 0, list: [] as any[] };
          const list = await res.json();
          const total = (Array.isArray(list) ? list : []).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
          return { m: m - 1, total, list: Array.isArray(list) ? list : [] };
        });
        const out = await Promise.all(fetches);
        const map: Record<number, number> = {};
        out.forEach(({ m, total }) => { map[m] = total; });
        setYearExpensesByMonth(map);
      } catch {
        setYearExpensesByMonth({});
      } finally {
        setLoading(false);
      }
    };
    loadYearExpenses();
  }, [selectedYear]);

  const monthlyData = useMemo(() => {
    const tokens = Array.isArray(tokensData) ? tokensData : [];
    return months.map((label, idx) => {
      const monthRevenue = tokens.reduce((sum: number, t: any) => {
        const d = new Date(t.dateTime);
        if (d.getFullYear() !== selectedYear || d.getMonth() !== idx) return sum;
        const isReturned = String(t?.status || '').toLowerCase() === 'returned';
        if (isReturned) return sum;
        const refundAmount = Number(t?.refundAmount || 0) || 0;
        const base = Number(t?.finalFee || 0) || 0;
        return sum + Math.max(0, base - refundAmount);
      }, 0);
      const monthExpenses = yearExpensesByMonth[idx] || 0;
      return { month: label, revenue: monthRevenue, expenses: monthExpenses };
    });
  }, [tokensData, selectedYear, yearExpensesByMonth]);

  const openMonthDetails = async (monthIndex: number) => {
    // Build details by fetching that month's expenses and filtering tokens
    try {
      const res = await fetch(`/api/expenses?month=${monthIndex + 1}&year=${selectedYear}`);
      const monthExpenses = res.ok ? await res.json() : [];
      const tokens = Array.isArray(tokensData) ? tokensData : [];
      const monthTokens = tokens.filter((token: any) => {
        const d = new Date(token.dateTime);
        return d.getMonth() === monthIndex && d.getFullYear() === selectedYear;
      });
      const details: MonthlyDetail[] = [
        ...monthTokens.filter((t: any) => String(t?.status || '').toLowerCase() !== 'returned').map((token: any) => ({
          date: new Date(token.dateTime).toLocaleDateString(),
          description: `Token #${token.tokenNumber} - ${token.patientName}`,
          amount: (Number(token.finalFee || 0) || 0) - (Number(token.refundAmount || 0) || 0),
          type: 'revenue' as const,
        })),
        ...(Array.isArray(monthExpenses) ? monthExpenses : []).map((e: any) => ({
          date: new Date(e.date).toLocaleDateString(),
          description: e.description || 'Expense',
          amount: Number(e.amount) || 0,
          type: 'expense' as const,
        })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setMonthlyDetails(details);
      setSelectedMonthDetails(months[monthIndex]);
    } catch {
      setMonthlyDetails([]);
      setSelectedMonthDetails(months[monthIndex]);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
        >
          {years.map(y => (<option key={y} value={y}>{y}</option>))}
        </select>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
      </div>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <CardTitle className="text-2xl font-bold">Monthly Trend for {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {monthlyData.map((month, index) => (
              <button
                key={`month-card-${month.month}-${index}`}
                onClick={() => openMonthDetails(index)}
                className={`text-left flex items-center justify-between p-3 md:p-4 rounded-xl border-l-4 ${
                  month.revenue > month.expenses ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                }`}
              >
                <div>
                  <p className="font-semibold text-base md:text-lg">{month.month}</p>
                  <p className="text-gray-600 text-sm md:text-base">{selectedYear}</p>
                </div>
                <div className="space-y-2.5 md:space-y-3">
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-green-600 font-semibold text-sm md:text-base">Revenue:</span>
                    <span className="text-green-700 font-bold text-base md:text-lg">Rs. {month.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-red-600 font-semibold text-sm md:text-base">Expenses:</span>
                    <span className="text-red-700 font-bold text-base md:text-lg">Rs. {month.expenses.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 md:h-3">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 md:h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(month.revenue, month.expenses) > 0 ? (month.revenue / Math.max(month.revenue, month.expenses)) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-700 text-sm md:text-base">Net:</span>
                    <span className={`font-bold text-lg md:text-xl ${(month.revenue - month.expenses) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      Rs. {(month.revenue - month.expenses).toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedMonthDetails && (
            <Card className="border-none shadow-2xl rounded-3xl overflow-hidden mt-6">
              <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                <CardTitle className="text-2xl font-bold flex items-center justify-between">
                  <span>Details for {selectedMonthDetails} {selectedYear}</span>
                  <Button onClick={() => setSelectedMonthDetails(null)} variant="outline" className="text-white border-white hover:bg-white hover:text-cyan-500">
                    Close
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {monthlyDetails.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-xl">No transactions found for this month</p>
                    </div>
                  ) : (
                    monthlyDetails.map((detail, index) => (
                      <div
                        key={`detail-${detail.type}-${detail.date}-${detail.description}-${index}`}
                        className={`flex items-center justify-between p-4 rounded-xl border-l-4 ${
                          detail.type === 'revenue' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-lg">{detail.description}</p>
                          <p className="text-gray-600">{detail.date}</p>
                        </div>
                        <span className={`font-bold text-xl ${detail.type === 'revenue' ? 'text-green-700' : 'text-red-700'}`}>
                          {detail.type === 'revenue' ? '+' : '-'}Rs. {detail.amount.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsTrend;
