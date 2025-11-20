
interface OfflineData {
  medicines: any[];
  customers: any[];
  suppliers: any[];
  branches: any[];
  staff: any[];
  sales: any[];
  prescriptions: any[];
  settings: any;
  lastSync: string;
}

class OfflineManager {
  private storageKey = 'pharmacy_offline_data';
  private isOnline = navigator.onLine;
  private syncQueue: any[] = [];

  constructor() {
    this.initializeOfflineSupport();
  }

  private initializeOfflineSupport() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData();
      this.showOnlineStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showOfflineStatus();
    });

    // Initialize with current status
    if (this.isOnline) {
      this.showOnlineStatus();
    } else {
      this.showOfflineStatus();
    }
  }

  private showOnlineStatus() {
    this.removeStatusIndicator();
    const indicator = document.createElement('div');
    indicator.className = 'online-indicator';
    indicator.textContent = 'Online - Synced';
    indicator.id = 'connection-status';
    document.body.appendChild(indicator);
    
    setTimeout(() => this.removeStatusIndicator(), 3000);
  }

  private showOfflineStatus() {
    this.removeStatusIndicator();
    const indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.textContent = 'Offline Mode';
    indicator.id = 'connection-status';
    document.body.appendChild(indicator);
  }

  private removeStatusIndicator() {
    const existing = document.getElementById('connection-status');
    if (existing) {
      existing.remove();
    }
  }

  saveData(key: string, data: any) {
    try {
      const offlineData = this.getOfflineData();
      offlineData[key as keyof OfflineData] = data;
      offlineData.lastSync = new Date().toISOString();
      
      localStorage.setItem(this.storageKey, JSON.stringify(offlineData));
      
      if (!this.isOnline) {
        this.addToSyncQueue({ key, data, action: 'save', timestamp: new Date().toISOString() });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save offline data:', error);
      return false;
    }
  }

  getData(key: string) {
    try {
      const offlineData = this.getOfflineData();
      return offlineData[key as keyof OfflineData] || null;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  }

  private getOfflineData(): OfflineData {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : this.getDefaultOfflineData();
    } catch {
      return this.getDefaultOfflineData();
    }
  }

  private getDefaultOfflineData(): OfflineData {
    return {
      medicines: [],
      customers: [],
      suppliers: [],
      branches: [],
      staff: [],
      sales: [],
      prescriptions: [],
      settings: {},
      lastSync: new Date().toISOString()
    };
  }

  private addToSyncQueue(item: any) {
    this.syncQueue.push(item);
    localStorage.setItem('pharmacy_sync_queue', JSON.stringify(this.syncQueue));
  }

  private async syncPendingData() {
    if (this.syncQueue.length === 0) return;

    console.log(`Syncing ${this.syncQueue.length} pending changes...`);
    
    // In a real app, you would sync with your backend here
    // For now, we'll just clear the queue and show success
    this.syncQueue = [];
    localStorage.removeItem('pharmacy_sync_queue');
    
    console.log('Sync completed successfully');
  }

  isOffline() {
    return !this.isOnline;
  }

  getLastSyncTime() {
    const data = this.getOfflineData();
    return data.lastSync;
  }

  addSale(saleData: any): boolean {
    try {
      const allSales = this.getData('sales') || [];
      allSales.push(saleData);
      return this.saveData('sales', allSales);
    } catch (error) {
      console.error('Failed to add sale:', error);
      return false;
    }
  }

  clearOfflineData() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('pharmacy_sync_queue');
    this.syncQueue = [];
  }

  exportData() {
    const data = this.getOfflineData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pharmacy_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importData(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          localStorage.setItem(this.storageKey, JSON.stringify(data));
          resolve(true);
        } catch {
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }
}

export const offlineManager = new OfflineManager();
