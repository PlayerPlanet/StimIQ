import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { PatientSummary } from '../../lib/mockData';

interface PatientTableProps {
  patients: PatientSummary[];
}

/**
 * PatientTable component - displays list of patients with status indicators
 */
export function PatientTable({ patients }: PatientTableProps) {
  return (
    <div className="space-y-md">
      {patients.length === 0 ? (
        <Card className="p-xl text-center text-text-muted font-medium">
          No patients found.
        </Card>
      ) : (
        patients.map((patient) => (
          <Link key={patient.id} to={`/clinician/patient/${patient.id}`}>
            <Card className="p-xl hover:shadow-lg transition-all duration-300 ease-smooth cursor-pointer -translate-y-0 hover:-translate-y-xs border border-border-subtle hover:border-brand-blue">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold font-heading text-text-main">
                    {patient.name}
                  </h3>
                  <div className="mt-sm space-y-xs">
                    <p className="text-sm text-text-muted font-medium">
                      Age: <span className="font-bold">{patient.age}</span>
                    </p>
                    <p className="text-sm text-text-muted font-medium">
                      Diagnosis:{' '}
                      <span className="font-bold">{patient.diagnosis}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={patient.status} size="md">
                    {patient.status === 'stable'
                      ? 'Stable'
                      : patient.status === 'monitor'
                        ? 'Monitor'
                        : 'Review Soon'}
                  </StatusBadge>
                  <p className="text-xs text-text-muted mt-md font-semibold">ID: {patient.id}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
