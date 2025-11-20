import axios from 'axios';

export interface CustomerPayload {
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  address: string;
  cnic: string;
  notes?: string;
  mrNumber?: string;
}

export const customerApi = {
  async getAll() {
    const { data } = await axios.get('/api/pharmacy/customers');
    return data;
  },

  async create(payload: CustomerPayload) {
    const { data } = await axios.post('/api/pharmacy/customers', payload);
    return data;
  },

  async update(id: string, payload: Partial<CustomerPayload>) {
    const { data } = await axios.put(`/api/pharmacy/customers/${id}`, payload);
    return data;
  },

  async remove(id: string) {
    const { data } = await axios.delete(`/api/pharmacy/customers/${id}`);
    return data;
  },

  async searchByCNIC(cnic: string) {
    const { data } = await axios.get('/api/pharmacy/customers/search', { params: { cnic } });
    return data;
  },

  async searchByPhone(phone: string) {
    const { data } = await axios.get('/api/pharmacy/customers/search', { params: { phone } });
    return data;
  },

  async searchByMR(mrNumber: string) {
    const { data } = await axios.get('/api/pharmacy/customers/search', { params: { mrNumber } });
    return data;
  },

  // Record a payment against a customer's credit balance
  async payCredit(customerId: string, payload: { amount: number; date?: string | Date }) {
    const { data } = await axios.post(`/api/credit/customer/${customerId}/payments`, payload);
    return data;
  },

  // Fetch all credit sales for a given customer
  async getCreditSales(customerId: string) {
    const { data } = await axios.get(`/api/credit/customer/${customerId}/sales`);
    return data as Array<{ _id: string; billNo?: string; totalAmount: number; paidAmount?: number; date?: string }>; 
  },

  // Settle allocations across specific sales with optional notes
  async settleCredit(customerId: string, payload: { allocations: { saleId: string; amount: number }[]; notes?: string }) {
    const { data } = await axios.post(`/api/credit/customer/${customerId}/settle`, payload);
    return data;
  }
};
