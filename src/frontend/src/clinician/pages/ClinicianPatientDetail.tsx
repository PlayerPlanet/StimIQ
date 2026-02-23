import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClinicianLayout } from '../../layouts/ClinicianLayout';
import { LoadingState } from '../../components/common/LoadingState';
import type { PatientDetail } from '../../lib/types';
import { IMUUploadModal } from '../components/IMUUploadModal';
import { PatientDetailView } from '../components/PatientDetailView';
import { DbsStateSection } from '../components/DbsStateSection';
import { DbsTuningSection } from '../components/DbsTuningSection';
import { TreatmentGoalsSection } from '../components/TreatmentGoalsSection';
import { getPatientDetail } from '../../lib/apiClient';

/**
 * ClinicianPatientDetail - view patient details and upload IMU data
 */
export function ClinicianPatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [showIMUModal, setShowIMUModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (patientId) {
          const patientData = await getPatientDetail(patientId);
          setPatient(patientData);
        }
      } catch (err) {
        console.error('Failed to load patient:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  if (isLoading) {
    return (
      <ClinicianLayout>
        <div className="px-4 py-3">
          <LoadingState />
        </div>
      </ClinicianLayout>
    );
  }

  if (!patient) {
    return (
      <ClinicianLayout>
        <div className="px-4 py-3">
          <button
            onClick={() => navigate('/clinician')}
            className="text-brand-blue hover:text-brand-navy font-semibold mb-2"
          >
            ← Back to Patients
          </button>
          <p className="text-text-muted text-center">Patient not found.</p>
        </div>
      </ClinicianLayout>
    );
  }

  return (
    <ClinicianLayout>
      <div className="px-4 py-3 space-y-3">
        {/* Breadcrumb Navigation */}
        <button
          onClick={() => navigate('/clinician')}
          className="text-brand-blue hover:text-brand-navy font-semibold flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Patients
        </button>

        {/* Upload IMU Data Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowIMUModal(true)}
            className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-sm hover:bg-brand-navy transition-colors duration-75 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload IMU Data
          </button>
        </div>

        {/* Patient Detail View */}
        <PatientDetailView patient={patient} />

        {/* DBS State Section */}
        <DbsStateSection patientId={patient.id} patient={patient} />

        {/* DBS Tuning Section */}
        <DbsTuningSection patientId={patient.id} />

        {/* Treatment Goals Section */}
        <TreatmentGoalsSection patientId={patient.id} />

        {showIMUModal && (
          <IMUUploadModal
            patientId={patient.id}
            patientName={`${patient.first_name} ${patient.last_name}`}
            onClose={() => setShowIMUModal(false)}
          />
        )}
      </div>
    </ClinicianLayout>
  );
}
