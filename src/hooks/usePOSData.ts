export function usePOSData() {
  try {
    const raw = localStorage.getItem('pharmacy_sales');
    const sales = raw ? JSON.parse(raw) : [];
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = Array.isArray(sales)
      ? sales.filter((s: any) => String(s.date || '').startsWith(today)).reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0)
      : 0;
    return { todaySales, isLoading: false };
  } catch {
    return { todaySales: 0, isLoading: false };
  }
}
