import React, { useState } from 'react';
import CustomerReturnPage from '@/components/Pharmacy components/CustomerReturnPage';
import SupplierReturnPage from '@/components/Pharmacy components/SupplierReturnPage';
import { Button } from '@/components/ui/button';

interface Props { isUrdu: boolean }

const ReturnsContainer: React.FC<Props> = ({ isUrdu }) => {
  const [mode, setMode] = useState<'customer' | 'supplier'>('customer');
  const t = {
    customer: 'Customer Return',
    supplier: 'Supplier Return'
  };
  return (
    <div className="space-y-4 p-4">
      <div className="space-x-2">
        <Button variant={mode==='customer'?'default':'outline'} onClick={()=>setMode('customer')}>{t.customer}</Button>
        <Button variant={mode==='supplier'?'default':'outline'} onClick={()=>setMode('supplier')}>{t.supplier}</Button>
      </div>
      {mode==='customer'? <CustomerReturnPage isUrdu={isUrdu}/> : <SupplierReturnPage isUrdu={isUrdu}/>} 
    </div>
  );
};
export default ReturnsContainer; 