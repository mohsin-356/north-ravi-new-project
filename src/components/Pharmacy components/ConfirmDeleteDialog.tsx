import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  isOpen: boolean;
  supplierName: string;
  isUrdu: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteDialog: React.FC<Props> = ({ isOpen, supplierName, isUrdu, onCancel, onConfirm }) => {
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAck1(false);
      setAck2(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const t = isUrdu
    ? {
        title: 'کیا آپ واقعی اس سپلائر کو حذف کرنا چاہتے ہیں؟',
        desc: 'یہ عمل ناقابلِ واپسی ہے۔ براہ کرم تصدیق کریں کہ آپ اس سپلائر کو مستقل طور پر حذف کرنا چاہتے ہیں۔',
        a1: 'میں سمجھتا/سمجھتی ہوں کہ یہ عمل واپس نہیں ہو سکتا۔',
        a2: `میں نے ${supplierName} کا جائزہ لیا ہے اور مستقل طور پر حذف کرنا چاہتا/چاہتی ہوں۔`,
        cancel: 'منسوخ',
        del: 'حذف کریں',
      }
    : {
        title: `Are you sure you want to delete ${supplierName}?`,
        desc: 'This action is irreversible. Please confirm you want to permanently delete this supplier.',
        a1: 'I understand this action cannot be undone.',
        a2: `I have reviewed ${supplierName} and wish to permanently delete it.`,
        cancel: 'Cancel',
        del: 'Delete',
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex items-start justify-between">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>{t.title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <p>{t.desc}</p>

          <div className="space-y-4">
            <label className="flex items-start space-x-2">
              <Checkbox checked={ack1} onCheckedChange={() => setAck1(!ack1)} />
              <span>{t.a1}</span>
            </label>
            <label className="flex items-start space-x-2">
              <Checkbox checked={ack2} onCheckedChange={() => setAck2(!ack2)} />
              <span>{t.a2}</span>
            </label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button variant="destructive" disabled={!(ack1 && ack2)} onClick={onConfirm}>
              {t.del}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmDeleteDialog;
