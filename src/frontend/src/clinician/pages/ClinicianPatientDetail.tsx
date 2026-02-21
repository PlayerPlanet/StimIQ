import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClinicianLayout } from '../../layouts/ClinicianLayout';
import { Card } from '../../components/common/Card';
import { SectionHeader } from '../../components/common/SectionHeader';
import { InfoRow } from '../../components/common/InfoRow';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { DBSParameterComparison } from '../components/DBSParameterComparison';
import { TremorTimelineChart } from '../components/TremorTimelineChart';
import type {
  PatientSummary,
  DBSParameterHistory,
  TremorTimelinePoint,
} from '../../lib/mockData';
import type { InterpolatedDBSValues } from '../components/TremorTimelineChart';
import {
  getPatientDetail,
  getDBSParameterHistory,
  getTremorTimeline,
} from '../../lib/apiClient';

/**
 * ClinicianPatientDetail - displays detailed view of a single patient
 */
export function ClinicianPatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [parameterHistory, setParameterHistory] = useState<DBSParameterHistory | null>(null);
  const [tremorTimeline, setTremorTimeline] = useState<TremorTimelinePoint[]>([]);
  const [hoverValues, setHoverValues] = useState<InterpolatedDBSValues | null>(null);
  const [hoverTimestamp, setHoverTimestamp] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (patientId) {
          const patientData = await getPatientDetail(patientId);
          const historyData = await getDBSParameterHistory();
          const tremorData = await getTremorTimeline();
          setPatient(patientData);
          setParameterHistory(historyData);
          setTremorTimeline(tremorData);
        }
      } catch (error) {
        console.error('Failed to load patient details:', error);
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
            className="px-4 py-2 bg-brand-blue text-white font-semibold rounded-md transition-all duration-200 hover:opacity-90 mb-4"
          >
            ← Back to Patient List
          </button>
          <p className="text-center text-text-secondary">Patient not found.</p>
        </div>
      </ClinicianLayout>
    );
  }

  const handleChartHover = (values: InterpolatedDBSValues | null, timestamp?: string) => {
    setHoverValues(values);
    setHoverTimestamp(timestamp);
  };

  return (
    <ClinicianLayout>
      <div className="px-8 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/clinician')}
          className="px-4 py-2 text-brand-blue font-semibold hover:text-brand-navy transition-colors duration-200 mb-6"
        >
          ← Back to Patient List
        </button>

        {/* Patient header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold font-heading text-text-main">
                {patient.name}
              </h1>
              <p className="text-text-muted mt-1 font-mono">
                Patient ID: {patient.patientId}
              </p>
            </div>
            <StatusBadge status={patient.status}>
              {patient.status === 'stable'
                ? 'Stable'
                : patient.status === 'monitor'
                  ? 'Monitor'
                  : 'Review Soon'}
            </StatusBadge>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Age" value={`${patient.age} years`} />
              <InfoRow label="Diagnosis" value={patient.diagnosis} />
              <InfoRow label="Visit Focus" value="DBS parameter review" />
              <InfoRow
                label="Status"
                value={patient.status === 'stable' ? 'Stable' : 'Needs Attention'}
                variant="highlight"
              />
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <SectionHeader
            title="DBS Parameter Adjustment"
            subtitle="Before and after values from the current clinical visit"
          />
          {parameterHistory ? (
            <DBSParameterComparison 
              history={parameterHistory}
              hoverValues={hoverValues}
              hoverTimestamp={hoverTimestamp}
            />
          ) : (
            <Card className="p-6 text-sm text-text-muted">
              Parameter history unavailable.
            </Card>
          )}

          <SectionHeader
            title="Tremor Timeline"
            subtitle="Wearable wrist sensor amplitude throughout the visit"
          />
          <Card className="p-6">
            <TremorTimelineChart 
              data={tremorTimeline}
              onHoverChange={handleChartHover}
            />
          </Card>
        </div>
      </div>
    </ClinicianLayout>
  );
}
