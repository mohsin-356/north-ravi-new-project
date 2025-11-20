import React from 'react';
import { INDOOR_API_URL, indoorApi } from '@/Indoor lib/api';
import { useIndoorAuth } from '@/Indoor contexts/AuthContext';
import { ShoppingCart, TrendingUp, DollarSign, Package, Boxes, AlertTriangle, Ban } from 'lucide-react';
import IndoorPOS from '@/Indoor components/IndoorPOS';
import IndoorInventory from '@/Indoor components/IndoorInventory';
import IndoorSalesHistory from '@/Indoor components/IndoorSalesHistory';
import IndoorPurchaseHistory from '@/Indoor components/IndoorPurchaseHistory';
import IndoorSuppliers from '@/Indoor components/IndoorSuppliers';
import IndoorReturns from '@/Indoor components/IndoorReturns';
import IndoorSupplierReturnHistory from '@/Indoor components/IndoorSupplierReturnHistory';
import IndoorCart from '@/Indoor components/IndoorCart';
import IndoorSidebar from '@/Indoor components/IndoorSidebar';
import IndoorHeader from '@/Indoor components/IndoorHeader';
import IndoorSettings from '@/Indoor components/IndoorSettings';
import IndoorAuditLogs from '@/Indoor components/IndoorAuditLogs';
import IndoorUserManagement from '@/Indoor components/IndoorUserManagement';
import IndoorReports from '../Indoor components/IndoorReports';
import IndoorExpenses from '../Indoor components/IndoorExpenses';
import { IndoorSettingsProvider } from '@/Indoor contexts/SettingsContext';
import { Guidelines } from '@/components/Pharmacy components/Guidelines';

const KpiCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode; className: string; valueClassName?: string }> = ({ title, value, icon, className, valueClassName }) => (
  <div className={`relative p-4 rounded-lg border shadow-sm ${className}`}>
    <div className="text-xs font-medium text-gray-700 mb-1">{title}</div>
    <div className={`text-xl font-semibold ${valueClassName || ''}`}>{value}</div>
    <div className="absolute right-3 top-3 opacity-70">{icon}</div>
  </div>
);

