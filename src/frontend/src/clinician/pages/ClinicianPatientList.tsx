import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClinicianLayout } from '../../layouts/ClinicianLayout';
import { SectionHeader } from '../../components/common/SectionHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { PatientSummary } from '../../lib/mockData';
import { getClinicianPatients } from '../../lib/apiClient';

/**
 * ClinicianPatientList - patient selection page
 * First step in clinician flow: choose a patient to view/manage
 */
export function ClinicianPatientList() {
  const navigate = useNavigate();
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

  const handlePatientClick = (patientId: string) => {
    navigate(`/clinician/${patientId}`);
  };

  return (
    <ClinicianLayout>
      <div className="px-8 py-6 max-w-6xl">
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold font-heading text-text-main mb-2">
              DBS Patients
            </h1>
            <p className="text-text-muted text-base">
              Select a patient to view detailed metrics and manage their DBS therapy
            </p>
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : (
          <div>
            {/* Patient list */}
            <div>
              <SectionHeader
                title="Your Patients"
                subtitle={`Managing ${patients.length} patient(s)`}
              />
              <div className="space-y-3 mt-4">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => handlePatientClick(patient.id)}
                    className="cursor-pointer"
                  >
                    <Card className="p-5 hover:shadow-md hover:bg-surface-alt transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-semibold font-mono text-brand-blue">
                              {patient.patientId}
                            </span>
                            <h3 className="text-lg font-semibold font-heading text-text-main">
                              {patient.name}
                            </h3>
                            <StatusBadge status={patient.status} size="sm">
                              {patient.status === 'stable'
                                ? 'Stable'
                                : patient.status === 'monitor'
                                  ? 'Monitor'
                                  : 'Review'}
                            </StatusBadge>
                          </div>
                          <div className="flex gap-4 text-sm text-text-muted">
                            <span>Age: {patient.age}</span>
                            <span>{patient.diagnosis}</span>
                          </div>
                        </div>
                        <div className="text-brand-blue ml-4">
                          <svg
                            className="w-5 h-5"
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </ClinicianLayout>
  );
}
