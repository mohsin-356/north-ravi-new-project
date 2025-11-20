import React from 'react';
import FinanceDashboard from '@/components/lab compoenents/finance/FinanceDashboard';

type Tx = { _id: any; date: string; title: string; category: string; type: 'income'|'expense'; amount: number; ref?: string|null };

export default function LabReport() {
  return <FinanceDashboard />;
}
