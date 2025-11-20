interface SaleItem {
  id: string;
  medicine: string;
  customer: string;
  amount: number;
  time: string;
  date: string;
}

const RECENT_SALES_KEY = 'pharmacy_recent_sales';
const MAX_RECENT_SALES = 5;

export const saveSaleToRecent = (sale: Omit<SaleItem, 'id'>) => {
  try {
    const recentSales = getRecentSales();
    const newSale: SaleItem = {
      id: Date.now().toString(),
      ...sale
    };
    
    // Add new sale to the beginning of the array and keep only the most recent 5
    const updatedSales = [newSale, ...recentSales].slice(0, MAX_RECENT_SALES);
    localStorage.setItem(RECENT_SALES_KEY, JSON.stringify(updatedSales));
    return updatedSales;
  } catch (error) {
    console.error('Error saving recent sale:', error);
    return [];
  }
};

export const getRecentSales = (): SaleItem[] => {
  try {
    const saved = localStorage.getItem(RECENT_SALES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading recent sales:', error);
    return [];
  }
};
