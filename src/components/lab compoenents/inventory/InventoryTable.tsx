import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Category { _id: string; name: string }
export interface InventoryItemRow {
  _id: string;
  name: string;
  category?: Category;
  packs?: number;
  itemsPerPack?: number;
  salePricePerPack?: number;
  salePricePerUnit?: number;
  buyPricePerPack?: number;
  invoiceNumber?: string;
  currentStock: number;
  minThreshold: number;
  expiryDate?: string | Date;
  supplier: string;
  unit: string;
}

interface Props {
  rows: InventoryItemRow[];
  filter: "all" | "low" | "expiring" | "out";
  onEdit: (row: InventoryItemRow) => void;
  onDelete: (row: InventoryItemRow) => void;
  onUpdateStock: (row: InventoryItemRow) => void;
  onAdjustUnits: (row: InventoryItemRow) => void;
  indexStart?: number; // starting index offset for SR.NO (e.g., (page-1)*limit)
}

const InventoryTable: React.FC<Props> = ({ rows, filter, onEdit, onDelete, onUpdateStock, onAdjustUnits, indexStart = 0 }) => {
  const [sortKey, setSortKey] = useState<keyof InventoryItemRow | "totalValue">("name");
  const [asc, setAsc] = useState(true);

  const filtered = useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 30*24*60*60*1000);
    let r = rows;
    if (filter === "low") r = rows.filter(r => r.currentStock <= r.minThreshold);
    if (filter === "expiring") r = rows.filter(r => r.expiryDate && (new Date(r.expiryDate) <= soon));
    if (filter === "out") r = rows.filter(r => r.currentStock <= 0);
    return r;
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const getVal = (x: InventoryItemRow) => {
        if (sortKey === "totalValue") return (x.currentStock || 0) * (x.salePricePerUnit || 0);
        const v: any = (x as any)[sortKey];
        return typeof v === 'string' ? v.toLowerCase() : v ?? '';
      };
      const va = getVal(a), vb = getVal(b);
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, asc]);

  const setSort = (key: keyof InventoryItemRow | "totalValue") => {
    if (sortKey === key) setAsc(!asc); else { setSortKey(key); setAsc(true); }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 px-2">SR.NO</th>
            <th className="py-2 px-2 cursor-pointer" onClick={()=> setSort('invoiceNumber')}>Invoice #</th>
            <th className="py-2 px-2 cursor-pointer" onClick={()=> setSort('name')}>Item</th>
            <th className="py-2 px-2 cursor-pointer" onClick={()=> setSort('category')}>Category</th>
            <th className="py-2 px-2">Packs</th>
            <th className="py-2 px-2">Units/Pack</th>
            <th className="py-2 px-2">Sale/Pack</th>
            <th className="py-2 px-2">Unit Sale</th>
            <th className="py-2 px-2 cursor-pointer" onClick={()=> setSort('currentStock')}>Total Units</th>
            <th className="py-2 px-2">Min Stock</th>
            <th className="py-2 px-2">Expiry</th>
            <th className="py-2 px-2">Supplier</th>
            <th className="py-2 px-2">Status</th>
            <th className="py-2 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const isLow = r.currentStock <= r.minThreshold;
            const isOut = r.currentStock <= 0;
            const exp = r.expiryDate ? new Date(r.expiryDate) : null;
            const isExpiring = exp ? (exp.getTime() <= Date.now() + 30*24*60*60*1000) : false;
            return (
              <tr key={r._id} className={`border-b ${isOut ? 'bg-red-50' : ''}`}>
                <td className="py-2 px-2">{indexStart + i + 1}</td>
                <td className="py-2 px-2">{r.invoiceNumber || '-'}</td>
                <td className="py-2 px-2 font-medium">{r.name}</td>
                <td className="py-2 px-2">{r.category?.name || 'Uncategorized'}</td>
                <td className="py-2 px-2">{r.packs ?? '-'}</td>
                <td className="py-2 px-2">{r.itemsPerPack ?? '-'}</td>
                <td className="py-2 px-2">{r.salePricePerPack != null ? r.salePricePerPack : '-'}</td>
                <td className="py-2 px-2">{r.salePricePerUnit != null ? Number(r.salePricePerUnit).toFixed(2) : '-'}</td>
                <td className="py-2 px-2">{r.currentStock}</td>
                <td className="py-2 px-2">{r.minThreshold}</td>
                <td className="py-2 px-2">{exp ? exp.toLocaleDateString() : '-'}</td>
                <td className="py-2 px-2">{r.supplier}</td>
                <td className="py-2 px-2">
                  {isOut ? (
                    <Badge variant="destructive">Out of stock</Badge>
                  ) : isLow ? (
                    <Badge variant="secondary">Low</Badge>
                  ) : isExpiring ? (
                    <Badge variant="secondary">Expiring</Badge>
                  ) : (
                    <Badge>OK</Badge>
                  )}
                </td>
                <td className="py-2 px-2">
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-black text-white hover:bg-black/90" onClick={()=> onEdit(r)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={()=> onDelete(r)}>Delete</Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr><td colSpan={14} className="py-6 text-center text-muted-foreground">No items found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
