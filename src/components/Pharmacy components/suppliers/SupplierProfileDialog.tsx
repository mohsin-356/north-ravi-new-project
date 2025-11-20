import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SupplierProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: {
    id: string;
    companyName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  } | null;
}

const currency = (n: any) => {
  const x = Number(n);
  return isNaN(x) ? '-' : x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function SupplierProfileDialog({ open, onOpenChange, supplier }: SupplierProfileDialogProps) {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!open || !supplier?.id) { setRows([]); return; }
      try {
        // Use purchases endpoint which mirrors AddStock fields stored at purchase time
        const res = await fetch(`/api/purchases/supplier/${supplier.id}`);
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        const items = (data?.purchases || []).map((p: any) => ({
          medicineName: p.medicineName,
          packs: p.quantity, // number of packs
          packQuantity: p.packQuantity, // units/pack
          totalItems: p.totalItems,
          buyPricePerPack: p.buyPricePerPack,
          unitBuyPrice: p.buyPricePerUnit ?? p.unitBuyPrice,
          salePricePerPack: p.salePricePerPack,
          unitSalePrice: p.salePricePerUnit ?? p.unitSalePrice,
          profitPerUnit: (p.salePricePerUnit ?? p.unitSalePrice) != null && (p.buyPricePerUnit ?? p.unitBuyPrice) != null
            ? (Number(p.salePricePerUnit ?? p.unitSalePrice) - Number(p.buyPricePerUnit ?? p.unitBuyPrice))
            : undefined,
          invoiceNumber: p.invoiceNumber,
          expiryDate: p.expiryDate,
          minStock: p.minStock,
          createdAt: p.purchaseDate || p.createdAt || p.date,
          category: p.category,
        }));
        if (active) setRows(items);
      } catch {
        if (active) setRows([]);
      }
    })();
    return () => { active = false; };
  }, [open, supplier?.id]);

  // No search box/filtering per request; render raw rows

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] max-w-[1200px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Details</DialogTitle>
        </DialogHeader>

        {supplier && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{supplier.companyName}</h2>
                {supplier.contactPerson && <p className="text-sm text-gray-600">Contact: {supplier.contactPerson}</p>}
              </div>
            </div>

            {/* Supplier Info only (no KPI widgets) */}
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-3">Supplier Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>Phone: <span className="font-medium">{supplier.phone || '-'}</span></div>
                <div className="md:col-span-2">Address: <span className="font-medium">{supplier.address || '-'}</span></div>
                {supplier.notes && <div className="md:col-span-2">Notes: <span className="font-medium">{supplier.notes}</span></div>}
              </div>
            </div>

            {/* Table with all medicine columns entered when adding/updating */}
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-3">Supplied Items</h3>
              <div className="overflow-x-auto w-full">
                <table className="min-w-max border text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {[
                        'Item','Packs','Units/Pack','Total Units','Buy/Pack','Unit Buy','Sale/Pack','Unit Sale','Profit/Unit','Invoice #','Expiry','Min Stock','Updated'
                      ].map(h=> (
                        <th key={h} className="px-3 py-2 border whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={13}>No items</td></tr>
                    ) : rows.map((r, i) => (
                      <tr key={i} className="odd:bg-gray-50">
                        <td className="px-3 py-2 border whitespace-nowrap">{r.medicineName}</td>
                        <td className="px-3 py-2 border text-center">{r.packs ?? '-'}</td>
                        <td className="px-3 py-2 border text-center">{r.packQuantity ?? '-'}</td>
                        <td className="px-3 py-2 border text-center">{r.totalItems ?? '-'}</td>
                        <td className="px-3 py-2 border text-right">{currency(r.buyPricePerPack)}</td>
                        <td className="px-3 py-2 border text-right">{currency(r.unitBuyPrice)}</td>
                        <td className="px-3 py-2 border text-right">{currency(r.salePricePerPack)}</td>
                        <td className="px-3 py-2 border text-right">{currency(r.unitSalePrice)}</td>
                        <td className="px-3 py-2 border text-right">{currency(r.profitPerUnit)}</td>
                        <td className="px-3 py-2 border whitespace-nowrap">{r.invoiceNumber || '-'}</td>
                        <td className="px-3 py-2 border whitespace-nowrap">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '-'}</td>
                        <td className="px-3 py-2 border text-center">{r.minStock ?? '-'}</td>
                        <td className="px-3 py-2 border whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
