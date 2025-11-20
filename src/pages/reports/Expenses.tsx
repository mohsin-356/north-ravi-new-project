import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Download, Trash2 } from 'lucide-react';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const expenseCategories = [
  'Medical Supplies',
  'Equipment',
  'Utilities',
  'Staff Salary',
  'Maintenance',
  'Administrative',
  'Other',
];

const ReportsExpenses: React.FC = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => now.getFullYear() - i), [now]);

  const [expenses, setExpenses] = useState<any[]>([]);
  const [pageExpenses, setPageExpenses] = useState<any[]>([]);
  const [expTotal, setExpTotal] = useState(0);
  const [expPage, setExpPage] = useState(1);
  const EXP_PAGE_SIZE = 10;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range (defaults to month-to-date)
  const firstOfMonth = new Date(); firstOfMonth.setDate(1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const [range, setRange] = useState<{ from: string; to: string }>({ from: isoDate(firstOfMonth), to: isoDate(now) });

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: 0,
    category: '',
    expenseDepartmentId: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [expenseDepartments, setExpenseDepartments] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try by explicit date range first
      try {
        const selectedDept = deptFilter && deptFilter !== 'all' ? deptFilter : '';
        const depQ = selectedDept ? `&expenseDepartmentId=${encodeURIComponent(selectedDept)}` : '';
        const resRange = await fetch(`/api/expenses?from=${range.from}&to=${range.to}${depQ}`);
        if (resRange.ok) {
          const rows = await resRange.json();
          const list = Array.isArray(rows) ? rows : [];
          setExpenses(list);
          const start = (expPage - 1) * EXP_PAGE_SIZE;
          setPageExpenses(list.slice(start, start + EXP_PAGE_SIZE));
          setExpTotal(list.length);
          return;
        }
      } catch { /* fall back to month/year endpoints below */ }

      const month = (selectedMonth + 1).toString();
      const year = selectedYear.toString();
      const selectedDept2 = deptFilter && deptFilter !== 'all' ? deptFilter : '';
      const depQ2 = selectedDept2 ? `&expenseDepartmentId=${encodeURIComponent(selectedDept2)}` : '';
      const resPaged = await fetch(`/api/expenses?month=${month}&year=${year}&page=${expPage}&limit=${EXP_PAGE_SIZE}${depQ2}`);
      if (!resPaged.ok) throw new Error('Failed to load expenses (paged)');
      const jsonPaged = await resPaged.json();
      if (Array.isArray(jsonPaged?.data)) {
        setPageExpenses(jsonPaged.data);
        setExpTotal(Number(jsonPaged.total || 0));
      } else {
        setPageExpenses(Array.isArray(jsonPaged) ? jsonPaged : []);
        setExpTotal(Array.isArray(jsonPaged) ? jsonPaged.length : 0);
      }

      const resAll = await fetch(`/api/expenses?month=${month}&year=${year}${depQ2}`);
      if (!resAll.ok) throw new Error('Failed to load expenses (all)');
      const all = await resAll.json();
      setExpenses(Array.isArray(all) ? all : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load expenses');
      setPageExpenses([]);
      setExpenses([]);
      setExpTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setExpPage(1); }, [selectedMonth, selectedYear, range.from, range.to, deptFilter]);
  useEffect(() => { loadExpenses(); }, [selectedMonth, selectedYear, expPage, range.from, range.to, deptFilter]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/expense-departments');
        const list = await res.json();
        setExpenseDepartments(Array.isArray(list) ? list : []);
      } catch {
        setExpenseDepartments([]);
      }
    })();
  }, []);

  const filteredExpenses = useMemo(() => (
    (expenses || []).filter((e: any) => {
      const d = new Date(e.date || e.createdAt || e.expenseDate || '');
      return new Date(`${range.from}T00:00:00`) <= d && d <= new Date(`${range.to}T23:59:59`);
    })
  ), [expenses, range.from, range.to]);

  const addExpense = async (payload?: any) => {
    const body = payload || {
      title: expenseForm.description || 'Expense',
      description: expenseForm.description,
      amount: parseFloat(String(expenseForm.amount || 0)),
      category: expenseForm.category,
      expenseDepartmentId: expenseForm.expenseDepartmentId || undefined,
      date: expenseForm.date,
    };
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to add expense');
      if (!payload) setExpenseForm({ description: '', amount: 0, category: '', expenseDepartmentId: '', date: new Date().toISOString().split('T')[0] });
      await loadExpenses();
    } catch (e) {
      alert('Failed to add expense');
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      await loadExpenses();
    } catch (e) {
      alert('Failed to delete expense');
    }
  };

  const exportExpensesToCSV = () => {
    if (filteredExpenses.length === 0) { alert('No expenses found for the selected period'); return; }
    const csv = [
      ['Date', 'Description', 'Category', 'Amount'],
      ...filteredExpenses.map((e: any) => [new Date(e.date).toLocaleDateString(), e.description, e.category || 'Uncategorized', e.amount])
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${range.from}_to_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <select className="border rounded-md h-9 px-2 text-sm" value={selectedMonth} onChange={(e)=>setSelectedMonth(parseInt(e.target.value,10))}>
          {months.map((m, i) => (<option key={m} value={i}>{m}</option>))}
        </select>
        <select className="border rounded-md h-9 px-2 text-sm" value={selectedYear} onChange={(e)=>setSelectedYear(parseInt(e.target.value,10))}>
          {years.map(y => (<option key={y} value={y}>{y}</option>))}
        </select>
        <div className="flex items-center gap-2">
          <Input type="date" className="h-9 w-[150px]" value={range.from} onChange={(e)=>setRange(r=>({...r, from: e.target.value}))} />
          <span>—</span>
          <Input type="date" className="h-9 w-[150px]" value={range.to} onChange={(e)=>setRange(r=>({...r, to: e.target.value}))} />
          <Button variant="outline" className="h-9" onClick={loadExpenses}>Apply</Button>
        </div>
        <div>
          <Select value={deptFilter} onValueChange={(v)=>setDeptFilter(v)}>
            <SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="All expense departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All expense departments</SelectItem>
              {expenseDepartments
                .filter((d: any) => d && typeof d._id === 'string' && d._id.trim() !== '')
                .map((d: any) => (<SelectItem key={`expdept-filter-${d._id}`} value={d._id}>{d.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button id="reports-expenses-trigger" className="h-9 px-4 bg-blue-500 hover:bg-blue-400 text-white rounded-xl shadow"> <Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description-exp">Description</Label>
                <Input id="description-exp" value={expenseForm.description} onChange={(e)=>setExpenseForm(p=>({...p, description: e.target.value}))} placeholder="Enter expense description" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="amount-exp">Amount (Rs.)</Label>
                <Input id="amount-exp" type="number" value={expenseForm.amount} onChange={(e)=>setExpenseForm(p=>({...p, amount: parseFloat(e.target.value)||0}))} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="category-exp">Category</Label>
                <Select value={expenseForm.category} onValueChange={(v)=>setExpenseForm(p=>({...p, category: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (<SelectItem key={`exp-cat-${cat}`} value={cat}>{cat}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expense-department-exp">Expense Department</Label>
                <Select value={expenseForm.expenseDepartmentId} onValueChange={(v)=>setExpenseForm(p=>({...p, expenseDepartmentId: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select expense department" /></SelectTrigger>
                  <SelectContent>
                    {expenseDepartments
                      .filter((d: any) => d && typeof d._id === 'string' && d._id.trim() !== '')
                      .map((d: any) => (<SelectItem key={`expdep-${d._id}`} value={d._id}>{d.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date-exp">Date</Label>
                <Input id="date-exp" type="date" value={expenseForm.date} onChange={(e)=>setExpenseForm(p=>({...p, date: e.target.value}))} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={()=>addExpense()} disabled={!expenseForm.description || !expenseForm.amount} className="bg-blue-500 hover:bg-blue-400">Add Expense</Button>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button onClick={exportExpensesToCSV} className="h-9 px-4 bg-blue-500 hover:bg-blue-400 text-white rounded-xl shadow"> <Download className="h-4 w-4 mr-2" /> Export CSV</Button>
      </div>

      {/* Widgets and charts removed; tabular view below */}

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {expTotal === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-xl">No expenses recorded for this period</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const totalPages = Math.max(1, Math.ceil(expTotal / EXP_PAGE_SIZE));
            const currentPage = Math.min(expPage, totalPages);
            const start = (currentPage - 1) * EXP_PAGE_SIZE;
            const end = Math.min(start + EXP_PAGE_SIZE, expTotal);
            const pageItems = pageExpenses;
            return (
              <>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Showing {expTotal === 0 ? 0 : start + 1}-{end} of {expTotal}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={currentPage === 1} onClick={() => setExpPage(p => Math.max(1, p - 1))} className="h-8 px-3">Prev</Button>
                    <span className="px-2">Page {currentPage} / {totalPages}</span>
                    <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setExpPage(p => Math.min(totalPages, p + 1))} className="h-8 px-3">Next</Button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border bg-white">
                  <Table>
                    <TableHeader className="bg-blue-50">
                      <TableRow className="bg-blue-50">
                        <TableHead className="text-blue-900 font-semibold">Date</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Description</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Category</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Expense Department</TableHead>
                        <TableHead className="text-right text-blue-900 font-semibold">Amount</TableHead>
                        <TableHead className="text-blue-900 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map((expense: any, idx: number) => (
                        <TableRow key={`exp-${expense._id || expense.id || expense.date || idx}`}>
                          <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>{expense.category || 'Uncategorized'}</TableCell>
                          <TableCell>{expense.expenseDepartmentName || ''}</TableCell>
                          <TableCell className="text-right">Rs. {Number(expense.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => deleteExpense(expense._id || expense.id)} className="bg-red-500 hover:bg-red-600 text-white">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Showing {expTotal === 0 ? 0 : start + 1}-{end} of {expTotal}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={currentPage === 1} onClick={() => setExpPage(p => Math.max(1, p - 1))} className="h-8 px-3">Prev</Button>
                    <span className="px-2">Page {currentPage} / {totalPages}</span>
                    <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setExpPage(p => Math.min(totalPages, p + 1))} className="h-8 px-3">Next</Button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ReportsExpenses;
