import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface InventoryItem {
  _id: string;
  name: string;
  currentStock: number;
  packs?: number;
  itemsPerPack?: number;
  buyPricePerPack?: number;
  costPerUnit?: number;
  salePricePerPack?: number;
  salePricePerUnit?: number;
  invoiceNumber?: string;
  expiryDate?: string;
  updatedAt?: string;
}

interface HistoryResponse {
  supplier: Supplier;
  items: InventoryItem[];
}

interface SupplierSummary {
  totalSpend: number;
  purchases: number;
  lastPurchaseDate: string | null;
}

interface Props {
  supplierId: string;
  onBack: () => void;
}

const SupplierDetail: React.FC<Props> = ({ supplierId, onBack }) => {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [summary, setSummary] = useState<SupplierSummary | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`/api/lab/suppliers/${supplierId}/history`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null));
    fetch(`/api/lab/suppliers/${supplierId}/summary`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.ok ? r.json() : null)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [supplierId]);

  if (!data) return (
    <div className="p-4">
      <Button variant="outline" onClick={onBack} className="mb-4">Back</Button>
      <div className="text-sm text-muted-foreground">Loading supplier history...</div>
    </div>
  );

  const { supplier, items } = data;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">{supplier.name}</div>
        <Button variant="outline" onClick={onBack}>Back</Button>
      </div>

      {/* Spend Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle>Total Spend</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">PKR {(summary.totalSpend || 0).toFixed(2)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Purchases</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{summary.purchases || 0}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Last Purchase</CardTitle></CardHeader>
            <CardContent className="text-lg">{summary.lastPurchaseDate ? new Date(summary.lastPurchaseDate).toLocaleString() : '-'}</CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Supplier Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span className="text-muted-foreground">Phone:</span> {supplier.phone || '-'}</div>
          <div><span className="text-muted-foreground">Email:</span> {supplier.email || '-'}</div>
          <div className="md:col-span-2"><span className="text-muted-foreground">Address:</span> {supplier.address || '-'}</div>
          <div className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {supplier.notes || '-'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplied Items History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Packs</th>
                  <th className="py-2 pr-4">Units/Pack</th>
                  <th className="py-2 pr-4">Buy/Pack</th>
                  <th className="py-2 pr-4">Cost/Unit</th>
                  <th className="py-2 pr-4">Total Units</th>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Expiry</th>
                  <th className="py-2 pr-4">Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => {
                  const totalUnits = (it.packs || 0) * (it.itemsPerPack || 0);
                  return (
                    <tr key={it._id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-4">{it.name}</td>
                      <td className="py-2 pr-4">{it.packs ?? '-'}</td>
                      <td className="py-2 pr-4">{it.itemsPerPack ?? '-'}</td>
                      <td className="py-2 pr-4">{it.buyPricePerPack ?? '-'}</td>
                      <td className="py-2 pr-4">{it.costPerUnit != null ? Number(it.costPerUnit).toFixed(2) : '-'}</td>
                      <td className="py-2 pr-4">{totalUnits || '-'}</td>
                      <td className="py-2 pr-4">{it.invoiceNumber || '-'}</td>
                      <td className="py-2 pr-4">{it.expiryDate ? new Date(it.expiryDate).toLocaleDateString() : '-'}</td>
                      <td className="py-2 pr-4">{it.updatedAt ? new Date(it.updatedAt).toLocaleString() : '-'}</td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td className="py-4 text-muted-foreground" colSpan={9}>No items supplied yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierDetail;
