import { PatientDashboard } from '../patient/pages/PatientDashboard';
import { PatientStandardTests } from '../patient/pages/PatientStandardTests';
import { PatientHandMovementTestStart } from '../patient/pages/PatientHandMovementTestStart';
import { PatientHandMovementTestSession } from '../patient/pages/PatientHandMovementTestSession';
import { PatientFingerTappingTestStart } from '../patient/pages/PatientFingerTappingTestStart';
import { PatientFingerTappingTestSession } from '../patient/pages/PatientFingerTappingTestSession';
import { PatientDailyReport } from '../patient/pages/PatientDailyReport';

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
  {
    path: '/standard-tests/hand-movement/start',
    element: <PatientHandMovementTestStart />,
  },
  {
    path: '/standard-tests/hand-movement/session',
    element: <PatientHandMovementTestSession />,
  },
  {
    path: '/standard-tests/finger-tapping/start',
    element: <PatientFingerTappingTestStart />,
  },
  {
    path: '/standard-tests/finger-tapping/session',
    element: <PatientFingerTappingTestSession />,
  },
  {
    path: '/daily-report',
    element: <PatientDailyReport />,
  },
];
