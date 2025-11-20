import React, { useState, useEffect } from 'react';

export default function FinanceSettings() {
  const [orgName, setOrgName] = useState('Hospital Finance');
  const [currency, setCurrency] = useState('PKR');
  const [defaultRange, setDefaultRange] = useState<'today'|'thisMonth'|'thisYear'>('thisMonth');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load existing settings from localStorage (no backend endpoint)
    try {
      const raw = localStorage.getItem('finance_settings');
      if (raw) {
        const data = JSON.parse(raw);
        if (data) {
          setOrgName(data.orgName ?? orgName);
          setCurrency(data.currency ?? currency);
          setDefaultRange(data.defaultRange ?? defaultRange);
        }
      }
    } catch {/* ignore */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true); setMessage(null);
    try {
      // Persist locally (no backend endpoint exists)
      localStorage.setItem('finance_settings', JSON.stringify({ orgName, currency, defaultRange }));
      // Notify other parts of the app in the same tab
      try {
        window.dispatchEvent(new CustomEvent('finance_settings_updated', { detail: { orgName, currency, defaultRange } }));
      } catch {}
      setMessage('Settings saved locally');
    } catch {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance Settings</h1>
        <p className="text-gray-600">Configure defaults for the finance portal</p>
      </div>

      <div className="bg-white border rounded-2xl shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">Organization Name</label>
          <input className="mt-1 w-full border rounded-lg p-2" value={orgName} onChange={e=>setOrgName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <select className="mt-1 w-full border rounded-lg p-2" value={currency} onChange={e=>setCurrency(e.target.value)}>
            <option>PKR</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Default Date Range</label>
          <select className="mt-1 w-full border rounded-lg p-2" value={defaultRange} onChange={e=>setDefaultRange(e.target.value as any)}>
            <option value="today">Today</option>
            <option value="thisMonth">This Month</option>
            <option value="thisYear">This Year</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {message && <span className="text-sm text-gray-600">{message}</span>}
        </div>
      </div>
    </div>
  );
}
