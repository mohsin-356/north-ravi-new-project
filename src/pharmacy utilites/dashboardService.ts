import { getInventory } from './inventoryService';
// Dashboard metrics utilities

/**
 * Get today's total sales
 */
export const getTodaySales = async (): Promise<number> => {
  try {
    const res = await fetch('/api/sales/summary');
    if (!res.ok) throw new Error('Failed to fetch sales summary');
    const data = await res.json();
    // Prefer explicit cash/credit breakdown if provided, else fallback to daily total
    const today = Number(data.cashToday || 0) + Number(data.creditToday || 0);
    return Number.isFinite(today) && today > 0 ? today : Number(data?.today?.totalAmount || 0);
  } catch (e) {
    console.error('Error fetching today sales:', e);
    return 0;
  }
};

/**
 * Get total inventory quantity (sum of all quantities in stock)
 */
export const getTotalInventory = async (): Promise<number> => {
  try {
    const items = await getInventory();
    return items.reduce((sum: number, item: any) => sum + (item.stock ?? item.totalItems ?? 0), 0);
  } catch (error) {
    console.error('Error calculating total inventory:', error);
    return 0;
  }
};

/**
 * Get count of low stock items (stock < threshold)
 */
export const getLowStockItems = async (threshold = 10): Promise<number> => {
  try {
    const items = await getInventory();
    return items.filter((item: any) => {
      const min = item.minStock ?? threshold;
      return (item.stock ?? 0) > 0 && (item.stock ?? 0) < min;
    }).length;
  } catch (error) {
    console.error('Error calculating low stock items:', error);
    return 0;
  }
};

/**
 * Get count of out of stock items (stock === 0)
 */
export const getOutOfStockItems = async (): Promise<number> => {
  try {
    const items = await getInventory();
    return items.filter((item: any) => (item.stock ?? 0) === 0).length;
  } catch (error) {
    console.error('Error calculating out of stock items:', error);
    return 0;
  }
};

/**
 * Get monthly profit (sales - expenses for current month)
 */
export const getMonthlyProfit = async (): Promise<number> => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Sales summary
    const [summaryRes, expensesRes] = await Promise.all([
      fetch('/api/sales/summary'),
      fetch(`/api/expenses?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
    ]);
    if (!summaryRes.ok) throw new Error('Failed to fetch sales summary');
    const summary = await summaryRes.json();
    const monthlySales = Number(summary?.month?.totalAmount || 0);

    // Expenses for the month
    let monthlyExpenses = 0;
    if (expensesRes.ok) {
      const expenses = await expensesRes.json();
      monthlyExpenses = Array.isArray(expenses)
        ? expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)
        : 0;
    }

    // Profit approximation (sales - expenses). If you also want to subtract purchases, do it in the caller.
    return monthlySales - monthlyExpenses;
  } catch (error) {
    console.error('Error calculating monthly profit:', error);
    return 0;
  }
};
