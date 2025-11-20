import React, { createContext, useContext, useEffect, useState } from 'react';
import { indoorApi } from '@/Indoor lib/api';

export interface IndoorSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  taxRate: string;
  discountRate?: string;
  taxEnabled?: boolean;
  taxInclusive?: boolean;
  currency: string;
  dateFormat: string;
  notifications: boolean;
  autoBackup: boolean;
  printReceipts: boolean;
  barcodeScanning: boolean;
  language: string;
  template?: string;
  slipName?: string;
  footerText?: string;
  logo?: string;
}

const defaultSettings: IndoorSettings = {
  companyName: 'Indoor Pharmacy',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  taxRate: '17',
  discountRate: '0',
  taxEnabled: true,
  taxInclusive: false,
  currency: 'PKR',
  dateFormat: 'dd/mm/yyyy',
  notifications: true,
  autoBackup: true,
  printReceipts: true,
  barcodeScanning: true,
  language: 'en',
  template: 'default',
  slipName: '',
  footerText: '',
  logo: '',
};

interface Ctx {
  settings: IndoorSettings;
  updateSettings: (partial: Partial<IndoorSettings>) => Promise<void>;
}

const IndoorSettingsContext = createContext<Ctx | undefined>(undefined);

export const IndoorSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<IndoorSettings>(defaultSettings);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await indoorApi.get('/settings');
        setSettings({ ...defaultSettings, ...data });
        localStorage.setItem('indoor_settings', JSON.stringify({ ...defaultSettings, ...data }));
      } catch (e) {
        const saved = localStorage.getItem('indoor_settings');
        if (saved) setSettings(JSON.parse(saved));
      }
    })();
  }, []);

  const updateSettings = async (partial: Partial<IndoorSettings>) => {
    const merged = { ...settings, ...partial };
    try {
      const { data } = await indoorApi.put('/settings', merged);
      setSettings(data);
      localStorage.setItem('indoor_settings', JSON.stringify(data));
    } catch (e) {
      setSettings(merged);
      localStorage.setItem('indoor_settings', JSON.stringify(merged));
    }
  };

  return (
    <IndoorSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </IndoorSettingsContext.Provider>
  );
};

export const useIndoorSettings = () => {
  const ctx = useContext(IndoorSettingsContext);
  if (!ctx) throw new Error('useIndoorSettings must be used within IndoorSettingsProvider');
  return ctx;
};
