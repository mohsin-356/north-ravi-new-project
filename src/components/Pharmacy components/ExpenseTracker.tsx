import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  DollarSign, 
  Calendar,
  FileText,
  TrendingDown,
  Search,
  Edit,
  Trash
} from 'lucide-react';
import { useData } from '@/Pharmacy contexts/DataContext';
import { useAuditLog } from '@/Pharmacy contexts/AuditLogContext';
import { Expense } from '@/Pharmacy contexts/DataContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

interface ExpenseTrackerProps {
  isUrdu: boolean;
}

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ isUrdu }) => {
  const { expenses, addExpense, updateExpense, deleteExpense } = useData();
  const { logAction } = useAuditLog();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({ 
    date: new Date().toISOString().split('T')[0],
    type: 'Rent',
    amount: 0,
    notes: ''
  });

  // Advanced expense filters
  const [filter, setFilter] = useState({
    dateRange: { from: '', to: '' },
    expenseType: 'all',
    minAmount: 0
  });

  // Filtered expense data for charts and list
  const filteredExpenses = expenses.filter(expense => {
    const matchesDate = !filter.dateRange.from || !filter.dateRange.to || 
      (expense.date >= filter.dateRange.from && expense.date <= filter.dateRange.to);
    const matchesType = filter.expenseType === 'all' || expense.type === filter.expenseType;
    const matchesAmount = expense.amount >= filter.minAmount;
    const matchesSearch = expense.type.toLowerCase().includes(searchTerm.toLowerCase()) || expense.notes.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesType && matchesAmount && matchesSearch;
  });

  // Expense type distribution data
  const expenseTypeData = filteredExpenses.reduce((acc, expense) => {
    const existing = acc.find(item => item.name === expense.type);
    if (existing) {
      existing.value += expense.amount;
    } else {
      acc.push({ name: expense.type, value: expense.amount });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Monthly expense trend data
  const monthlyExpenseData = filteredExpenses.reduce((acc, expense) => {
    const month = expense.date.substring(0, 7); // YYYY-MM
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      acc.push({ month, amount: expense.amount });
    }
    return acc;
  }, [] as { month: string; amount: number }[]).sort((a, b) => a.month.localeCompare(b.month));

  const text = {
    en: {
      title: 'Expense Tracker',
      addExpense: 'Add New Expense',
      editExpense: 'Edit Expense',
      date: 'Date',
      expenseType: 'Expense Type',
      amount: 'Amount (PKR)',
      notes: 'Notes',
      save: 'Save Expense',
      cancel: 'Cancel',
      totalExpenses: 'Total Expenses',
      thisMonth: 'This Month',
      searchPlaceholder: 'Search expenses...',
      rent: 'Rent',
      utilities: 'Utilities',
      salaries: 'Salaries',
      supplies: 'Supplies',
      other: 'Other',
      marketing: 'Marketing',
      maintenance: 'Maintenance',
      insurance: 'Insurance',
      taxes: 'Taxes',
      confirmDelete: 'Are you sure you want to delete this expense?',
      deleteSuccess: 'Expense deleted successfully'
    },
    ur: {
      title: 'اخراجات کا ٹریکر',
      addExpense: 'نیا خرچ شامل کریں',
      editExpense: 'خرچ میں ترمیم کریں',
      date: 'تاریخ',
      expenseType: 'خرچ کی قسم',
      amount: 'رقم (PKR)',
      notes: 'نوٹس',
      save: 'خرچ محفوظ کریں',
      cancel: 'منسوخ',
      totalExpenses: 'کل اخراجات',
      thisMonth: 'اس مہینے',
      searchPlaceholder: 'اخراجات تلاش کریں...',
      rent: 'کرایہ',
      utilities: 'بجلی پانی',
      salaries: 'تنخواہیں',
      supplies: 'سامان',
      other: 'دیگر',
      marketing: 'مارکیٹنگ',
      maintenance: 'مرمت',
      insurance: 'انشورنس',
      taxes: 'ٹیکس',
      confirmDelete: 'کیا آپ واقعی یہ خرچ حذف کرنا چاہتے ہیں؟',
      deleteSuccess: 'خرچ کامیابی سے حذف ہو گیا'
    }
  };

  const t = isUrdu ? text.ur : text.en;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = () => {
    if (editingId) {
      updateExpense(editingId, formData);
      logAction('EXPENSE_UPDATE', `Updated expense: ${formData.type} (PKR ${formData.amount})`);
    } else {
      addExpense(formData);
      logAction('EXPENSE_ADD', `Added expense: ${formData.type} (PKR ${formData.amount})`);
    }
    resetForm();
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      date: expense.date,
      type: expense.type,
      amount: expense.amount,
      notes: expense.notes
    });
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t.confirmDelete)) {
      deleteExpense(id);
      logAction('EXPENSE_DELETE', `Deleted expense ID: ${id}`);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'Rent',
      amount: 0,
      notes: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const getExpenseTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'rent': return 'destructive';
      case 'utilities': return 'secondary';
      case 'salaries': return 'default';
      case 'supplies': return 'outline';
      case 'marketing': return 'primary';
      case 'maintenance': return 'success';
      case 'insurance': return 'warning';
      case 'taxes': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t.addExpense}
        </Button>
      </div>

      {/* Add/Edit Expense Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? t.editExpense : t.addExpense}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">{t.date}</Label>
                <Input 
                  id="date" 
                  type="date" 
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t.expenseType}</Label>
                <select 
                  id="type"
                  name="type"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option value="Rent">{t.rent}</option>
                  <option value="Utilities">{t.utilities}</option>
                  <option value="Salaries">{t.salaries}</option>
                  <option value="Supplies">{t.supplies}</option>
                  <option value="Marketing">{t.marketing}</option>
                  <option value="Maintenance">{t.maintenance}</option>
                  <option value="Insurance">{t.insurance}</option>
                  <option value="Taxes">{t.taxes}</option>
                  <option value="Other">{t.other}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">{t.amount}</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  name="amount"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">{t.notes}</Label>
                <Input 
                  id="notes" 
                  name="notes"
                  placeholder="Enter details..."
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={resetForm}>
                {t.cancel}
              </Button>
              <Button onClick={handleSubmit}>
                {t.save}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label>Date Range</label>
            <div className="flex items-center space-x-2">
              <DatePicker
                selected={filter.dateRange.from ? new Date(filter.dateRange.from) : null}
                onChange={(date: Date) => {
                  setFilter(prev => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      from: date ? date.toISOString().split('T')[0] : ''
                    }
                  }));
                }}
                selectsStart
                startDate={filter.dateRange.from ? new Date(filter.dateRange.from) : null}
                endDate={filter.dateRange.to ? new Date(filter.dateRange.to) : null}
                placeholderText="Select Start Date"
                className="w-full p-2 border rounded-md"
                dateFormat="yyyy-MM-dd"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                isClearable
              />
              <span>to</span>
              <DatePicker
                selected={filter.dateRange.to ? new Date(filter.dateRange.to) : null}
                onChange={(date: Date) => {
                  setFilter(prev => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      to: date ? date.toISOString().split('T')[0] : ''
                    }
                  }));
                }}
                selectsEnd
                startDate={filter.dateRange.from ? new Date(filter.dateRange.from) : null}
                endDate={filter.dateRange.to ? new Date(filter.dateRange.to) : null}
                minDate={filter.dateRange.from ? new Date(filter.dateRange.from) : null}
                placeholderText="Select End Date"
                className="w-full p-2 border rounded-md"
                dateFormat="yyyy-MM-dd"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                isClearable
              />
            </div>
          </div>
          <div className="space-y-2">
            <label>Expense Type</label>
            <select
              value={filter.expenseType}
              onChange={e => setFilter({ ...filter, expenseType: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="all">All Types</option>
              <option value="Rent">Rent</option>
              <option value="Utilities">Utilities</option>
              <option value="Salaries">Salaries</option>
              <option value="Supplies">Supplies</option>
              <option value="Marketing">Marketing</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Insurance">Insurance</option>
              <option value="Taxes">Taxes</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label>Minimum Amount</label>
            <Input
              type="number"
              value={filter.minAmount}
              onChange={e => setFilter({ ...filter, minAmount: Number(e.target.value) })}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Expenses</span>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-100 p-2 rounded-full">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getExpenseTypeColor(expense.type) as any}>
                        {expense.type}
                      </Badge>
                      <span className="text-sm text-gray-500">{expense.date}</span>
                    </div>
                    <p className="font-medium text-gray-900">{expense.notes}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-lg font-bold text-red-600">PKR {expense.amount.toLocaleString()}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEdit(expense)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(expense.id)}
                  >
                    <Trash className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expense Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Distribution by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`PKR ${value}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Expense Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyExpenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`PKR ${value}`, 'Amount']} />
                <Bar dataKey="amount" fill="#8884d8" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpenseTracker;
