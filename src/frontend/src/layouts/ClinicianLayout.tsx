import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Modal } from '../components/common/Modal';
import { CreatePatientForm, type PatientFormData } from '../clinician/components/CreatePatientForm';

interface ClinicianLayoutProps {
  children: ReactNode;
}

/**
 * ClinicianLayout - wraps clinician view pages with persistent left sidebar
 * Uses data-dense, clinical design with deep blue theme
 * Sidebar adapts based on whether a patient is selected
 */
export function ClinicianLayout({ children }: ClinicianLayoutProps) {
  const { patientId } = useParams();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Dynamic sidebar links based on whether a patient is selected
  const sidebarLinks = patientId
    ? [
        { label: 'Patient List', path: '/clinician' },
        { label: 'Overview', path: `/clinician/${patientId}` },
        { label: 'Model Parameters', path: `/clinician/parameters/${patientId}` },
      ]
    : [
        { label: 'Patient List', path: '/clinician' },
      ];

  const handleCreatePatient = (data: PatientFormData) => {
    console.log('Creating patient:', data);
    setShowCreateModal(false);
  };

  return (
    <div className="flex min-h-screen bg-surface-alt">
      <Sidebar
        links={sidebarLinks}
        userType="clinician"
        navActions={(
          <button
            onClick={() => setShowCreateModal(true)}
            className="block w-full px-4 py-2 bg-brand-navy text-white text-center text-sm font-semibold rounded-md border-2 border-white hover:opacity-90 transition-all duration-200"
          >
            Create patient profile
          </button>
        )}
      />
      <main className="flex-1 overflow-y-auto bg-surface">
        {children}
      </main>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Patient Profile"
      >
        <CreatePatientForm
          onSubmit={handleCreatePatient}
          onClose={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
}
