import React, { useEffect, useState } from 'react';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier, UISupplier, addSupplierPayment } from '@/pharmacy utilites/supplierService';
import { getInventory, saveInventory, InventoryItem } from '@/pharmacy utilites/inventoryService';
import { useAuditLog } from '@/Pharmacy contexts/AuditLogContext';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import SupplierForm from './SupplierForm';
import SupplierProfileDialog from './suppliers/SupplierProfileDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Building, Phone, Mail, Calendar, Edit, Trash2, Eye, AlertCircle } from 'lucide-react';

interface SupplierManagementProps { isUrdu: boolean }

const SupplierManagement: React.FC<SupplierManagementProps> = ({ isUrdu }) => {
  const { logAction } = useAuditLog();

  // search and selection
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<UISupplier | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<UISupplier | null>(null);
  const [suppliers, setSuppliers] = useState<UISupplier[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [supplierInventoryItems, setSupplierInventoryItems] = useState<InventoryItem[]>([]);

  // delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UISupplier | null>(null);

  // payment UI state
  const [payForId, setPayForId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNote, setPayNote] = useState('');
  const [payDate, setPayDate] = useState('');

  // English-only labels (Urdu removed)
  const t = {
    title: 'Supplier Management',
    searchPlaceholder: 'Search suppliers...',
    addSupplier: 'Add Supplier',
    lastOrder: 'Last Order',
    totalPurchases: 'Total Purchases',
    pendingPayments: 'Pending Payments',
    active: 'Active',
    inactive: 'Inactive',
    recordPayment: 'Record Payment',
    paid: 'Paid',
    remaining: 'Remaining',
    amount: 'Amount',
    method: 'Method',
    note: 'Note',
    date: 'Date',
    save: 'Save',
    cancel: 'Cancel',
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
  } as const;

  // load suppliers
  useEffect(() => {
    (async () => {
      try { setSuppliers(await getSuppliers()); } catch (e) { console.error(e); }
    })();
  }, []);

  // local storage mirror
  useEffect(() => {
    if (suppliers.length) localStorage.setItem('pharmacy_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.companyName || '').toLowerCase().includes(q) ||
      (s.contactPerson || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q)
    );
  });

  useEffect(() => { setPage(1); }, [searchTerm, suppliers.length]);
  const total = filteredSuppliers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginatedSuppliers = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, page, pageSize]);

  const handleSaveSupplier = async (supplierData: any) => {
    if (editingSupplier) {
      try { await updateSupplier(editingSupplier.id, supplierData); setSuppliers(await getSuppliers()); }
      catch (err) { console.error(err); window.alert('Error updating supplier.'); }
      logAction('EDIT_SUPPLIER', `Updated supplier: ${supplierData.companyName}`, 'supplier', editingSupplier.id);
    } else {
      try { await addSupplier(supplierData); setSuppliers(await getSuppliers()); }
      catch (err) { console.error(err); window.alert('Error adding supplier.'); }
      logAction('ADD_SUPPLIER', `Added new supplier: ${supplierData.companyName}`, 'supplier');
    }
    setEditingSupplier(null);
    setShowForm(false);
  };

  const handleDeleteSupplier = (supplier: UISupplier) => {
    setDeleteTarget(supplier);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      await deleteSupplier(id);
      setSuppliers(await getSuppliers());
      logAction('DELETE_SUPPLIER', `Deleted supplier: ${deleteTarget.companyName}`, 'supplier', id);
      if (selectedSupplier?.id === id) setSelectedSupplier(null);
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      window.alert('Error deleting supplier.');
    }
    setShowDeleteDialog(false);
    setDeleteTarget(null);
  };

  // inventory helpers kept from previous version
  const handleViewInInventory = (item: any) => { window.alert('View in Inventory: ' + item.name); };
  const handleAddToInventory = async (item: any) => {
    try {
      const inventory = await getInventory();
      const existing = inventory.find((inv: any) => (inv.name || '').toLowerCase() === (item.name || '').toLowerCase());
      if (existing) {
        const updated = inventory.map((inv: any) => ((inv.name || '').toLowerCase() === (item.name || '').toLowerCase()) ? { ...inv, stock: (inv.stock || 0) + (item.quantity || 0), price: item.cost } : inv);
        await saveInventory(updated);
        window.alert('Inventory updated: Stock increased for ' + item.name);
      } else {
        const newItem: Partial<InventoryItem> = { name: item.name, genericName: '', category: '', stock: item.quantity, minStock: 0, purchasePrice: item.cost, price: item.cost, barcode: '', manufacturer: selectedSupplier ? selectedSupplier.companyName : '', expiryDate: '' };
        await saveInventory([...inventory, newItem as InventoryItem]);
        window.alert('New item added to inventory: ' + item.name);
      }
    } catch { window.alert('Error updating inventory.'); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> {t.addSupplier}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {paginatedSuppliers.map((supplier) => (
              <Card key={supplier.id} className="cursor-pointer hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Building className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{supplier.companyName}</h3>
                          <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2"><Phone className="h-4 w-4 text-gray-400" /><span>{supplier.phone}</span></div>
                        <div className="flex items-center space-x-2"><span className="truncate">{supplier.address}</span></div>
                        <div className="flex items-center space-x-2"><Calendar className="h-4 w-4 text-gray-400" /><span>{t.lastOrder}: {supplier.lastOrder}</span></div>
                      </div>
                      <div className="flex items-center space-x-4 mt-4 flex-wrap">
                        <Badge variant="secondary">{t.totalPurchases}: PKR {(supplier.totalPurchases ?? 0).toLocaleString()}</Badge>
                        <Badge variant="outline">{t.paid}: PKR {(supplier.totalPaid ?? 0).toLocaleString()}</Badge>
                        {Number(supplier.pendingPayments ?? 0) > 0 ? (
                          <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{t.remaining}: PKR {(supplier.pendingPayments ?? 0).toLocaleString()}</Badge>
                        ) : (
                          <Badge variant="outline">{t.paid}</Badge>
                        )}
                        <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>{supplier.status === 'active' ? t.active : t.inactive}</Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedSupplier(supplier); setProfileOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => { setPayForId(prev => prev === supplier.id ? null : supplier.id); setPayAmount(''); setPayMethod('cash'); setPayNote(''); setPayDate(''); }}>{t.recordPayment}</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingSupplier(supplier); setShowForm(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteSupplier(supplier)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  {payForId === supplier.id && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
                      <div><label className="text-xs text-gray-600">{t.amount}</label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></div>
                      <div><label className="text-xs text-gray-600">{t.method}</label><Input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} placeholder="cash/bank/online" /></div>
                      <div><label className="text-xs text-gray-600">{t.note}</label><Input value={payNote} onChange={(e) => setPayNote(e.target.value)} /></div>
                      <div><label className="text-xs text-gray-600">{t.date}</label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
                      <div className="flex items-end gap-2">
                        <Button size="sm" onClick={async () => {
                          const amt = Number(payAmount);
                          if (!amt || amt <= 0) { window.alert('Enter valid amount'); return; }
                          try {
                            await addSupplierPayment(supplier.id, { amount: amt, method: payMethod, note: payNote, date: payDate || undefined });
                            setSuppliers(await getSuppliers());
                            setPayForId(null);
                          } catch (err) { console.error(err); window.alert('Failed to add payment'); }
                        }}>{t.save}</Button>
                        <Button size="sm" variant="outline" onClick={() => setPayForId(null)}>{t.cancel}</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</div>
            <div className="flex items-center gap-2">
              <select className="border rounded px-2 py-1 text-sm" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                <option value={6}>6</option>
                <option value={9}>9</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
              </select>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
                <span className="text-sm px-2">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDeleteDialog && deleteTarget && (
        <ConfirmDeleteDialog
          isOpen={showDeleteDialog}
          supplierName={deleteTarget.companyName}
          isUrdu={isUrdu}
          onCancel={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}
          onConfirm={confirmDelete}
        />
      )}

      {showForm && (
        <SupplierForm
          isUrdu={isUrdu}
          onClose={() => { setShowForm(false); setEditingSupplier(null); }}
          onSave={handleSaveSupplier}
          supplier={editingSupplier as any}
        />
      )}

      <SupplierProfileDialog open={profileOpen} onOpenChange={setProfileOpen} supplier={selectedSupplier as any} />
    </div>
  );
};

export default SupplierManagement;
