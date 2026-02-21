import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarLink {
  label: string;
  path: string;
}

interface SidebarProps {
  links: SidebarLink[];
  title?: string;
  userType: 'patient' | 'clinician';
  navActions?: ReactNode;
  footerActions?: ReactNode;
}

/**
 * Sidebar component - persistent left navigation with deep blue theme
 * Role-aware design for patient and clinician views
 */
export function Sidebar({ links, title = 'Healthcare DBS', userType, navActions, footerActions }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="w-64 bg-brand-navy min-h-screen flex flex-col shadow-xl">
      {/* Logo/Header */}
      <div className="p-6 border-b border-brand-blue/20">
        <h2 className="text-xl font-heading font-bold text-white tracking-tight">{title}</h2>
        <p className="text-xs text-white/70 mt-1 font-medium">
          {userType === 'patient' ? 'Patient Portal' : 'Clinician Dashboard'}
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-navy text-white border-2 border-white'
                    : 'bg-brand-navy/50 text-white/70 hover:text-white hover:bg-brand-navy/70 border-2 border-transparent'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        {navActions && <div className="mt-4 space-y-2">{navActions}</div>}
      </nav>

      {/* Footer - Create Patient or Demo toggle */}
      <div className="p-4 border-t border-brand-blue/20 space-y-3">
        {footerActions}
        <Link
          to={userType === 'patient' ? '/clinician' : '/patient'}
          className="block w-full px-4 py-2 bg-brand-navy text-white text-center text-sm font-semibold rounded-md border-2 border-white hover:opacity-90 transition-all duration-200"
        >
          {userType === 'patient' ? 'Switch to Clinician' : 'Switch to Patient'}
        </Link>
      </div>
    </aside>
  );
}
