import type { ReactNode } from 'react';
import { Sidebar } from '../components/common/Sidebar';

interface PatientLayoutProps {
  children: ReactNode;
}

/**
 * PatientLayout - wraps patient view pages with persistent left sidebar
 * Uses calming, patient-friendly design with deep blue theme
 */
export function PatientLayout({ children }: PatientLayoutProps) {
  const sidebarLinks = [
    { label: 'Overview', path: '/patient' },
    { label: 'Standard tests', path: '/patient/standard-tests' },
  ];

  return (
    <div className="flex min-h-screen bg-surface-alt">
      <Sidebar links={sidebarLinks} userType="patient" />
      <main className="flex-1 overflow-y-auto bg-surface">
        {children}
      </main>
    </div>
  );
}
