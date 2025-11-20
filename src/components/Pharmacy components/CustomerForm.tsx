import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save } from 'lucide-react';

interface CustomerFormProps {
  isUrdu: boolean;
  onClose: () => void;
  onSave: (customer: any) => void;
  customer?: any;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ isUrdu, onClose, onSave, customer }) => {
  const generateMRNumber = () => {
    const prefix = 'MR-';
    const randomNum = Math.floor(1000 + Math.random() * 9000); // Generates 4-digit number
    return `${prefix}${randomNum}`;
  };

  const [formData, setFormData] = useState({
    name: customer?.name || '',
    companyName: customer?.companyName || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    cnic: customer?.cnic || '',
    mrNumber: customer?.mrNumber || generateMRNumber()
  });

  const text = {
    en: {
      title: customer ? 'Edit Customer' : 'Add Customer',
      name: 'Customer Name',
      companyName: 'Company Name',
      phone: 'Phone Number',
      
      address: 'Address',
      cnic: 'CNIC',
      
      mrNumber: 'MR Number',
      save: 'Save',
      cancel: 'Cancel'
    },
    ur: {
      title: customer ? 'کسٹمر میں تبدیلی' : 'کسٹمر شامل کریں',
      name: 'کسٹمر کا نام',
      companyName: 'کمپنی نام',
      phone: 'فون نمبر',
      
      address: 'پتہ',
      cnic: 'شناختی کارڈ',
      
      mrNumber: 'ایم آر نمبر',
      save: 'محفوظ کریں',
      cancel: 'منسوخ'
    }
  };

  const t = isUrdu ? text.ur : text.en;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      createdAt: customer?.createdAt || new Date().toISOString()
    });
    // Parent will close the form on successful save
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
              <Label>{t.companyName}</Label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
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
                required
              />
            </div>

            <div>
              <Label>{t.cnic}</Label>
              <Input
                value={formData.cnic}
                onChange={(e) => setFormData({...formData, cnic: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mrNumber" className="text-sm font-medium">{t.mrNumber}</Label>
              <Input
                id="mrNumber"
                value={formData.mrNumber}
                onChange={(e) => setFormData({...formData, mrNumber: e.target.value})}
                className="w-full"
              />
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

export default CustomerForm;
