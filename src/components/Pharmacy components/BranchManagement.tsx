
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Building2, 
  Phone, 
  Mail,
  MapPin,
  DollarSign,
  Users,
  Calendar,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import BranchForm from './BranchForm';

interface BranchManagementProps {
  isUrdu: boolean;
}

const BranchManagement: React.FC<BranchManagementProps> = ({ isUrdu }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branches, setBranches] = useState<Array<{
    id: number;
    name: string;
    manager: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    revenue: number;
    expenses: number;
    staff: number;
    status: 'active' | 'inactive';
    createdAt: string;
  }>>([]);

  // Load branches from localStorage on component mount
  useEffect(() => {
    const savedBranches = localStorage.getItem('pharmacy_branches');
    if (savedBranches) {
      setBranches(JSON.parse(savedBranches));
    } else {
      // Default branches if no data in localStorage
      const defaultBranches = [
        {
          id: 1,
          name: 'Main Branch',
          manager: 'Dr. Ali Ahmed',
          phone: '+92-21-1234567',
          email: 'main@pharmacare.com',
          address: 'Main Boulevard, Gulshan-e-Iqbal, Karachi',
          city: 'Karachi',
          revenue: 850000.00,
          expenses: 320000.00,
          staff: 8,
          status: 'active' as const,
          createdAt: '2020-01-15'
        },
        {
          id: 2,
          name: 'North Branch',
          manager: 'Ms. Sarah Khan',
          phone: '+92-21-9876543',
          email: 'north@pharmacare.com',
          address: 'North Nazimabad, Block H, Karachi',
          city: 'Karachi',
          revenue: 420000.00,
          expenses: 180000.00,
          staff: 5,
          status: 'active' as const,
          createdAt: '2021-03-20'
        },
        {
          id: 3,
          name: 'Lahore Branch',
          manager: 'Mr. Usman Ali',
          phone: '+92-42-5555555',
          email: 'lahore@pharmacare.com',
          address: 'MM Alam Road, Gulberg, Lahore',
          city: 'Lahore',
          revenue: 650000.00,
          expenses: 280000.00,
          staff: 6,
          status: 'active' as const,
          createdAt: '2022-06-10'
        }
      ];
      setBranches(defaultBranches);
      localStorage.setItem('pharmacy_branches', JSON.stringify(defaultBranches));
    }
  }, []);

  // Save branches to localStorage whenever they change
  useEffect(() => {
    if (branches.length > 0) {
      localStorage.setItem('pharmacy_branches', JSON.stringify(branches));
    }
  }, [branches]);

  const text = {
    en: {
      title: 'Branch Management',
      searchPlaceholder: 'Search branches...',
      addBranch: 'Add Branch',
      name: 'Branch Name',
      manager: 'Manager',
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
      city: 'City',
      revenue: 'Revenue',
      expenses: 'Expenses',
      profit: 'Profit',
      staff: 'Staff',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      edit: 'Edit',
      delete: 'Delete',
      view: 'View',
      since: 'Since'
    },
    ur: {
      title: 'برانچ منیجمنٹ',
      searchPlaceholder: 'برانچ تلاش کریں...',
      addBranch: 'برانچ شامل کریں',
      name: 'برانچ کا نام',
      manager: 'منیجر',
      phone: 'فون',
      email: 'ای میل',
      address: 'پتہ',
      city: 'شہر',
      revenue: 'آمدنی',
      expenses: 'اخراجات',
      profit: 'منافع',
      staff: 'عملہ',
      status: 'حالت',
      active: 'فعال',
      inactive: 'غیر فعال',
      edit: 'تبدیل کریں',
      delete: 'حذف کریں',
      view: 'دیکھیں',
      since: 'سے'
    }
  };

  const t = isUrdu ? text.ur : text.en;

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.manager.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveBranch = (branchData: any) => {
    if (editingBranch) {
      setBranches(branches.map(b => b.id === branchData.id ? branchData : b));
    } else {
      setBranches([...branches, branchData]);
    }
    setEditingBranch(null);
  };

  const handleEditBranch = (branch: any) => {
    setEditingBranch(branch);
    setShowForm(true);
  };

  const handleDeleteBranch = (branchId: number) => {
    setBranches(branches.filter(b => b.id !== branchId));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t.addBranch}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches.map((branch) => {
          const profit = branch.revenue - branch.expenses;
          const profitMargin = branch.revenue > 0 ? (profit / branch.revenue) * 100 : 0;
          
          return (
            <Card key={branch.id} className="hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{branch.name}</h3>
                      <p className="text-sm text-gray-600">{branch.city}</p>
                    </div>
                  </div>
                  <Badge variant={branch.status === 'active' ? 'default' : 'secondary'}>
                    {branch.status === 'active' ? t.active : t.inactive}
                  </Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{t.manager}: {branch.manager}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{branch.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{branch.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{branch.address}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t.revenue}:</span>
                    <span className="text-green-600 font-semibold">PKR {branch.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t.expenses}:</span>
                    <span className="text-red-600 font-semibold">PKR {branch.expenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t.profit}:</span>
                    <div className="flex items-center space-x-1">
                      {profit >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        PKR {profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t.staff}:</span>
                    <span className="font-semibold">{branch.staff} members</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="text-xs text-gray-500">{t.since} {branch.createdAt}</span>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline" onClick={() => handleEditBranch(branch)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteBranch(branch.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <BranchForm
          isUrdu={isUrdu}
          onClose={() => {
            setShowForm(false);
            setEditingBranch(null);
          }}
          onSave={handleSaveBranch}
          branch={editingBranch}
        />
      )}
    </div>
  );
};

export default BranchManagement;
