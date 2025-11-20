import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  Building, 
  DollarSign, 
  Globe, 
  Bell,
  Save,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types for settings
type LabSettings = {
  labName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  license: string;
  currency: string;
  timezone: string;
  defaultLanguage: string;
  pathologistName?: string;
  pathologistDegrees?: string;
  pathologistTitle?: string;
};

type PricingSettings = {
  defaultCurrency: string;
  taxRate: number;
  discountThreshold: number;
  bulkDiscountRate: number;
  emergencyCharges: number;
  homeCollectionCharges: number;
};

type NotificationSettings = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  criticalAlerts: boolean;
  reportReady: boolean;
  appointmentReminders: boolean;
  systemMaintenance: boolean;
};

type BackupSettings = {
  enabled: boolean;
  time: string; // HH:MM 24h
};

// Default settings
const DEFAULT_LAB_SETTINGS: LabSettings = {
  labName: "MedSync Laboratory",
  address: "Block A, Gulberg III, Lahore",
  phone: "+92 42 123 4567",
  email: "info@medsynclab.com",
  website: "www.medsynclab.com",
  license: "LAB-PK-2024-001",
  currency: "PKR",
  timezone: "Asia/Karachi",
  defaultLanguage: "English",
  pathologistName: "",
  pathologistDegrees: "",
  pathologistTitle: "Consultant Pathologist",
};

const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  defaultCurrency: "PKR",
  taxRate: 17,
  discountThreshold: 10000,
  bulkDiscountRate: 10,
  emergencyCharges: 500,
  homeCollectionCharges: 300
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailNotifications: true,
  smsNotifications: true,
  criticalAlerts: true,
  reportReady: true,
  appointmentReminders: true,
  systemMaintenance: false
};

const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  enabled: false,
  time: "02:00"
};

// Helper functions for localStorage
const loadSettings = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
};

const saveSettings = <T,>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

