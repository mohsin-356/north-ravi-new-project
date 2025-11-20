import { StockManager } from '@/pharmacy utilites/stockManager';
import { Medicine, MedicineSupplierTransaction, MedicineCustomerTransaction, InvoiceTracking } from '../types/medicine';

export class MedicineService {
  private stockManager = StockManager.getInstance();

  public async addSupplierTransaction(transaction: Omit<MedicineSupplierTransaction, 'id'>): Promise<MedicineSupplierTransaction> {
    const newTransaction: MedicineSupplierTransaction = {
      ...transaction,
      id: Math.random().toString(36).substring(2, 9),
    };
    
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    const medicineIndex = medicines.findIndex((m: Medicine) => m.id === transaction.medicineId);
    
    if (medicineIndex !== -1) {
      medicines[medicineIndex].supplierTransactions = medicines[medicineIndex].supplierTransactions || [];
      medicines[medicineIndex].supplierTransactions.push(newTransaction);
      medicines[medicineIndex].stock = (medicines[medicineIndex].stock || 0) + transaction.quantity;
      medicines[medicineIndex].purchasePrice = transaction.purchasePrice;
      
      localStorage.setItem('medicines', JSON.stringify(medicines));
      this.stockManager.syncStock(transaction.medicineId, medicines[medicineIndex].stock, 'medicine');
    }
    
    return newTransaction;
  }

  public async addCustomerTransaction(transaction: Omit<MedicineCustomerTransaction, 'id'>): Promise<MedicineCustomerTransaction> {
    const newTransaction: MedicineCustomerTransaction = {
      ...transaction,
      id: Math.random().toString(36).substring(2, 9),
    };
    
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    const medicineIndex = medicines.findIndex((m: Medicine) => m.id === transaction.medicineId);
    
    if (medicineIndex !== -1) {
      medicines[medicineIndex].customerTransactions = medicines[medicineIndex].customerTransactions || [];
      medicines[medicineIndex].customerTransactions.push(newTransaction);
      medicines[medicineIndex].stock = (medicines[medicineIndex].stock || 0) - transaction.quantity;
      
      localStorage.setItem('medicines', JSON.stringify(medicines));
      this.stockManager.syncStock(transaction.medicineId, medicines[medicineIndex].stock, 'medicine');
    }
    
    return newTransaction;
  }

  public async getMedicineTraceability(medicineId: string): Promise<{
    supplierTransactions: MedicineSupplierTransaction[];
    customerTransactions: MedicineCustomerTransaction[];
  }> {
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    const medicine = medicines.find((m: Medicine) => m.id === medicineId);
    
    return {
      supplierTransactions: medicine?.supplierTransactions || [],
      customerTransactions: medicine?.customerTransactions || []
    };
  }

  public async trackByInvoice(invoiceNumber: string): Promise<InvoiceTracking | null> {
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    
    // Find all supplier transactions with matching invoice number
    const transactions = medicines.flatMap((m: Medicine) => 
      (m.supplierTransactions || [])
        .filter((t: MedicineSupplierTransaction) => t.invoiceNumber === invoiceNumber)
        .map((t: MedicineSupplierTransaction) => ({
          medicineId: m.id,
          medicineName: m.name,
          ...t
        }))
    );
    
    if (transactions.length === 0) {
      return null;
    }
    
    return {
      invoiceNumber,
      supplierId: transactions[0].supplierId,
      supplierName: transactions[0].supplierName,
      date: transactions[0].date,
      medicines: transactions.map(t => ({
        medicineId: t.medicineId,
        medicineName: t.medicineName,
        quantity: t.quantity,
        purchasePrice: t.purchasePrice,
        batchNumber: t.batchNumber
      }))
    };
  }

  public async getHistoricalPurchaseData(medicineId: string): Promise<{
    lastPurchaseDate?: Date;
    lastPurchasePrice?: number;
    lastSupplierName?: string;
    lastSalePrice?: number;
  }> {
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    const medicine = medicines.find((m: Medicine) => m.id === medicineId);
    
    if (!medicine || !medicine.supplierTransactions) {
      return {};
    }
    
    const sortedTransactions = [...medicine.supplierTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const lastPurchase = sortedTransactions[0];
    
    return {
      lastPurchaseDate: lastPurchase?.date,
      lastPurchasePrice: lastPurchase?.purchasePrice,
      lastSupplierName: lastPurchase?.supplierName,
      lastSalePrice: medicine.price
    };
  }

  public async deleteMedicine(medicineId: string): Promise<boolean> {
    try {
      // TODO: Implement actual delete from storage
      // For now just simulating success
      return true;
    } catch (error) {
      console.error('Failed to delete medicine:', error);
      return false;
    }
  }

  public async updateMedicineStock(medicine: Medicine): Promise<boolean> {
    try {
      const success = this.stockManager.syncStock(medicine.id, medicine.quantity, 'medicine');
      
      if (!success) {
        throw new Error('Failed to update medicine stock');
      }
      
      return true;
    } catch (error) {
      console.error('Medicine stock update failed:', error);
      return false;
    }
  }

  public async getCurrentStock(medicineId: string): Promise<number> {
    return this.stockManager.getStock(medicineId);
  }

  public subscribeToStockChanges(callback: (medicineId: string, quantity: number) => void) {
    return this.stockManager.subscribeToStockChanges(callback);
  }

  public async addStock(medicineId: string, data: {
    quantity: number;
    purchasePrice: number;
    invoiceNumber: string;
    supplierId: string;
    batchNumber: string;
  }): Promise<void> {
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    const medicineIndex = medicines.findIndex((m: Medicine) => m.id === medicineId);
    
    if (medicineIndex !== -1) {
      // Update medicine stock
      medicines[medicineIndex].currentStock = (medicines[medicineIndex].currentStock || 0) + data.quantity;
      medicines[medicineIndex].lastPurchasePrice = data.purchasePrice;
      medicines[medicineIndex].lastSupplierId = data.supplierId;
      medicines[medicineIndex].lastPurchaseDate = new Date().toISOString();
      medicines[medicineIndex].batchNumber = data.batchNumber;
      
      // Add supplier transaction
      const transaction: MedicineSupplierTransaction = {
        id: Math.random().toString(36).substring(2, 9),
        medicineId,
        quantity: data.quantity,
        purchasePrice: data.purchasePrice,
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        supplierName: '', // Will be filled from supplier service
        date: new Date(),
        batchNumber: data.batchNumber
      };
      
      medicines[medicineIndex].supplierTransactions = medicines[medicineIndex].supplierTransactions || [];
      medicines[medicineIndex].supplierTransactions.push(transaction);
      
      localStorage.setItem('medicines', JSON.stringify(medicines));
      this.stockManager.syncStock(medicineId, medicines[medicineIndex].currentStock, 'medicine');
    }
  }
}

export const medicineService = new MedicineService();
