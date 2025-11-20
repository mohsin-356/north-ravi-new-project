import { Route, Routes } from 'react-router-dom';
import IpdPage from '../pages/Ipd';
import PatientProfile from '../components/ipd/PatientProfile';

import { BedPlan } from '../components/ipd/BedPlan';

import { PatientList } from '../components/ipd/PatientList';
import { IpdAdmissions as Admissions } from '../components/ipd/Admissions';
import Schedule from '../components/ipd/Schedule';
import { IpdDashboard } from '../components/ipd/IpdDashboard';
import IpdFinance from '../pages/ipd/IpdFinance';
import IpdExpenses from '../pages/ipd/IpdExpenses';

export const IpdRoutes = () => (
  <Routes>
    <Route path="/" element={<IpdPage />}>
      <Route index element={<IpdDashboard />} />
      <Route path="beds" element={<BedPlan />} />
      <Route path="patients" element={<PatientList />} />
      <Route path="admissions" element={<Admissions />} />
      <Route path="schedule" element={<Schedule />} />
      <Route path="finance" element={<IpdFinance />} />
      <Route path="finance/expenses" element={<IpdExpenses />} />
      <Route path="patients/:patientId" element={<PatientProfile />} />
    </Route>
  </Routes>
);

export default IpdRoutes;
