import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAuditLogs, createAuditLog as apiCreateAuditLog } from '@/Pharmacy services/auditLogService';
import { useSettings } from '@/Pharmacy contexts/PharmacySettingsContext';

type AuditLogAction = 
  'LOGIN' | 'LOGOUT' | 
  'ADD_MEDICINE' | 'EDIT_MEDICINE' | 'DELETE_MEDICINE' |
  'ADD_SUPPLIER' | 'EDIT_SUPPLIER' | 'DELETE_SUPPLIER' |
  'ADD_INVENTORY' | 'EDIT_INVENTORY' | 'DELETE_INVENTORY' |
  'ADD_CUSTOMER' | 'EDIT_CUSTOMER' | 'DELETE_CUSTOMER' |
  'ADD_BRANCH' | 'EDIT_BRANCH' | 'DELETE_BRANCH' |
  'ADD_USER' | 'EDIT_USER' | 'DELETE_USER' |
  'SALE_ADD' | 'SALE_UPDATE' | 'SALE_DELETE' |
  'EXPENSE_ADD' | 'EXPENSE_UPDATE' | 'EXPENSE_DELETE' |
  'SUPPLY_ADD' | 'ORDER_ADD';

interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditLogAction;
  entityType?: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
}

interface AuditLogContextType {
  logs: AuditLog[];
  logAction: (action: AuditLogAction, details: string, entityType?: string, entityId?: string) => void;
  clearLogs: () => void;
  refreshLogs: () => Promise<void>;
}

const AuditLogContext = createContext<AuditLogContextType>({
  logs: [],
  logAction: () => {},
  clearLogs: () => {},
  refreshLogs: async () => {}
});

export const AuditLogProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const loadLogs = async (): Promise<void> => {
    try {
      const data = await fetchAuditLogs({ limit: 500 });
      const parsed = data.map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) }));
      setLogs(parsed);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  // Initial load
  useEffect(() => { loadLogs(); }, []);
  // Poll every 10 seconds
  useEffect(() => {
    const id = setInterval(loadLogs, 10000);
    return () => clearInterval(id);
  }, []);
  const { settings } = useSettings();

  const logAction = (action: AuditLogAction, details: string, entityType?: string, entityId?: string) => {
    const user = JSON.parse(localStorage.getItem('pharmacy_user') || '{}');
    
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: user.id || 'unknown',
      userName: user.name || 'unknown',
      userRole: user.role || 'unknown',
      action,
      entityType,
      entityId,
      details,
      ipAddress: (settings as any)?.logIpAddresses ? '127.0.0.1' : undefined // In real app, get actual IP
    };

    // Persist to backend
    try {
      apiCreateAuditLog({
        userId: newLog.userId,
        userName: newLog.userName,
        userRole: newLog.userRole,
        action,
        entityType,
        entityId,
        details,
        ipAddress: newLog.ipAddress,
      }).catch(console.error);
    } catch (e) {
      console.error('Failed to save audit log to backend', e);
    }

    setLogs(prev => [newLog, ...prev].slice(0, 1000));
    console.log(`[AUDIT] ${newLog.timestamp.toISOString()} - ${newLog.userName} (${newLog.userRole}) ${action}: ${details}`);
  };

  const clearLogs = () => setLogs([]);

  const refreshLogs = loadLogs;

  return (
    <AuditLogContext.Provider value={{ logs, logAction, clearLogs, refreshLogs } as any}>
      {children}
    </AuditLogContext.Provider>
  );
};

export const useAuditLog = () => useContext(AuditLogContext) as AuditLogContextType;
