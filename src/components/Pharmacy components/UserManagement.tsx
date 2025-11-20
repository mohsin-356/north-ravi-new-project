import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import * as userService from '@/services/userService';
import { Eye, EyeOff } from 'lucide-react';

interface User {
  _id: string;
  username: string;
  role: 'admin' | 'manager' | 'pharmacist' | 'salesman';
}

const UserManagement: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<User & { password?: string }>>({});
  const [newUser, setNewUser] = useState<{ username: string; password: string; role: User['role'] }>({ username: '', password: '', role: 'salesman' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user._id);
    setEditData({ ...user });
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    try {
      await userService.updateUser(editingId, editData);
      toast({ title: 'User updated successfully' });
      setEditingId(null);
      setEditData({});
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
      toast({ title: err.message || 'Failed to update user', variant: 'destructive' });
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    try {
      await userService.createUser({ username: newUser.username, password: newUser.password, role: newUser.role });
      toast({ title: 'User created successfully' });
      setNewUser({ username: '', password: '', role: 'salesman' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      toast({ title: err.message || 'Failed to create user', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.deleteUser(id);
      toast({ title: 'User deleted' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      toast({ title: err.message || 'Failed to delete user', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-r from-[#3f2b96] via-[#a8c0ff] to-[#70e1f5] animate-gradient-slow p-6"> 
      {/* Decorative shapes */}
      <div className="absolute -top-10 -left-10 w-72 h-72 bg-purple-300 opacity-30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-300 opacity-20 rounded-full blur-3xl animate-pulse"></div>
      <div className="pill-3d saturate-150" style={{ top: '25%', left: '70%' }}></div>
      <div className="pill-3d saturate-150" style={{ top: '75%', left: '20%', transform: 'rotateX(15deg) rotateY(25deg) rotateZ(10deg)' }}></div>

      <div className="max-w-4xl w-full">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <h2 className="font-semibold mb-2">All Users</h2>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <table className="w-full mb-4 text-left shadow-lg rounded-lg overflow-hidden backdrop-blur bg-white/60">
              <thead>
                <tr>
                  <th className="p-2 border">Username</th>
                  <th className="p-2 border">Role</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id} className="even:bg-white/60 hover:bg-white/80 transition-colors">
                    <td className="p-2 border">{editingId === user._id ? (
                      <Input
                        value={(editData as any).username || ''}
                        onChange={e => setEditData({ ...(editData as any), username: e.target.value })}
                      />
                    ) : user.username}</td>
                    <td className="p-2 border">{editingId === user._id ? (
                      <Select value={editData.role as string} onValueChange={val => setEditData({ ...editData, role: val as User['role'] })}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="pharmacist">Pharmacist</SelectItem>
                          <SelectItem value="salesman">Salesman</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : user.role}</td>
                    <td className="p-2 border">
                      {editingId === user._id ? (
                        <>
                          <Button size="sm" onClick={handleEditSave}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                          <div className="relative mt-1">
                            <Input
                              placeholder="New Password (optional)"
                              type={showEditPassword ? "text" : "password"}
                              value={editData.password || ''}
                              onChange={e => setEditData({ ...editData, password: e.target.value })}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                              onClick={() => setShowEditPassword(v => !v)}
                              tabIndex={-1}
                            >
                              {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => handleEdit(user)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(user._id)}>Delete</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 className="font-semibold mb-2">Add New User</h2>
          <div className="flex flex-col gap-4 md:flex-row md:items-end mb-4 bg-white/70 backdrop-blur rounded-xl p-4 shadow-lg">
            <Input
              placeholder="Username"
              value={newUser.username}
              onChange={e => setNewUser({ ...newUser, username: e.target.value })}
            />
            <Select value={newUser.role} onValueChange={val => setNewUser({ ...newUser, role: val as User['role'] })}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="pharmacist">Pharmacist</SelectItem>
                <SelectItem value="salesman">Salesman</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Input
                placeholder="Password"
                type={showNewUserPassword ? "text" : "password"}
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowNewUserPassword(v => !v)}
                tabIndex={-1}
              >
                {showNewUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Button onClick={handleAddUser}>Add User</Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
};

export default UserManagement;
