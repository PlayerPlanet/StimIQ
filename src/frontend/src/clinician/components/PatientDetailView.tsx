import type { PatientDetail } from '../../lib/types';
import { Card } from '../../components/common/Card';
import { InfoRow } from '../../components/common/InfoRow';
import { StatusBadge } from '../../components/common/StatusBadge';

interface PatientDetailViewProps {
  patient: PatientDetail;
}

/**
 * PatientDetailView - Comprehensive patient information display for DBS treatment
 */
export function PatientDetailView({ patient }: PatientDetailViewProps) {
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

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string | null | undefined): 'stable' | 'monitor' | 'review' | 'neutral' => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'stable';
      case 'monitoring':
        return 'monitor';
      case 'adjustment_needed':
        return 'review';
      default:
        return 'neutral';
    }
  };

  const age = calculateAge(patient.date_of_birth);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-main">
            {patient.first_name} {patient.last_name}
          </h1>
          <p className="text-text-muted text-sm mt-1">Patient ID: {patient.id.slice(0, 8)}</p>
        </div>
        {patient.treatment_status && (
          <StatusBadge status={getStatusColor(patient.treatment_status)}>
            {patient.treatment_status.replace('_', ' ').toUpperCase()}
          </StatusBadge>
        )}
      </div>

      {/* Demographics & Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-main mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Demographics
          </h2>
          <div className="space-y-3">
            <InfoRow label="Date of Birth" value={formatDate(patient.date_of_birth)} />
            {age && <InfoRow label="Age" value={`${age} years`} />}
            <InfoRow label="Gender" value={patient.gender || '—'} />
            <InfoRow label="Patient Since" value={formatDate(patient.created_at)} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-main mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Information
          </h2>
          <div className="space-y-3">
            <InfoRow label="Email" value={patient.email || '—'} />
            <InfoRow label="Phone" value={patient.phone || '—'} />
          </div>
        </Card>
      </div>

      {/* DBS Device Information */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-text-main mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          DBS Device Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Device Model" value={patient.device_model || '—'} />
          <InfoRow label="Serial Number" value={patient.device_serial || '—'} />
          <InfoRow label="Lead Location" value={patient.lead_location || '—'} />
          <InfoRow label="Implant Date" value={formatDate(patient.implant_date)} />
        </div>
      </Card>

      {/* Clinical Information */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-text-main mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Clinical Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Diagnosis Date" value={formatDate(patient.diagnosis_date)} />
          <InfoRow label="Primary Physician" value={patient.primary_physician || '—'} />
          <InfoRow label="Care Coordinator" value={patient.care_coordinator || '—'} />
          <InfoRow label="Last Programming" value={formatDate(patient.last_programming_date)} />
          <InfoRow label="Next Appointment" value={formatDate(patient.next_appointment)} />
        </div>
      </Card>

      {/* Notes Section */}
      {patient.notes && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-main mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Clinical Notes
          </h2>
          <p className="text-text-main whitespace-pre-wrap">{patient.notes}</p>
        </Card>
      )}

      {/* Placeholder for Future Sections */}
      <Card className="p-6 bg-surface-alt border-2 border-dashed border-gray-300">
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-semibold text-text-muted mb-2">Additional Data Coming Soon</h3>
          <p className="text-sm text-text-muted">
            Stimulation settings, symptom assessments, programming history, and more will be displayed here.
          </p>
        </div>
      </Card>
    </div>
  );
}
