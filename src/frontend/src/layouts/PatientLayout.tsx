import { useState, type ReactNode } from 'react';
import { Sidebar } from '../components/common/Sidebar';

interface PatientLayoutProps {
  children: ReactNode;
}

/**
 * PatientLayout - wraps patient view pages with persistent left sidebar
 * Uses calming, patient-friendly design with deep blue theme
 */
export function PatientLayout({ children }: PatientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarLinks = [
    { label: 'Overview', path: '/patient' },
    { label: 'Standard tests', path: '/patient/standard-tests' },
  ];

  return (
    <div className="flex min-h-screen bg-surface-alt">
      <Sidebar
        links={sidebarLinks}
        userType="patient"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with hamburger */}
        <header className="md:hidden flex items-center px-4 py-3 bg-brand-navy shadow-md">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1 rounded-md hover:bg-white/10 transition-colors duration-200"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 text-white font-heading font-bold text-lg">StimIQ</span>
        </header>
        <main className="flex-1 overflow-y-auto bg-surface">
          {children}
        </main>
      </div>
    </div>
  );
}
