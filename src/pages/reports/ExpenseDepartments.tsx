import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const ExpenseDepartmentsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/expense-departments');
      if (!res.ok) throw new Error('Failed to load expense departments');
      const list = await res.json();
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load expense departments');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createItem = async () => {
    if (!newName.trim()) return;
    try {
      setSaving(true);
      const res = await fetch('/api/expense-departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setNewName('');
      await load();
    } catch (e) {
      alert('Failed to create expense department');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: any) => {
    setEditId(item._id);
    setEditName(item.name || '');
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/expense-departments/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update');
      cancelEdit();
      await load();
    } catch (e) {
      alert('Failed to update expense department');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this expense department?')) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/expense-departments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await load();
    } catch (e) {
      alert('Failed to delete expense department');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Expense Departments</h1>
        <p className="text-sm text-slate-600">Create and manage departments used to categorize expenses.</p>
      </div>

      <Card className="p-4 space-y-3">
        <div>
          <Label htmlFor="new-expdep">New Department Name</Label>
          <div className="flex gap-2 mt-1 max-w-md">
            <Input id="new-expdep" value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder="e.g., Utilities, Maintenance" />
            <Button onClick={createItem} disabled={saving || !newName.trim()} className="bg-blue-500 hover:bg-blue-400">Add</Button>
          </div>
        </div>
      </Card>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-500">No expense departments yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item._id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                <div className="flex-1 min-w-0">
                  {editId === item._id ? (
                    <Input value={editName} onChange={(e)=>setEditName(e.target.value)} className="max-w-md" />
                  ) : (
                    <div className="font-medium text-slate-800 truncate">{item.name}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editId === item._id ? (
                    <>
                      <Button size="sm" onClick={saveEdit} disabled={saving || !editName.trim()} className="bg-blue-500 hover:bg-blue-400">Save</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={()=>startEdit(item)}>Edit</Button>
                      <Button size="sm" onClick={()=>deleteItem(item._id)} disabled={deletingId === item._id} className="bg-red-500 hover:bg-red-600 text-white">Delete</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseDepartmentsPage;
