import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  ShoppingCart,
  Users,
  Clock,
  RefreshCw,
  DollarSign
} from 'lucide-react';
// Indoor dashboard pulls directly from Indoor endpoints for real-time accuracy
import { indoorApi } from '@/Indoor lib/api';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  TrendingUp as TrendingUpIcon, 
  Package as PackageIcon, 
  AlertTriangle as AlertTriangleIcon, 
  ShoppingCart as ShoppingCartIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon2,
  Clock as ClockIcon,
  RefreshCw as RefreshCwIcon,
  DollarSign as DollarSignIcon
} from 'lucide-react';
import { getRecentSales } from '@/pharmacy utilites/salesService';
import { getInventory } from '@/pharmacy utilites/inventoryService';

interface DashboardProps {
  isUrdu: boolean;
}

interface DashboardStats {
  todaySales: number;
  monthlySales: number;
  cashSales: number;
  creditSales: number;
  totalPurchases: number;
  totalInventory: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockValue: number;
  isLoading: boolean;
}

interface SaleItem {
  id: string;
  medicine: string;
  customer: string;
  amount: number;
  time: string;
  date: string;
}

interface FormData {
  customerName: string;
  productName: string;
  price: string;
  tax: string;
  discount: string;
  date: Date | undefined;
  time: string;
}

// Helper functions for localStorage
const STORAGE_KEY = 'pharmacy_recent_sales';

const saveToLocalStorage = (sales: SaleItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadFromLocalStorage = (): SaleItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return [];
  }
};

