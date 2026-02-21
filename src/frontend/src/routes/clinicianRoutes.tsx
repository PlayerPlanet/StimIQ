import { ClinicianPatientList } from '../clinician/pages/ClinicianPatientList';
import { ClinicianPatientDetail } from '../clinician/pages/ClinicianPatientDetail';
import { ClinicianModelParameters } from '../clinician/pages/ClinicianModelParameters';

/**
 * Clinician view routes
 * All routes under /clinician/*
 * Flow: Patient List → Patient Detail → Model Parameters (all scoped to single patient)
 */
export const clinicianRoutes = [
  {
    path: '/',
    element: <ClinicianPatientList />,
  },
  {
    path: '/:patientId',
    element: <ClinicianPatientDetail />,
  },
  {
    path: '/parameters/:patientId',
    element: <ClinicianModelParameters />,
  },
];
