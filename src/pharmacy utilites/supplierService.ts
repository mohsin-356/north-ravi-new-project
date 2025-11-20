import { api } from '@/lib/api';

export interface UISupplier {
  // "name" duplicated for components expecting simple name field (e.g., dropdowns)
  name?: string;
  id: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  totalPurchases?: number;
  totalPaid?: number;
  pendingPayments?: number;
  lastOrder?: string;
  status?: 'active' | 'inactive';
  supplies?: Array<{
    name: string;
    cost: number;
    quantity: number;
    inventoryId?: string;
  }>;
  purchases?: Array<{
    date: string;
    amount: number;
    items: string;
    invoice: string;
  }>;
}

export const getSuppliers = async (): Promise<UISupplier[]> => {
  const res = await api.get('/suppliers');
  // Normalize: ensure each supplier has _id or id
  return (res.data || []).map((s: any) => ({
    // Basic identifiers
    id: s._id || s.id,
    name: s.name,
    companyName: s.name,
    contactPerson: s.contactPerson,
    phone: s.phone,
    email: s.email,
    address: s.address,
    taxId: s.taxId,
    totalPurchases: s.totalPurchases ?? 0,
    totalPaid: s.totalPaid ?? 0,
    pendingPayments: (s.pendingPayments != null ? s.pendingPayments : Math.max(0, (Number(s.totalPurchases)||0) - (Number(s.totalPaid)||0))),
    lastOrder: s.lastOrder ? new Date(s.lastOrder).toISOString().split('T')[0] : '',
    status: s.status,
    supplies: s.supplies || [],
    purchases: s.purchases || [],
  }));
};

// Add new supplier
export const addSupplier = async (supplier: UISupplier) => {
  const payload = {
        name: supplier.companyName || supplier.name,
    contactPerson: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    taxId: supplier.taxId,
    status: supplier.status,
  };
  return api.post('/suppliers', payload);
};

// Update existing supplier
export const updateSupplier = async (id: string, supplier: Partial<UISupplier>) => {
  const payload = {
        name: supplier.companyName || supplier.name,
    contactPerson: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    taxId: supplier.taxId,
    status: supplier.status,
  };
  return api.put(`/suppliers/${id}`, payload);
};

// Delete supplier
export const deleteSupplier = async (id: string) => {
  return api.delete(`/suppliers/${id}`);
};

// Payments
export interface SupplierPaymentInput {
  amount: number;
  method?: string;
  note?: string;
  date?: string | Date;
}

export interface SupplierPaymentsResponse {
  payments: Array<{ date: string; amount: number; method?: string; note?: string }>;
  totalPaid: number;
  pendingPayments: number;
}

export const addSupplierPayment = async (id: string, payload: SupplierPaymentInput) => {
  const res = await api.post(`/suppliers/${id}/payments`, payload);
  return res.data as { totalPaid: number; pendingPayments: number };
};

export const getSupplierPayments = async (id: string) => {
  const res = await api.get(`/suppliers/${id}/payments`);
  return res.data as SupplierPaymentsResponse;
};
