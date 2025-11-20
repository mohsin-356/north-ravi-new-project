export function useInventoryData() {
  try {
    const raw = localStorage.getItem('pharmacy_inventory');
    const items = raw ? JSON.parse(raw) : [];
    const totalItems = Array.isArray(items) ? items.length : 0;
    const lowStockItems = Array.isArray(items)
      ? items.filter((it: any) => Number(it.stock || it.quantity || 0) < Number(it.minStock || 0)).length
      : 0;
    return { totalItems, lowStockItems, isLoading: false };
  } catch {
    return { totalItems: 0, lowStockItems: 0, isLoading: false };
  }
}
