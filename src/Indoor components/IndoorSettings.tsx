import React from 'react';
import { useIndoorSettings } from '@/Indoor contexts/SettingsContext';
import { Lock } from 'lucide-react';

const IndoorSettings: React.FC = () => {
  const { settings, updateSettings } = useIndoorSettings();
  const [tab, setTab] = React.useState<'company' | 'system'>('company');
  const [form, setForm] = React.useState({ ...settings });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { setForm({ ...settings }); }, [settings]);
  const onChange = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const onLogoChange = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange('logo', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const onSave = async () => { setSaving(true); try { await updateSettings(form); } finally { setSaving(false); } };

  return (
    <div className="space-y-3">
      <div className="text-2xl font-semibold">Settings</div>
      <div className="flex items-center gap-2">
        <button className={`px-3 py-1 rounded border ${tab==='company' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}`} onClick={()=>setTab('company')}>Company Settings</button>
        <button className={`px-3 py-1 rounded border ${tab==='system' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}`} onClick={()=>setTab('system')}>System Settings</button>
      </div>

      {tab === 'company' && (
        <div className="p-3 bg-white border rounded-md space-y-3">
          <div className="text-lg font-semibold">Company Settings</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm mb-1">Company Name</div>
              <input className="w-full border rounded px-3 py-2" value={form.companyName || ''} onChange={e=>onChange('companyName', e.target.value)} />
            </div>
            <div>
              <div className="text-sm mb-1">Phone Number</div>
              <input className="w-full border rounded px-3 py-2" value={form.companyPhone || ''} onChange={e=>onChange('companyPhone', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm mb-1">Company Address</div>
              <textarea className="w-full border rounded px-3 py-2" rows={3} value={form.companyAddress || ''} onChange={e=>onChange('companyAddress', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm mb-1">Email Address</div>
              <input className="w-full border rounded px-3 py-2" value={form.companyEmail || ''} onChange={e=>onChange('companyEmail', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm mb-1">Billing Footer</div>
              <textarea className="w-full border rounded px-3 py-2" rows={3} value={form.footerText || ''} onChange={e=>onChange('footerText', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm mb-1">Company Logo</div>
              <div className="flex items-center gap-3">
                <input type="file" accept="image/*" onChange={e=>onLogoChange(e.target.files?.[0])} className="border rounded px-3 py-2" />
                {form.logo && <img src={form.logo} alt="logo" className="h-10" />}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded bg-indigo-600 text-white inline-flex items-center gap-2 disabled:opacity-50"><Lock className="h-4 w-4" /> {saving?'Saving…':'Save Settings'}</button>
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div className="p-3 bg-white border rounded-md space-y-3">
          <div className="text-lg font-semibold">System Settings</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-sm mb-1">Tax Rate (%)</div>
              <input className="w-full border rounded px-3 py-2" value={form.taxRate || ''} onChange={e=>onChange('taxRate', e.target.value)} />
            </div>
            <div>
              <div className="text-sm mb-1">Discount Rate (%)</div>
              <input className="w-full border rounded px-3 py-2" value={form.discountRate || ''} onChange={e=>onChange('discountRate', e.target.value)} />
            </div>
            <div>
              <div className="text-sm mb-1">Currency</div>
              <input className="w-full border rounded px-3 py-2" value={form.currency || ''} onChange={e=>onChange('currency', e.target.value)} />
            </div>
            <div>
              <div className="text-sm mb-1">Date Format</div>
              <select className="w-full border rounded px-3 py-2" value={form.dateFormat || ''} onChange={e=>onChange('dateFormat', e.target.value)}>
                <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                <option value="yyyy-mm-dd">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded bg-indigo-600 text-white inline-flex items-center gap-2 disabled:opacity-50"><Lock className="h-4 w-4" /> {saving?'Saving…':'Save Settings'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndoorSettings;
