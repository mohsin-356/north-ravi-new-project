import React from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useSettings } from '@/contexts/SettingsContext';

const AdminSettings: React.FC = () => {
  const { settings, setSettings } = useSettings();
  const [hospitalName, setHospitalName] = React.useState<string>(settings.hospitalName);
  const [saving, setSaving] = React.useState(false);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSettings({ hospitalName });
    setTimeout(() => setSaving(false), 300); // tiny UX delay
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Settings</h1>
        <form onSubmit={onSave} className="space-y-4 bg-white p-4 border rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="w-full h-10 rounded-md border px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter hospital name"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setHospitalName(settings.hospitalName)}
              className="inline-flex items-center justify-center h-10 px-4 rounded-md border hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
