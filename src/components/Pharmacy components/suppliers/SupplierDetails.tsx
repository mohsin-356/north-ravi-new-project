import React from 'react';
import { Supplier } from '@/types/supplier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SupplierOrderHistory } from './SupplierOrderHistory';
import { SupplierPaymentForm } from './SupplierPaymentForm';
import { SupplierPaymentHistory } from './SupplierPaymentHistory';

type SupplierDetailsProps = {
  supplier: Supplier;
  onSave: (updatedSupplier: Supplier) => void;
  onBack: () => void;
};

export function SupplierDetails({ supplier, onSave, onBack }: SupplierDetailsProps) {
  const [editedSupplier, setEditedSupplier] = React.useState<Supplier>({ ...supplier });
  const [isEditing, setIsEditing] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedSupplier(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    onSave({
      ...editedSupplier,
      updatedAt: new Date()
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>
        Back to List
      </Button>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Supplier Profile</CardTitle>
              {isEditing ? (
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save</Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={editedSupplier.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    value={editedSupplier.contactPerson}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              {/* Additional fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={editedSupplier.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    value={editedSupplier.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={editedSupplier.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    name="taxId"
                    value={editedSupplier.taxId || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    name="paymentTerms"
                    value={editedSupplier.paymentTerms}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creditLimit">Credit Limit</Label>
                  <Input
                    id="creditLimit"
                    name="creditLimit"
                    type="number"
                    value={editedSupplier.creditLimit || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentBalance">Current Balance</Label>
                  <Input
                    id="currentBalance"
                    name="currentBalance"
                    type="number"
                    value={editedSupplier.currentBalance || ''}
                    onChange={handleChange}
                    disabled={true}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={editedSupplier.notes || ''}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="orders">
          <SupplierOrderHistory supplierId={supplier.id} />
        </TabsContent>
        
        <TabsContent value="payments">
          <div className="space-y-4">
            <SupplierPaymentForm supplierId={supplier.id} />
            <SupplierPaymentHistory supplierId={supplier.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
