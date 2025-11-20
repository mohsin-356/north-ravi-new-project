import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Database, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { API_URL } from '@/lib/api';

const Backup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  type BackupFrequency = 'none' | 'hourly' | '6h' | '12h' | 'daily' | 'weekly' | 'monthly';
const [backupFrequency, setBackupFrequency] = useState<BackupFrequency>(
  (localStorage.getItem('backupFrequency') as BackupFrequency) || 'none'
);
  const [lastBackup, setLastBackup] = useState<string>(localStorage.getItem('lastBackupTime') || 'Never');
  const [nextBackup, setNextBackup] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  const { toast } = useToast();
  const backupTimer = React.useRef<NodeJS.Timeout | null>(null);
  // NodeJS.setInterval returns Timeout, not Interval. Fix type error:
  const backupInterval = React.useRef<NodeJS.Timeout | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState<string>('60');
  const [folderPath, setFolderPath] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string>('');

  // Enhanced backup scheduling function
  const scheduleBackup = (frequency: BackupFrequency, customTime?: string) => {
    // Clear any existing timers
    if (backupTimer.current) {
      clearTimeout(backupTimer.current);
    }
    if (backupInterval.current) {
      clearInterval(backupInterval.current);
    }

    if (frequency === 'none') {
      setNextBackup('');
      return;
    }

    const now = new Date();
    let nextBackup = new Date(now);
    let initialDelay = 0;

    // Parse custom time or use default (2:00 AM)
    const [hours = 2, minutes = 0] = (customTime || '02:00').split(':').map(Number);

    switch (frequency) {
      case 'hourly':
        nextBackup.setMinutes(now.getMinutes() + 60 - now.getMinutes() % 60, 0, 0);
        initialDelay = nextBackup.getTime() - now.getTime();
        backupTimer.current = setTimeout(() => {
          exportData(true);
          backupInterval.current = setInterval(() => exportData(true), 60 * 60 * 1000);
        }, initialDelay);
        break;
      case '6h':
        {
          const currentHour = now.getHours();
          const nextHour = Math.ceil((currentHour + 1) / 6) * 6;
          nextBackup.setHours(nextHour, 0, 0, 0);
          if (nextBackup <= now) nextBackup.setHours(nextBackup.getHours() + 6);
          initialDelay = nextBackup.getTime() - now.getTime();
          backupTimer.current = setTimeout(() => {
            exportData(true);
            backupInterval.current = setInterval(() => exportData(true), 6 * 60 * 60 * 1000);
          }, initialDelay);
        }
        break;
      case '12h':
        {
          const currentHour = now.getHours();
          const nextHour = Math.ceil((currentHour + 1) / 12) * 12;
          nextBackup.setHours(nextHour, 0, 0, 0);
          if (nextBackup <= now) nextBackup.setHours(nextBackup.getHours() + 12);
          initialDelay = nextBackup.getTime() - now.getTime();
          backupTimer.current = setTimeout(() => {
            exportData(true);
            backupInterval.current = setInterval(() => exportData(true), 12 * 60 * 60 * 1000);
          }, initialDelay);
        }
        break;
      case 'daily':
        nextBackup.setHours(hours, minutes, 0, 0);
        if (nextBackup <= now) {
          nextBackup.setDate(nextBackup.getDate() + 1);
        }
        initialDelay = nextBackup.getTime() - now.getTime();
        backupTimer.current = setTimeout(() => {
          exportData(true);
          backupInterval.current = setInterval(() => exportData(true), 24 * 60 * 60 * 1000);
        }, initialDelay);
        break;
      case 'weekly':
        nextBackup.setHours(hours, minutes, 0, 0);
        // Find next occurrence of the same weekday (for now, just next week)
        if (nextBackup <= now) {
          nextBackup.setDate(nextBackup.getDate() + 7);
        }
        initialDelay = nextBackup.getTime() - now.getTime();
        backupTimer.current = setTimeout(() => {
          exportData(true);
          backupInterval.current = setInterval(() => exportData(true), 7 * 24 * 60 * 60 * 1000);
        }, initialDelay);
        break;
      case 'monthly':
        nextBackup.setHours(hours, minutes, 0, 0);
        nextBackup.setDate(1);
        if (nextBackup <= now) {
          nextBackup.setMonth(nextBackup.getMonth() + 1);
        }
        initialDelay = nextBackup.getTime() - now.getTime();
        backupTimer.current = setTimeout(() => {
          exportData(true);
          backupInterval.current = setInterval(() => exportData(true), 30 * 24 * 60 * 60 * 1000); // Approximate monthly
        }, initialDelay);
        break;
      default:
        break;
    }

    setNextBackup(nextBackup.toLocaleString());
    setLastBackup(new Date().toLocaleString());
    localStorage.setItem('lastBackupTime', new Date().toLocaleString());
  };

  // Fix syntax error by removing stray braces
  const getDataStatistics = () => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '[]');
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    // Doctors are stored in the backend; do not read from localStorage
    const doctorCount = 0;
    
    return {
      tokenCount: tokens.length,
      patientCount: patients.length,
      doctorCount,
      totalSize: Math.round((JSON.stringify({tokens, patients}).length / 1024) * 100) / 100
    };
  };

  // Persist frequency
  useEffect(() => {
    localStorage.setItem('backupFrequency', backupFrequency);
  }, [backupFrequency]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const r = await axios.get(`${API_URL}/api/backup/settings`, { headers: { Authorization: `Bearer ${token||''}` }});
        const s = r.data || {};
        setAutoEnabled(!!s.enabled);
        setIntervalMinutes(String(s.intervalMinutes ?? '60'));
        setFolderPath(String(s.folderPath || ''));
        if (s.lastRunAt) setLastRunAt(new Date(s.lastRunAt).toLocaleString());
      } catch {}
    })();
  }, []);

  const handleFrequencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const freq = e.target.value as BackupFrequency;
    setBackupFrequency(freq);
    scheduleBackup(freq, customTime);
    // Persist to backend scheduler if available
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/backup/schedule`, { frequency: freq, time: customTime }, { headers: { Authorization: `Bearer ${token||''}` }});
    } catch {}
  };

  const handleCustomTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTime(e.target.value);
    scheduleBackup(backupFrequency, e.target.value);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/backup/schedule`, { frequency: backupFrequency, time: e.target.value }, { headers: { Authorization: `Bearer ${token||''}` }});
    } catch {}
  };

  const saveAutoSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { enabled: autoEnabled, intervalMinutes: Number(intervalMinutes || '0'), folderPath };
      const r = await axios.post(`${API_URL}/api/backup/settings`, payload, { headers: { Authorization: `Bearer ${token||''}` }});
      const s = r.data || {};
      setAutoEnabled(!!s.enabled);
      setIntervalMinutes(String(s.intervalMinutes ?? '60'));
      setFolderPath(String(s.folderPath || ''));
      if (s.lastRunAt) setLastRunAt(new Date(s.lastRunAt).toLocaleString());
      toast({ title: 'Settings Saved', description: 'Auto-backup settings updated.' });
    } catch (err) {
      toast({ title: 'Save Failed', description: 'Could not save auto-backup settings.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = async (silent: boolean = false) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Prefer backend export; fallback to local export if API unavailable
      const resp = await axios.get(`${API_URL}/api/backup`, { responseType: 'blob', headers: { Authorization: `Bearer ${token||''}` }}).catch(()=>null as any);
      if (resp && resp.data) {
        const blob = new Blob([resp.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `hospital-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback local snapshot
        const data = {
          tokens: JSON.parse(localStorage.getItem('tokens') || '[]'),
          patients: JSON.parse(localStorage.getItem('patients') || '[]'),
          settings: {
            hospitalName: localStorage.getItem('hospitalName') || '',
            hospitalLogo: localStorage.getItem('hospitalLogo') || '',
            primaryColor: localStorage.getItem('primaryColor') || '',
            address: localStorage.getItem('hospitalAddress') || '',
            phone: localStorage.getItem('hospitalPhone') || ''
          },
          exportDate: new Date().toISOString(),
          version: '1.0'
        };
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `hospital-backup-${new Date().toISOString().split('T')[0]}.json`; link.click();
        URL.revokeObjectURL(url);
      }
      if (!silent) toast({ title: 'Backup Created', description: 'Backup file downloaded.' });
      // inform backend that a backup occurred (optional)
      try { await axios.post(`${API_URL}/api/backup/mark`, { when: new Date().toISOString() }, { headers: { Authorization: `Bearer ${token||''}` }}); } catch {}
    } catch (error) {
      if (!silent) toast({ title: 'Backup Failed', description: 'There was an error creating the backup file.', variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const token = localStorage.getItem('token');
      const text = await file.text();
      const data = JSON.parse(text);
      // Prefer backend import with parsed JSON
      await axios.post(`${API_URL}/api/backup/restore`, data, { headers: { Authorization: `Bearer ${token||''}` }}).catch(async ()=>{
        // Fallback: restore to localStorage
        if (!data.tokens || !data.patients) throw new Error('Invalid backup file format');
        localStorage.setItem('tokens', JSON.stringify(data.tokens));
        localStorage.setItem('patients', JSON.stringify(data.patients));
        if (data.settings) {
          Object.entries(data.settings).forEach(([key, value]) => {
            if (value && key !== 'exportDate' && key !== 'version') localStorage.setItem(key, value as string);
          });
        }
      });
      toast({ title: 'Data Restored', description: 'Backup imported successfully.' });
      setTimeout(()=>window.location.reload(), 800);
    } catch (err) {
      toast({ title: 'Import Failed', description: 'The backup file is corrupted or server import failed.', variant: 'destructive' });
    } finally {
      event.target.value = '';
    }
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to DELETE ALL DATA? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/backup`, { headers: { Authorization: `Bearer ${token||''}` }}).catch(()=>{
        // fallback: clear local storage only
        const keysToRemove = ['tokens','patients','hospitalName','hospitalLogo','primaryColor','hospitalAddress','hospitalPhone'];
        keysToRemove.forEach(k=>localStorage.removeItem(k));
      });
      toast({ title: 'Data Cleared', description: 'All data has been removed.' });
      setTimeout(()=>window.location.reload(), 800);
    } catch {
      toast({ title: 'Delete Failed', description: 'Could not delete all data.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-poppins">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <SettingsIcon className="mr-3 h-8 w-8" />
        Settings
      </h1>

      <Card className="border rounded-2xl shadow bg-white max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-700" />
            Backup & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Manage your application data. It's recommended to create backups regularly.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button onClick={() => exportData()} disabled={isLoading}>
              {isLoading ? 'Processing…' : (<><Download className="mr-2 h-4 w-4"/>Backup Now</>)}
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4"/>Restore from Backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
            <Button variant="destructive" onClick={clearAllData}>
              <Trash2 className="mr-2 h-4 w-4"/>Delete All Data
            </Button>
          </div>

          <div className="text-xs text-gray-500">
            Last Backup: <span className="text-green-700 font-semibold">{lastBackup}</span>
            <span className="mx-2">•</span>
            Next Backup: <span className="text-blue-700 font-semibold">{nextBackup || 'Not scheduled'}</span>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">Auto Backup</div>
                <div className="text-xs text-gray-500">Periodically export a JSON backup to a local folder.</div>
              </div>
              <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="interval">Interval (minutes)</Label>
                <Input id="interval" type="number" min={1} value={intervalMinutes} onChange={(e)=>setIntervalMinutes(e.target.value)} placeholder="60" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="folder">Backup Folder Path</Label>
                <Input id="folder" value={folderPath} onChange={(e)=>setFolderPath(e.target.value)} placeholder="e.g. C:\\PharmacyBackups" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={saveAutoSettings} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Settings'}</Button>
              {lastRunAt && (<div className="text-xs text-gray-500">Last Auto Backup: <span className="font-medium">{lastRunAt}</span></div>)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default Backup;
