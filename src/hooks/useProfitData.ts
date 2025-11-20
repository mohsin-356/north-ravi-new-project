export function useProfitData() {
  try {
    const raw = localStorage.getItem('pharmacy_sales');
    const sales = raw ? JSON.parse(raw) : [];
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const monthlyProfit = Array.isArray(sales)
      ? sales
          .filter((s: any) => String(s.date || '').startsWith(`${y}-${m}`))
          .reduce((sum: number, s: any) => sum + Number(s.profit || s.amount || 0), 0)
      : 0;
    return { monthlyProfit, isLoading: false };
  } catch {
    return { monthlyProfit: 0, isLoading: false };
  }
}
