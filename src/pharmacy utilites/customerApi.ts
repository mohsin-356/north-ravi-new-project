import axios from 'axios';

export interface CreditEntry {
  medicines: { medicineId: string; name: string; quantity: number; price: number }[];
  amount: number;
  date?: string;
  paid?: boolean;
}

export interface CustomerPayload {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  cnic?: string;
  mrNumber?: string;
  notes?: string;
  creditHistory?: CreditEntry[];
}

export interface UICustomer extends CustomerPayload {
  id: string;
}

export const getCustomers = async (): Promise<UICustomer[]> => {
  const res = await axios.get('/api/customers');
  return (res.data || []).map((c: any) => ({ ...c, id: c._id || c.id }));
};

export const createCustomer = async (customer: CustomerPayload): Promise<UICustomer> => {
  const res = await axios.post('/api/customers', customer);
  return { ...res.data, id: res.data._id || res.data.id } as UICustomer;
};

export const addCreditEntry = async (customerId: string, entry: CreditEntry) => {
  return axios.put(`/api/customers/${customerId}`, {
    $push: { creditHistory: entry },
  });
};
