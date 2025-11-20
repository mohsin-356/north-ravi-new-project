import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useDoctors = () => {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api.get('/doctors');
      const list = Array.isArray(res.data) ? res.data : [];
      return list.map((d: any) => ({ ...d, id: d._id || d.id }));
    },
  });
};

export const useCreateDoctor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/doctors', payload);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); },
  });
};

export const useUpdateDoctor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/doctors/${id}`, payload);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); },
  });
};

export const useDeleteDoctor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/doctors/${id}`);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); },
  });
};

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return Array.isArray(res.data) ? res.data : [];
    },
  });
};

export const useTokens = (date?: string) => {
  return useQuery({
    queryKey: ['tokens', date || 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      const res = await api.get(`/tokens${params.toString() ? `?${params.toString()}` : ''}`);
      return Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.items) ? res.data.items : []);
    },
  });
};

export const useCreateToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/tokens', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens'] });
      try { window.dispatchEvent(new Event('tokenGenerated')); } catch {}
    },
  });
};

export const useUpdateTokenById = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const id = String(payload._id || payload.id);
      const body = { ...payload };
      delete body._id; delete body.id;
      const res = await api.put(`/tokens/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens'] });
      try { window.dispatchEvent(new Event('revenueChanged')); } catch {}
    },
  });
};

export const useDeleteToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/tokens/${id}`);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tokens'] }); },
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return Array.isArray(res.data) ? res.data : [];
    },
  });
};

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/users', payload);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); },
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/users/${id}`, payload);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/users/${id}`);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); },
  });
};

export const checkUsernameExists = async (username: string) => {
  const res = await api.get(`/users/check-username`, { params: { username } });
  return res.data;
};

// Doctor Ledger APIs
export const useCreateDoctorLedger = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/doctor-ledger', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
};

export const useDoctorLedgerSummary = (doctorId?: string) => {
  return useQuery({
    queryKey: ['doctor-ledger','summary', doctorId || 'none'],
    queryFn: async () => {
      if (!doctorId) return { credit: 0, debit: 0, balance: 0 };
      const res = await api.get('/doctor-ledger/summary', { params: { doctorId } });
      return res.data;
    },
    enabled: !!doctorId,
  });
};

export const useAllPatients = () => {
  return useQuery({
    queryKey: ['patients','all'],
    queryFn: async () => {
      const res = await api.get('/patients');
      return Array.isArray(res.data) ? res.data : [];
    },
  });
};

export const fetchPatients = async (filters: any) => {
  const params = new URLSearchParams();
  if (filters?.mrNumber) params.set('mrNumber', String(filters.mrNumber));
  if (filters?.phone) params.set('phone', String(filters.phone));
  const qs = params.toString();
  const url = `/patients${qs ? `?${qs}` : ''}`;
  const res = await api.get(url);
  return Array.isArray(res.data) ? res.data : [];
};
