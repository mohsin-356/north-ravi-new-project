import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ReturnsPageImpl from '@/components/Pharmacy components/ReturnsPage';

export function ReturnsPage() {
  const [params] = useSearchParams();
  const billNo = params.get('billNo') || undefined;
  // isUrdu could be derived from settings or locale; defaulting to false here.
  return <ReturnsPageImpl isUrdu={false} initialBillNo={billNo} />;
}
