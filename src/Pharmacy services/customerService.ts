import { Customer, CustomerHistory } from '@/types/customer';

export const customerService = {
  customers: [] as Customer[],
  history: [] as CustomerHistory[],

  // Initialize with sample data
  init() {
    this.customers = [
      {
        mrNumber: 'MR1001',
        name: 'Ali Khan',
        phone: '03001234567',
        totalCredit: 5000,
        creditRemaining: 2500,
        createdAt: new Date()
      }
    ];
    
    this.history = [
      {
        id: '1',
        customerMr: 'MR1001',
        type: 'medicine',
        amount: 1500,
        date: new Date(),
        description: 'Medicine purchase',
        medicineDetails: {
          name: 'Paracetamol',
          quantity: 10,
          price: 150
        }
      }
    ];
    return this;
  },

  // Customer CRUD operations
  getCustomers() {
    return this.customers;
  },

  getCustomer(mrNumber: string) {
    return this.customers.find(c => c.mrNumber === mrNumber);
  },

  addCustomer(customer: Omit<Customer, 'createdAt'>) {
    const newCustomer = {
      ...customer,
      createdAt: new Date()
    };
    this.customers.push(newCustomer);
    return newCustomer;
  },

  // Credit management
  updateCredit(mrNumber: string, amount: number) {
    const customer = this.getCustomer(mrNumber);
    if (customer) {
      customer.creditRemaining += amount;
      return true;
    }
    return false;
  },

  // History operations
  getCustomerHistory(mrNumber: string) {
    return this.history.filter(h => h.customerMr === mrNumber);
  },

  addHistoryEntry(entry: Omit<CustomerHistory, 'id' | 'date'>) {
    const newEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      date: new Date()
    };
    this.history.push(newEntry);
    return newEntry;
  },

  // Visit logging
  logVisit(mrNumber: string, note?: string) {
    const customer = this.getCustomer(mrNumber);
    if (customer) {
      return this.addHistoryEntry({
        customerMr: mrNumber,
        type: 'visit',
        amount: 0,
        description: note || 'Visit logged',
      });
    }
    return null;
  },

  getVisitHistory(mrNumber: string) {
    return this.getCustomerHistory(mrNumber).filter(h => h.type === 'visit');
  }
}.init();
