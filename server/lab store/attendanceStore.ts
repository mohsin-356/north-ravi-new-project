// In-memory attendance store shared across routes.
// Replace with persistent DB model in future.

export interface AttendanceRecord {
  staffId: string;
  staffName?: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "leave";
  checkInTime?: string;
  checkOutTime?: string;
}

export const attendanceMemory: AttendanceRecord[] = [];
