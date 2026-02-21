import { PatientDashboard } from '../patient/pages/PatientDashboard';
import { PatientHistory } from '../patient/pages/PatientHistory';
import { PatientLogs } from '../patient/pages/PatientLogs';

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
    path: 'history',
    element: <PatientHistory />,
  },
  {
    path: 'logs',
    element: <PatientLogs />,
  },
];
