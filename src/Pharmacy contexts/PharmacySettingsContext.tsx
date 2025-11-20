import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSettings as fetchSettings, updateSettingsApi } from '@/Pharmacy services/settingsService';

export interface Settings {
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
  gstin?: string;
  // Billing slip fields
  template?: string;
  slipName?: string;
  footerText?: string;
  logo?: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  isUrdu: boolean;
  selectedPrinter: string;
  setSelectedPrinter: (printer: string) => void;
}

const defaultSettings: Settings = {
  companyName: 'PharmaCare',
  companyAddress: 'Main Boulevard, Gulshan-e-Iqbal, Karachi',
  companyPhone: '+92-21-1234567',
  companyEmail: 'info@pharmacare.com',
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
  gstin: 'YOUR-GSTIN-HERE',
  template: 'default',
  slipName: '',
  footerText: '',
  logo: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');

  // Initial load from backend, then fallback to localStorage if server not reachable
  useEffect(() => {
    (async () => {
      try {
        const remote = await fetchSettings();
        setSettings(remote);
        localStorage.setItem('pharmacy_settings', JSON.stringify(remote));
      } catch (err) {
        console.error('Failed to fetch settings from server, falling back to localStorage:', err);
        try {
          const saved = localStorage.getItem('pharmacy_settings');
          if (saved) {
            setSettings(JSON.parse(saved));
          }
        } catch (e) {
          console.error('Failed to parse settings from localStorage:', e);
        }
      }
    })();
  }, []);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const payload = { ...settings, ...newSettings };
    try {
      const updatedFromServer = await updateSettingsApi(payload);
      setSettings(updatedFromServer);
      localStorage.setItem('pharmacy_settings', JSON.stringify(updatedFromServer));
    } catch (err) {
      console.error('Failed to update settings on server, saving locally instead:', err);
      setSettings(payload);
      localStorage.setItem('pharmacy_settings', JSON.stringify(payload));
    }
  };

  const isUrdu = settings.language === 'ur';

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isUrdu, selectedPrinter, setSelectedPrinter }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
