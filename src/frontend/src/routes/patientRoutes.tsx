import { PatientDashboard } from '../patient/pages/PatientDashboard';
import { PatientStandardTests } from '../patient/pages/PatientStandardTests';
import { PatientHandMovementTestStart } from '../patient/pages/PatientHandMovementTestStart';
import { PatientHandMovementTestSession } from '../patient/pages/PatientHandMovementTestSession';
import { PatientFingerTappingTestStart } from '../patient/pages/PatientFingerTappingTestStart';
import { PatientFingerTappingTestSession } from '../patient/pages/PatientFingerTappingTestSession';
import { PatientDailyReport } from '../patient/pages/PatientDailyReport';
import { PatientSpeechTaskStart } from '../patient/pages/PatientSpeechTaskStart';
import { PatientSpeechTaskSession } from '../patient/pages/PatientSpeechTaskSession';
import { ImuTrackingPage } from '../patient/pages/ImuTrackingPage';

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
    path: '/standard-tests/speech-task/start',
    element: <PatientSpeechTaskStart />,
  },
  {
    path: '/standard-tests/speech-task/session',
    element: <PatientSpeechTaskSession />,
  },
  {
    path: '/daily-report',
    element: <PatientDailyReport />,
  },
  {
    path: '/imu-tracking',
    element: <ImuTrackingPage />,
  },
];
