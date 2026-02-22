import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { patientRoutes } from './patientRoutes';
import { clinicianRoutes } from './clinicianRoutes';

/**
 * Central Router configuration
 * Defines route hierarchy:
 *   /patient/* → Patient routes
 *   /clinician/* → Clinician routes
 *   / → Redirect to clinician
 */
export function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Patient routes */}
        {patientRoutes.map((route) => (
          <Route
            key={`patient-${route.path}`}
            path={`/patient${route.path}`}
            element={route.element}
          />
        ))}

        {/* Clinician routes */}
        {clinicianRoutes.map((route) => (
          <Route
            key={`clinician-${route.path}`}
            path={`/clinician${route.path}`}
            element={route.element}
          />
        ))}

        {/* Catch-all: redirect to clinician view */}
        <Route path="/" element={<Navigate to="/clinician" replace />} />
        <Route path="*" element={<Navigate to="/clinician" replace />} />
      </Routes>
    </Router>
  );
}
