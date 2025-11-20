import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lab types/user";

interface LabUser {
  _id?: string;
  username: string;
  role: UserRole;
  createdAt?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<LabUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [editRole, setEditRole] = useState<UserRole>("receptionist");
  const [editPassword, setEditPassword] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("receptionist");
  const [error, setError] = useState<string | null>(null);

  const roles: UserRole[] = useMemo(() => ["receptionist", "researcher", "lab-technician"], []);

  // role normalization helpers (UI <-> API)
  const toApiRole = (r: UserRole): string => (r === "lab-technician" ? "labTech" : r);
  const fromApiRole = (r: string): UserRole => (r === "labTech" ? "lab-technician" : (r as UserRole));

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lab/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load users");
      const mapped = (data?.users || []).map((u: any) => ({
        ...u,
        role: fromApiRole(u.role),
      }));
      setUsers(mapped);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async () => {
    setError(null);
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }
    try {
      const res = await fetch("/api/lab/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: toApiRole(role) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const serverMsg = data?.message || (data?.errors && JSON.stringify(data.errors)) || "Failed to create user";
        throw new Error(serverMsg);
      }
      setUsername("");
      setPassword("");
      await fetchUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const removeUser = async (id?: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/lab/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || "Failed to delete user");
      }
      await fetchUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const startEdit = (u: LabUser) => {
    setEditingId(u._id!);
    setEditRole(u.role);
    setEditPassword("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPassword("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/lab/users/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: toApiRole(editRole), password: editPassword || undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const serverMsg = data?.message || (data?.errors && JSON.stringify(data.errors)) || "Failed to update user";
        throw new Error(serverMsg);
      }
      cancelEdit();
      await fetchUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">User Management</h1>
        <Badge>Lab</Badge>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-medium">Create User</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Select value={role} onValueChange={(v: UserRole) => setRole(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={createUser}>Create</Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Users</h2>
          <Button variant="ghost" size="sm" onClick={fetchUsers} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b">
                  <td className="py-2 pr-4">{u.username}</td>
                  <td className="py-2 pr-4">
                    {editingId === u._id ? (
                      <Select value={editRole} onValueChange={(v: UserRole) => setEditRole(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{u.role}</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-4">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</td>
                  <td className="py-2 pr-4 space-x-2">
                    {editingId === u._id ? (
                      <div className="flex items-center gap-2">
                        <Input type="password" placeholder="New password (optional)" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-44" />
                        <Button size="sm" onClick={saveEdit}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(u)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => removeUser(u._id)}>Delete</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default UserManagement;
