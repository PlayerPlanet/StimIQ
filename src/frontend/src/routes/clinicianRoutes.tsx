import { ClinicianDashboard } from '../clinician/pages/ClinicianDashboard';
import { ClinicianPatientDetail } from '../clinician/pages/ClinicianPatientDetail';
import { ClinicianSimulationLab } from '../clinician/pages/ClinicianSimulationLab';
import { ClinicianHandTrackingDebug } from '../clinician/pages/ClinicianHandTrackingDebug';
import { ClinicianOverview } from '../clinician/pages/ClinicianOverview';

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
    path: '/overview',
    element: <ClinicianOverview />,
  },
  {
    path: '/simulation',
    element: <ClinicianSimulationLab />,
  },
  {
    path: '/hand-tracking',
    element: <ClinicianHandTrackingDebug />,
  },
  {
    path: '/:patientId',
    element: <ClinicianPatientDetail />,
  },
];
