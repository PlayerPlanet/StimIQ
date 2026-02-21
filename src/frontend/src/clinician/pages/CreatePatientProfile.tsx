import { ClinicianLayout } from '../../layouts/ClinicianLayout';
import { CreatePatientForm, type PatientFormData } from '../components/CreatePatientForm';

/**
 * DEPRECATED: CreatePatientProfile - this page is no longer used
 * Patient creation is now modal-based in ClinicianPatientList
 * This file is kept for reference only
 */
export function CreatePatientProfile() {
  const handleSubmit = (data: PatientFormData) => {
    console.log('Creating patient:', data);
  };

  const handleClose = () => {
    console.log('Form closed');
  };

  return (
    <ClinicianLayout>
      <div className="px-8 py-6">
        <CreatePatientForm onSubmit={handleSubmit} onClose={handleClose} />
      </div>
    </ClinicianLayout>
  );
}
