import type { ReactNode } from 'react';
import { Sidebar } from '../components/common/Sidebar';

interface ClinicianLayoutProps {
  children: ReactNode;
}

/**
 * ClinicianLayout - wraps clinician view pages with persistent left sidebar
 * Uses professional design with deep blue theme for clinician interface
 */
export function ClinicianLayout({ children }: ClinicianLayoutProps) {
  const sidebarLinks = [
    { label: 'Patients', path: '/clinician' },
  ];

  return (
    <div className="flex min-h-screen bg-surface-alt">
      <Sidebar links={sidebarLinks} userType="clinician" />
      <main className="flex-1 overflow-y-auto bg-surface">
        {children}
      </main>
    </div>
  );
}
