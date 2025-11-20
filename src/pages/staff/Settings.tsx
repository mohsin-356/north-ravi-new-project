import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { getAttendanceSettings, saveAttendanceSettings } from '@/utils/staffService';

const StaffSettingsPage: React.FC = () => {
  const [attendanceSettings, setAttendanceSettings] = useState(() => {
    const saved = localStorage.getItem('pharmacy_attendance_settings');
    return saved
      ? JSON.parse(saved)
      : {
          leaveDeduction: 0,
          lateDeduction: 0,
          earlyOutDeduction: 0,
          clockInTime: '09:00',
          clockOutTime: '18:00',
        };
  });

  useEffect(() => {
    getAttendanceSettings().then((s) => { if (s && s.value) setAttendanceSettings(s.value); }).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('pharmacy_attendance_settings', JSON.stringify(attendanceSettings));
  }, [attendanceSettings]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Staff & Attendance</h1>
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leave Deduction (Rs)</Label>
                <Input
                  type="number"
                  value={attendanceSettings.leaveDeduction}
                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, leaveDeduction: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Late Deduction (Rs)</Label>
                <Input
                  type="number"
                  value={attendanceSettings.lateDeduction}
                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, lateDeduction: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Early Out Deduction (Rs)</Label>
                <Input
                  type="number"
                  value={attendanceSettings.earlyOutDeduction}
                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, earlyOutDeduction: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Official Clock-in Time</Label>
                <Input
                  type="time"
                  value={attendanceSettings.clockInTime}
                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, clockInTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Official Clock-out Time</Label>
                <Input
                  type="time"
                  value={attendanceSettings.clockOutTime}
                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, clockOutTime: e.target.value })}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={async () => {
                try {
                  await saveAttendanceSettings(attendanceSettings);
                  toast({ title: 'Settings saved successfully' });
                } catch (err: any) {
                  toast({ variant: 'destructive', title: 'Failed to save', description: err.message || 'Server error' });
                }
              }}
            >
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffSettingsPage;
