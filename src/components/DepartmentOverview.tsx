import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Users, Calendar, Download, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDepartments, useTokens, useAllPatients } from '@/hooks/useApi';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { API_URL } from '@/lib/api';

interface Token {
  dateTime?: string | Date;
  department?: string;
  mrNumber?: string;
  phone?: string;
}

const formatDate = (d: Date) => d.toLocaleDateString('en-CA');

const DepartmentOverview: React.FC = () => {
  const today = formatDate(new Date());
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const rangeActive = fromDate !== toDate;

  const { data: departments = [], refetch: refetchDepartments } = useDepartments();
  // If a range is active, load all tokens and filter client-side; else load a single date
  const { data: tokens = [], refetch, isFetching } = useTokens(rangeActive ? undefined : fromDate);
  const { data: allPatients = [] } = useAllPatients();

  useEffect(() => {
    refetch();
  }, [fromDate, toDate, rangeActive, refetch]);

  const filteredTokens = useMemo(() => {
    const arr: Token[] = Array.isArray(tokens) ? (tokens as Token[]) : [];
    if (!arr.length) return [] as Token[];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    return arr.filter((t) => {
      if (!t.dateTime) return false;
      const d = new Date(t.dateTime);
      return d >= start && d <= end;
    });
  }, [tokens, fromDate, toDate]);

  const counts = useMemo(() => {
    const map = new Map<string, { tokens: number; patients: number }>();
    const patientsSet = new Map<string, Set<string>>();

    // Helper to ensure key exists
    const ensure = (key: string) => {
      if (!map.has(key)) {
        map.set(key, { tokens: 0, patients: 0 });
      }
      if (!patientsSet.has(key)) {
        patientsSet.set(key, new Set<string>());
      }
    };

  

    // Count from tokens (date-filtered)
    (filteredTokens as Token[]).forEach((t) => {
      const dept = (t.department || 'Unassigned').toString().toLowerCase();
      const id = (t.mrNumber || t.phone || '').toString();
      ensure(dept);
      map.get(dept)!.tokens += 1;
      if (id) patientsSet.get(dept)!.add(id);
    });

    // Fallback and merge from Patients DB (for departments with patients but no tokens in range)
    (Array.isArray(allPatients) ? allPatients : []).forEach((p: any) => {
      const dept = (p.department || 'Unassigned').toString().toLowerCase();
      const id = (p.mrNumber || p.phone || p._id || '').toString();
      if (!id) return;
      ensure(dept);
      patientsSet.get(dept)!.add(id);
    });

    // Finalize patient counts from sets
    patientsSet.forEach((set, key) => {
      ensure(key);
      map.get(key)!.patients = set.size;
    });

    return { map, patientsSet };
  }, [filteredTokens, allPatients]);

  // Add Department dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');
  // Track which derived departments are hidden by user
  const [hiddenDerived, setHiddenDerived] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addDepartment = async () => {
    const name = addName.trim();
    if (!name) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, description: addDesc.trim() || undefined })
      });
      if (!res.ok) throw new Error(await res.text());
      setAddOpen(false);
      setAddName('');
      setAddDesc('');
      await refetchDepartments();
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : 'Failed to add department');
    } finally {
      setSaving(false);
    }
  };

  const openAddWithName = (name: string) => {
    setAddName(name || '');
    setAddDesc('');
    setError(null);
    setAddOpen(true);
  };

  const exportCsv = () => {
    const rows = (Array.isArray(departments) ? departments : []).map((d: any) => {
      const key = (d?.name || 'Unassigned').toString().toLowerCase();
      const row = counts.map.get(key) || { tokens: 0, patients: 0 };
      return {
        Department: d?.name || 'Unassigned',
        Tokens: row.tokens,
        Patients: row.patients,
      };
    });
    // Include any departments present only in tokens
    counts.map.forEach((v, k) => {
      const present = (departments as any[]).some((d: any) => (d?.name || '').toString().toLowerCase() === k);
      if (!present) rows.push({ Department: k, Tokens: v.tokens, Patients: v.patients });
    });

    const header = Object.keys(rows[0] || { Department: '', Tokens: 0, Patients: 0 });
    const csv = [header.join(','), ...rows.map(r => header.map(h => String((r as any)[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `department-overview-${fromDate}${rangeActive ? `_to_${toDate}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // View patients dialog: state and handler
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTitle, setViewTitle] = useState('');
  const [viewPatients, setViewPatients] = useState<any[]>([]);

  const openView = (deptName: string) => {
    const deptKey = (deptName || 'Unassigned').toString().toLowerCase();
    const tok = (filteredTokens as Token[]).filter(
      (t) => (t.department || 'Unassigned').toString().toLowerCase() === deptKey
    );
    const pats = (Array.isArray(allPatients) ? allPatients : []).filter(
      (p: any) => (p.department || 'Unassigned').toString().toLowerCase() === deptKey
    );
    const byId = new Map<string, any>();
    tok.forEach((t: any) => {
      const id = (t.mrNumber || t.phone || '').toString();
      if (!byId.has(id)) byId.set(id, t);
    });
    pats.forEach((p: any) => {
      const id = (p.mrNumber || p.phone || p._id || '').toString();
      if (!byId.has(id)) byId.set(id, p);
    });
    setViewPatients(Array.from(byId.values()));
    setViewTitle(`${deptName} — Patients`);
    setViewOpen(true);
  };

  // Edit/Delete dialogs and handlers
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editOriginalName, setEditOriginalName] = useState<string | null>(null);

  const openEdit = (d: any) => {
    // Supports real department object or derived name string
    const isString = typeof d === 'string';
    setEditId(isString ? null : (d?._id || null));
    setEditName(isString ? d : (d?.name || ''));
    setEditDesc(isString ? '' : (d?.description || ''));
    setEditOriginalName(isString ? String(d) : null);
    setEditError(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    const name = editName.trim();
    if (!name) { setEditError('Name is required'); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const url = editId ? `${API_URL}/api/departments/${editId}` : `${API_URL}/api/departments`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method as any,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description: editDesc.trim() || '' }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditOpen(false);
      await refetchDepartments();
      // If we converted a derived card, hide the original derived key so it doesn't appear as a duplicate
      if (!editId && editOriginalName) {
        const key = editOriginalName.trim().toLowerCase();
        setHiddenDerived(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        setEditOriginalName(null);
      }
    } catch (e: any) {
      setEditError(typeof e?.message === 'string' ? e.message : 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  };

  // Custom delete confirmation modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'real' | 'derived'; id?: string; name: string } | null>(null);

  const requestDeleteReal = (d: any) => {
    if (!d) return;
    setDeleteTarget({ type: 'real', id: d._id, name: d.name });
    setDeleteOpen(true);
  };

  const requestDeleteDerived = (name: string) => {
    setDeleteTarget({ type: 'derived', name });
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'derived') {
      setHiddenDerived(prev => new Set(prev).add(deleteTarget.name.toLowerCase()));
      setDeleteOpen(false);
      setDeleteTarget(null);
      return;
    }
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/departments/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      await refetchDepartments();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-emerald-600 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              <span>Departments</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-[150px]" />
              <span className="text-sm text-gray-500">to</span>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-[150px]" />
              <Button variant="outline" onClick={exportCsv} className="h-9"><Download className="h-4 w-4 mr-2"/>Export</Button>
              <Button onClick={() => setAddOpen(true)} className="h-9"><Plus className="h-4 w-4 mr-2"/>Add Department</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isFetching && (
            <div className="text-sm text-gray-500">Loading...</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.isArray(departments) ? departments : []).map((d: any) => {
              const key = (d?.name || 'Unassigned').toString().toLowerCase();
              const row = counts.map.get(key) || { tokens: 0, patients: 0 };
              return (
                <div key={d._id || d.name} className="border rounded-xl p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-base font-semibold">{d.name}</div>
                        <div className="text-xs text-gray-500">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" title="View patients" onClick={() => openView(d.name)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="default" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" title="Delete" onClick={() => requestDeleteReal(d)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="text-right">
                      <div className="text-emerald-700 font-bold text-xl">{row.patients}</div>
                      <div className="text-xs text-gray-500">Patients</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{row.tokens}</span>
                      <span className="text-xs">tokens</span>
                    </div>
                    {d.description && <span className="text-xs text-gray-500 truncate max-w-[50%]">{d.description}</span>}
                  </div>
                </div>
              );
            })}
            {/* Also show departments present only in tokens */}
            {Array.from(counts.map.entries())
              .filter(([k]) => k.trim() !== 'unassigned')
              .filter(([k]) => !(departments as any[]).some((d: any) => (d?.name || '').toString().trim().toLowerCase() === k.toString().trim().toLowerCase()))
              .filter(([k]) => !hiddenDerived.has(k))
              .map(([k, v]) => (
              <div key={k} className="border rounded-xl p-4 bg-white shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-base font-semibold">{k}</div>
                      <div className="text-xs text-gray-500">Derived from tokens</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" title="View patients" onClick={() => openView(k)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="default" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(k)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" title="Delete" onClick={() => requestDeleteDerived(k)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{v.tokens}</span>
                    <span className="text-xs">tokens</span>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-700 font-bold text-xl">{v.patients}</div>
                    <div className="text-xs text-gray-500">Patients</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Department Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>Create a new department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">Name</div>
              <input className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm" value={addName} onChange={e=>setAddName(e.target.value)} placeholder="Department name" />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Description</div>
              <textarea className="w-full min-h-[90px] px-3 py-2 rounded-md border border-slate-300 text-sm" value={addDesc} onChange={e=>setAddDesc(e.target.value)} placeholder="Optional description" />
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={addDepartment} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Patients Dialog */}
      <ViewPatientsDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        title={viewTitle}
        patients={viewPatients}
      />

      {/* Edit Department Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Department' : 'Create Department'}</DialogTitle>
            <DialogDescription>{editId ? 'Update the department name and description.' : 'Convert this derived department into a saved department.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">Name</div>
              <input className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Department name" />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Description</div>
              <textarea className="w-full min-h-[90px] px-3 py-2 rounded-md border border-slate-300 text-sm" value={editDesc} onChange={e=>setEditDesc(e.target.value)} placeholder="Optional description" />
            </div>
            {editError && <div className="text-xs text-red-600">{editError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setEditOpen(false)} disabled={editSaving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>No</Button>
            <Button variant="destructive" onClick={confirmDelete}>Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper dialog component to view patients list
const ViewPatientsDialog: React.FC<{ open: boolean; onOpenChange: (v:boolean)=>void; title: string; patients: any[] }>=({ open, onOpenChange, title, patients })=>{
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Patients in this department for the selected period and from the master list.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {patients.length === 0 && <div className="text-sm text-gray-500">No patients found.</div>}
          {patients.map((p:any, idx:number)=> (
            <div key={idx} className="p-3 border rounded-md flex items-center justify-between">
              <div>
                <div className="font-medium">{p.name || p.patientName || '-'} {p.age ? `, ${p.age}` : ''} {p.gender ? `, ${p.gender}` : ''}</div>
                <div className="text-xs text-gray-600">MR: {p.mrNumber || '-'} • Phone: {p.phone || '-'}</div>
              </div>
              <div className="text-xs text-gray-500">{p.dateTime ? new Date(p.dateTime).toLocaleString() : ''}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentOverview;
