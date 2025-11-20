import React, { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, checkUsernameExists } from '@/hooks/useApi';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'receptionist' | 'doctor' | 'ipd';
  password?: string;
}

const emptyForm = { 
  username: '', 
  role: 'receptionist' as 'admin' | 'receptionist' | 'doctor' | 'ipd', 
  password: '' 
};

const UsersManagement: React.FC = () => {
  const { data: usersData } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (usersData) {
      setUsers(usersData.map((u: any) => ({
        id: u._id || u.id,
        username: u.username,
        role: u.role
      })));
    }
  }, [usersData]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password; // don't send empty password
      updateUser.mutate({ id: editingUser.id, payload }, {
        onSuccess: () => {
          toast.success('User updated successfully');
          setEditingUser(null);
          setForm(emptyForm);
          setShowForm(false);
        },
        onError: (error) => {
          toast.error(`Error updating user: ${error.message}`);
        }
      });
    } else {
      // Client-side check for duplicate username to provide instant feedback
      try {
        const res = await checkUsernameExists(form.username);
        if (res && (res.exists === true || res.exists === 1)) {
          toast.error('Username already exists. Please choose another.');
          return;
        }
      } catch (_) {
        // proceed; server will still validate
      }
      createUser.mutate(form, {
        onSuccess: () => {
          toast.success('User created successfully');
          setForm(emptyForm);
          setShowForm(false);
        },
        onError: (error: any) => {
          const msg = error?.message || 'Error creating user';
          toast.error(msg);
        }
      });
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setForm({ username: user.username, role: user.role, password: '' });
    setShowForm(true);
  };

  const confirmDelete = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const deleteUserHandler = () => {
    if (userToDelete) {
      deleteUser.mutate(userToDelete, {
        onSuccess: () => {
          toast.success('User deleted successfully');
          setDeleteDialogOpen(false);
        },
        onError: (error) => {
          toast.error(`Error deleting user: ${error.message}`);
        }
      });
    }
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold">User Management</CardTitle>
          <Button onClick={() => { setShowForm(true); setEditingUser(null); setForm(emptyForm); }} className="flex gap-1">
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-gray-500">No users found.</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{user.username}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-1"><Shield className="w-3 h-3" /> {user.role}</p>
                    {/* Name/Email removed */}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => startEdit(user)} className="bg-blue-500 hover:bg-blue-600 text-white p-2"><Edit className="w-3 h-3" /></Button>
                    <Button size="sm" onClick={() => confirmDelete(user.id)} className="bg-red-500 hover:bg-red-600 text-white p-2"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => handleChange('username', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select 
                value={form.role} 
                onChange={(e) => handleChange('role', e.target.value as 'admin' | 'receptionist' | 'doctor' | 'ipd')} 
                className="w-full border p-2 rounded-md"
              >
                <option value="admin">Admin</option>
                <option value="receptionist">Receptionist</option>
                <option value="doctor">Doctor</option>
                <option value="ipd">IPD Staff</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Password {editingUser && <span className="text-xs text-gray-500">(leave blank to keep current)</span>}</Label>
              <Input type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} required={!editingUser} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUserHandler}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersManagement;
