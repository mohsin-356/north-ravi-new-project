import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface SupplierPayload {
  _id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface Props {
  initial?: SupplierPayload;
  onCancel: () => void;
  onSave: (payload: SupplierPayload) => Promise<void> | void;
}

const SupplierForm: React.FC<Props> = ({ initial, onCancel, onSave }) => {
  const [form, setForm] = useState<SupplierPayload>(
    initial ?? { name: "", phone: "", email: "", address: "", notes: "" }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input value={form.name} onChange={e=> setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e=> setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e=> setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={form.address} onChange={e=> setForm({ ...form, address: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea rows={3} value={form.notes} onChange={e=> setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{initial? 'Save' : 'Create'}</Button>
      </div>
    </div>
  );
};

export default SupplierForm;
