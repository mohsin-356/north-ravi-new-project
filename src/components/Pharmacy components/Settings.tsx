import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Pharmacy components/ui/card';
import { Button } from '@/components/Pharmacy components/ui/button';
import { Input } from '@/components/Pharmacy components/ui/input';
import { Label } from '@/components/Pharmacy components/ui/label';
import { Textarea } from '@/components/Pharmacy components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Pharmacy components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/Pharmacy components/ui/tabs';
import { 
  Save, 
  Building, 
  Settings as SettingsIcon
} from 'lucide-react';
import { useToast } from '@/components/Pharmacy components/ui/use-toast';
import { useSettings } from '@/Pharmacy contexts/PharmacySettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/Pharmacy components/ui/dialog';

interface SettingsProps {
  isUrdu: boolean;
  setIsUrdu: (value: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ isUrdu, setIsUrdu }) => {
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (settings.language) {
      setIsUrdu(settings.language === 'ur');
    }
  }, [settings.language, setIsUrdu]);

  const text = {
    en: {
      title: 'Settings',
      company: 'Company Settings',
      system: 'System Settings',
      backup: 'Backup & Security',
      companyName: 'Company Name',
      companyAddress: 'Company Address',
      companyPhone: 'Phone Number',
      companyEmail: 'Email Address',
      companyLogo: 'Company Logo',
      taxRate: 'Tax Rate (%)',
      currency: 'Currency',
      dateFormat: 'Date Format',
      language: 'Language',
      discountRate: 'Discount Rate (%)',
      enableNotifications: 'Enable Notifications',
      autoBackup: 'Auto Backup',
      printReceipts: 'Auto Print Receipts',
      barcodeScanning: 'Enable Barcode Scanning',
      billingFooter: 'Billing Footer',
      selectedPrinter: 'Selected Printer',
      
      save: 'Save Settings',
      
      settingsSaved: 'Settings saved successfully',
      settingsError: 'Failed to save settings',
      logoUpdated: 'Logo updated successfully',
      logoError: 'Failed to update logo',
      cancel: 'Cancel',
      confirmDelete: 'Confirm Delete'
    },
    ur: {
      title: 'ترتیبات',
      company: 'کمپنی کی ترتیبات',
      system: 'سسٹم کی ترتیبات',
      backup: 'بیک اپ اور سیکیورٹی',
      companyName: 'کمپنی کا نام',
      companyAddress: 'کمپنی کا پتہ',
      companyPhone: 'فون نمبر',
      companyEmail: 'ای میل ایڈریس',
      companyLogo: 'کمپنی کا لوگو',
      taxRate: 'ٹیکس کی شرح (%)',
      currency: 'کرنسی',
      dateFormat: 'تاریخ کی شکل',
      language: 'زبان',
      discountRate: 'رعایتی شرح (%)',
      enableNotifications: 'اطلاعات کو فعال کریں',
      autoBackup: 'خودکار بیک اپ',
      printReceipts: 'رسیدیں خودکار پرنٹ کریں',
      barcodeScanning: 'بارکوڈ اسکیننگ کو فعال کریں',
      billingFooter: 'بلنگ فوٹر',
      selectedPrinter: 'منتخب پرنٹر',
      
      save: 'ترتیبات محفوظ کریں',
      
      settingsSaved: 'ترتیبات کامیابی سے محفوظ ہو گئیں',
      settingsError: 'ترتیبات محفوظ کرنے میں ناکامی',
      logoUpdated: 'لوگو کامیابی سے اپ ڈیٹ ہو گیا',
      logoError: 'لوگو اپ ڈیٹ کرنے میں ناکامی',
      cancel: 'منسوخ کریں',
      confirmDelete: 'حذف کی تصدیق کریں'
    }
  };

  const t = isUrdu ? text.ur : text.en;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const newLogo = reader.result as string;
        const updatedSettings = { ...localSettings, logo: newLogo };
        setLocalSettings(updatedSettings);
        updateSettings(updatedSettings);
        toast({ title: t.logoUpdated });
      };
      reader.onerror = () => {
        toast({ title: t.logoError, variant: 'destructive' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    try {
      updateSettings(localSettings);
      toast({ title: t.settingsSaved });
    } catch (error) {
      toast({ title: t.settingsError, variant: 'destructive' });
    }
  };

  

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <SettingsIcon className="mr-3 h-8 w-8" />
        {t.title}
      </h1>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company"><Building className="mr-2 h-4 w-4"/>{t.company}</TabsTrigger>
          <TabsTrigger value="system"><SettingsIcon className="mr-2 h-4 w-4"/>{t.system}</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader><CardTitle>{t.company}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">{t.companyName}</Label>
                  <Input id="companyName" name="companyName" value={localSettings.companyName || ''} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="companyPhone">{t.companyPhone}</Label>
                  <Input id="companyPhone" name="companyPhone" value={localSettings.companyPhone || ''} onChange={handleInputChange} />
                </div>
              </div>
              <div>
                <Label htmlFor="companyAddress">{t.companyAddress}</Label>
                <Textarea id="companyAddress" name="companyAddress" value={localSettings.companyAddress || ''} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="companyEmail">{t.companyEmail}</Label>
                <Input id="companyEmail" name="companyEmail" type="email" value={localSettings.companyEmail || ''} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="footerText">{t.billingFooter}</Label>
                <Textarea id="footerText" name="footerText" value={localSettings.footerText || ''} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="logo">{t.companyLogo}</Label>
                <div className="flex items-center gap-4">
                  {localSettings.logo && <img src={localSettings.logo} alt="Company Logo" className="h-16 w-16 object-contain rounded-md border p-1" />}
                  <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} className="max-w-xs" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader><CardTitle>{t.system}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="taxRate">{t.taxRate}</Label>
                  <Input id="taxRate" name="taxRate" type="number" value={localSettings.taxRate || ''} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="discountRate">{t.discountRate}</Label>
                  <Input id="discountRate" name="discountRate" type="number" value={(localSettings as any).discountRate || ''} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="currency">{t.currency}</Label>
                  <Input id="currency" name="currency" value={localSettings.currency || ''} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="dateFormat">{t.dateFormat}</Label>
                  <Select name="dateFormat" value={localSettings.dateFormat} onValueChange={(v) => handleSelectChange('dateFormat', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy/mm/dd">YYYY/MM/DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Language and printer selection removed */}
              {/* System toggles removed */}
            </CardContent>
          </Card>
        </TabsContent>

        

      </Tabs>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="mr-2 h-5 w-5" />
          {t.save}
        </Button>
      </div>

      

    </div>
  );
};

export default Settings;
