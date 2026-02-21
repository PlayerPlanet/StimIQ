import { ClinicianDashboard } from '../clinician/pages/ClinicianDashboard';
import { ClinicianPatientDetail } from '../clinician/pages/ClinicianPatientDetail';

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
    path: '/:patientId',
    element: <ClinicianPatientDetail />,
  },
];
