import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClinicianLayout } from '../../layouts/ClinicianLayout';
import { LoadingState } from '../../components/common/LoadingState';
import { Card } from '../../components/common/Card';
import type { Patient } from '../../lib/types';
import { CreatePatientModal } from '../components/CreatePatientModal';
import { getClinicianPatients } from '../../lib/apiClient';

/**
 * ClinicianDashboard - main clinician view showing all patients
 * Allows creating new patients and navigating to individual patient details
 */
export function ClinicianDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getClinicianPatients();
        setPatients(data);
      } catch (err) {
        console.error('Failed to load patients:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePatientCreated = (newPatient: Patient) => {
    setPatients([...patients, newPatient]);
    setShowCreateModal(false);
  };

  const handlePatientClick = (patientId: string) => {
    navigate(`/clinician/${patientId}`);
  };

  // Helper to calculate age from date of birth
  const getAge = (dob: string | null): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <ClinicianLayout>
      <div className="px-4 py-3">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-text-main">Patients</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-sm hover:bg-brand-navy transition-colors duration-75"
          >
            + New Patient
          </button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : (
          <div className="space-y-3">
            {patients.length === 0 ? (
              <Card className="p-3 text-center bg-surface-alt">
                <p className="text-xs text-text-muted">No patients yet.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 px-3 py-1 text-xs text-brand-blue font-semibold hover:text-brand-navy"
                >
                  Create your first patient
                </button>
              </Card>
            ) : (
              patients.map((patient) => {
                const age = getAge(patient.date_of_birth);
                return (
                  <Card
                    key={patient.id}
                    onClick={() => handlePatientClick(patient.id)}
                    className="p-3 cursor-pointer hover:border-brand-blue transition-colors duration-75"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-text-main">
                          {patient.first_name} {patient.last_name}
                        </h3>
                        <div className="text-xs text-text-muted mt-0.5">
                          {age && <span>Age: {age}</span>}
                        </div>
                      </div>
                      <div className="text-brand-blue flex-shrink-0 ml-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {showCreateModal && (
          <CreatePatientModal
            onSubmit={handlePatientCreated}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </div>
    </ClinicianLayout>
  );
}