const IndoorDashboard: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [overview, setOverview] = React.useState<any | null>(null);
  const [summary, setSummary] = React.useState<any | null>(null);
  const [recent, setRecent] = React.useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = React.useState({
    totalInventory: 0,
    lowStock: 0,
    outOfStock: 0,
    stockValue: 0,
  });
  const [expiringSoon, setExpiringSoon] = React.useState<any[]>([]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [overviewRes, summaryRes, recentRes, invRes, addStockRes] = await Promise.all([
          indoorApi.get('/analytics/overview'),
          indoorApi.get('/sales/summary'),
          indoorApi.get('/sales/recent'),
          indoorApi.get('/inventory'),
          indoorApi.get('/add-stock', { params: { page: 1, limit: 200 } }),
        ]);
        if (!alive) return;
        setOverview(overviewRes.data);
        setSummary(summaryRes.data);
        setRecent(Array.isArray(recentRes.data) ? recentRes.data : []);

        const inv = Array.isArray(invRes.data) ? invRes.data : [];
        let lowStock = inv.filter((it: any) => Number(it.stock || 0) > 0 && Number(it.stock || 0) <= Number((it.minStock ?? 5))).length;
        let outOfStock = inv.filter((it: any) => Number(it.stock || 0) <= 0).length;
        const lots = Array.isArray(addStockRes.data?.items) ? addStockRes.data.items : (Array.isArray(addStockRes.data) ? addStockRes.data : []);
        const totalInventory = lots.reduce((sum: number, r: any) => {
          const units = (r?.totalItems != null) ? Number(r.totalItems) : (Number(r.quantity || 0) * Number(r.packQuantity || 1));
          return sum + units;
        }, 0);
        const stockValue = lots.reduce((sum: number, r: any) => {
          const units = (r?.totalItems != null) ? Number(r.totalItems) : (Number(r.quantity || 0) * Number(r.packQuantity || 1));
          const unit = (r?.unitSalePrice != null) ? Number(r.unitSalePrice) : (r?.salePricePerPack && r?.packQuantity ? Number(r.salePricePerPack)/Number(r.packQuantity) : Number(r?.unitBuyPrice || 0));
          return sum + units * unit;
        }, 0);
        setInventoryStats({ totalInventory, lowStock, outOfStock, stockValue });

        // lots already defined above
        const now = new Date(); const soon = new Date(); soon.setDate(soon.getDate() + 30);
        const exp = lots.filter((r: any) => r.expiryDate).filter((r: any) => {
          const d = new Date(r.expiryDate); return d >= now && d <= soon;
        }).slice(0, 10);
        setExpiringSoon(exp.map((r: any) => ({
          name: r.medicineName || r.name || 'Unknown',
          expiryDate: r.expiryDate,
          remaining: r.totalItems ?? (Number(r.quantity || 0) * Number(r.packQuantity || 1)),
        })));

        setErr(null);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="p-6">Loading dashboard…</div>;
  if (err) return <div className="p-6 text-red-600">{String(err)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Today's Sales"
          value={`Rs. ${(Number(summary?.today?.totalAmount || 0)).toLocaleString()}`}
          icon={<ShoppingCart className="h-5 w-5 text-emerald-700" />}
          className="bg-gradient-to-r from-green-50 to-emerald-100 border-emerald-200"
          valueClassName="text-emerald-800"
        />
        <KpiCard
          title="This Month's Sales"
          value={`Rs. ${(Number(summary?.month?.totalAmount || 0)).toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5 text-indigo-700" />}
          className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200"
          valueClassName="text-indigo-800"
        />
        <KpiCard
          title="Cash Sales"
          value={`Rs. ${(Number(summary?.cashToday || 0)).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-green-700" />}
          className="bg-gradient-to-r from-emerald-50 to-green-100 border-green-200"
          valueClassName="text-green-800"
        />
        <KpiCard
          title="Total Purchases"
          value={`Rs. ${(Number(overview?.totalPurchases || 0)).toLocaleString()}`}
          icon={<Package className="h-5 w-5 text-blue-700" />}
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
          valueClassName="text-blue-800"
        />
        <KpiCard
          title="Total Inventory"
          value={`${Number(inventoryStats.totalInventory).toLocaleString()}`}
          icon={<Boxes className="h-5 w-5 text-sky-700" />}
          className="bg-gradient-to-r from-sky-50 to-sky-100 border-sky-200"
          valueClassName="text-sky-800"
        />
        <KpiCard
          title="Low Stock Items"
          value={`${inventoryStats.lowStock}`}
          icon={<AlertTriangle className="h-5 w-5 text-amber-700" />}
          className="bg-gradient-to-r from-yellow-50 to-amber-100 border-amber-200"
          valueClassName="text-amber-800"
        />
        <KpiCard
          title="Out of Stock"
          value={`${inventoryStats.outOfStock}`}
          icon={<Ban className="h-5 w-5 text-red-700" />}
          className="bg-gradient-to-r from-rose-50 to-red-100 border-red-200"
          valueClassName="text-red-800"
        />
        <KpiCard
          title="Total Stock Value"
          value={`Rs. ${inventoryStats.stockValue.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-violet-700" />}
          className="bg-gradient-to-r from-indigo-50 to-violet-100 border-violet-200"
          valueClassName="text-violet-800"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-3 bg-white border rounded-md">
          <div className="font-semibold mb-2">Recent Sales</div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded px-2 py-1">
                <div>
                  <div className="font-medium truncate max-w-[28rem]">{r.medicine}</div>
                  <div className="text-xs text-gray-500">Customer: {r.customer} • {r.date} {r.time}</div>
                </div>
                <div className="text-green-700 font-semibold">PKR {Number(r.amount || 0).toFixed(2)}</div>
              </div>
            ))}
            {recent.length === 0 && <div className="text-sm text-gray-500">No recent sales</div>}
          </div>
        </div>
        <div className="p-3 bg-white border rounded-md">
          <div className="font-semibold mb-2">Expiring Soon</div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {expiringSoon.map((e, idx) => (
              <div key={idx} className="flex items-center justify-between border rounded px-2 py-1">
                <div>
                  <div className="font-medium truncate max-w-[28rem]">{e.name}</div>
                  <div className="text-xs text-gray-500">Expiry: {new Date(e.expiryDate).toLocaleDateString()}</div>
                </div>
                <div className="text-xs text-gray-600">Units: {Number(e.remaining || 0)}</div>
              </div>
            ))}
            {expiringSoon.length === 0 && <div className="text-sm text-gray-500">No expiring medicines found</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const IndoorApp: React.FC = () => {
  const { logout, user } = useIndoorAuth();
  const [activeModule, setActiveModule] = React.useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('indoor_dark');
    return saved ? JSON.parse(saved) : false;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const toggleSidebar = () => setSidebarCollapsed(s => !s);

  React.useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('indoor_dark', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const hasAccess = (_module: string) => true; // refine later if needed

  const renderActiveModule = () => {
    if (!hasAccess(activeModule)) return <div className="p-8 text-red-600 font-bold">Access Denied</div>;
    switch (activeModule) {
      case 'dashboard':
        return <IndoorDashboard />;
      case 'pos':
        return <IndoorPOS />;
      case 'inventory':
        return <IndoorInventory />;
      case 'suppliers':
        return <IndoorSuppliers />;
      case 'sales-history':
        return <IndoorSalesHistory />;
      case 'purchase-history':
        return <IndoorPurchaseHistory />;
      case 'return-history':
        return <IndoorSupplierReturnHistory />;
      case 'returns':
        return <IndoorReturns />;
      case 'reports':
        return <IndoorReports />;
      case 'cart':
        return <IndoorCart />;
      case 'guidelines':
        return <Guidelines isUrdu={false} />;
      case 'user-management':
        return <IndoorUserManagement />;
      case 'settings':
        return <IndoorSettings />;
      case 'audit-logs':
        return <IndoorAuditLogs />;
      case 'expenses':
        return <IndoorExpenses />;
      default:
        return <IndoorDashboard />;
    }
  };

  return (
    <IndoorSettingsProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ltr">
        <div className="flex">
          <IndoorSidebar
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            currentUser={user}
            onLogout={logout}
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
          />
          <div className="flex-1 overflow-hidden">
            {activeModule !== 'pos' && (
              <IndoorHeader isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
            )}
            <div className="p-1">
              {renderActiveModule()}
            </div>
          </div>
        </div>
      </div>
    </IndoorSettingsProvider>
  );
};

export default IndoorApp;
