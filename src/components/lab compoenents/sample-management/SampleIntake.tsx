//export { default } from "./SampleIntakeClean";
import { useState, useEffect, useRef } from "react";
import { printLabTokenSlip } from "../../../utils/printLabSlip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TestType } from "@/lab types/sample";
import TestSelect from "@/components/lab compoenents/ui/TestSelect";
import { Check } from "lucide-react";

interface SampleIntakeProps {
  onNavigateBack?: () => void;
}

const SampleIntakeClean = ({ onNavigateBack }: SampleIntakeProps) => {
  const { toast } = useToast();
  const [availableTests, setAvailableTests] = useState<TestType[]>([]);
  const [selectedTests, setSelectedTests] = useState<TestType[]>([]);
  // Appointment fields removed per requirement
  const [patientInfo, setPatientInfo] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "",
    address: "",
    guardianRelation: "",
    guardianName: "",
    cnic: "",
  });
  const [cnicError, setCnicError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSampleId, setSubmittedSampleId] = useState<string | null>(null);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<Array<{ itemId: string; name: string; quantity: number; unit?: string; currentStock?: number }>>([]);
  const [selItemId, setSelItemId] = useState<string>("");
  const [selQty, setSelQty] = useState<string>("1");
  const [discount, setDiscount] = useState<string>("0");

  // refs for Enter navigation
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // fetch tests
    fetch("/api/labtech/tests", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then(setAvailableTests)
      .catch(() => toast({ title: "Error", description: "Failed to load tests", variant: "destructive" }));
  }, []);

  useEffect(() => {
    fetch("/api/lab/inventory/inventory", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      credentials: "include",
    })
      .then((r) => r.json())
      .then(setAvailableInventory)
      .catch(() => toast({ title: "Error", description: "Failed to load inventory", variant: "destructive" }));
  }, []);

  const handleEnter = (_e: React.KeyboardEvent, _next: React.RefObject<HTMLInputElement>) => {
    // Enter navigation simplified; email field removed
  };

  const addConsumable = () => {
    const item = availableInventory.find((i: any) => i._id === selItemId);
    if (!item) {
      toast({ title: "Error", description: "Select an item", variant: "destructive" });
      return;
    }
    const qty = Math.max(1, parseInt(selQty) || 0);
    if (qty > (item.currentStock || 0)) {
      toast({ title: "Error", description: "Quantity exceeds stock", variant: "destructive" });
      return;
    }
    setConsumables((prev) => {
      const idx = prev.findIndex((c) => c.itemId === item._id);
      if (idx >= 0) {
        const next = [...prev];
        const sum = next[idx].quantity + qty;
        next[idx] = { ...next[idx], quantity: Math.min(sum, item.currentStock || sum) };
        return next;
      }
      return [...prev, { itemId: item._id, name: item.name, quantity: qty, unit: item.unit, currentStock: item.currentStock }];
    });
    // Reduce local stock to reflect reservation
    setAvailableInventory((prev:any[]) => prev.map((it:any)=> it._id===item._id ? { ...it, currentStock: Math.max(0, (it.currentStock||0) - qty) } : it));
    setSelItemId("");
    setSelQty("1");
  };

  const removeConsumable = (id: string) => {
    setConsumables((prev) => {
      const c = prev.find(x=>x.itemId===id);
      if (c) {
        setAvailableInventory((inv:any[]) => inv.map((it:any)=> it._id===id ? { ...it, currentStock: (it.currentStock||0) + (c.quantity||0) } : it));
      }
      return prev.filter((c) => c.itemId !== id);
    });
  };

  const getTotalAmount = () => selectedTests.reduce((t, s) => t + s.price, 0);
  const getNetAmount = () => Math.max(0, getTotalAmount() - (Number(discount) || 0));

  const handleSubmit = async () => {
    if (!patientInfo.name || !patientInfo.phone || selectedTests.length === 0) {
      toast({ title: "Error", description: "Enter patient name, phone and select at least one test", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        patientName: patientInfo.name,
        phone: patientInfo.phone,
        // email removed from payload
        age: patientInfo.age,
        gender: patientInfo.gender,
        address: patientInfo.address,
        guardianRelation: patientInfo.guardianRelation || undefined,
        guardianName: patientInfo.guardianName || undefined,
        cnic: patientInfo.cnic || undefined,
        tests: selectedTests.map((t) => t._id),
        consumables: consumables.map((c) => ({ item: c.itemId, quantity: c.quantity })),
        totalAmount: getTotalAmount(),
        discount: Math.max(0, Number(discount) || 0),
      };
      const res = await fetch("/api/labtech/samples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setSubmittedSampleId(created._id);
      // Print sample slip (best effort)
      try {
        printLabTokenSlip({
          tokenNumber: String(created.sampleNumber || created._id || ''),
          dateTime: created.createdAt,
          patientName: patientInfo.name,
          phone: patientInfo.phone,
          age: patientInfo.age,
          gender: patientInfo.gender,
          tests: selectedTests.map(t => ({ name: t.name, amount: t.price })),
          discount: Math.max(0, Number(discount) || 0),
        });
      } catch {}
      toast({ title: "Success", description: "Sample submitted" });
      // reset
      setSelectedTests([]);
      setPatientInfo({ name: "", phone: "", age: "", gender: "", address: "", guardianRelation: "", guardianName: "", cnic: "" });
      setConsumables([]);
      setDiscount("0");
    } catch {
      toast({ title: "Error", description: "Submission failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedSampleId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Sample Submitted!</h2>
            <p className="text-gray-600 mb-4">ID: {submittedSampleId}</p>
            <Button onClick={() => setSubmittedSampleId(null)}>New Sample</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Patient Info + Appointment (Combined) */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Details</CardTitle>
          <CardDescription>Enter patient demographics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Patient row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={patientInfo.name}
                onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                onKeyDown={(e) => handleEnter(e, phoneRef)}
                required
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                ref={phoneRef}
                value={patientInfo.phone}
                onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Age</Label>
              <Input
                value={patientInfo.age}
                onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
              />
            </div>
          </div>
          {/* Patient row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Gender</Label>
              <Select value={patientInfo.gender} onValueChange={(v) => setPatientInfo({ ...patientInfo, gender: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={patientInfo.address}
                onChange={(e) => setPatientInfo({ ...patientInfo, address: e.target.value })}
              />
            </div>
          </div>
          {/* Guardian and ID fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Guardian Relation</Label>
              <Select value={patientInfo.guardianRelation} onValueChange={(v) => setPatientInfo({ ...patientInfo, guardianRelation: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S/O">S/O</SelectItem>
                  <SelectItem value="D/O">D/O</SelectItem>
                  <SelectItem value="W/O">W/O</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Guardian Name</Label>
              <Input
                value={patientInfo.guardianName}
                onChange={(e) => setPatientInfo({ ...patientInfo, guardianName: e.target.value })}
              />
            </div>
            <div>
              <Label>CNIC</Label>
              <Input
                value={patientInfo.cnic}
                onChange={(e) => {
                  // Keep only digits, max 13
                  const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 13);
                  setPatientInfo({ ...patientInfo, cnic: digits });
                  if (digits && digits.length !== 13) setCnicError("CNIC must be exactly 13 digits (no dashes)");
                  else setCnicError("");
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={13}
                placeholder="13-digit without dashes"
              />
              {cnicError && <div className="text-sm text-red-600 mt-1">{cnicError}</div>}
            </div>
          </div>
          {/* Additional notes removed per requirement */}
        </CardContent>
      </Card>

      {/* Test selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tests</CardTitle>
          <CardDescription>Type to search and pick multiple tests</CardDescription>
        </CardHeader>
        <CardContent>
          <TestSelect tests={availableTests} selected={selectedTests} onChange={setSelectedTests} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Consumables</CardTitle>
          <CardDescription>Choose items and quantities to use</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <Label>Item</Label>
              <Select value={selItemId} onValueChange={(v) => setSelItemId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {availableInventory.map((it: any) => (
                    <SelectItem key={it._id} value={it._id}>{`${it.name} (${it.currentStock ?? 0} ${it.unit || ''})`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={selQty} onChange={(e) => setSelQty(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={addConsumable}>Add</Button>
            </div>
          </div>
          {consumables.length > 0 && (
            <div className="space-y-2">
              {consumables.map((c) => (
                <div key={c.itemId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-gray-600">{c.quantity} {c.unit || ''}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => removeConsumable(c.itemId)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected summary */}
      {selectedTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Tests ({selectedTests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTests.map((t) => (
              <div key={t._id} className="flex justify-between p-3 bg-gray-50 rounded">
                <span>{t.name}</span>
                <span className="font-medium">PKR {t.price.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t">
              <span>Subtotal</span>
              <span>PKR {getTotalAmount().toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Discount</span>
              <Input className="w-40 text-right" value={discount} onChange={(e)=>setDiscount(e.target.value)} />
            </div>
            <div className="flex justify-between font-semibold">
              <span>Net Amount</span>
              <span>PKR {getNetAmount().toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onNavigateBack}>Back</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || selectedTests.length === 0}>
          {isSubmitting ? "Submitting..." : `Submit (PKR ${getNetAmount().toFixed(2)})`}
        </Button>
      </div>
    </div>
  );
};

export default SampleIntakeClean;
