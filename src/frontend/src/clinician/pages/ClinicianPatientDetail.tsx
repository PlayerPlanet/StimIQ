import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClinicianLayout } from '../../layouts/ClinicianLayout';
<<<<<<< HEAD
import { Card } from '../../components/common/Card';
import { LoadingState } from '../../components/common/LoadingState';
import type { Patient } from '../../lib/types';
import { IMUUploadModal } from '../components/IMUUploadModal';
=======
import { LoadingState } from '../../components/common/LoadingState';
import type { PatientDetail } from '../../lib/types';
import { IMUUploadModal } from '../components/IMUUploadModal';
import { PatientDetailView } from '../components/PatientDetailView';
import { DbsStateSection } from '../components/DbsStateSection';
import { DbsTuningSection } from '../components/DbsTuningSection';
import { getPatientDetail } from '../../lib/apiClient';

/**
 * ClinicianPatientDetail - view patient details and upload IMU data
 */
export function ClinicianPatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
<<<<<<< HEAD
  const [patient, setPatient] = useState<Patient | null>(null);
=======
  const [patient, setPatient] = useState<PatientDetail | null>(null);
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df
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
        <div className="px-8 py-6">
          <LoadingState />
        </div>
      </ClinicianLayout>
    );
  }

  if (!patient) {
    return (
      <ClinicianLayout>
        <div className="px-8 py-6">
          <button
            onClick={() => navigate('/clinician')}
            className="text-brand-blue hover:text-brand-navy font-semibold mb-4"
          >
            ← Back to Patients
          </button>
          <p className="text-text-muted text-center">Patient not found.</p>
        </div>
      </ClinicianLayout>
    );
  }

<<<<<<< HEAD
  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(patient.date_of_birth);

  return (
    <ClinicianLayout>
      <div className="px-8 py-6">
        <button
          onClick={() => navigate('/clinician')}
          className="text-brand-blue hover:text-brand-navy font-semibold mb-6"
        >
          ← Back to Patients
        </button>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-main">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-text-muted text-sm mt-1">ID: {patient.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={() => setShowIMUModal(true)}
            className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-navy transition-colors"
          >
=======
  return (
    <ClinicianLayout>
      <div className="px-8 py-6">
        {/* Breadcrumb Navigation */}
        <button
          onClick={() => navigate('/clinician')}
          className="text-brand-blue hover:text-brand-navy font-semibold mb-6 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Patients
        </button>

        {/* Upload IMU Data Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowIMUModal(true)}
            className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-navy transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df
            Upload IMU Data
          </button>
        </div>

<<<<<<< HEAD
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-main mb-4">Patient Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-muted font-semibold">Date of Birth</p>
              <p className="text-lg text-text-main">
                {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : '—'}
              </p>
            </div>
            {age && (
              <div>
                <p className="text-sm text-text-muted font-semibold">Age</p>
                <p className="text-lg text-text-main">{age} years</p>
              </div>
            )}
            {patient.notes && (
              <div>
                <p className="text-sm text-text-muted font-semibold">Notes</p>
                <p className="text-lg text-text-main">{patient.notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-text-muted font-semibold">Created</p>
              <p className="text-lg text-text-main">
                {new Date(patient.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
=======
        {/* Patient Detail View */}
        <PatientDetailView patient={patient} />

        {/* DBS State Section */}
        <DbsStateSection patientId={patient.id} />

        {/* DBS Tuning Section */}
        <DbsTuningSection patientId={patient.id} />

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
