
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save } from 'lucide-react';

interface StaffFormProps {
  isUrdu: boolean;
  onClose: () => void;
  onSave: (staff: any) => void;
  staff?: any;
}

const StaffForm: React.FC<StaffFormProps> = ({ isUrdu, onClose, onSave, staff }) => {
  const [formData, setFormData] = useState({
    name: staff?.name || '',
    position: staff?.position || '',
    phone: staff?.phone || '',
    email: staff?.email || '',
    address: staff?.address || '',
    salary: staff?.salary || '',
    joinDate: staff?.joinDate || new Date().toISOString().split('T')[0],
    status: staff?.status || 'active'
  });

  const text = {
    en: {
      title: staff ? 'Edit Staff' : 'Add Staff',
      name: 'Staff Name',
      position: 'Position',
      phone: 'Phone Number',
      email: 'Email',
      address: 'Address',
      salary: 'Salary',
      joinDate: 'Join Date',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      pharmacist: 'Pharmacist',
      assistant: 'Assistant',
      cashier: 'Cashier',
      manager: 'Manager',
      save: 'Save',
      cancel: 'Cancel'
    },
    ur: {
      title: staff ? 'عملے میں تبدیلی' : 'عملہ شامل کریں',
      name: 'عملے کا نام',
      position: 'عہدہ',
      phone: 'فون نمبر',
      email: 'ای میل',
      address: 'پتہ',
      salary: 'تنخواہ',
      joinDate: 'شمولیت کی تاریخ',
      status: 'حالت',
      active: 'فعال',
      inactive: 'غیر فعال',
      pharmacist: 'فارماسسٹ',
      assistant: 'اسسٹنٹ',
      cashier: 'کیشیئر',
      manager: 'منیجر',
      save: 'محفوظ کریں',
      cancel: 'منسوخ'
    }
  };

  const t = isUrdu ? text.ur : text.en;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: staff?.id || Date.now(),
      attendanceRecords: staff?.attendanceRecords || []
    });
    onClose();
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-hidden p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-y-auto max-h-[90vh]">
        <Card className="border-0 shadow-none">
        <CardHeader className="border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">{t.title}</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">{t.name}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full"
                  required
                />
              </div>
              
              {/* Position */}
              <div className="space-y-2">
                <Label htmlFor="position" className="text-sm font-medium">{t.position}</Label>
                <Select 
                  value={formData.position} 
                  onValueChange={(value) => setFormData({...formData, position: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pharmacist">{t.pharmacist}</SelectItem>
                    <SelectItem value="assistant">{t.assistant}</SelectItem>
                    <SelectItem value="cashier">{t.cashier}</SelectItem>
                    <SelectItem value="manager">{t.manager}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">{t.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full"
                />
              </div>

              {/* Address - Full Width */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-sm font-medium">{t.address}</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full min-h-[100px]"
                />
              </div>

              {/* Salary */}
              <div className="space-y-2">
                <Label htmlFor="salary" className="text-sm font-medium">{t.salary}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">PKR</span>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    className="w-full pl-12"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>

              {/* Join Date */}
              <div className="space-y-2">
                <Label htmlFor="joinDate" className="text-sm font-medium">{t.joinDate}</Label>
                <Input
                  id="joinDate"
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                  className="w-full"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">{t.status}</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t.active}</SelectItem>
                    <SelectItem value="inactive">{t.inactive}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                {t.cancel}
              </Button>
              <Button type="submit" className="min-w-[120px]">
                <Save className="h-4 w-4 mr-2" />
                {t.save}
              </Button>
            </div>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffForm;
