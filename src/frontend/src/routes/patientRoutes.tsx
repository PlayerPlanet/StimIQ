import { PatientDashboard } from '../patient/pages/PatientDashboard';

/**
 * Patient view routes
 * All routes under /patient/*
 */
export const patientRoutes = [
  {
    path: '/',
    element: <PatientDashboard />,
  },
];
