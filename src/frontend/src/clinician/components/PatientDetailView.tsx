import type { PatientDetail } from '../../lib/types';
import { Card } from '../../components/common/Card';
import { CollapsibleSection } from '../../components/common/CollapsibleSection';
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
    <div className="space-y-3">
      {/* Header Section */}
      <div className="flex justify-between items-start pb-2 border-b border-border-subtle">
        <div>
          <h1 className="text-lg font-bold text-text-main">
            {patient.first_name} {patient.last_name}
          </h1>
          <p className="text-text-muted text-xs mt-0.5">ID: {patient.id.slice(0, 8)}</p>
        </div>
        {patient.treatment_status && (
          <StatusBadge status={getStatusColor(patient.treatment_status)}>
            {patient.treatment_status.replace('_', ' ').toUpperCase()}
          </StatusBadge>
        )}
      </div>

      {/* Patient Information */}
      <CollapsibleSection title="Patient information" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-text-muted">Demographics</p>
            <InfoRow density="compact" label="Date of Birth" value={formatDate(patient.date_of_birth)} />
            {age && <InfoRow density="compact" label="Age" value={`${age} years`} />}
            <InfoRow density="compact" label="Gender" value={patient.gender || '—'} />
            <InfoRow density="compact" label="Patient Since" value={formatDate(patient.created_at)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-text-muted">Contact</p>
            <InfoRow density="compact" label="Email" value={patient.email || '—'} />
            <InfoRow density="compact" label="Phone" value={patient.phone || '—'} />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-text-muted">Clinical</p>
            <InfoRow density="compact" label="Diagnosis Date" value={formatDate(patient.diagnosis_date)} />
            <InfoRow density="compact" label="Physician" value={patient.primary_physician || '—'} />
            <InfoRow density="compact" label="Coordinator" value={patient.care_coordinator || '—'} />
            <InfoRow density="compact" label="Last Program" value={formatDate(patient.last_programming_date)} />
            <InfoRow density="compact" label="Next Appt" value={formatDate(patient.next_appointment)} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Notes Section */}
      {patient.notes && (
        <Card className="p-3">
          <h2 className="text-sm font-bold text-text-main mb-2">
            Clinical Notes
          </h2>
          <p className="text-xs text-text-main whitespace-pre-wrap">{patient.notes}</p>
        </Card>
      )}
    </div>
  );
}
