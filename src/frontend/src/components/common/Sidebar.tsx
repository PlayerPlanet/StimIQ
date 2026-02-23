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
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Sidebar component - persistent left navigation with deep blue theme
 * Role-aware design for patient and clinician views
 * On mobile: collapsible overlay drawer controlled via isOpen/onClose props
 */
export function Sidebar({ links, title = 'StimIQ - DBS Treatment', userType, navActions, footerActions, isOpen = false, onClose }: SidebarProps) {
  const location = useLocation();

  const sidebarContent = (
    <aside className="w-64 bg-brand-navy h-full flex flex-col shadow-xl" aria-label="Main navigation">
      {/* Logo/Header */}
      <div className="p-6 border-b border-brand-blue/20 flex items-start justify-between">
        <div>
          <h2 className="text-4xl font-heading font-bold text-white tracking-tight">{title}</h2>
          <p className="text-xs text-white/70 mt-1 font-medium">
            {userType === 'patient' ? 'Patient Portal' : 'Clinician Dashboard'}
          </p>
        </div>
        {/* Close button - only shown on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden ml-2 mt-1 text-white/70 hover:text-white transition-colors duration-200"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
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
                onClick={onClose}
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
          onClick={onClose}
          className="block w-full px-4 py-2 bg-brand-navy text-white text-center text-sm font-semibold rounded-md border-2 border-white hover:opacity-90 transition-all duration-200"
        >
          {userType === 'patient' ? 'Switch to Clinician' : 'Switch to Patient'}
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <div className="hidden md:block min-h-screen">
        {sidebarContent}
      </div>

      {/* Mobile sidebar - overlay drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Drawer */}
        <div className={`relative h-full transition-transform duration-300 ease-smooth ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
