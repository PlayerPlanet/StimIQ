import { Card } from '../../components/common/Card';
import type { PatientLog } from '../../lib/mockData';

interface PatientLogListProps {
  logs: PatientLog[];
}

/**
 * PatientLogList component - displays clinical log entries with IDs
 * Thin, table-like cards with minimal color for professional appearance
 */
export function PatientLogList({ logs }: PatientLogListProps) {
  const getSeverityLabel = (severity: number) => {
    if (severity <= 3) return 'Mild';
    if (severity <= 6) return 'Moderate';
    return 'Severe';
  };

  return (
    <div className="space-y-2">
      {logs.length === 0 ? (
        <p className="text-center text-text-muted py-6">No logs available.</p>
      ) : (
        logs.map((log) => (
          <Card key={log.id} className="p-4 hover:bg-surface-alt transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-1">
                  <p className="text-sm font-semibold text-brand-blue font-mono">
                    {log.logId}
                  </p>
                  <p className="text-xs text-text-muted">
                    {log.date}
                  </p>
                  <span className="text-xs px-2 py-1 bg-brand-blue-soft text-brand-blue rounded font-medium">
                    {log.entryType}
                  </span>
                </div>
                <p className="text-sm text-text-main">{log.notesSummary}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-xs text-text-muted mb-1">Severity</p>
                <p className="text-sm font-semibold text-text-main">
                  {getSeverityLabel(log.symptomSeverity)}
                </p>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
