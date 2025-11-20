import axios from 'axios';

export const getMedicines = async () => {
  const res = await axios.get('/api/medicines');
  return res.data;
};

export const searchMedicines = async (q: string, limit: number = 50) => {
  if (!q?.trim()) return [] as any[];
  const res = await axios.get('/api/medicines/search', {
    params: { q, limit }
  });
  return res.data;
};