const Settings = () => {
  const [labSettings, setLabSettings] = useState<LabSettings>(() => 
    loadSettings<LabSettings>('labSettings', DEFAULT_LAB_SETTINGS)
  );

  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(() => 
    loadSettings<PricingSettings>('pricingSettings', DEFAULT_PRICING_SETTINGS)
  );

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => 
    loadSettings<NotificationSettings>('notificationSettings', DEFAULT_NOTIFICATION_SETTINGS)
  );

  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() =>
    loadSettings<BackupSettings>('backupSettings', DEFAULT_BACKUP_SETTINGS)
  );
  
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // Lab Logo state (used in receipts)
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('labLogoUrl') || '';
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoUrl(dataUrl);
      if (typeof window !== 'undefined') {
        localStorage.setItem('labLogoUrl', dataUrl);
      }
      toast({ title: 'Logo updated', description: 'This logo will appear on receipts.' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('labLogoUrl');
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
    toast({ title: 'Logo removed' });
  };

  const handleManualBackup = async () => {
    try {
      const res = await fetch(`${API_BASE}/backup/manual`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast({ title: 'Backup created', description: 'Downloading...' });
      window.location.href = `${API_BASE}/backup/download/${data.fileName}`;
    } catch {
      toast({ title: 'Error', description: 'Backup failed', variant: 'destructive' });
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure? This will delete ALL data and cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/backup/purge`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Data deleted', description: 'All database data has been removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete data', variant: 'destructive' });
    }
  };

  const handleImportBackup: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch(`${API_BASE}/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json)
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Data restored', description: 'Backup imported successfully' });
    } catch {
      toast({ title: 'Error', description: 'Failed to restore backup', variant: 'destructive' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const currencies = [
    { code: "PKR", name: "Pakistani Rupee", symbol: "₨" }
  ];

  // Save settings whenever they change
  useEffect(() => {
    saveSettings('labSettings', labSettings);
  }, [labSettings]);

  useEffect(() => {
    saveSettings('pricingSettings', pricingSettings);
  }, [pricingSettings]);

  useEffect(() => {
    saveSettings('notificationSettings', notificationSettings);
  }, [notificationSettings]);

  useEffect(() => {
    saveSettings('backupSettings', backupSettings);
  }, [backupSettings]);

  const API_BASE = "/api/lab";

  const handleSaveAll = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          lab: labSettings,
          pricing: pricingSettings,
          backup: { enabled: backupSettings.enabled, time: `0 ${backupSettings.time.split(':')[1]} ${backupSettings.time.split(':')[0]} * * *` }
        })
      });
      if (!res.ok) throw new Error('Failed');
      toast({
        title: 'Settings saved',
        description: 'Your settings have been saved successfully!'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const settings = {
        lab: labSettings,
        pricing: pricingSettings,
        notifications: notificationSettings,
        updatedAt: new Date()
      };
      
      console.log("Settings saved:", settings);
      
      toast({
        title: "Settings Saved",
        description: "All settings have been updated successfully.",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your laboratory settings and preferences
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>

      <Tabs defaultValue="lab" className="w-full">
        <TabsList className="flex gap-4 mb-4">
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="lab">
            <Building className="w-4 h-4 mr-2" />
            Lab
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="w-4 h-4 mr-2" />
            Pricing
          </TabsTrigger>

        </TabsList>

        <TabsContent value="lab">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Lab Information
              </CardTitle>
              <CardDescription>Update your laboratory's contact and identification details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="labName">Laboratory Name</Label>
                <Input
                  id="labName"
                  value={labSettings.labName}
                  onChange={(e) => setLabSettings({...labSettings, labName: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <textarea
                  id="address"
                  className="w-full p-3 border rounded-md resize-none"
                  rows={3}
                  value={labSettings.address}
                  onChange={(e) => setLabSettings({...labSettings, address: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={labSettings.phone}
                    onChange={(e) => setLabSettings({...labSettings, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={labSettings.email}
                    onChange={(e) => setLabSettings({...labSettings, email: e.target.value})}
                  />
                </div>
              </div>

              {/* Report Footer: Consultant/Pathologist */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pathologistName">Consultant/Pathologist Name</Label>
                  <Input
                    id="pathologistName"
                    value={labSettings.pathologistName || ''}
                    onChange={(e) => setLabSettings({ ...labSettings, pathologistName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pathologistDegrees">Degrees</Label>
                  <Input
                    id="pathologistDegrees"
                    value={labSettings.pathologistDegrees || ''}
                    onChange={(e) => setLabSettings({ ...labSettings, pathologistDegrees: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pathologistTitle">Title</Label>
                  <Input
                    id="pathologistTitle"
                    value={labSettings.pathologistTitle || ''}
                    onChange={(e) => setLabSettings({ ...labSettings, pathologistTitle: e.target.value })}
                  />
                </div>
              </div>


              {/* Lab Logo upload */}
              <div className="space-y-2">
                <Label htmlFor="labLogo">Lab Logo (for receipts)</Label>
                <div className="flex items-start gap-4 flex-wrap">
                  <input
                    id="labLogo"
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full max-w-sm text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
                  />
                  {logoUrl && (
                    <div className="flex items-center gap-3">
                      <img src={logoUrl} alt="Lab Logo Preview" className="h-16 w-16 object-contain border rounded" />
                      <Button variant="destructive" type="button" onClick={handleRemoveLogo}>Remove</Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG or JPG recommended. This image is stored locally and used on printed receipts/reports.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing Configuration
              </CardTitle>
              <CardDescription>Currency and pricing settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <select
                  id="defaultCurrency"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={pricingSettings.defaultCurrency}
                  onChange={(e) => setPricingSettings({...pricingSettings, defaultCurrency: e.target.value})}
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name} ({currency.code})
                    </option>
                  ))}
                </select>
                <Badge className="bg-green-100 text-green-800">
                  Recommended: PKR for Pakistan
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={pricingSettings.taxRate}
                    onChange={(e) => setPricingSettings({...pricingSettings, taxRate: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulkDiscountRate">Discount (%)</Label>
                  <Input
                    id="bulkDiscountRate"
                    type="number"
                    value={pricingSettings.bulkDiscountRate}
                    onChange={(e) => setPricingSettings({...pricingSettings, bulkDiscountRate: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
            </CardContent>
          </Card>
        </TabsContent>

        

        {/* Backup Tab */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Backup Settings</CardTitle>
              <CardDescription>Configure and run backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="font-medium">Daily Backup</Label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backupSettings.enabled}
                    onChange={(e) => setBackupSettings({ ...backupSettings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="backupTime">Backup Time</Label>
                <input
                  id="backupTime"
                  type="time"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={backupSettings.time}
                  onChange={(e) => setBackupSettings({ ...backupSettings, time: e.target.value })}
                />
              </div>

              <div className="flex gap-4 flex-wrap">
                <Button onClick={handleManualBackup}>Run Manual Backup</Button>
                <Button variant="destructive" onClick={handleDeleteAll}>Delete All Data</Button>
                <Button variant="secondary" onClick={() => fileRef.current?.click()}>Import Backup</Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="gap-2" onClick={handleSaveAll}>
          <Save className="w-4 h-4" />
          Save All Changes
        </Button>
      </div>
    </div>
  );
};

export default Settings;
