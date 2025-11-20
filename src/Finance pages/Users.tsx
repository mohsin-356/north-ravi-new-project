import React, { useEffect, useState } from 'react';
import { useFinanceAuth } from '@/Finance contexts/AuthContext';
import { API_URL } from '@/lib/api';

interface FinanceUser {
  _id?: string;
  username: string;
  role: 'finance' | 'admin' | 'viewer';
  active: boolean;
}

export default function FinanceUsers() {
  const { token } = useFinanceAuth();
  const [users, setUsers] = useState<FinanceUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<FinanceUser>({ username: '', role: 'finance', active: true });
  const [password, setPassword] = useState<string>('');

  const LS_KEY = 'finance_portal_users';
  const API_BASE = API_URL || (import.meta as any).env?.VITE_API_URL || '';

  const loadFromLocal = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [] as FinanceUser[];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as FinanceUser[];
    }
  };

  const changePassword = async (id?: string) => {
    if (!id) return;
    const pwd = prompt('Enter new password');
    if (!pwd) return;
    try {
      const res = await fetch(`${API_BASE}/api/finance/users/${id}/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ password: pwd })
      });
      if (!res.ok) throw new Error('failed');
      alert('Password changed');
    } catch {
      alert('Failed to change password');
    }
  };

  const saveToLocal = (list: FinanceUser[]) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/finance/users`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('network');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setUsers(list);
      // Sync local cache
      saveToLocal(list);
    } catch (e) {
      // Fallback to localStorage
      const cached = loadFromLocal();
      setUsers(cached);
      setError(cached.length === 0 ? 'Failed to load users' : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addUser = async () => {
    if (!newUser.username) return;
    try {
      const res = await fetch(`${API_BASE}/api/finance/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...newUser, password })
      });
      if (!res.ok) throw new Error('network');
      const saved = await res.json();
      const next = [saved, ...users];
      setUsers(next);
      saveToLocal(next);
      setNewUser({ username: '', role: 'finance', active: true });
      setPassword('');
    } catch {
      // Persist locally if API not available
      const localSaved: FinanceUser = {
        _id: `local-${Date.now()}`,
        username: newUser.username,
        role: newUser.role,
        active: newUser.active,
      };
      const next = [localSaved, ...users];
      setUsers(next);
      saveToLocal(next);
      setNewUser({ username: '', role: 'finance', active: true });
      setPassword('');
    }
  };

  const toggleActive = async (id?: string) => {
    if (!id) return;
    const idx = users.findIndex(u => u._id === id);
    if (idx === -1) return;
    const updated = { ...users[idx], active: !users[idx].active };
    const next = users.map(u => (u._id === id ? updated : u));
    setUsers(next);
    saveToLocal(next);
    try {
      await fetch(`${API_BASE}/api/finance/users/${id}/toggle`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      // ignore; already updated locally
    }
  };

  const deleteUser = async (id?: string) => {
    if (!id) return;
    const next = users.filter(u => u._id !== id);
    setUsers(next);
    saveToLocal(next);
    try {
      await fetch(`${API_BASE}/api/finance/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      // ignore; user already removed locally
    }
  };

  const sendResetInvite = async (id?: string) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/finance/users/${id}/reset-invite`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error('network');
      alert('Password reset invitation sent');
    } catch {
      alert('Could not contact server. Please send a manual reset or try again later.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance Users</h1>
        <p className="text-gray-600">Manage finance portal users and roles</p>
      </div>

      <div className="bg-white border rounded-2xl shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-700">Username</label>
            <input
              className="border rounded-lg p-2 w-full"
              placeholder="Username"
              value={newUser.username}
              onChange={e=>setNewUser({...newUser, username: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Role</label>
            <select
              className="border rounded-lg p-2 w-full"
              value={newUser.role}
              onChange={e=>setNewUser({...newUser, role: e.target.value as any})}
            >
              <option value="finance">Finance</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Password</label>
            <input
              className="border rounded-lg p-2 w-full"
              placeholder="Set password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              type="password"
            />
          </div>
          <label className="inline-flex items-center gap-2 p-2">
            <input type="checkbox" checked={newUser.active} onChange={e=>setNewUser({...newUser, active: e.target.checked})} />
            Active
          </label>
          <button onClick={addUser} className="px-4 py-2 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800">Add User</button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow">
        <div className="px-4 py-3 border-b font-semibold">Users</div>
        {loading ? (
          <div className="p-4 text-gray-500">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-gray-500">No users found. Add a user above.</div>
        ) : (
          <div className="divide-y">
            {users.map(u => (
              <div key={u._id || u.username} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{u.username}</div>
                  <div className="text-xs text-gray-500">Role: {u.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{u.active ? 'Active' : 'Inactive'}</span>
                  <button onClick={()=>toggleActive(u._id)} className="px-3 py-1 border rounded">Toggle</button>
                  <button onClick={()=>sendResetInvite(u._id)} className="px-3 py-1 border rounded">Send Reset</button>
                  <button onClick={()=>changePassword(u._id)} className="px-3 py-1 border rounded">Change Password</button>
                  <button onClick={()=>deleteUser(u._id)} className="px-3 py-1 border rounded text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
