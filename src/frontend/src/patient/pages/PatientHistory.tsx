import { useEffect, useState } from 'react';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { LoadingState } from '../../components/common/LoadingState';
import type { DBSSession } from '../../lib/mockData';
import { getDBSSessions } from '../../lib/apiClient';

/**
 * PatientHistory - displays historical DBS sessions and adjustments
 */
export function PatientHistory() {
  const [sessions, setSessions] = useState<DBSSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDBSSessions();
        setSessions(data);
      } catch (error) {
        console.error('Failed to load sessions:', error);
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
          DBS Session History
        </h1>

        {isLoading ? (
          <LoadingState />
        ) : (
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <Card className="p-8 text-center bg-brand-blue-soft border border-brand-blue rounded-md">
                <div className="max-w-md mx-auto">
                  <h3 className="text-lg font-semibold text-brand-navy mb-2">No Session History</h3>
                  <p className="text-sm text-text-muted mb-4">
                    Your DBS session history will display here once adjustments are recorded.
                  </p>
                  <p className="text-xs text-text-muted">
                    Each therapy adjustment made by your care team will appear as a session entry with detailed stimulation parameters.
                  </p>
                </div>
              </Card>
            ) : (
              sessions.map((session, index) => (
                <Card key={session.id} className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-semibold font-mono text-brand-blue mb-1">
                        {session.sessionId}
                      </p>
                      <p className="text-xs text-text-muted">
                        {session.date} • {session.duration} minutes
                      </p>
                    </div>
                    <span className="text-sm font-medium text-brand-blue bg-brand-blue-soft px-3 py-1.5 rounded-md">
                      Session #{sessions.length - index}
                    </span>
                  </div>

                  <div className="bg-surface-alt rounded-md p-4 mb-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted font-medium">
                        Stimulation Amplitude
                      </span>
                      <span className="text-sm font-semibold text-text-main">
                        {session.stimulationAmplitude} mV
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted font-medium">
                        Frequency
                      </span>
                      <span className="text-sm font-semibold text-text-main">
                        {session.frequency} Hz
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted font-medium">
                        Pulse Width
                      </span>
                      <span className="text-sm font-semibold text-text-main">
                        {session.pulseWidth} µs
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-text-main border-t border-border-subtle pt-4">
                    {session.notes}
                  </p>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
