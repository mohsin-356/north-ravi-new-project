import React from 'react';
import { indoorApi } from '../Indoor lib/api';
import { Plus, Search as SearchIcon, Trash2, Pencil, DollarSign } from 'lucide-react';
// Charts removed for a focused CRUD UI

type Expense = { id: string; date: string; type: string; amount: number; notes: string };

const fmtPKR = (n: number) => `PKR ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const IndoorExpenses: React.FC = () => {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().split('T')[0];
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [rows, setRows] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('All Types');
  const [minAmount, setMinAmount] = React.useState<number>(0);
  const [q, setQ] = React.useState('');

  const [showDialog, setShowDialog] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [formType, setFormType] = React.useState('Other');
  const [formDate, setFormDate] = React.useState(iso(today));
  const [formAmount, setFormAmount] = React.useState<number>(0);
  const [formNotes, setFormNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { const { data } = await indoorApi.get('/expenses'); setRows(Array.isArray(data) ? data : []); }
    catch (e:any) { setError(e?.response?.data?.error || e?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };
  React.useEffect(() => { load(); }, []);

  const allTypes = React.useMemo(() => {
    const s = new Set<string>(); rows.forEach(r => r.type && s.add(r.type));
    return ['All Types', ...Array.from(s).sort((a,b)=>a.localeCompare(b))];
  }, [rows]);

  const filtered = React.useMemo(() => {
    const fromD = from ? new Date(from) : null; const toD = to ? new Date(to) : null;
    const lowerQ = q.trim().toLowerCase();
    return rows.filter(r => {
      const d = new Date(r.date);
      if (fromD && d < fromD) return false;
      if (toD) { const t = new Date(toD); t.setHours(23,59,59,999); if (d > t) return false; }
      if (typeFilter !== 'All Types' && r.type !== typeFilter) return false;
      if (minAmount && Number(r.amount || 0) < minAmount) return false;
      if (lowerQ && !(r.notes || '').toLowerCase().includes(lowerQ)) return false;
      return true;
    });
  }, [rows, from, to, typeFilter, minAmount, q]);

  const openAdd = () => { setEditId(null); setFormType('Other'); setFormAmount(0); setFormDate(iso(today)); setFormNotes(''); setShowDialog(true); };
  const openEdit = (r: Expense) => { setEditId(r.id); setFormType(r.type || 'Other'); setFormAmount(r.amount || 0); setFormDate(r.date || iso(today)); setFormNotes(r.notes || ''); setShowDialog(true); };

  const save = async () => {
    setSaving(true); try {
      const payload = { type: formType || 'Other', amount: Number(formAmount)||0, date: formDate, notes: formNotes } as any;
      if (editId) await indoorApi.put(`/expenses/${editId}`, payload); else await indoorApi.post('/expenses', payload);
      setShowDialog(false); await load();
    } catch (e:any) { alert(e?.response?.data?.error || e?.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const onDelete = async (id: string) => { if (!confirm('Delete this expense?')) return; try { await indoorApi.delete(`/expenses/${id}`); await load(); } catch (e:any) { alert(e?.response?.data?.error || e?.message || 'Failed to delete'); } };

  // CRUD-only: compute a quick total for header
  const totalAmount = React.useMemo(() => filtered.reduce((s, r) => s + Number(r.amount || 0), 0), [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Expense Tracker</div>
        <button className="px-3 py-2 rounded bg-indigo-600 text-white inline-flex items-center gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add New Expense</button>
      </div>

      <div className="p-3 bg-white border rounded-md">
        <div className="text-base font-semibold mb-3">Filters</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="text-sm mb-1">Date Range</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="border rounded px-3 py-2" placeholder="Select Start Date" value={from} onChange={e=>setFrom(e.target.value)} />
              <input type="date" className="border rounded px-3 py-2" placeholder="Select End Date" value={to} onChange={e=>setTo(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm block mb-1">Expense Type</label>
            <select className="border rounded px-3 py-2 w-full" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
              {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Minimum Amount</label>
            <input type="number" className="border rounded px-3 py-2 w-full" value={minAmount} onChange={e=>setMinAmount(parseFloat(e.target.value)||0)} />
          </div>
        </div>
      </div>

      <div className="p-3 bg-white border rounded-md">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Expenses</div>
          <div className="relative">
            <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="border rounded pl-8 pr-3 py-2 w-64" placeholder="Search expenses..." value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>
        {loading ? <div className="text-sm text-gray-500">Loading…</div> : (
          <div className="space-y-2">
            {filtered.map((r, idx) => (
              <div key={r.id} className="flex items-center justify-between border rounded px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><DollarSign className="h-4 w-4 text-gray-600" /></div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">{r.type || 'Other'}</span>
                    <span className="text-gray-500">{r.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`${r.type === 'Customer Refund' ? 'text-rose-600' : r.type === 'Supplier Return' ? 'text-blue-600' : 'text-slate-700'} font-semibold`}>{fmtPKR(r.amount)}</div>
                  <button className="px-2 py-1 border rounded" onClick={()=>openEdit(r)}><Pencil className="h-4 w-4" /></button>
                  <button className="px-2 py-1 border rounded text-red-600" onClick={()=>onDelete(r.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-sm text-gray-500">No expenses</div>}
          </div>
        )}
        <div className="mt-3 text-sm text-gray-600">Total (filtered): <b>{fmtPKR(totalAmount)}</b></div>
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border w-full max-w-md p-4 space-y-3">
            <div className="text-base font-semibold">{editId ? 'Edit Expense' : 'Add Expense'}</div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm block mb-1">Type</label>
                <input className="border rounded px-3 py-2 w-full" value={formType} onChange={e=>setFormType(e.target.value)} />
              </div>
              <div>
                <label className="text-sm block mb-1">Date</label>
                <input type="date" className="border rounded px-3 py-2 w-full" value={formDate} onChange={e=>setFormDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm block mb-1">Amount</label>
                <input type="number" className="border rounded px-3 py-2 w-full" value={formAmount} onChange={e=>setFormAmount(parseFloat(e.target.value)||0)} />
              </div>
              <div>
                <label className="text-sm block mb-1">Notes</label>
                <input className="border rounded px-3 py-2 w-full" value={formNotes} onChange={e=>setFormNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button className="px-3 py-2 border rounded" onClick={()=>setShowDialog(false)}>Cancel</button>
              <button className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndoorExpenses;
