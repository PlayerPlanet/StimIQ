import { useEffect, useState } from 'react';
import { ClinicianLayout } from '../../layouts/ClinicianLayout';
import { SectionHeader } from '../../components/common/SectionHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { Card } from '../../components/common/Card';
import type { PatientSummary } from '../../lib/mockData';
import { PatientTable } from '../components/PatientTable';
import { getClinicianPatients } from '../../lib/apiClient';

/**
 * ClinicianDashboard - displays list of patients under clinician's care
 */
export function ClinicianDashboard() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getClinicianPatients();
        setPatients(data);
      } catch (error) {
        console.error('Failed to load patients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const stableCount = patients.filter((p) => p.status === 'stable').length;
  const monitorCount = patients.filter((p) => p.status === 'monitor').length;
  const reviewCount = patients.filter((p) => p.status === 'review').length;

  return (
    <ClinicianLayout>
      <div className="px-xl py-lg">
        <h1 className="text-3xl font-bold font-heading text-text-main mb-2xl">
          Patient Dashboard
        </h1>

        {isLoading ? (
          <LoadingState />
        ) : (
          <div className="space-y-2xl">
            {/* Summary stats - Pfizer-inspired metric cards */}
            <div className="grid grid-cols-4 gap-lg">
              <Card variant="subtle" className="p-lg text-center border-2">
                <p className="text-5xl font-bold text-brand-blue mb-sm">{stableCount}</p>
                <p className="text-sm font-semibold text-text-muted">Stable</p>
              </Card>
              <Card variant="subtle" className="p-lg text-center border-2">
                <p className="text-5xl font-bold text-brand-blue mb-sm">{monitorCount}</p>
                <p className="text-sm font-semibold text-text-muted">Monitor</p>
              </Card>
              <Card variant="subtle" className="p-lg text-center border-2">
                <p className="text-5xl font-bold text-brand-blue mb-sm">{reviewCount}</p>
                <p className="text-sm font-semibold text-text-muted">Review Soon</p>
              </Card>
              <Card variant="metric" className="p-lg text-center">
                <p className="text-5xl font-bold mb-sm">{patients.length}</p>
                <p className="text-sm font-semibold opacity-90">Total</p>
              </Card>
            </div>

            {/* Patient list */}
            <div>
              <SectionHeader
                title="Patients"
                subtitle={`Managing ${patients.length} patient(s)`}
              />
              <PatientTable patients={patients} />
            </div>
          </div>
        )}
      </div>
    </ClinicianLayout>
  );
}
