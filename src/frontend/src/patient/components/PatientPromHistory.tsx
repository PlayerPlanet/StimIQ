import type { PromTestRead } from '../../api/promTests';
import { usePromTests } from '../usePromTests';
import { Card } from '../../components/common/Card';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

interface PatientPromHistoryProps {
  patientId: string | null;
}

export function PatientPromHistory({ patientId }: PatientPromHistoryProps) {
  const { tests, loading, error, refetch } = usePromTests(patientId);

  if (!patientId) {
    return (
      <Card className="p-6">
        <p className="text-text-muted text-center py-8">Enter a patient ID to view history</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <ErrorState message={error} onRetry={refetch} />
      </Card>
    );
  }

  if (tests.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-text-muted">No PROM assessments found for this patient</p>
        </div>
      </Card>
    );
  }

  const getOverallScore = (test: PromTestRead) => {
    const sum = test.q1 + test.q2 + test.q3 + test.q4 + test.q5 + test.q6 + test.q7 + test.q8 + test.q9 + test.q10;
    return (sum / 10).toFixed(1);
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-main mb-2">Assessment History</h2>
        <p className="text-text-muted text-sm">{tests.length} assessment(s) found</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border-subtle">
              <th className="text-left py-3 px-4 font-semibold text-text-main">Date</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Q1</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Q2</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Q3</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Q4</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Q5</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Q6</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Q7</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Q8</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Q9</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Q10</th>
              <th className="text-center py-3 px-4 font-semibold text-text-main">Avg</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr key={test.id} className="border-b border-border-subtle hover:bg-brand-blue-soft transition-colors">
                <td className="py-3 px-4 text-text-main font-medium">
                  {new Date(test.testDate).toLocaleDateString()}
                </td>
                <td className="text-center py-3 px-4 text-text-main">{test.q1}</td>
                <td className="text-center py-3 px-4 text-text-main">{test.q2}</td>
                <td className="text-center py-3 px-4 text-text-main">{test.q3}</td>
                <td className="text-center py-3 px-4 text-text-main">{test.q4}</td>
                <td className="text-center py-3 px-4 text-text-main">{test.q5}</td>
                <td className="text-center py-3 px-4 text-text-main">{test.q6}</td>
                <td className="text-center py-3 px-4 text-text-main">{test.q7}</td>
                <td className="text-center py-3 px-4 text-text-main">{test.q8}</td>
                <td className="text-center py-3 px-4 text-text-main">{test.q9}</td>
                <td className="text-center py-3 px-4 text-text-main">{test.q10}</td>
                <td className="text-center py-3 px-4 font-semibold text-brand-blue">
                  {getOverallScore(test)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
