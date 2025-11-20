import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface InventoryRow {
  id: string | number;
  name: string;
  quantity: number; // packs
  packQuantity?: number; // units per pack
  totalItems?: number;
  minStock?: number;
  buyPricePerPack?: number;
  salePricePerPack?: number;
  category?: string;
  unitBuyPrice?: number;
  unitSalePrice?: number; // sell unit price
  price?: number;
  profitPerUnit?: number;
  unitPrice?: number; // legacy unit price
  expiryDate?: string;
  invoiceNumber?: string;
  supplierName?: string;
  status?: string;
  date?: string;
  createdAt?: string;
  _id?: string;
}

interface InventoryTableProps {
  items: InventoryRow[];
  onApprove?: (id: string | number) => void;
  onReject?: (id: string | number) => void;
  onEdit?: (item: InventoryRow) => void;
  onDelete?: (id: string | number) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ items, onApprove, onReject, onEdit, onDelete }) => {
  if (items && items.length) console.log('InventoryTable first row sample', items[0]);
  const formatNumber = (val: unknown) => {
    const num = Number(val);
    return isNaN(num) ? '-' : num.toFixed(2);
  };
  const [sortKey, setSortKey] = useState<keyof InventoryRow>('name');
  const [ascending, setAscending] = useState(true);

    const sorted = React.useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return ascending ? av - bv : bv - av;
      return ascending ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [items, sortKey, ascending]);

  const toggleSort = (key: keyof InventoryRow) => {
    if (sortKey === key) setAscending(!ascending);
    else { setSortKey(key); setAscending(true); }
  };

  const showActions = Boolean(onApprove || onEdit || onDelete);
  const colCount = showActions ? 16 : 15;

  const headerCell = (label: string, key: keyof InventoryRow) => (
    <th
      className="px-3 py-2 cursor-pointer select-none whitespace-nowrap text-left text-sm font-medium text-gray-700"
      onClick={() => toggleSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === key && (ascending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headerCell('Invoice #', 'invoiceNumber')}
            {headerCell('Medicine', 'name')}
            {headerCell('Category', 'category')}
            {headerCell('Packs', 'quantity')}
            {headerCell('Units/Pack', 'packQuantity')}
            <th className="px-3 py-2 cursor-pointer select-none whitespace-nowrap text-left text-sm font-medium text-gray-700 hidden print:table-cell" onClick={() => toggleSort('buyPricePerPack')}>
              <span className="inline-flex items-center gap-1">
                Buy/Pack
                {sortKey === 'buyPricePerPack' && (ascending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              </span>
            </th>
            {headerCell('Sale/Pack', 'salePricePerPack')}
            <th className="px-3 py-2 cursor-pointer select-none whitespace-nowrap text-left text-sm font-medium text-gray-700 hidden print:table-cell" onClick={() => toggleSort('unitBuyPrice')}>
              <span className="inline-flex items-center gap-1">
                Unit Buy
                {sortKey === 'unitBuyPrice' && (ascending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              </span>
            </th>
            {headerCell('Unit Sale', 'unitSalePrice')}

            {headerCell('Total Items', 'totalItems')}
            {headerCell('Min Stock', 'minStock')}
            {headerCell('Expiry', 'expiryDate')}
            {headerCell('Supplier', 'supplierName')}
            {headerCell('Status', 'status')}
            <th className="px-3 py-2 cursor-pointer select-none whitespace-nowrap text-left text-sm font-medium text-gray-700 hidden print:table-cell" onClick={() => toggleSort('date')}>
              <span className="inline-flex items-center gap-1">
                Date
                {sortKey === 'date' && (ascending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              </span>
            </th>
            {showActions && <th className="px-3 py-2 text-sm font-medium text-gray-700 no-print">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((row) => {
            const unitsPerPack = row.packQuantity ?? (row.totalItems && row.quantity ? Math.round(row.totalItems / row.quantity) : undefined);
            const totalUnits = row.totalItems ?? (row.quantity && row.packQuantity
              ? row.quantity * row.packQuantity
              : (unitsPerPack !== undefined && row.quantity ? unitsPerPack * row.quantity : undefined));
            const qtyPacks = row.quantity ?? 0;
            const minStock = row.minStock ?? 0;
            const isOutOfStock = qtyPacks <= 0 || (typeof totalUnits === 'number' && totalUnits <= 0);
            const expiry = row.expiryDate ? new Date(row.expiryDate) : null;
            const now = new Date();
            const daysToExpiry = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
            const isExpired = expiry ? (daysToExpiry as number) < 0 : false;
            const isExpiringSoon = expiry ? (daysToExpiry as number) >= 0 && (daysToExpiry as number) <= 30 : false;
            const isLowStock = !isOutOfStock && typeof totalUnits === 'number' && minStock > 0 && totalUnits <= minStock;

            const severityClass = (isOutOfStock || isExpired)
              ? 'bg-red-50'
              : ((isLowStock || isExpiringSoon) ? 'bg-yellow-50' : '');

            const hoverClass = severityClass ? '' : 'hover:bg-gray-50';

            return (
            <tr key={row.id} className={`${hoverClass} ${severityClass}`}>
              <td className="px-3 py-2 text-center">{row.invoiceNumber ?? '-'}</td>
               <td className="px-3 py-2 whitespace-nowrap">{row.name}</td>
               <td className="px-3 py-2 text-center">{row.category ?? '-'}</td>
              <td className="px-3 py-2 text-center">{row.quantity}</td>
              {(() => { const pq = row.packQuantity ?? (row.totalItems && row.quantity ? Math.round(row.totalItems / row.quantity) : undefined); return <td className="px-3 py-2 text-center">{pq !== undefined ? pq : '-'}</td>; })()}
              <td className="px-3 py-2 text-center hidden print:table-cell">
                {(() => {
                  const unitsPerPack = row.packQuantity ?? (row.totalItems && row.quantity ? Math.round(row.totalItems / row.quantity) : undefined);
                  const bp = row.buyPricePerPack !== undefined
                    ? row.buyPricePerPack
                    : (row.unitBuyPrice !== undefined && unitsPerPack !== undefined
                        ? row.unitBuyPrice * unitsPerPack
                        : undefined);
                  return bp !== undefined ? formatNumber(bp) : '-';
                })()}
              </td>
              {(() => {
                  const unitsPerPack = row.packQuantity ?? (row.totalItems && row.quantity ? Math.round(row.totalItems / row.quantity) : undefined);
                  const sp = row.salePricePerPack !== undefined
                    ? row.salePricePerPack
                    : (row.unitSalePrice !== undefined && unitsPerPack !== undefined
                        ? row.unitSalePrice * unitsPerPack
                        : undefined);
                  return <td className="px-3 py-2 text-center">{sp !== undefined ? formatNumber(sp) : '-'}</td>;
                })()}
              <td className="px-3 py-2 text-center hidden print:table-cell">
                {(() => {
                  const unitsPerPack = row.packQuantity ?? (row.totalItems && row.quantity ? Math.round(row.totalItems / row.quantity) : undefined);
                  const ub = row.unitBuyPrice !== undefined
                    ? row.unitBuyPrice
                    : (row.buyPricePerPack !== undefined && unitsPerPack !== undefined
                        ? row.buyPricePerPack / unitsPerPack
                        : row.unitPrice);
                  return ub !== undefined ? formatNumber(ub) : '-';
                })()}
              </td>
              <td className="px-3 py-2 text-center">{row.unitSalePrice !== undefined ? formatNumber(row.unitSalePrice) : (row.price !== undefined ? formatNumber(row.price) : '-')}</td>

              <td className="px-3 py-2 text-center">{row.totalItems ?? (row.quantity && row.packQuantity ? row.quantity * row.packQuantity : '-')}</td>
              <td className="px-3 py-2 text-center">{row.minStock ?? '-'}</td>
              <td className="px-3 py-2 text-center">{row.expiryDate ? (new Date(row.expiryDate).toISOString().split('T')[0]) : '-'}</td>
              <td className="px-3 py-2 text-center">{row.supplierName ?? '-'}</td>
              <td className="px-3 py-2 text-center">
                {row.status ?? '-'}
                {(isOutOfStock || isExpired) && (
                  <Badge className="ml-2 bg-red-100 text-red-800 border border-red-200">{isExpired ? 'Expired' : 'Out of stock'}</Badge>
                )}
                {!isOutOfStock && !isExpired && (isLowStock || isExpiringSoon) && (
                  <Badge className="ml-2 bg-yellow-100 text-yellow-800 border border-yellow-200">{isLowStock ? 'Low stock' : 'Expiring soon'}</Badge>
                )}
              </td>
              <td className="px-3 py-2 text-center hidden print:table-cell">
                {(() => {
                  const dt = row.date || row.createdAt || (row._id ? new Date(parseInt(String(row._id).substring(0,8),16)*1000).toISOString() : undefined);
                  return dt ? new Date(dt).toLocaleDateString() : '-';
                })()}
              </td>
              {showActions && (
                <td className="px-3 py-2 text-center space-x-1 no-print">
                  {row.status === 'pending' && onApprove && onReject ? (
                    <>
                      {onApprove && <Button size="sm" onClick={() => onApprove(row.id)}>Approve</Button>}
                      {onReject && <Button size="sm" variant="destructive" onClick={() => onReject(row.id)}>Reject</Button>}
                    </>
                  ) : (
                    <>
                      {onEdit && <Button variant="outline" size="sm" onClick={() => onEdit(row)}><Pencil className="h-4 w-4 mr-1"/>Edit</Button>}
                      {onDelete && <Button variant="destructive" size="sm" onClick={() => onDelete(row.id)}><Trash2 className="h-4 w-4 mr-1"/>Delete</Button>}
                    </>
                  )}
                </td>
              )}
            </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-center text-gray-500" colSpan={colCount}>
                No records
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
