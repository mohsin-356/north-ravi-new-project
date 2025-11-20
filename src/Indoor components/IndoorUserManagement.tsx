import React from 'react';
import { indoorApi } from '@/Indoor lib/api';

type IndoorUser = { _id: string; username: string; role: string };

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'salesman', label: 'Salesman' },
];

const FieldInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`border rounded px-3 py-2 w-full ${props.className || ''}`} />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select {...props} className={`border rounded px-3 py-2 w-full ${props.className || ''}`}></select>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...rest }) => (
  <button {...rest} className={`px-3 py-2 rounded text-white ${className || ''}`} />
);

const IndoorUserManagement: React.FC = () => {
  const [users, setUsers] = React.useState<IndoorUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [newUsername, setNewUsername] = React.useState('');
  const [newRole, setNewRole] = React.useState<'admin' | 'salesman'>('salesman');
  const [newPassword, setNewPassword] = React.useState('');

  const [editId, setEditId] = React.useState<string | null>(null);
  const [editUsername, setEditUsername] = React.useState('');
  const [editRole, setEditRole] = React.useState<'admin' | 'salesman'>('salesman');
  const [editPassword, setEditPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const fetchUsers = async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await indoorApi.get('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally { setLoading(false); }
  };

  React.useEffect(() => { fetchUsers(); }, []);

  const resetNewForm = () => { setNewUsername(''); setNewRole('salesman'); setNewPassword(''); };

  const addUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      setError('Username and password are required');
      return;
    }
    setSaving(true); setError(null);
    try {
      await indoorApi.post('/users', { username: newUsername.trim(), password: newPassword, role: newRole });
      resetNewForm();
      await fetchUsers();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to add user';
      setError(msg);
    } finally { setSaving(false); }
  };

  const startEdit = (u: IndoorUser) => {
    setEditId(u._id);
    setEditUsername(u.username);
    setEditRole((u.role as any) === 'admin' ? 'admin' : 'salesman');
    setEditPassword('');
  };

  const cancelEdit = () => { setEditId(null); setEditUsername(''); setEditPassword(''); };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true); setError(null);
    try {
      const payload: any = { username: editUsername.trim(), role: editRole };
      if (editPassword.trim()) payload.password = editPassword.trim();
      await indoorApi.put(`/users/${editId}`, payload);
      cancelEdit();
      await fetchUsers();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to update user';
      setError(msg);
    } finally { setSaving(false); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    setSaving(true); setError(null);
    try {
      await indoorApi.delete(`/users/${id}`);
      await fetchUsers();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to delete user';
      setError(msg);
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-[70vh] flex items-start justify-center p-6 bg-gradient-to-r from-purple-600/30 via-indigo-400/20 to-cyan-300/30">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow border">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">User Management</h2>
        </div>

        <div className="p-4">
          <div className="text-sm font-medium mb-2">All Users</div>
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Username</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t">
                    <td className="px-3 py-2">
                      {editId === u._id ? (
                        <FieldInput value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username" />
                      ) : (
                        u.username
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editId === u._id ? (
                        <Select value={editRole} onChange={(e) => setEditRole(e.target.value as any)}>
                          {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </Select>
                      ) : (
                        u.role
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editId === u._id ? (
                        <div className="flex items-center gap-2">
                          <FieldInput type="password" placeholder="New Password (optional)" value={editPassword} onChange={(e)=>setEditPassword(e.target.value)} />
                          <Button className={`bg-blue-600 ${saving ? 'opacity-70' : ''}`} onClick={saveEdit} disabled={saving}>Save</Button>
                          <Button className="bg-gray-500" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button className="bg-blue-600" onClick={() => startEdit(u)}>Edit</Button>
                          <Button className="bg-red-600" onClick={() => deleteUser(u._id)}>Delete</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={3}>{loading ? 'Loading…' : 'No users found'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}

          <div className="mt-6 text-sm font-medium mb-2">Add New User</div>
          <div className="p-3 border rounded flex flex-col md:flex-row gap-2 items-stretch md:items-end">
            <div className="flex-1">
              <FieldInput placeholder="Username" value={newUsername} onChange={(e)=>setNewUsername(e.target.value)} />
            </div>
            <div className="w-full md:w-48">
              <Select value={newRole} onChange={(e)=>setNewRole(e.target.value as any)}>
                {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </div>
            <div className="flex-1">
              <FieldInput type="password" placeholder="Password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} />
            </div>
            <div>
              <Button className={`bg-indigo-700 ${saving ? 'opacity-70' : ''}`} onClick={addUser} disabled={saving}>Add User</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndoorUserManagement;
