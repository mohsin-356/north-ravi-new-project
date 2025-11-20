import React from 'react';
import POSSystem from '@/components/Pharmacy components/POSSystem';

export function POSPage() {
  return (
    <div className="flex h-screen">
      <POSSystem isUrdu={false} />
    </div>
  );
}
