import { Supplier, SupplierOrder, SupplierPayment } from '@/types/supplier';

type CreateOrderParams = {
  supplierId: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  expectedDelivery: Date;
  notes?: string;
};

type RecordPaymentParams = {
  supplierId: string;
  orderId?: string;
  amount: number;
  date: Date;
  method: 'cash' | 'bank_transfer' | 'cheque' | 'credit' | 'other';
  reference?: string;
  notes?: string;
  status?: 'completed' | 'pending' | 'failed' | 'refunded';
};

export const supplierService = {
  createOrder: async (order: CreateOrderParams): Promise<SupplierOrder> => {
    const newOrder: SupplierOrder = {
      ...order,
      id: Math.random().toString(36).substring(2, 9),
      totalCost: order.quantity * order.unitPrice,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      actualDelivery: null,
      receivedQuantity: 0
    };
    
    const orders = JSON.parse(localStorage.getItem('supplierOrders') || '[]');
    orders.push(newOrder);
    localStorage.setItem('supplierOrders', JSON.stringify(orders));
    
    return newOrder;
  },
  
  getOrdersBySupplier: (supplierId: string): SupplierOrder[] => {
    const orders = JSON.parse(localStorage.getItem('supplierOrders') || '[]');
    return orders
      .filter((order: SupplierOrder) => order.supplierId === supplierId)
      .sort((a: SupplierOrder, b: SupplierOrder) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  
  updateOrderStatus: (orderId: string, status: 'pending' | 'delivered' | 'cancelled' | 'partially_delivered', receivedQuantity?: number) => {
    const orders = JSON.parse(localStorage.getItem('supplierOrders') || '[]');
    const orderIndex = orders.findIndex((order: SupplierOrder) => order.id === orderId);
    if (orderIndex !== -1) {
      const updatedOrder = {
        ...orders[orderIndex],
        status,
        updatedAt: new Date(),
        actualDelivery: status === 'delivered' || status === 'partially_delivered' ? new Date() : null,
        receivedQuantity: receivedQuantity || orders[orderIndex].receivedQuantity
      };
      orders[orderIndex] = updatedOrder;
      localStorage.setItem('supplierOrders', JSON.stringify(orders));
      return updatedOrder;
    }
    return null;
  },
  
  recordPayment: async (payment: RecordPaymentParams): Promise<SupplierPayment> => {
    const newPayment: SupplierPayment = {
      ...payment,
      id: Math.random().toString(36).substring(2, 9),
      status: payment.status || 'completed',
      createdAt: new Date()
    };
    
    const payments = JSON.parse(localStorage.getItem('supplierPayments') || '[]');
    payments.push(newPayment);
    localStorage.setItem('supplierPayments', JSON.stringify(payments));
    
    // Update supplier balance
    supplierService.updateSupplierBalance(payment.supplierId, -payment.amount);
    
    return newPayment;
  },
  
  getPaymentsBySupplier: (supplierId: string): SupplierPayment[] => {
    const payments = JSON.parse(localStorage.getItem('supplierPayments') || '[]');
    return payments
      .filter((payment: SupplierPayment) => payment.supplierId === supplierId)
      .sort((a: SupplierPayment, b: SupplierPayment) => 
        new Date(b.date).getTime() - new Date(a.date).getTime());
  },
  
  updateSupplierBalance: (supplierId: string, amount: number) => {
    const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
    const supplierIndex = suppliers.findIndex((s: Supplier) => s.id === supplierId);
    if (supplierIndex !== -1) {
      suppliers[supplierIndex].currentBalance = 
        (suppliers[supplierIndex].currentBalance || 0) + amount;
      localStorage.setItem('suppliers', JSON.stringify(suppliers));
    }
  },
  
  getSupplierBalance: (supplierId: string): number => {
    const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
    const supplier = suppliers.find((s: Supplier) => s.id === supplierId);
    return supplier?.currentBalance || 0;
  }
};
