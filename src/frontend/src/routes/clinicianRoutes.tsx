import { ClinicianDashboard } from '../clinician/pages/ClinicianDashboard';
import { ClinicianPatientDetail } from '../clinician/pages/ClinicianPatientDetail';
import { ClinicianSimulationLab } from '../clinician/pages/ClinicianSimulationLab';

/**
 * Clinician view routes
 * All routes under /clinician/*
 * Flow: Dashboard (patient list) → Patient Detail
 */
export const clinicianRoutes = [
  {
    path: '/',
    element: <ClinicianDashboard />,
  },
  {
    path: '/simulation',
    element: <ClinicianSimulationLab />,
  },
  {
    path: '/:patientId',
    element: <ClinicianPatientDetail />,
  },
];
