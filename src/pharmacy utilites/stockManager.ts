import { Medicine } from '../types/medicine';
import { POSItem } from '../types/pos';
import { InventoryItem } from '../types/inventory';

type StockChangeCallback = (medicineId: string, newQuantity: number) => void;

export class StockManager {
  private static instance: StockManager;
  private medicines: Medicine[] = [];
  private posItems: POSItem[] = [];
  private inventoryItems: InventoryItem[] = [];
  private subscribers: StockChangeCallback[] = [];

  private constructor() {
    this.loadInitialData();
    this.setupStorageListener();
  }

  public static getInstance(): StockManager {
    if (!StockManager.instance) {
      StockManager.instance = new StockManager();
    }
    return StockManager.instance;
  }

  private async loadInitialData() {
    try {
      const medicines = localStorage.getItem('pharmacy_medicines');
      const pos = localStorage.getItem('pharmacy_pos');
      const inventory = localStorage.getItem('pharmacy_inventory');

      this.medicines = medicines ? JSON.parse(medicines) : [];
      this.posItems = pos ? JSON.parse(pos) : [];
      this.inventoryItems = inventory ? JSON.parse(inventory) : [];
    } catch (error) {
      console.error('Error loading initial stock data:', error);
    }
  }

  private setupStorageListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === 'pharmacy_medicines' || 
          event.key === 'pharmacy_pos' || 
          event.key === 'pharmacy_inventory') {
        this.loadInitialData();
      }
    });
  }

  public syncStock(medicineId: string, quantity: number, source: 'pos' | 'inventory' | 'medicine') {
    try {
      // Update all modules
      this.medicines = this.medicines.map(med => 
        med.id === medicineId ? { ...med, quantity } : med
      );
      
      this.posItems = this.posItems.map(item => 
        item.medicineId === medicineId ? { ...item, quantity } : item
      );
      
      this.inventoryItems = this.inventoryItems.map(inv => 
        inv.medicineId === medicineId ? { ...inv, quantity } : inv
      );

      // Save to localStorage
      localStorage.setItem('pharmacy_medicines', JSON.stringify(this.medicines));
      localStorage.setItem('pharmacy_pos', JSON.stringify(this.posItems));
      localStorage.setItem('pharmacy_inventory', JSON.stringify(this.inventoryItems));

      // Notify subscribers
      this.subscribers.forEach(cb => cb(medicineId, quantity));
      
      return true;
    } catch (error) {
      console.error('Error syncing stock:', error);
      return false;
    }
  }

  public getStock(medicineId: string): number {
    const medicine = this.medicines.find(med => med.id === medicineId);
    return medicine?.quantity || 0;
  }

  public subscribeToStockChanges(callback: StockChangeCallback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }
}
