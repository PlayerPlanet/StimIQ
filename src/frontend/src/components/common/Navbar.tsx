import { Link } from 'react-router-dom';

/**
 * Navbar component - top navigation with demo toggle
 */
export function Navbar({ userType }: { userType: 'patient' | 'clinician' }) {
  const isPatient = userType === 'patient';

  return (
    <nav className="bg-brand-navy text-white shadow-navbar sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-xl py-lg flex justify-between items-center">
        {/* Logo/Title */}
        <div className="flex items-center gap-lg">
          <div className="text-2xl font-bold tracking-tight">Healthcare DBS</div>
          <div className="text-sm font-medium text-white/70 border-l-2 border-white/30 pl-lg">
            {isPatient ? 'Patient Portal' : 'Clinician Dashboard'}
          </div>
        </div>

        {/* Demo toggle */}
        <div className="flex items-center gap-lg">
          {isPatient ? (
            <Link
              to="/clinician"
              className="px-xl py-md bg-white text-brand-navy hover:bg-brand-blue-soft rounded-md transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg"
            >
              View as Clinician
            </Link>
          ) : (
            <Link
              to="/patient"
              className="px-xl py-md bg-white text-brand-navy hover:bg-brand-blue-soft rounded-md transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg"
            >
              View as Patient
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
