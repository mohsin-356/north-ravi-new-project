const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

export const fetchRealTimeAnalytics = async (params?: Record<string, string>) => {
  try {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    // Overview KPI
    const overviewRes = await fetch(`${API_BASE}/api/analytics/overview${qs}`);
    if (!overviewRes.ok) throw new Error('Overview fetch failed');
    const overview = await overviewRes.json();

    // Sales trend for charts (optional)
    let salesTrend: any[] = [];
    try {
      const trendRes = await fetch(`${API_BASE}/api/analytics/sales-trend${qs}`);
      if (trendRes.ok) salesTrend = await trendRes.json();
    } catch {}

    // Transform for existing UI expectations
    return {
      ...overview,
      salesTrend,
      // Provide separate count for existing KPI card expectation
      topProductsCount: overview.topProductsCount ?? (overview.topProducts ? overview.topProducts.reduce((s: number,p: any)=>s+p.quantity,0) : 0),
      totalPurchases: overview.totalPurchases ?? 0,
      customers: [], // placeholder for future customer analysis
      totalItemsSold: overview.totalItemsSold ?? 0,
      creditCustomers: overview.creditCustomers ?? 0,
      cashCustomers: overview.cashCustomers ?? 0,
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }
};

// Category-wise sales data
export const fetchCategorySales = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/category-sales`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return [];
  }
};

export const fetchProductSales = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/product-sales`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return [];
  }
};
