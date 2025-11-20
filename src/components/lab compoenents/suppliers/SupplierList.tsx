import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SupplierForm, { SupplierPayload } from "./SupplierForm";
import SupplierDetail from "./SupplierDetail";

export interface Supplier extends SupplierPayload { _id: string; createdAt?: string; updatedAt?: string }

interface Props {
  onView: (supplier: Supplier) => void;
}

const SupplierList: React.FC<Props> = ({ onView }) => {
  const [list, setList] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [serverPaging, setServerPaging] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const load = async () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (search.trim()) params.set('q', search.trim());
    setLoading(true);
    const res = await fetch(`/api/lab/suppliers?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { setList([]); setTotal(0); setTotalPages(1); setServerPaging(false); setLoading(false); return; }
    const data = await res.json();
    if (Array.isArray(data)) {
      setServerPaging(false);
      setList(data);
      setTotal(data.length);
      setTotalPages(Math.max(1, Math.ceil(data.length / limit)));
    } else if (data && Array.isArray(data.data)) {
      setServerPaging(true);
      setList(data.data);
      setTotal(Number(data.total)||0);
      setTotalPages(Number(data.totalPages)||1);
    } else {
      setServerPaging(false);
      setList([]);
      setTotal(0);
      setTotalPages(1);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, limit, search]);

  const filtered = useMemo(() => serverPaging ? list : list.filter(s => s.name.toLowerCase().includes(search.toLowerCase())), [list, search, serverPaging]);

  const createSupplier = async (payload: SupplierPayload) => {
    await fetch("/api/lab/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    setCreating(false);
    await load();
  };

  const saveSupplier = async (payload: SupplierPayload) => {
    if (!editing) return;
    await fetch(`/api/lab/suppliers/${editing._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    setEditing(null);
    await load();
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    await fetch(`/api/lab/suppliers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    await load();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Search supplier" value={search} onChange={e=> setSearch(e.target.value)} className="max-w-sm" />
        <Button onClick={()=> setCreating(true)}>+ New Supplier</Button>
      </div>
      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Supplier</DialogTitle>
          </DialogHeader>
          <SupplierForm onCancel={()=> setCreating(false)} onSave={createSupplier} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o)=> { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          {editing && (
            <SupplierForm initial={editing} onCancel={()=> setEditing(null)} onSave={saveSupplier} />
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o)=> { if (!o) setViewing(null); }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <SupplierDetail supplierId={viewing._id} onBack={()=> setViewing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {filtered.slice(serverPaging ? 0 : (page-1)*limit, serverPaging ? undefined : (page-1)*limit + limit).map((s, idx) => (
          <Card key={s._id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-500 w-8 text-right">{(page-1)*limit + idx + 1}</div>
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-muted-foreground">{s.phone || ""} {s.email ? `· ${s.email}` : ""}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={()=> setViewing(s)}>View</Button>
                <Button variant="outline" onClick={()=> setEditing(s)}>Edit</Button>
                <Button variant="destructive" onClick={()=> deleteSupplier(s._id)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground p-4">No suppliers found.</div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          {loading ? 'Loading...' : `${Math.min((page-1)*limit+1, Math.max(0, total))}-${Math.min(page*limit, Math.max(0, total))} of ${total}`}
        </div>
        <div className="flex items-center gap-2">
          <select className="px-2 py-1 border rounded text-sm" value={limit} onChange={(e)=> { setPage(1); setLimit(parseInt(e.target.value)||10); }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <Button variant="outline" size="sm" onClick={()=> setPage(1)} disabled={page<=1}>First</Button>
          <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.max(1,p-1))} disabled={page<=1}>Prev</Button>
          <div className="px-2 text-sm">Page {page} / {totalPages}</div>
          <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages}>Next</Button>
          <Button variant="outline" size="sm" onClick={()=> setPage(totalPages)} disabled={page>=totalPages}>Last</Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierList;
