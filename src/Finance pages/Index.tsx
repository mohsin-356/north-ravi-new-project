import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useFinanceAuth, FinanceAuthProvider } from '@/Finance contexts/AuthContext';
import FinanceLogin from './Login';
import FinanceLayout from '@/Finance components/Layout';
import PharmacyReport from './PharmacyReport';
import LabReport from './LabReport';
import HospitalReport from './HospitalReport';
import FinanceSettings from './Settings';
import FinanceUsers from './Users';
// Staff dashboard removed

function InnerApp() {
  const { user } = useFinanceAuth();
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<FinanceLogin />} />
        <Route path="*" element={<Navigate to="/finance/login" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<FinanceLayout />}>
        {/* Default to an existing page now that FinanceDashboard has been removed */}
        <Route index element={<Navigate to="/finance/lab" replace />} />
        <Route path="pharmacy" element={<PharmacyReport />} />
        <Route path="lab" element={<LabReport />} />
        <Route path="hospital" element={<HospitalReport />} />
        <Route path="settings" element={<FinanceSettings />} />
        <Route path="users" element={<FinanceUsers />} />
        <Route path="*" element={<Navigate to="/finance" replace />} />
      </Route>
    </Routes>
  );
}

export default function FinanceApp() {
  return (
    <FinanceAuthProvider>
      <InnerApp />
    </FinanceAuthProvider>
  );
}

