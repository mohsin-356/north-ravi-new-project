import { StockManager } from '@/pharmacy utilites/stockManager';
import { InventoryItem } from '../types/inventory';

export class InventoryService {
  private stockManager = StockManager.getInstance();

  public async updateInventoryItem(item: InventoryItem): Promise<boolean> {
    try {
      // Update local inventory
      const success = this.stockManager.syncStock(item.medicineId, item.quantity, 'inventory');
      
      if (!success) {
        throw new Error('Failed to sync inventory changes');
      }
      
      return true;
    } catch (error) {
      console.error('Inventory update failed:', error);
      return false;
    }
  }

  public async getCurrentStock(medicineId: string): Promise<number> {
    return this.stockManager.getStock(medicineId);
  }

  public subscribeToStockChanges(callback: (medicineId: string, quantity: number) => void) {
    return this.stockManager.subscribeToStockChanges(callback);
  }
}

export const inventoryService = new InventoryService();
