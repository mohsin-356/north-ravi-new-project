import { api } from '@/lib/api';

const SETTINGS_PATH = '/pharmacy/settings';

export async function getSettings() {
  const res = await api.get(SETTINGS_PATH);
  return res.data;
}

export async function updateSettingsApi(data: any) {
  const res = await api.put(SETTINGS_PATH, data);
  return res.data;
}