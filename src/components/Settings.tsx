
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Hospital, Save, Camera, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSettings } from '@/contexts/SettingsContext';

const Settings = () => {
  // License & Security UI removed

  const { settings, setSettings } = useSettings();
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalLogo, setHospitalLogo] = useState('');
  const [hospitalCode, setHospitalCode] = useState(localStorage.getItem('hospitalCode') || 'SAFH');
  const [mrFormat, setMrFormat] = useState(localStorage.getItem('mrNumberFormat') || '{HOSP}/{DEPT}/{YEAR}/{MONTH}/{SERIAL}');
  // Auth context not required here

  // Departments management removed; OPD assumed as default in examples

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadSettings();
    // Also fetch from backend so values persist across devices
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = await res.json();
        if (data) {
          if (typeof data.hospitalName === 'string') setHospitalName(data.hospitalName);
          if (typeof data.hospitalLogo === 'string') setHospitalLogo(data.hospitalLogo);
          if (typeof data.hospitalCode === 'string') setHospitalCode(data.hospitalCode);
          // Reflect in context and cache for components that still rely on localStorage
          try {
            if (data.hospitalName) localStorage.setItem('hospitalName', data.hospitalName);
            if (data.hospitalLogo) localStorage.setItem('hospitalLogo', data.hospitalLogo);
            if (data.hospitalCode) localStorage.setItem('hospitalCode', data.hospitalCode);
          } catch {}
          setSettings({ hospitalName: data.hospitalName || settings.hospitalName });
        }
      } catch {}
    })();
  }, []);

  const loadSettings = () => {
    setHospitalName(localStorage.getItem('hospitalName') || settings.hospitalName || 'Hospital Name');
    setHospitalPhone(localStorage.getItem('hospitalPhone') || '+92-XXX-XXXXXXX');
    setHospitalAddress(localStorage.getItem('hospitalAddress') || 'Hospital Address, City, Country');
    setHospitalLogo(localStorage.getItem('hospitalLogo') || '');
    setHospitalCode(localStorage.getItem('hospitalCode') || 'SAFH');
    setMrFormat(localStorage.getItem('mrNumberFormat') || '{HOSP}/{DEPT}/{YEAR}/{MONTH}/{SERIAL}');
  };

  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  const saveSettings = async () => {
    // Save to backend (source of truth)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalName: hospitalName?.trim() || '',
          hospitalLogo: hospitalLogo || '',
          hospitalCode: hospitalCode?.trim() || '',
        }),
      });
    } catch {}

    // Keep local caches for other components
    localStorage.setItem('hospitalName', hospitalName);
    localStorage.setItem('hospitalPhone', hospitalPhone);
    localStorage.setItem('hospitalAddress', hospitalAddress);
    localStorage.setItem('hospitalLogo', hospitalLogo);
    localStorage.setItem('hospitalCode', hospitalCode);
    localStorage.setItem('mrNumberFormat', mrFormat);
    localStorage.setItem('hospitalInfo', JSON.stringify({
      name: hospitalName,
      phone: hospitalPhone,
      address: hospitalAddress,
      logoUrl: hospitalLogo,
      code: hospitalCode,
    }));
    setSettings({ hospitalName: hospitalName || 'Hospital Name' });
    setShowSavedModal(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHospitalLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoRemove = () => {
    setHospitalLogo('');
    localStorage.removeItem('hospitalLogo');
  };

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    // In a real app, you would validate the current password here
    alert('Password changed successfully');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const clearAllData = () => {
    const confirmMessage = `This action will permanently delete:
    • All patient tokens and records
    • All doctor information
    • All financial data and expenses
    • All reports and analytics
    
    Hospital settings and password will be preserved.
    Token counter will reset to 1.
    
    This action cannot be undone. Are you sure?`;
    
    if (confirm(confirmMessage)) {
      const doubleConfirm = confirm('Are you absolutely sure? This will delete ALL hospital data except settings.');
      
      if (doubleConfirm) {
        // Clear all data except settings and password
        localStorage.removeItem('tokens');
        localStorage.removeItem('patients');
        localStorage.removeItem('doctors');
        localStorage.removeItem('expenses');
        localStorage.removeItem('dailyTokenCounter');
        localStorage.removeItem('lastTokenDate');
        localStorage.removeItem('mrCounter_2024');
        localStorage.removeItem('mrCounter_2025');
        localStorage.removeItem('lastMRYear');
        
        // Reset counters
        localStorage.setItem('dailyTokenCounter', '1');
        localStorage.setItem('lastTokenDate', new Date().toDateString());
        
        alert('All data has been cleared successfully. Token counter reset to 1.');
        window.location.reload();
      }
    }
  };

  const exportData = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) as string;
      data[key] = localStorage.getItem(key);
    }
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hospital-data-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          for (const key in data) {
            localStorage.setItem(key, data[key]);
          }
          alert('Data imported successfully! Please refresh the page.');
          window.location.reload();
        } catch (error) {
          alert('Failed to import data. Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg">Hospital Settings</h1>
            <p className="text-lg opacity-90 font-medium">Manage hospital information, security, and data.</p>
          </div>
          <div className="mt-6 lg:mt-0 bg-white/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <SettingsIcon className="h-20 w-20 text-white opacity-80" />
          </div>
        </div>
      </div>

      <Tabs defaultValue="hospital" className="mt-6">
        <TabsList className="flex flex-wrap gap-2 overflow-x-auto">
          <TabsTrigger value="hospital">Hospital</TabsTrigger>
        </TabsList>

        <TabsContent value="hospital" className="mt-6">
          <Card className="border-t-4 border-t-blue-600 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Hospital className="h-6 w-6 text-blue-600" />
                <span className="font-poppins font-semibold">Hospital Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hospitalName" className="font-poppins font-medium text-gray-700">Hospital Name</Label>
              <Input
                id="hospitalName"
                value={hospitalName}
                onChange={(e) => {
                  const v = e.target.value;
                  setHospitalName(v);
                  // Live update header via SettingsContext
                  setSettings({ hospitalName: v || 'Hospital Name' });
                }}
                placeholder="Enter hospital name"
                className="border-gray-300 focus:border-blue-500 font-poppins"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hospitalPhone" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                <Phone className="h-4 w-4 text-green-600" />
                <span>Hospital Phone</span>
              </Label>
              <Input
                id="hospitalPhone"
                value={hospitalPhone}
                onChange={(e) => setHospitalPhone(e.target.value)}
                placeholder="Enter hospital phone number"
                className="border-gray-300 focus:border-blue-500 font-poppins"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="hospitalAddress" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                <MapPin className="h-4 w-4 text-red-600" />
                <span>Hospital Address</span>
              </Label>
              <Input
                id="hospitalAddress"
                value={hospitalAddress}
                onChange={(e) => setHospitalAddress(e.target.value)}
                placeholder="Enter hospital address"
                className="border-gray-300 focus:border-blue-500 font-poppins"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hospitalLogo" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
              <Camera className="h-4 w-4 text-purple-600" />
              <span>Hospital Logo</span>
            </Label>
            <div className="flex items-center space-x-4">
              <Input
                type="file"
                id="hospitalLogo"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Label htmlFor="hospitalLogo" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-poppins font-semibold px-4 py-2 rounded-lg cursor-pointer">
                Upload Logo
              </Label>
              {hospitalLogo && (
                <>
                  <img src={hospitalLogo} alt="Hospital Logo" className="max-h-12 max-w-24 rounded-md" />
                  <Button type="button" onClick={handleLogoRemove} variant="outline">
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hospitalCode" className="font-poppins font-medium text-gray-700">Hospital Code</Label>
            <Input
              id="hospitalCode"
              value={hospitalCode}
              onChange={e => setHospitalCode(e.target.value.toUpperCase())}
              placeholder="e.g. SAFH, DUF, ABC"
              className="border-gray-300 focus:border-blue-500 font-poppins"
              maxLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mrFormat" className="font-poppins font-medium text-gray-700">MR Number Format</Label>
            <Input
              id="mrFormat"
              value={mrFormat}
              onChange={e => setMrFormat(e.target.value)}
              placeholder="e.g. DUF/{DEPT}/{YEAR}/{MONTH}/{SERIAL} or MR-{YEAR}-{SERIAL}"
              className="border-gray-300 focus:border-blue-500 font-poppins"
            />
            <div className="text-xs text-gray-500 mt-1 font-poppins">
              Example: {mrFormat
                .replace('{HOSP}', hospitalCode || 'SAFH')
                .replace('{DEPT}', 'OPD')
                .replace('{YEAR}', '2025')
                .replace('{MONTH}', '06')
                .replace('{SERIAL}', '001')}
            </div>
          </div>


          <Button 
            onClick={saveSettings}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-poppins font-semibold shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Information
          </Button>

          {/* Settings Saved Modal */}
          {showSavedModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white rounded-xl shadow-2xl px-8 py-6 max-w-xs w-full text-center relative">
                <div className="text-green-600 text-3xl mb-2">✓</div>
                <div className="font-semibold text-lg mb-3 font-poppins">Settings saved successfully!</div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full font-poppins" onClick={() => setShowSavedModal(false)}>OK</Button>
                <button
                  className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold"
                  onClick={() => setShowSavedModal(false)}
                  aria-label="Close"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >×</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Data tab removed */}
      </Tabs>
    </div>
  );
};

export default Settings;
