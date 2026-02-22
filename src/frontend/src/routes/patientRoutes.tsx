import { PatientDashboard } from '../patient/pages/PatientDashboard';
import { PatientStandardTests } from '../patient/pages/PatientStandardTests';

/**
 * Patient view routes
 * All routes under /patient/*
 */
export const patientRoutes = [
  {
    path: '/',
    element: <PatientDashboard />,
  },
  {
    path: '/standard-tests',
    element: <PatientStandardTests />,
  },
];
