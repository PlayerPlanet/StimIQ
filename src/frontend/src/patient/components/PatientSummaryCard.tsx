import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';

interface PatientSummaryCardProps {
  nextCheckUp: string;
  daysUntilCheckUp: number;
  currentStatus: string;
  recentSymptomSeverity: number;
}

/**
 * PatientSummaryCard component - displays high-level patient overview
 */
export function PatientSummaryCard({
  nextCheckUp,
  daysUntilCheckUp,
  currentStatus,
  recentSymptomSeverity,
}: PatientSummaryCardProps) {
  const statusMap: 'stable' | 'monitor' | 'review' | 'neutral' =
    recentSymptomSeverity <= 3
      ? 'stable'
      : recentSymptomSeverity <= 6
        ? 'monitor'
        : 'review';

  return (
    <Card variant="metric" className="p-8">
      <h3 className="text-2xl font-bold text-white mb-6 border-b-2 border-brand-blue pb-4">
        Your Health Overview
      </h3>

      <div className="space-y-6">
        {/* Next check-up */}
        <div>
          <p className="text-sm text-white/70 mb-2 font-semibold">Next Check-up</p>
          <p className="text-4xl font-bold text-white">{nextCheckUp}</p>
          <p className="text-xs text-white/70 mt-1 font-medium">
            {daysUntilCheckUp} days from now
          </p>
        </div>

        {/* Status summary */}
        <div className="border-t-2 border-brand-blue pt-4">
          <p className="text-sm text-white/70 mb-3 font-semibold">Current Status</p>
          <StatusBadge status={statusMap} size="md">
            {currentStatus === 'optimal'
              ? 'All Systems Optimal'
              : 'Needs Attention'}
          </StatusBadge>
        </div>

        {/* Symptom severity */}
        <div className="border-t-2 border-brand-blue pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/70 font-semibold">Recent Symptom Severity</span>
            <span className="text-lg font-bold text-white">{recentSymptomSeverity}/10</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
