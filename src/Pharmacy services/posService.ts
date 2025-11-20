import { StockManager } from '@/pharmacy utilites/stockManager';
import { POSItem } from '../types/pos';
import { taxService } from './taxService';

export class POSService {
  private stockManager = StockManager.getInstance();

  public async processSale(items: POSItem[]): Promise<boolean> {
    try {
      // Apply taxes to items
      const taxedItems = items.map(item => ({
        ...item,
        price: taxService.calculateTotalWithTax(item.price),
        tax: taxService.calculateTax(item.price)
      }));
      
      // Update stock for each sold item
      for (const item of taxedItems) {
        const currentStock = this.stockManager.getStock(item.medicineId);
        const newQuantity = currentStock - item.quantity;
        
        if (newQuantity < 0) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
        
        const success = this.stockManager.syncStock(item.medicineId, newQuantity, 'pos');
        
        if (!success) {
          throw new Error(`Failed to update stock for ${item.name}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('POS transaction failed:', error);
      return false;
    }
  }

  public async getCurrentStock(medicineId: string): Promise<number> {
    return this.stockManager.getStock(medicineId);
  }

  public subscribeToStockChanges(callback: (medicineId: string, quantity: number) => void) {
    return this.stockManager.subscribeToStockChanges(callback);
  }

  public calculateTax(amount: number): number {
    return taxService.calculateTax(amount);
  }

  public calculateTotalWithTax(amount: number): number {
    return taxService.calculateTotalWithTax(amount);
  }
}

export const posService = new POSService();
