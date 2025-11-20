import axios from 'axios';

export interface AttendanceRecord {
  date: string; // ISO date string
  status: 'present' | 'absent' | 'leave' | 'half-day';
  checkIn?: string;
  checkOut?: string;
  note?: string;
}

export interface UIStaff {
  _id?: string; // Mongo
  id?: number; // local fallback
  name: string;
  position: string;
  phone?: string;
  email?: string;
  address?: string;
  salary?: number | string;
  joinDate?: string; // ISO date
  status?: 'active' | 'inactive';
  attendanceRecords?: AttendanceRecord[];
}

// Use a relative base so it works with whatever host/port the app runs on
// Point specifically to pharmacy staff endpoints mounted in server/index.js at /api/pharmacy/staff
const api = axios.create({
  baseURL: '/api/pharmacy/staff',
});

export const getStaff = async (): Promise<UIStaff[]> => {
  const res = await api.get('/');
  return res.data;
};

export const getStaffById = async (_id: string): Promise<UIStaff> => {
  const res = await api.get(`/${_id}`);
  return res.data;
};

export const addStaff = async (data: UIStaff): Promise<UIStaff> => {
  const res = await api.post('/', data);
  return res.data;
};

export const updateStaff = async (_id: string, data: Partial<UIStaff>): Promise<UIStaff> => {
  const res = await api.patch(`/${_id}`, data);
  return res.data;
};

export const clockIn = async (_id: string) => {
  const res = await api.post(`/${_id}/clock-in`);
  return res.data;
};

export const clockOut = async (_id: string) => {
  const res = await api.post(`/${_id}/clock-out`);
  return res.data;
};

export const getDailyAttendance = (date?: string) =>
  api.get('/attendance/daily', { params: { date } }).then(r => r.data);

export const getMonthlyAttendance = (month?: string) =>
  api.get('/attendance/monthly', { params: { month } }).then(r => r.data);

export const deleteStaff = async (_id: string): Promise<void> => {
  await api.delete(`/${_id}`);
};
