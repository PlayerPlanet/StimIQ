import { useEffect, useState } from 'react';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { SectionHeader } from '../../components/common/SectionHeader';
import { LoadingState } from '../../components/common/LoadingState';
import type { PatientLog } from '../../lib/mockData';
import { PatientLogList } from '../components/PatientLogList';
import { getPatientLogs } from '../../lib/apiClient';

/**
 * PatientLogs - displays patient symptom logs and entries
 */
export function PatientLogs() {
  const [logs, setLogs] = useState<PatientLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getPatientLogs();
        setLogs(data);
      } catch (error) {
        console.error('Failed to load logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <h1 className="text-4xl font-bold font-heading text-text-main mb-8">
          Health Logs
        </h1>

        <SectionHeader
          title="Recent Entries"
          subtitle="Clinical log entries and symptom assessments"
        />

        {isLoading ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <Card className="p-8 text-center bg-brand-blue-soft border border-brand-blue rounded-md">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-brand-navy mb-2">No Logs Yet</h3>
              <p className="text-sm text-text-muted mb-4">
                Symptom logs will appear here as you track your DBS therapy progress.
              </p>
              <p className="text-xs text-text-muted">
                Log in periodically to record your symptoms and receive personalized insights from your care team.
              </p>
            </div>
          </Card>
        ) : (
          <PatientLogList logs={logs} />
        )}
      </div>
    </PatientLayout>
  );
}
