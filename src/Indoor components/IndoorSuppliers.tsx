import React from 'react';
import { indoorApi } from '@/Indoor lib/api';
import { Eye, X, Plus } from 'lucide-react';

type Supplier = {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  totalPurchases?: number;
  totalPaid?: number;
  pendingPayments?: number;
  lastOrder?: string;
};

const emptyForm: Partial<Supplier> = { name: '', contactPerson: '', phone: '', email: '', address: '', taxId: '' };

const IndoorSuppliers: React.FC = () => {
  const [rows, setRows] = React.useState<Supplier[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<Partial<Supplier>>(emptyForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  const [payOpenId, setPayOpenId] = React.useState<string | null>(null);
  const [payAmount, setPayAmount] = React.useState('');
  const [payMethod, setPayMethod] = React.useState('');
  const [payNote, setPayNote] = React.useState('');

  const [viewOpenId, setViewOpenId] = React.useState<string | null>(null);
  const [viewLoading, setViewLoading] = React.useState(false);
  const [viewData, setViewData] = React.useState<{ purchases: any[]; totalAmount: number; count: number } | null>(null);

  const [retOpenId, setRetOpenId] = React.useState<string | null>(null);
  const [retLoading, setRetLoading] = React.useState(false);
  const [retRows, setRetRows] = React.useState<any[]>([]);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const { data } = await indoorApi.get('/suppliers');
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load suppliers');
    } finally { setLoading(false); }
  };

  const openReturns = async (id: string) => {
    setRetOpenId(id); setRetLoading(true); setRetRows([]);
    try {
      const { data } = await indoorApi.get('/supplier-returns/history');
      const list = Array.isArray(data) ? data.filter((r:any) => String(r.supplierId) === String(id)) : [];
      setRetRows(list);
    } catch { setRetRows([]); }
    finally { setRetLoading(false); }
  };

  React.useEffect(() => { load(); }, []);

  const onSave = async () => {
    try {
      if (!form.name?.trim()) return;
      if (editingId) {
        await indoorApi.put(`/suppliers/${editingId}`, form);
      } else {
        await indoorApi.post('/suppliers', form);
      }
      setForm(emptyForm); setEditingId(null); setFormOpen(false);
      await load();
    } catch (e: any) { setErr(e?.message || 'Save failed'); }
  };

  const onEdit = (s: Supplier) => {
    setEditingId(s._id);
    setForm({ name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email, address: s.address, taxId: s.taxId });
    setFormOpen(true);
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    try { await indoorApi.delete(`/suppliers/${id}`); await load(); } catch (e:any) { setErr(e?.message || 'Delete failed'); }
  };

  const openView = async (id: string) => {
    try {
      setViewOpenId(id); setViewLoading(true); setViewData(null);
      const { data } = await indoorApi.get(`/purchases/supplier/${id}`);
      const normalized = Array.isArray(data?.purchases) ? data : { purchases: [], totalAmount: 0, count: 0 };
      setViewData(normalized);
    } catch (e:any) {
      setViewData({ purchases: [], totalAmount: 0, count: 0 });
    } finally { setViewLoading(false); }
  };

  const onAddPayment = async () => {
    if (!payOpenId) return;
    const amt = Number(payAmount);
    if (!amt || !isFinite(amt) || amt <= 0) return;
    try {
      await indoorApi.post(`/suppliers/${payOpenId}/payments`, { amount: amt, method: payMethod, note: payNote });
      setPayAmount(''); setPayMethod(''); setPayNote(''); setPayOpenId(null);
      await load();
    } catch (e:any) { setErr(e?.message || 'Payment failed'); }
  };

  return (
    <div className="space-y-3">
      <div className="p-3 bg-white border rounded-md">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded bg-green-600 text-white inline-flex items-center gap-2" onClick={()=>{ setEditingId(null); setForm(emptyForm); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Supplier
          </button>
          {loading && <span className="text-sm text-gray-500">Loading…</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>

      <div className="overflow-auto bg-white border rounded-md">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-1 text-left">Name</th>
              <th className="px-2 py-1 text-left">Phone</th>
              <th className="px-2 py-1 text-right">Total Purchases</th>
              <th className="px-2 py-1 text-right">Total Paid</th>
              <th className="px-2 py-1 text-right">Pending</th>
              <th className="px-2 py-1 text-left">Last Order</th>
              <th className="px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s._id} className="border-t">
                <td className="px-2 py-1">{s.name}</td>
                <td className="px-2 py-1">{s.phone || '-'}</td>
                <td className="px-2 py-1 text-right">{Number(s.totalPurchases || 0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right">{Number(s.totalPaid || 0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right">{Number(s.pendingPayments || 0).toFixed(2)}</td>
                <td className="px-2 py-1">{s.lastOrder ? new Date(s.lastOrder).toLocaleDateString() : '-'}</td>
                <td className="px-2 py-1">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 border rounded text-red-600" onClick={()=>onDelete(s._id)}>Delete</button>
                    <button className="px-2 py-1 border rounded text-green-700" onClick={()=>setPayOpenId(s._id)}>Payment</button>
                    <button className="px-2 py-1 border rounded" title="View" onClick={()=>openView(s._id)}><Eye className="h-4 w-4" /></button>
                    <button className="px-2 py-1 border rounded text-red-700 bg-red-50 hover:bg-red-100" onClick={()=>openReturns(s._id)}>Returns</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={7}>No suppliers</td></tr>
            )}

      {retOpenId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md w-full max-w-3xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Supplier Returns</div>
              <button className="p-1 border rounded" onClick={()=>{ setRetOpenId(null); setRetRows([]); }}><X className="h-4 w-4" /></button>
            </div>
            <div className="text-sm mb-2">{retLoading ? 'Loading…' : `${retRows.length} return(s)`}</div>
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 text-left">Date</th>
                    <th className="px-2 py-1 text-left">Invoice</th>
                    <th className="px-2 py-1 text-left">Medicine</th>
                    <th className="px-2 py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {retRows.map((r:any, idx:number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">{r.date ? new Date(r.date).toLocaleString() : '-'}</td>
                      <td className="px-2 py-1">{r.invoiceNumber || '-'}</td>
                      <td className="px-2 py-1">{r.medicineName || '-'}</td>
                      <td className="px-2 py-1 text-right">{Number(r.amount||0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {retRows.length === 0 && !retLoading && (
                    <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={4}>No returns</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{editingId ? 'Update Supplier' : 'Add Supplier'}</div>
              <button className="p-1 border rounded" onClick={()=>{ setFormOpen(false); setEditingId(null); }}><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input className="border rounded px-2 py-1" placeholder="Name" value={form.name||''} onChange={e=>setForm(f=>({ ...f, name: e.target.value }))} />
              <input className="border rounded px-2 py-1" placeholder="Contact Person" value={form.contactPerson||''} onChange={e=>setForm(f=>({ ...f, contactPerson: e.target.value }))} />
              <input className="border rounded px-2 py-1" placeholder="Phone" value={form.phone||''} onChange={e=>setForm(f=>({ ...f, phone: e.target.value }))} />
              <input className="border rounded px-2 py-1" placeholder="Email" value={form.email||''} onChange={e=>setForm(f=>({ ...f, email: e.target.value }))} />
              <input className="border rounded px-2 py-1" placeholder="Address" value={form.address||''} onChange={e=>setForm(f=>({ ...f, address: e.target.value }))} />
              <input className="border rounded px-2 py-1" placeholder="Tax ID" value={form.taxId||''} onChange={e=>setForm(f=>({ ...f, taxId: e.target.value }))} />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={onSave}>{editingId ? 'Update' : 'Save'}</button>
              <button className="px-3 py-1 rounded border" onClick={()=>{ setFormOpen(false); setEditingId(null); setForm(emptyForm); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {payOpenId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md w-full max-w-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Add Payment</div>
              <button className="p-1 border rounded" onClick={()=>{ setPayOpenId(null); setPayAmount(''); setPayMethod(''); setPayNote(''); }}><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input className="border rounded px-2 py-1" placeholder="Amount" value={payAmount} onChange={e=>setPayAmount(e.target.value)} />
              <input className="border rounded px-2 py-1" placeholder="Method" value={payMethod} onChange={e=>setPayMethod(e.target.value)} />
              <input className="border rounded px-2 py-1" placeholder="Note" value={payNote} onChange={e=>setPayNote(e.target.value)} />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={onAddPayment}>Save</button>
              <button className="px-3 py-1 rounded border" onClick={()=>{ setPayOpenId(null); setPayAmount(''); setPayMethod(''); setPayNote(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {viewOpenId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md w-full max-w-3xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Supplier History</div>
              <button className="p-1 border rounded" onClick={()=>{ setViewOpenId(null); setViewData(null); }}><X className="h-4 w-4" /></button>
            </div>
            <div className="text-sm mb-2">{viewLoading ? 'Loading…' : (viewData ? `${viewData.count} purchases, Total ${Number(viewData.totalAmount || 0).toFixed(2)}` : '')}</div>
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 text-left">Date</th>
                    <th className="px-2 py-1 text-left">Medicine</th>
                    <th className="px-2 py-1 text-right">Packs</th>
                    <th className="px-2 py-1 text-right">Units</th>
                    <th className="px-2 py-1 text-right">Amount</th>
                    <th className="px-2 py-1 text-left">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {viewData && viewData.purchases.map((p:any) => (
                    <tr key={p._id} className="border-t">
                      <td className="px-2 py-1">{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : '-'}</td>
                      <td className="px-2 py-1">{p.medicineName || p.medicine?.name || '-'}</td>
                      <td className="px-2 py-1 text-right">{Number(p.quantity || 0)}</td>
                      <td className="px-2 py-1 text-right">{Number(p.totalItems || (Number(p.quantity || 0) * Number(p.packQuantity || 1)))}</td>
                      <td className="px-2 py-1 text-right">{Number(p.totalPurchaseAmount || 0).toFixed(2)}</td>
                      <td className="px-2 py-1">{p.invoiceNumber || '-'}</td>
                    </tr>
                  ))}
                  {(!viewData || viewData.purchases.length === 0) && !viewLoading && (
                    <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={6}>No purchases</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndoorSuppliers;
