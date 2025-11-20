import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Edit, Trash2, Eye, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import ConfirmStaffDeleteDialog from '@/components/staff attendance/ConfirmStaffDeleteDialog';
import StaffForm from '@/components/staff attendance/StaffForm';
import StaffReport from '@/components/staff attendance/StaffReport';
import { getStaff as fetchStaff, updateStaff as apiUpdateStaff, addStaff as apiAddStaff, deleteStaff as apiDeleteStaff, clockIn as apiClockIn, clockOut as apiClockOut } from '@/utils/staffService';

const t = {
  title: 'Staff & Attendance',
  staffManagement: 'Staff Management',
  searchPlaceholder: 'Search staff...',
  addStaff: 'Add Staff',
  active: 'Active',
  inactive: 'Inactive',
  phone: 'Phone',
  email: 'Email',
  salary: 'Salary',
  joinDate: 'Join Date',
};

function formatTime(iso?: string) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const StaffManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showStaffReport, setShowStaffReport] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [loadingButton, setLoadingButton] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    fetchStaff().then(setStaff).catch(console.error);
  }, []);

  const filteredStaff = useMemo(() =>
    staff.filter((m:any) =>
      (m.name||'').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.position||'').toLowerCase().includes(searchTerm.toLowerCase())
    )
  , [staff, searchTerm]);

  const handleEditStaff = (member: any) => { setEditingStaff(member); setShowStaffForm(true); };

  const handleSaveStaff = async (formData: any) => {
    try {
      const payload: any = {
        name: formData.name?.trim(),
        position: formData.position,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        status: formData.status || 'active',
      };
      if (formData.salary) payload.salary = Number(formData.salary);
      if (formData.joinDate) payload.joinDate = new Date(formData.joinDate);
      if (editingStaff && editingStaff._id) await apiUpdateStaff(editingStaff._id, payload);
      else await apiAddStaff(payload);
      const refreshed = await fetchStaff();
      setStaff(refreshed);
    } catch (err) {
      console.error('Failed to save staff:', err);
    }
  };

  const handleRequestDeleteStaff = (member: any) => { setStaffToDelete(member); setDeleteDialogOpen(true); };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    try {
      if (staffToDelete._id) await apiDeleteStaff(staffToDelete._id);
      setStaff((prev:any[]) => prev.filter(s => (s._id || s.id) !== (staffToDelete._id || staffToDelete.id)));
      toast({ title: 'Staff deleted' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to delete staff' });
    } finally {
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    }
  };

  const handleViewProfile = (member: any) => {
    const attendance = member.attendance || [];
    const totalLeaves = attendance.filter((a:any)=> (a.status||'').toLowerCase()==='leave').length;
    const totalDeductions = member.totalDeductions ?? 0;
    const salary = member.salary ?? member.baseSalary ?? 0;
    const status = (member.status || 'inactive').toLowerCase();
    setSelectedEmployee({ ...member, attendance, totalLeaves, totalDeductions, salary, status });
    setShowProfile(true);
  };

  const handleClockInOut = async (member: any, action: 'in'|'out') => {
    if (!member._id) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const btnId = member._id + '-' + (action==='in'?'in':'out');
    setLoadingButton(btnId);
    try {
      if (action==='in') {
        const updated = await apiClockIn(member._id);
        setStaff(prev => prev.map(s => s._id === member._id ? { ...s, attendance: [...(s.attendance || []).filter((a:any)=> a.date!==todayStr), updated] } : s));
        toast({ title: 'Clocked in', description: `${member.name} clocked in at ${updated.checkIn}` });
      } else {
        const updated = await apiClockOut(member._id);
        setStaff(prev => prev.map(s => s._id === member._id ? { ...s, attendance: [...(s.attendance || []).filter((a:any)=> a.date!==todayStr), updated] } : s));
        toast({ title: 'Clocked out', description: `${member.name} clocked out at ${updated.checkOut}` });
      }
    } catch (err:any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.response?.data?.message || err.message });
    } finally { setLoadingButton(null); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center justify-end">
          <div className="relative w-full sm:w-64">
            <Input placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowStaffReport(true)}>
              <FileText className="h-4 w-4 mr-2" /> Staff Report
            </Button>
            <Button onClick={() => setShowStaffForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> {t.addStaff}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((member:any) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const attendanceToday = member.attendance?.find((a:any)=> a.date===todayStr);
          return (
            <Card key={member._id ?? member.id ?? member.email ?? member.phone} className="hover:shadow-md transition-all">
              <CardContent className="p-6">
                {attendanceToday ? (
                  <div className="mb-4 space-y-1 text-sm text-gray-700">
                    <div>Check-in: {formatTime(attendanceToday.checkIn)}</div>
                    <div>Check-out: {formatTime(attendanceToday.checkOut)}</div>
                  </div>
                ) : null}

                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{member.position}</p>
                    </div>
                  </div>
                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                    {member.status === 'active' ? t.active : t.inactive}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">{t.phone}: </span><span>{member.phone}</span></div>
                  <div><span className="font-medium">{t.email}: </span><span>{member.email}</span></div>
                  <div><span className="font-medium">{t.salary}: </span><span>PKR {parseInt(member.salary).toLocaleString()}</span></div>
                  <div><span className="font-medium">{t.joinDate}: </span><span>{member.joinDate}</span></div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="text-xs text-gray-500">ID: {member.id}</span>
                  <div className="flex space-x-1">
                    {member._id && (!attendanceToday || !attendanceToday.checkIn) ? (
                      <Button size="sm" className="mt-2" disabled={loadingButton===member._id+'-in'} onClick={() => handleClockInOut(member,'in')}>Clock In</Button>
                    ) : member._id && !attendanceToday?.checkOut ? (
                      <Button variant="outline" size="sm" className="mt-2" disabled={loadingButton===member._id+'-out'} onClick={() => handleClockInOut(member,'out')}>Clock Out</Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => handleEditStaff(member)}><Edit className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleRequestDeleteStaff(member)}><Trash2 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleViewProfile(member)}><Eye className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showStaffForm && (
        <StaffForm
          onClose={() => { setShowStaffForm(false); setEditingStaff(null); }}
          onSave={handleSaveStaff}
          staff={editingStaff}
        />
      )}

      {showStaffReport && (
        <StaffReport
          staffList={staff}
          attendanceRecords={[]}
          onClose={() => setShowStaffReport(false)}
          initialMonth={new Date().toISOString().slice(0,7)}
        />
      )}

      {deleteDialogOpen && staffToDelete && (
        <ConfirmStaffDeleteDialog
          isOpen={deleteDialogOpen}
          staffName={staffToDelete.name}
          onCancel={() => { setDeleteDialogOpen(false); setStaffToDelete(null); }}
          onConfirm={handleConfirmDelete}
        />
      )}

      {showProfile && selectedEmployee && (
        <Dialog open={showProfile} onOpenChange={setShowProfile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEmployee.name}'s Profile</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Base Salary</h3>
                  <p>{(selectedEmployee.salary || 0).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-medium">Status</h3>
                  <Badge variant={(selectedEmployee.status || '').toLowerCase() === 'active' ? 'default' : 'destructive'}>
                    {(selectedEmployee.status || 'inactive').toString().charAt(0).toUpperCase() + (selectedEmployee.status || 'inactive').toString().slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <h3 className="font-medium">Clock In/Out History</h3>
                <div className="space-y-2 mt-2">
                  {(selectedEmployee.attendance && selectedEmployee.attendance.length > 0) ? (
                    selectedEmployee.attendance.map((entry: any) => (
                      <div key={entry._id || entry.date} className="flex justify-between">
                        <span>{new Date(entry.date).toLocaleDateString()}</span>
                        <span>
                          {entry.checkIn ? `In: ${formatTime(entry.checkIn)}` : ''}
                          {entry.checkOut ? `  Out: ${formatTime(entry.checkOut)}` : ''}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No attendance records</p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StaffManagementPage;
