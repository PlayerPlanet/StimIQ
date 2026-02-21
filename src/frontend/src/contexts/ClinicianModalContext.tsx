import React, { type ReactNode, useState } from 'react';

interface ClinicianModalContextType {
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
}

export const ClinicianModalContext = React.createContext<ClinicianModalContextType | undefined>(undefined);

export function ClinicianModalProvider({ children }: { children: ReactNode }) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <ClinicianModalContext.Provider value={{ showCreateModal, setShowCreateModal }}>
      {children}
    </ClinicianModalContext.Provider>
  );
}

export function useClinicianModal() {
  const context = React.useContext(ClinicianModalContext);
  return context;
}