// StatCard component for better code organization
const StatCard = ({ stat }: { stat: { title: string; value: string; icon: any; color?: string; bgColor?: string; card?: string; titleClass?: string; valueClass?: string; iconWrap?: string } }) => {
  const Icon = stat.icon;
  return (
    <Card className={`${stat.card || ''} transition-all hover:shadow-xl h-full border`}> 
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${stat.titleClass || 'text-gray-600 dark:text-gray-300'}`}>{stat.title}</p>
            <p className={`text-lg font-bold truncate ${stat.valueClass || 'text-gray-900 dark:text-gray-100'}`}>{stat.value}</p>
          </div>
          <div className={`p-2 rounded-full ml-2 flex-shrink-0 ${stat.iconWrap || stat.bgColor || 'bg-gray-100'}`}>
            <Icon className={`h-5 w-5 ${stat.color || 'text-gray-700'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ isUrdu }) => {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    monthlySales: 0,
    cashSales: 0,
    creditSales: 0,
    totalPurchases: 0,
    totalInventory: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalStockValue: 0,
    isLoading: true
  });
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [recentSales, setRecentSales] = useState<SaleItem[]>(() => loadFromLocalStorage());

  const fetchDashboardData = async () => {
    try {
      setStats(prev => ({...prev, isLoading: true}));
      // Prefer Indoor endpoints; fallback to legacy if needed
      let summaryData: any = null;
      let addStockList: any[] = [];
      let purchasesList: any[] = [];
      let supReturns: any[] = [];
      try {
        const [sumRes, addRes, purRes, srRes] = await Promise.all([
          indoorApi.get('/sales/summary'),
          indoorApi.get('/add-stock', { params: { page: 1, limit: 1000 } }),
          indoorApi.get('/purchases'),
          indoorApi.get('/supplier-returns/history')
        ]);
        summaryData = sumRes.data || {};
        addStockList = Array.isArray(addRes?.data?.items) ? addRes.data.items : (Array.isArray(addRes?.data) ? addRes.data : []);
        purchasesList = Array.isArray(purRes?.data) ? purRes.data : [];
        supReturns = Array.isArray(srRes?.data) ? srRes.data : [];
      } catch (e) {
        // Fallback to legacy endpoints only if Indoor fails entirely
        const [summaryResponse, purchasesResponse] = await Promise.all([
          fetch('/api/sales/summary'),
          fetch('/api/purchases')
        ]);
        if (summaryResponse.ok) summaryData = await summaryResponse.json();
        if (purchasesResponse.ok) purchasesList = await purchasesResponse.json();
      }

      // Compute inventory metrics from Indoor add-stock data
      const unitPrice = (r: any) => {
        if (r?.unitSalePrice != null) return Number(r.unitSalePrice);
        if (r?.salePricePerPack != null && r?.packQuantity) return Number(r.salePricePerPack) / Number(r.packQuantity);
        return Number(r?.unitBuyPrice || r?.price || 0);
      };
      const units = (r: any) => (r?.totalItems != null) ? Number(r.totalItems) : (Number(r?.quantity || 0) * Number(r?.packQuantity || 1));
      const totalInventory = addStockList.reduce((sum: number, r: any) => sum + units(r), 0);
      const totalStockValue = addStockList.reduce((sum: number, r: any) => sum + units(r) * unitPrice(r), 0);
      const lowStock = addStockList.filter((r: any) => {
        const tot = units(r); const min = Number(r?.minStock || 0);
        return tot > 0 && min > 0 && tot <= min;
      }).length;
      const outOfStock = addStockList.filter((r: any) => units(r) === 0).length;

      // Net purchases = purchases sum - supplier returns total
      const grossPurchases = purchasesList.reduce((sum, p: any) => sum + Number(p.totalPurchaseAmount || 0), 0);
      const supplierReturnsTotal = supReturns.reduce((s, r: any) => s + Number(r.amount || 0), 0);
      const netPurchases = Math.max(0, grossPurchases - supplierReturnsTotal);

      setStats({
        todaySales: Number(summaryData?.today?.totalAmount || 0),
        monthlySales: Number(summaryData?.month?.totalAmount || 0),
        cashSales: Number(summaryData?.cashToday ?? 0),
        creditSales: Number(summaryData?.creditToday ?? 0),
        totalPurchases: netPurchases,
        totalInventory,
        lowStockItems: lowStock,
        outOfStockItems: outOfStock,
        totalStockValue: totalStockValue,
        isLoading: false
      });
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setStats(prev => ({...prev, isLoading: false}));
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // --- event handlers ---
    const handleRefresh = () => {
      fetchDashboardData();
    };
    const handleSaleCompleted = () => {
      fetchDashboardData();
      loadRecentSales();
    };

    // Listen to various events that should trigger a dashboard refresh
    window.addEventListener('saleCompleted', handleSaleCompleted);
    window.addEventListener('returnProcessed', handleRefresh);
    window.addEventListener('inventoryUpdated', handleRefresh);

    // Auto-refresh every 30 seconds as a fallback
    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('saleCompleted', handleSaleCompleted);
      window.removeEventListener('returnProcessed', handleRefresh);
      window.removeEventListener('inventoryUpdated', handleRefresh);
    };
  }, []);

  const text = {
    en: {
      title: 'Dashboard',
      todaysSales: "Today's Sales",
      monthlySales: "This Month's Sales",
      cashSales: "Cash Sales",
      creditSales: "Credit Sales",
      totalInventory: "Total Inventory",
      lowStock: "Low Stock Items",
      recentSales: "Recent Sales",
      expiringMedicines: "Expiring Soon",
      topSelling: "Top Selling",
      quickActions: "Quick Actions"
    },
    ur: {
      title: 'ڈیش بورڈ',
      todaysSales: "آج کی سیلز",
      monthlySales: "اس مہینے کی سیلز",
      cashSales: "نقد سیلز",
      creditSales: "کریڈٹ سیلز",
      totalInventory: "کل انوینٹری",
      lowStock: "کم اسٹاک",
      recentSales: "حالیہ سیلز",
      expiringMedicines: "ختم ہونے والی",
      topSelling: "زیادہ فروخت",
      quickActions: "فوری اعمال"
    }
  };

  const t = text.en;

  const statsData = [
    {
      title: t.todaysSales,
      value: `Rs. ${stats.todaySales.toLocaleString()}`,
      icon: ShoppingCartIcon,
      color: 'text-emerald-700',
      iconWrap: 'bg-emerald-100 text-emerald-700',
      card: 'bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200',
      titleClass: 'text-emerald-700',
      valueClass: 'text-emerald-900'
    },
    {
      title: t.monthlySales,
      value: `Rs. ${stats.monthlySales.toLocaleString()}`,
      icon: TrendingUpIcon,
      color: 'text-violet-700',
      iconWrap: 'bg-violet-100 text-violet-700',
      card: 'bg-gradient-to-br from-purple-50 to-violet-100 border-violet-200',
      titleClass: 'text-violet-700',
      valueClass: 'text-violet-900'
    },
    {
      title: t.cashSales,
      value: `Rs. ${stats.cashSales.toLocaleString()}`,
      icon: DollarSignIcon,
      color: 'text-green-700',
      iconWrap: 'bg-green-100 text-green-700',
      card: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
      titleClass: 'text-green-700',
      valueClass: 'text-green-900'
    },
    {
      title: t.creditSales,
      value: `Rs. ${stats.creditSales.toLocaleString()}`,
      icon: DollarSignIcon,
      color: 'text-amber-700',
      iconWrap: 'bg-amber-100 text-amber-700',
      card: 'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200',
      titleClass: 'text-amber-700',
      valueClass: 'text-amber-900'
    },
    {
      title: 'Total Purchases',
      value: `Rs. ${stats.totalPurchases.toLocaleString()}`,
      icon: PackageIcon,
      color: 'text-blue-700',
      iconWrap: 'bg-blue-100 text-blue-700',
      card: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
      titleClass: 'text-blue-700',
      valueClass: 'text-blue-900'
    },
    {
      title: t.totalInventory,
      value: stats.totalInventory.toLocaleString(),
      icon: PackageIcon,
      color: 'text-sky-700',
      iconWrap: 'bg-sky-100 text-sky-700',
      card: 'bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200',
      titleClass: 'text-sky-700',
      valueClass: 'text-sky-900'
    },
    {
      title: t.lowStock,
      value: stats.lowStockItems.toLocaleString(),
      icon: AlertTriangleIcon,
      color: 'text-amber-700',
      iconWrap: 'bg-amber-100 text-amber-700',
      card: 'bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200',
      titleClass: 'text-amber-700',
      valueClass: 'text-amber-900'
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStockItems.toLocaleString(),
      icon: AlertTriangleIcon,
      color: 'text-red-700',
      iconWrap: 'bg-red-100 text-red-700',
      card: 'bg-gradient-to-br from-rose-50 to-red-100 border-rose-200',
      titleClass: 'text-red-700',
      valueClass: 'text-red-900'
    },
    {
      title: 'Total Stock Value',
      value: `Rs. ${stats.totalStockValue.toLocaleString()}`,
      icon: DollarSignIcon,
      color: 'text-indigo-700',
      iconWrap: 'bg-indigo-100 text-indigo-700',
      card: 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200',
      titleClass: 'text-indigo-700',
      valueClass: 'text-indigo-900'
    }
  ];

  // Load recent sales on component mount and set up refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const loadRecentSales = async () => {
    setIsRefreshing(true);
    try {
      try {
        const res = await fetch('/api/sales/recent');
        if (res.ok) {
          const apiSales = await res.json();
          setRecentSales(apiSales);
        } else {
          // fallback to localStorage if backend fails
          const savedSales = getRecentSales();
          setRecentSales(savedSales);
        }
      } catch (err) {
        console.error('Error fetching recent sales:', err);
        const savedSales = getRecentSales();
        setRecentSales(savedSales);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load recent sales on component mount
  React.useEffect(() => {
    loadRecentSales();
  }, []);

  // Real-time expiring medicines state
  const [expiringMedicines, setExpiringMedicines] = useState<{
    id: number;
    medicine: string;
    expiry: string;
    stock: number;
  }[]>([]);

  // Helper: isExpiringSoon (90 days logic)
  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date('2025-07-03T13:25:33+05:00'); // Use provided local time
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return expiry <= ninetyDaysFromNow;
  };

  // Load expiring medicines from inventory
  React.useEffect(() => {
    const updateExpiring = async () => {
      try {
        const inventory = await getInventory();
        const expiring = inventory
          .filter((item: any) => isExpiringSoon(item.expiryDate))
          .map((item: any) => ({
            id: item.id,
            medicine: item.name,
            expiry: item.expiryDate,
            stock: item.quantity ?? item.stock
          }))
          .sort((a: any, b: any) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());
        setExpiringMedicines(expiring);
      } catch (e) {
        setExpiringMedicines([]);
      }
    };
    updateExpiring();
    // Listen for storage changes to update in real-time
    window.addEventListener('storage', updateExpiring);
    return () => window.removeEventListener('storage', updateExpiring);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <CalendarIcon2 className="h-4 w-4" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4" />
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards - Two rows of three cards each */}
      <div className="space-y-4">
        {/* First row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statsData.slice(0, 3).map((stat, index) => (
            <StatCard key={index} stat={stat} />
          ))}
        </div>
        
        {/* Second row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statsData.slice(3).map((stat, index) => (
            <StatCard key={index + 3} stat={stat} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCartIcon className="h-5 w-5" />
                <span>{t.recentSales}</span>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={loadRecentSales}
                disabled={isRefreshing}
              >
                <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{sale.medicine}</p>
                      <p className="text-sm text-gray-600">Customer: {sale.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">PKR {sale.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {sale.date} • {sale.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">No recent sales found</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expiring Medicines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
              <span>{t.expiringMedicines}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringMedicines.length > 0 ? (
                expiringMedicines.map((medicine) => (
                  <div key={medicine.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <p className="font-medium text-gray-900">{medicine.medicine}</p>
                      <p className="text-sm text-gray-600">Stock: {medicine.stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-yellow-600">
                        Exp: {medicine.expiry}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">No expiring medicines found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Updated and Refresh Button */}
      <div className="text-right text-sm text-muted-foreground">
        Last updated: {lastUpdated || 'Never'}
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-2"
          onClick={fetchDashboardData}
          disabled={stats.isLoading}
        >
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${stats.isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
