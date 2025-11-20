import React from 'react';
import { SettingsProvider as PharmacySettingsProvider } from '@/Pharmacy contexts/PharmacySettingsContext';
import SummaryReportClean from '@/components/Pharmacy components/SummaryReportClean';

export default function PharmacyReport() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pharmacy Summary</h1>
      <PharmacySettingsProvider>
        <SummaryReportClean isUrdu={false} />
      </PharmacySettingsProvider>
    </div>
  );
}
