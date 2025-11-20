
export interface InventoryValuation {
  method: 'FIFO' | 'LIFO' | 'WeightedAverage';
  totalValue: number;
  breakdown: {
    medicineId: string;
    medicineName: string;
    quantity: number;
    averageCost: number;
    totalValue: number;
  }[];
}

export interface ReorderRule {
  id: string;
  medicineId: string;
  minThreshold: number;
  maxThreshold: number;
  reorderQuantity: number;
  supplierId: string;
  isActive: boolean;
  lastTriggered?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  expectedDelivery?: string;
  notes?: string;
}

export interface PurchaseOrderItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface GRN {
  id: string;
  purchaseOrderId: string;
  receivedBy: string;
  receivedAt: string;
  items: GRNItem[];
  status: 'partial' | 'complete';
  notes?: string;
}

export interface GRNItem {
  medicineId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  batchNumber: string;
  expiryDate: string;
  condition: 'good' | 'damaged' | 'expired';
}

class AdvancedInventoryManager {
  private reorderRules: ReorderRule[] = [];
  private purchaseOrders: PurchaseOrder[] = [];
  private grns: GRN[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // Inventory Valuation Methods
  calculateInventoryValue(medicines: any[], method: InventoryValuation['method']): InventoryValuation {
    const breakdown = medicines.map(medicine => {
      const averageCost = this.calculateAverageCost(medicine, method);
      const totalValue = medicine.quantity * averageCost;
      
      return {
        medicineId: medicine.id,
        medicineName: medicine.name,
        quantity: medicine.quantity,
        averageCost,
        totalValue
      };
    });

    const totalValue = breakdown.reduce((sum, item) => sum + item.totalValue, 0);

    return { method, totalValue, breakdown };
  }

  private calculateAverageCost(medicine: any, method: InventoryValuation['method']): number {
    // Simplified calculation - in real implementation, would use batch history
    switch (method) {
      case 'FIFO':
        return medicine.purchasePrice; // First-in cost
      case 'LIFO':
        return medicine.purchasePrice * 1.05; // Last-in cost (assumed 5% higher)
      case 'WeightedAverage':
        return medicine.purchasePrice * 1.025; // Weighted average
      default:
        return medicine.purchasePrice;
    }
  }

  // Reorder Management
  createReorderRule(rule: Omit<ReorderRule, 'id'>): ReorderRule {
    const newRule: ReorderRule = {
      ...rule,
      id: this.generateId()
    };
    
    this.reorderRules.push(newRule);
    this.saveToStorage();
    return newRule;
  }

  checkReorderRules(medicines: any[]): PurchaseOrder[] {
    const triggeredOrders: PurchaseOrder[] = [];
    
    medicines.forEach(medicine => {
      const rule = this.reorderRules.find(r => 
        r.medicineId === medicine.id && 
        r.isActive && 
        medicine.quantity <= r.minThreshold
      );
      
      if (rule) {
        const po = this.generatePurchaseOrder(rule, medicine);
        triggeredOrders.push(po);
        
        rule.lastTriggered = new Date().toISOString();
      }
    });

    if (triggeredOrders.length > 0) {
      this.saveToStorage();
    }

    return triggeredOrders;
  }

  private generatePurchaseOrder(rule: ReorderRule, medicine: any): PurchaseOrder {
    const po: PurchaseOrder = {
      id: this.generateId(),
      supplierId: rule.supplierId,
      supplierName: 'Auto-Generated Supplier', // Would fetch from suppliers data
      status: 'draft',
      items: [{
        medicineId: medicine.id,
        medicineName: medicine.name,
        quantity: rule.reorderQuantity,
        unitPrice: medicine.purchasePrice,
        total: rule.reorderQuantity * medicine.purchasePrice
      }],
      subtotal: rule.reorderQuantity * medicine.purchasePrice,
      tax: (rule.reorderQuantity * medicine.purchasePrice) * 0.17, // 17% GST
      total: (rule.reorderQuantity * medicine.purchasePrice) * 1.17,
      createdAt: new Date().toISOString(),
      notes: `Auto-generated from reorder rule for ${medicine.name}`
    };

    this.purchaseOrders.push(po);
    return po;
  }

  // Purchase Order Management
  createPurchaseOrder(poData: Omit<PurchaseOrder, 'id' | 'createdAt'>): PurchaseOrder {
    const po: PurchaseOrder = {
      ...poData,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    this.purchaseOrders.push(po);
    this.saveToStorage();
    return po;
  }

  updatePurchaseOrderStatus(poId: string, status: PurchaseOrder['status']): boolean {
    const po = this.purchaseOrders.find(p => p.id === poId);
    if (po) {
      po.status = status;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  getPurchaseOrders(): PurchaseOrder[] {
    return this.purchaseOrders;
  }

  // Goods Received Note Management
  createGRN(grnData: Omit<GRN, 'id'>): GRN {
    const grn: GRN = {
      ...grnData,
      id: this.generateId()
    };

    this.grns.push(grn);
    this.saveToStorage();
    return grn;
  }

  processGRN(grnId: string, medicines: any[]): boolean {
    const grn = this.grns.find(g => g.id === grnId);
    if (!grn) return false;

    grn.items.forEach(item => {
      if (item.condition === 'good') {
        const medicine = medicines.find(m => m.id === item.medicineId);
        if (medicine) {
          medicine.quantity += item.receivedQuantity;
          // Update batch information
          if (!medicine.batches) medicine.batches = [];
          medicine.batches.push({
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            quantity: item.receivedQuantity,
            receivedDate: grn.receivedAt
          });
        }
      }
    });

    // Update PO status
    const po = this.purchaseOrders.find(p => p.id === grn.purchaseOrderId);
    if (po) {
      const allItemsReceived = po.items.every(poItem => {
        const receivedQuantity = grn.items
          .filter(grnItem => grnItem.medicineId === poItem.medicineId)
          .reduce((sum, grnItem) => sum + grnItem.receivedQuantity, 0);
        return receivedQuantity >= poItem.quantity;
      });
      
      po.status = allItemsReceived ? 'received' : 'confirmed';
    }

    this.saveToStorage();
    return true;
  }

  // Stock Reconciliation
  performStockReconciliation(physicalCounts: { medicineId: string; physicalCount: number }[]): {
    discrepancies: { medicineId: string; systemCount: number; physicalCount: number; variance: number }[];
    adjustments: number;
  } {
    const discrepancies: any[] = [];
    let adjustments = 0;

    // This would typically load current system counts
    physicalCounts.forEach(count => {
      const systemCount = this.getSystemCount(count.medicineId);
      const variance = count.physicalCount - systemCount;
      
      if (variance !== 0) {
        discrepancies.push({
          medicineId: count.medicineId,
          systemCount,
          physicalCount: count.physicalCount,
          variance
        });
        adjustments++;
      }
    });

    return { discrepancies, adjustments };
  }

  private getSystemCount(medicineId: string): number {
    // Would fetch from medicines data
    return Math.floor(Math.random() * 100); // Placeholder
  }

  // Batch Tracking
  getBatchesNearExpiry(medicines: any[], days: number = 30): any[] {
    const expiringBatches: any[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    medicines.forEach(medicine => {
      if (medicine.batches) {
        medicine.batches.forEach((batch: any) => {
          const expiryDate = new Date(batch.expiryDate);
          if (expiryDate <= cutoffDate) {
            expiringBatches.push({
              medicineId: medicine.id,
              medicineName: medicine.name,
              batchNumber: batch.batchNumber,
              expiryDate: batch.expiryDate,
              quantity: batch.quantity,
              daysUntilExpiry: Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            });
          }
        });
      }
    });

    return expiringBatches.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadFromStorage() {
    const reorderRules = localStorage.getItem('pharmacy_reorder_rules');
    const purchaseOrders = localStorage.getItem('pharmacy_purchase_orders');
    const grns = localStorage.getItem('pharmacy_grns');

    if (reorderRules) this.reorderRules = JSON.parse(reorderRules);
    if (purchaseOrders) this.purchaseOrders = JSON.parse(purchaseOrders);
    if (grns) this.grns = JSON.parse(grns);
  }

  private saveToStorage() {
    localStorage.setItem('pharmacy_reorder_rules', JSON.stringify(this.reorderRules));
    localStorage.setItem('pharmacy_purchase_orders', JSON.stringify(this.purchaseOrders));
    localStorage.setItem('pharmacy_grns', JSON.stringify(this.grns));
  }
}

export const advancedInventoryManager = new AdvancedInventoryManager();
