import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { UIStaff } from "../../utils/staffService";

interface StaffFormProps {
  onClose: () => void;
  onSave: (staff: Partial<UIStaff>) => void;
  staff?: UIStaff | null; // edit mode
}

const StaffForm: React.FC<StaffFormProps> = ({ onClose, onSave, staff }) => {
  const [name, setName] = useState(staff?.name || "");
  const [position, setPosition] = useState(staff?.position || "");
  const [phone, setPhone] = useState(staff?.phone || "");
  const [address, setAddress] = useState(staff?.address || "");
  const [salary, setSalary] = useState(staff?.salary?.toString() || "");
  const initialJoinDate = (() => {
    const jd = staff?.joinDate as unknown as (string | Date | undefined);
    if (!jd) return "";
    if (typeof jd === 'string') return jd.substring(0, 10);
    try { return new Date(jd).toISOString().substring(0, 10); } catch { return ""; }
  })();
  const [joinDate, setJoinDate] = useState(initialJoinDate);
  const [status, setStatus] = useState<"active" | "inactive">(staff?.status || "active");

  const handleSubmit = () => {
    onSave({
      _id: staff?._id,
      name,
      position,
      phone,
      // email removed per request
      address,
      salary: salary ? Number(salary) : undefined,
      joinDate: joinDate ? new Date(joinDate).toISOString() : undefined,
      status,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>{staff ? "Edit Staff" : "Add Staff"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Staff Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />

            <label className="block text-sm font-medium">Phone Number</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />

            <label className="block text-sm font-medium">Address</label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />

            <label className="block text-sm font-medium">Salary</label>
            <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} />
          </div>

          {/* Right column */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Position</label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} />

            {/* Email field removed per request */}

            <label className="block text-sm font-medium">Join Date</label>
            <Input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />

            <label className="block text-sm font-medium">Status</label>
            <select
              className="border rounded p-2 w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !position.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
;

export default StaffForm;
