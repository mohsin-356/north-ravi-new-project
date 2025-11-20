import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';

interface ProfitAnalysisProps {
  isUrdu: boolean;
}

const ProfitAnalysis: React.FC<ProfitAnalysisProps> = ({ isUrdu }) => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  
  // Load data from localStorage
  const loadData = () => {
    try {
      const medicines = JSON.parse(localStorage.getItem('pharmacy_medicines') || '[]');
      const expenses = JSON.parse(localStorage.getItem('pharmacy_expenses') || '[]');
      const sales = JSON.parse(localStorage.getItem('pharmacy_sales') || '[]');
      
      return { medicines, expenses, sales };
    } catch {
      return { medicines: [], expenses: [], sales: [] };
    }
  };

  // Calculate profit metrics
  const calculateProfit = () => {
    const { medicines, expenses, sales } = loadData();
    
    // Filter data by time range
    const now = new Date();
    const filteredExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return timeRange === 'day' ? isSameDay(expDate, now) :
             timeRange === 'week' ? isSameWeek(expDate, now) :
             timeRange === 'month' ? isSameMonth(expDate, now) : true;
    });
    
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return timeRange === 'day' ? isSameDay(saleDate, now) :
             timeRange === 'week' ? isSameWeek(saleDate, now) :
             timeRange === 'month' ? isSameMonth(saleDate, now) : true;
    });
    
    // Calculate totals
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCost = filteredSales.reduce((sum, sale) => {
      const med = medicines.find(m => m.id === sale.medicineId);
      return sum + (med?.purchasePrice || 0) * sale.quantity;
    }, 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;
    
    return {
      totalRevenue,
      totalCost,
      totalExpenses,
      grossProfit,
      netProfit
    };
  };

  // Helper date functions
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isSameWeek = (d1: Date, d2: Date) => {
    const diff = Math.abs(d1.getTime() - d2.getTime());
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  const isSameMonth = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth();
  };

  const { totalRevenue, totalCost, totalExpenses, grossProfit, netProfit } = calculateProfit();

  const text = {
    en: {
      title: 'Profit Analysis',
      revenue: 'Revenue',
      cost: 'Cost of Goods',
      expenses: 'Expenses',
      grossProfit: 'Gross Profit',
      netProfit: 'Net Profit',
      timeRange: {
        day: 'Today',
        week: 'This Week',
        month: 'This Month',
        year: 'This Year'
      }
    },
    ur: {
      title: 'منافع کا تجزیہ',
      revenue: 'آمدنی',
      cost: 'سامان کی قیمت',
      expenses: 'اخراجات',
      grossProfit: 'کل منافع',
      netProfit: 'خالص منافع',
      timeRange: {
        day: 'آج',
        week: 'اس ہفتے',
        month: 'اس مہینے',
        year: 'اس سال'
      }
    }
  };

  const t = isUrdu ? text.ur : text.en;

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{t.title}</CardTitle>
          <div className="flex space-x-2">
            {(['day', 'week', 'month', 'year'] as const).map(range => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {t.timeRange[range]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">{t.revenue}</p>
                    <p className="text-2xl font-bold">PKR {totalRevenue.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">{t.cost}</p>
                    <p className="text-2xl font-bold">PKR {totalCost.toLocaleString()}</p>
                  </div>
                  <BarChart2 className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400">{t.expenses}</p>
                    <p className="text-2xl font-bold">PKR {totalExpenses.toLocaleString()}</p>
                  </div>
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">{t.netProfit}</p>
                    <p className="text-2xl font-bold">
                      PKR {netProfit.toLocaleString()}
                      <span className={`ml-2 text-sm ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({((netProfit / totalRevenue) * 100 || 0).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  {netProfit >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-purple-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitAnalysis;
