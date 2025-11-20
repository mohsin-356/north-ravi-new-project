import { api } from '@/lib/api';

export interface AuditLogPayload {
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
}

export const fetchAuditLogs = async (params?: {
  search?: string;
  action?: string;
  limit?: number;
  skip?: number;
}) => {
  const res = await api.get('/audit-logs', { params });
  return res.data;
};

export const createAuditLog = async (payload: AuditLogPayload) => {
  const res = await api.post('/audit-logs', payload);
  return res.data;
};

export const clearAuditLogs = async () => {
  const res = await api.delete('/audit-logs');
  return res.data;
};
