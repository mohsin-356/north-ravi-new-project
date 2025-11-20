import React, { useState, useEffect } from "react";
import AddNewItemForm from './AddNewItemForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ArrowLeft,
  Save,
  X,
  BarChart3
} from "lucide-react";
import EditItemForm from './EditItemForm';
import { useToast } from "@/hooks/use-toast";
import UpdateStockDialog from './UpdateStockDialog';
import AdjustLooseItemsDialog from './AdjustLooseItemsDialog';
import InventoryToolbar from './InventoryToolbar';
import InventoryTable from './InventoryTable';

// TODO: Move to env config
// Lab inventory routes are mounted at /api/lab/inventory
const API_BASE = "/api/lab/inventory";

interface Category { _id: string; name: string; }

interface InventoryItem {
  _id: string;
  name: string;
  category: Category;
  currentStock: number;
  minThreshold: number;
  maxCapacity: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  location: string;
  expiryDate?: Date | string;
  lastRestocked?: Date;
}

const InventoryManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  // single filter query replaces the three fields
  const [filterQuery, setFilterQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updateStockFor, setUpdateStockFor] = useState<InventoryItem | null>(null);
  const [adjustUnitsFor, setAdjustUnitsFor] = useState<InventoryItem | null>(null);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);
  const [quickItemId, setQuickItemId] = useState<string>("");
  const [showQuickAdjust, setShowQuickAdjust] = useState(false);
  const [quickAdjustItemId, setQuickAdjustItemId] = useState<string>("");
  const { toast } = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [serverPaging, setServerPaging] = useState(false);
  const [loading, setLoading] = useState(false);
  const suppliers = React.useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(i => { if (i.supplier) set.add(i.supplier); });
    return Array.from(set);
  }, [inventory]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [tableFilter, setTableFilter] = useState<'all'|'low'|'expiring'|'out'>('all');

  // When opening quick update, default to first item so full form shows immediately
  React.useEffect(() => {
    if (showQuickUpdate && !quickItemId && inventory.length > 0) {
      setQuickItemId(inventory[0]._id);
    }
  }, [showQuickUpdate, quickItemId, inventory]);

  // fetch categories & inventory on mount
  const loadAll = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      const q = (appliedQuery || '').trim();
      if (q) params.set('q', q);
      const [catRes, invRes] = await Promise.all([
        fetch(`${API_BASE}/categories`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`${API_BASE}/inventory?${params.toString()}`, { headers: { "Authorization": `Bearer ${token}` }, credentials: "include" })
      ]);
      if (!catRes.ok || !invRes.ok) throw new Error("Failed to fetch data");
      const cats: Category[] = await catRes.json();
      setDbCategories(cats);
      const invData = await invRes.json();
      const placeholderCategory: Category = { _id: 'uncategorized', name: 'Uncategorized' };
      if (Array.isArray(invData)) {
        setServerPaging(false);
        setTotal(invData.length);
        setTotalPages(Math.max(1, Math.ceil(invData.length / limit)));
        setInventory(invData.map((it: any) => {
          let category: Category;
          if (it.category && typeof it.category === 'object' && 'name' in it.category) {
            category = it.category as Category;
          } else {
            const found = cats.find(c => c._id === it.category);
            category = found ?? placeholderCategory;
          }
          return { ...it, category };
        }));
      } else if (invData && Array.isArray(invData.data)) {
        setServerPaging(true);
        setTotal(Number(invData.total) || 0);
        setTotalPages(Number(invData.totalPages) || 1);
        setInventory((invData.data as any[]).map((it: any) => {
          let category: Category;
          if (it.category && typeof it.category === 'object' && 'name' in it.category) {
            category = it.category as Category;
          } else {
            const found = cats.find(c => c._id === it.category);
            category = found ?? placeholderCategory;
          }
          return { ...it, category };
        }));
      } else {
        setServerPaging(false);
        setTotal(0);
        setTotalPages(1);
        setInventory([]);
      }
    } catch {
      toast({ title: "Error", description: "Unable to load inventory data", variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast, page, limit, appliedQuery]);

  React.useEffect(() => {
    (async () => { await loadAll(); })();
  }, [loadAll]);

  // Function to add a new category to the DB and local state
  const handleAddCategory = async (name: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/categories`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      const created: Category = await res.json();
      setDbCategories((prev) => [...prev, created]);
      toast({ title: "Category Added", description: `${name} has been added.` });
    } catch {
      toast({ title: "Error", description: "Failed to add category.", variant: "destructive" });
    }
  };

  // Build printable rows according to the current tab filter
  const getVisibleRowsForPrint = () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let rows = [...filteredInventory];
    if (tableFilter === 'low') rows = rows.filter(r => r.currentStock <= r.minThreshold);
    if (tableFilter === 'expiring') rows = rows.filter(r => r.expiryDate && (new Date(r.expiryDate as any) <= soon));
    if (tableFilter === 'out') rows = rows.filter(r => r.currentStock <= 0);
    return rows;
  };

  const handlePrint = () => {
    const rows = getVisibleRowsForPrint();
    const headers = [
      'Invoice #','Item','Category','Packs','Units/Pack','Sale/Pack','Unit Sale','Total Units','Min Stock','Expiry','Supplier','Status'
    ];
    const htmlRows = rows.map(r => {
      const exp = r.expiryDate ? (typeof r.expiryDate === 'string' ? new Date(r.expiryDate) : r.expiryDate) : null;
      const isOut = r.currentStock <= 0;
      const isLow = r.currentStock <= r.minThreshold;
      const isExp = exp ? (exp <= new Date(Date.now() + 30*24*60*60*1000)) : false;
      const status = isOut ? 'Out of stock' : (isLow ? 'Low' : (isExp ? 'Expiring' : 'OK'));
      return `<tr>
        <td>${(r as any).invoiceNumber || '-'}</td>
        <td>${r.name}</td>
        <td>${(r.category && (r.category as any).name) || 'Uncategorized'}</td>
        <td>${(r as any).packs ?? '-'}</td>
        <td>${(r as any).itemsPerPack ?? '-'}</td>
        <td>${(r as any).salePricePerPack ?? '-'}</td>
        <td>${(r as any).salePricePerUnit ?? '-'}</td>
        <td>${r.currentStock}</td>
        <td>${r.minThreshold}</td>
        <td>${exp ? exp.toLocaleDateString() : '-'}</td>
        <td>${r.supplier}</td>
        <td>${status}</td>
      </tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><title>Inventory Print</title>
      <style>
        body{font-family: Arial, sans-serif;padding:16px}
        h2{margin:0 0 12px 0}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px;text-align:left}
        th{background:#f5f5f5}
      </style>
    </head><body>
      <h2>Inventory (${tableFilter})</h2>
      <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${htmlRows || '<tr><td colspan="12">No items</td></tr>'}</tbody></table>
      <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(), 300); };</script>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  };
  const filteredInventory = serverPaging ? inventory : inventory
    .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(item => {
      const q = appliedQuery.trim().toLowerCase();
      if (!q) return true;
      const nameMatch = item.name.toLowerCase().includes(q);
      const catMatch = (item.category?.name || "").toLowerCase().includes(q);
      const invMatch = String((item as any).invoiceNumber || "").toLowerCase().includes(q);
      return nameMatch || catMatch || invMatch;
    });

  const effectiveTotal = serverPaging ? (total || 0) : filteredInventory.length;

  const lowStockItems = inventory.filter(item => item.currentStock <= item.minThreshold);
  const expiringSoonItems = inventory.filter(item => 
    (item.expiryDate && (typeof item.expiryDate === 'string' ? new Date(item.expiryDate) : item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
  );

  const getStockStatus = (item: InventoryItem) => {
    const percentage = (item.currentStock / item.maxCapacity) * 100;
    if (item.currentStock <= item.minThreshold) return { status: "low", color: "bg-red-500", textColor: "text-red-700" };
    if (percentage < 30) return { status: "medium", color: "bg-yellow-500", textColor: "text-yellow-700" };
    return { status: "good", color: "bg-green-500", textColor: "text-green-700" };
  };

  const getTotalValue = () => {
    return inventory.reduce((total, item: any) => {
      const spu: number | undefined = item.salePricePerUnit;
      const cpu: number = item.costPerUnit;
      const unitPrice = typeof spu === 'number' && !isNaN(spu) ? spu : cpu;
      return total + (item.currentStock * (unitPrice || 0));
    }, 0);
  };

  const handleAddItem = async (newItem: Omit<InventoryItem, '_id' | 'lastRestocked'>) => {
    try {
      console.log('Adding item payload:', newItem);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/inventory`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(newItem),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Inventory add error:', errorData);
        throw new Error(errorData.message || "Failed to add item");
      }
      const created: any = await res.json();
      const placeholderCategory: Category = { _id: 'uncategorized', name: 'Uncategorized' };
      const normCat = (created.category && typeof created.category === 'object' && 'name' in created.category)
        ? created.category as Category
        : (dbCategories.find(c => c._id === created.category) ?? placeholderCategory);
      setInventory(prev => [...prev, { ...created, category: normCat }]);
      
      toast({
        title: "Item Added",
        description: `${created.name} has been added to inventory.`,
      });
      
      setIsAddingItem(false);
      
    } catch (err) {
      console.error('Full error:', err);
      toast({ 
        title: "Error", 
        description: (err as Error).message, 
        variant: "destructive" 
      });
    }
  };

  const handleUpdateStock = (_id: string, newStock: number) => {
    setInventory(prev => 
      prev.map(item => 
        item._id === _id 
          ? { ...item, currentStock: newStock, lastRestocked: new Date() }
          : item
      )
    );
    
    toast({
      title: "Stock Updated",
      description: "Inventory has been updated successfully.",
    });
  };

  const handleDeleteItem = async (_id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE}/inventory/${_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        });
        if (!res.ok) {
          const err = await res.json().catch(()=>({ message: 'Failed to delete'}));
          throw new Error(err.message || 'Failed to delete');
        }
      } catch (err) {
        toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        return; // abort UI removal if backend failed
      }
      setInventory(prev => prev.filter(item => item._id !== _id));
      toast({
        title: "Item Deleted",
        description: "Item has been removed from inventory.",
      });
    }
  };

  // Replace full-page add form with modal dialog below in returned JSX

  // Edit flow handled via dialog below

  return (
    <div className="p-6 space-y-6">
      {/* Add New Item Dialog */}
      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          <AddNewItemForm 
            onClose={() => setIsAddingItem(false)} 
            onAddItem={handleAddItem}
            onAddCategory={handleAddCategory}
            dbCategories={dbCategories}
            suppliers={suppliers}
          />
        </DialogContent>
      </Dialog>
      {/* Edit Item Dialog */}
      <Dialog open={isEditing} onOpenChange={(open)=> { setIsEditing(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <EditItemForm
              onClose={() => { setIsEditing(false); setEditingItem(null); }}
              onUpdateItem={(updated) => {
                setInventory(prev => prev.map(it => it._id === updated._id ? updated : it));
                setIsEditing(false);
                setEditingItem(null);
              }}
              dbCategories={dbCategories}
              item={editingItem}
            />
          )}
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600">Track and manage laboratory supplies</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InventoryToolbar 
            onRefresh={loadAll}
            onExport={() => {
              const rows = filteredInventory.map(i => ({
                id: i._id,
                name: i.name,
                category: i.category?.name ?? 'Uncategorized',
                stock: i.currentStock,
                unit: i.unit,
                costPerUnit: i.costPerUnit,
                supplier: i.supplier,
                location: i.location
              }));
              const header = Object.keys(rows[0] || {id:'', name:'', category:'', stock:'', unit:'', costPerUnit:'', supplier:'', location:''});
              const csv = [header.join(','), ...rows.map(r => header.map(h => String((r as any)[h] ?? '')).join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'inventory.csv'; a.click();
              URL.revokeObjectURL(url);
            }}
            search={searchTerm}
            onSearch={setSearchTerm}
            showSearch={false}
          />
          <Button variant="secondary" className="bg-blue-800 text-white hover:bg-blue-900" onClick={() => setShowQuickUpdate(true)}>
            Update Stock
          </Button>
          <Button variant="secondary" className="bg-blue-800 text-white hover:bg-blue-900" onClick={() => setShowQuickAdjust(true)}>
            Add Loose Items
          </Button>
          <Button className="bg-blue-800 text-white hover:bg-blue-900" onClick={() => setIsAddingItem(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{effectiveTotal}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{expiringSoonItems.length}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">PKR {getTotalValue().toFixed(2)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apply Filter Controls */}
      <div className="flex items-end gap-3 justify-between">
        <div className="flex-1 max-w-xl">
          <Label>Search (name, category, invoice #)</Label>
          <Input placeholder="Type to search..." value={filterQuery} onChange={e=> setFilterQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Button className="bg-blue-800 text-white hover:bg-blue-900" onClick={()=> { setPage(1); setAppliedQuery(filterQuery); }}>Filter</Button>
          <Button className="bg-blue-800 text-white hover:bg-blue-900" onClick={handlePrint}>Print</Button>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>Manage your laboratory inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Button variant={tableFilter==='all'? 'default':'outline'} size="sm" onClick={()=> setTableFilter('all')}>All Items</Button>
            <Button variant={tableFilter==='low'? 'default':'outline'} size="sm" onClick={()=> setTableFilter('low')}>Low Stock</Button>
            <Button variant={tableFilter==='expiring'? 'default':'outline'} size="sm" onClick={()=> setTableFilter('expiring')}>Expiring Soon</Button>
            <Button variant={tableFilter==='out'? 'default':'outline'} size="sm" onClick={()=> setTableFilter('out')}>Out of Stock</Button>
          </div>
          <InventoryTable 
            rows={filteredInventory as any}
            filter={tableFilter}
            onEdit={(row)=> { const item = inventory.find(i=> i._id === row._id); if (item) { setEditingItem(item); setIsEditing(true);} }}
            onDelete={(row)=> handleDeleteItem(row._id)}
            onUpdateStock={(row)=> { const item = inventory.find(i=> i._id === row._id); if (item) setUpdateStockFor(item); }}
            onAdjustUnits={(row)=> { const item = inventory.find(i=> i._id === row._id); if (item) setAdjustUnitsFor(item); }}
            indexStart={(page - 1) * limit}
          />
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              {loading ? 'Loading...' : `${Math.min((page-1)*limit+1, Math.max(0, effectiveTotal))}-${Math.min(page*limit, Math.max(0, effectiveTotal))} of ${effectiveTotal}`}
            </div>
            <div className="flex items-center gap-2">
              <select className="px-2 py-1 border rounded text-sm" value={limit} onChange={(e)=> { setPage(1); setLimit(parseInt(e.target.value)||20); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <Button variant="outline" size="sm" onClick={()=> setPage(1)} disabled={loading || page<=1}>First</Button>
              <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.max(1,p-1))} disabled={loading || page<=1}>Prev</Button>
              <div className="px-2 text-sm">Page {loading ? '-' : page} / {loading ? '-' : (serverPaging ? (totalPages || 1) : Math.max(1, Math.ceil(effectiveTotal / limit)))}</div>
              <Button variant="outline" size="sm" onClick={()=> setPage(p=> (serverPaging ? Math.min((totalPages||1), p+1) : Math.min(Math.max(1, Math.ceil(effectiveTotal/limit)), p+1)))} disabled={loading || (serverPaging ? (totalPages||1) : Math.max(1, Math.ceil(effectiveTotal/limit))) <= page}>Next</Button>
              <Button variant="outline" size="sm" onClick={()=> setPage(serverPaging ? (totalPages||1) : Math.max(1, Math.ceil(effectiveTotal/limit)))} disabled={loading || (serverPaging ? (totalPages||1) : Math.max(1, Math.ceil(effectiveTotal/limit))) <= page}>Last</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Stock Dialog */}
      <Dialog open={!!updateStockFor} onOpenChange={(o)=> { if (!o) setUpdateStockFor(null); }}>
        {updateStockFor && (
          <UpdateStockDialog 
            itemId={updateStockFor._id}
            currentUnitsPerPack={undefined}
            onClose={() => setUpdateStockFor(null)}
            onUpdated={loadAll}
          />
        )}
      </Dialog>

      {/* Adjust Loose Items Dialog */}
      <Dialog open={!!adjustUnitsFor} onOpenChange={(o)=> { if (!o) setAdjustUnitsFor(null); }}>
        {adjustUnitsFor && (
          <AdjustLooseItemsDialog 
            itemId={adjustUnitsFor._id}
            currentStock={adjustUnitsFor.currentStock}
            unit={adjustUnitsFor.unit}
            onClose={() => setAdjustUnitsFor(null)}
            onUpdated={loadAll}
          />
        )}
      </Dialog>

      {/* Bulk Import feature removed */}

      {/* Quick Update Stock Dialog: selector inside */}
      <Dialog open={showQuickUpdate} onOpenChange={(o)=> { setShowQuickUpdate(o); if (!o) setQuickItemId(""); }}>
        {showQuickUpdate && (
          <UpdateStockDialog 
            items={inventory.map(i=> ({ _id: i._id, name: i.name }))}
            currentUnitsPerPack={undefined}
            onClose={() => { setShowQuickUpdate(false); setQuickItemId(""); }}
            onUpdated={async ()=> { await loadAll(); setShowQuickUpdate(false); setQuickItemId(""); }}
          />
        )}
      </Dialog>

      {/* Quick Adjust Loose Items Dialog (picker -> AdjustLooseItemsDialog) */}
      <Dialog open={showQuickAdjust} onOpenChange={(o)=> { setShowQuickAdjust(o); if (!o) setQuickAdjustItemId(""); }}>
        {!quickAdjustItemId ? (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select Item to Adjust Units</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Item</Label>
              <select className="border rounded-md p-2 w-full" value={quickAdjustItemId} onChange={e=> setQuickAdjustItemId(e.target.value)}>
                <option value="">-- Select item --</option>
                {inventory.map(it => (
                  <option key={it._id} value={it._id}>{it.name}</option>
                ))}
              </select>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={()=> setShowQuickAdjust(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        ) : (
          (() => {
            const sel = inventory.find(i => i._id === quickAdjustItemId);
            if (!sel) return null;
            return (
              <AdjustLooseItemsDialog 
                itemId={sel._id}
                currentStock={sel.currentStock}
                unit={sel.unit}
                onClose={() => { setShowQuickAdjust(false); setQuickAdjustItemId(""); }}
                onUpdated={async ()=> { await loadAll(); setShowQuickAdjust(false); setQuickAdjustItemId(""); }}
              />
            );
          })()
        )}
      </Dialog>
    </div>
  );
};

export default InventoryManagement;
