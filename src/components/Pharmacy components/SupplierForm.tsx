
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save } from 'lucide-react';

interface SupplierFormProps {
  isUrdu: boolean;
  onClose: () => void;
  onSave: (supplier: any) => void;
  supplier?: any;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ isUrdu, onClose, onSave, supplier }) => {
  const [formData, setFormData] = useState({
    companyName: supplier?.companyName || '',
    contactPerson: supplier?.contactPerson || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    taxId: supplier?.taxId || '',
    status: supplier?.status || 'active'
  });

  const text = {
    en: {
      title: supplier ? 'Edit Supplier' : 'Add Supplier',
      companyName: 'Supplier Name',
      contactPerson: 'Company Name',
      phone: 'Phone Number',
      
      address: 'Address',
      taxId: 'Tax ID',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      save: 'Save',
      cancel: 'Cancel'
    },
    ur: {
      title: supplier ? 'سپلائر میں تبدیلی' : 'سپلائر شامل کریں',
      companyName: 'سپلائر کا نام',
      contactPerson: 'کمپنی کا نام',
      phone: 'فون نمبر',
      
      address: 'پتہ',
      taxId: 'ٹیکس آئی ڈی',
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
      id: supplier?.id || Date.now(),
      totalPurchases: supplier?.totalPurchases || 0,
      pendingPayments: supplier?.pendingPayments || 0,
      lastOrder: supplier?.lastOrder || new Date().toISOString().split('T')[0],
      purchases: supplier?.purchases || []
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
              <Label>{t.companyName}</Label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label>{t.contactPerson}</Label>
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
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
              <Label>{t.address}</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div>
              <Label>{t.taxId}</Label>
              <Input
                value={formData.taxId}
                onChange={(e) => setFormData({...formData, taxId: e.target.value})}
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

export default SupplierForm;
