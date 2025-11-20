
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save } from 'lucide-react';

interface BranchFormProps {
  isUrdu: boolean;
  onClose: () => void;
  onSave: (branch: any) => void;
  branch?: any;
}

const BranchForm: React.FC<BranchFormProps> = ({ isUrdu, onClose, onSave, branch }) => {
  const [formData, setFormData] = useState({
    name: branch?.name || '',
    manager: branch?.manager || '',
    phone: branch?.phone || '',
    email: branch?.email || '',
    address: branch?.address || '',
    city: branch?.city || '',
    status: branch?.status || 'active'
  });

  const text = {
    en: {
      title: branch ? 'Edit Branch' : 'Add Branch',
      name: 'Branch Name',
      manager: 'Manager Name',
      phone: 'Phone Number',
      email: 'Email',
      address: 'Address',
      city: 'City',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      save: 'Save',
      cancel: 'Cancel'
    },
    ur: {
      title: branch ? 'برانچ میں تبدیلی' : 'برانچ شامل کریں',
      name: 'برانچ کا نام',
      manager: 'منیجر کا نام',
      phone: 'فون نمبر',
      email: 'ای میل',
      address: 'پتہ',
      city: 'شہر',
      status: 'حالت',
      active: 'فعال',
      inactive: 'غیر فعال',
      save: 'محفوظ کریں',
      cancel: 'منسوخ'
    }
  };

  const t = isUrdu ? text.ur : text.en;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: branch?.id || Date.now(),
      revenue: branch?.revenue || 0,
      expenses: branch?.expenses || 0,
      staff: branch?.staff || 0,
      createdAt: branch?.createdAt || new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t.title}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t.name}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label>{t.manager}</Label>
              <Input
                value={formData.manager}
                onChange={(e) => setFormData({...formData, manager: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>{t.phone}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>{t.email}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <Label>{t.address}</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div>
              <Label>{t.city}</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
              />
            </div>

            <div>
              <Label>{t.status}</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t.active}</SelectItem>
                  <SelectItem value="inactive">{t.inactive}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <Button type="submit" className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {t.save}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                {t.cancel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchForm;
