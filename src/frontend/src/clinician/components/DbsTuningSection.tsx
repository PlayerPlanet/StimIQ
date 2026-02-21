import { useDbsTuning } from '../useDbsTuning';
import { Card } from '../../components/common/Card';
import { LoadingState } from '../../components/common/LoadingState';

interface DbsTuningSectionProps {
  patientId: string;
}

export function DbsTuningSection({ patientId }: DbsTuningSectionProps) {
  const { data, loading, error } = useDbsTuning(patientId);

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-bold text-text-main mb-2 flex items-center">
          <svg className="w-5 h-5 mr-1.5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          DBS Tuning
        </h2>
        <LoadingState />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <h2 className="text-lg font-bold text-text-main mb-2 flex items-center">
          <svg className="w-5 h-5 mr-1.5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          DBS Tuning
        </h2>
        <Card className="p-3 bg-red-50 border border-red-200">
          <p className="text-xs text-red-700">Failed to load DBS tuning recommendations.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-text-main flex items-center">
        <svg className="w-5 h-5 mr-1.5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        DBS Tuning
      </h2>

      {/* Recommended Parameters Table */}
      <Card className="p-3">
        <h3 className="text-sm font-semibold text-text-main mb-2">Recommended Parameters</h3>
        <div className="overflow-x-auto text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-alt">
                <th className="px-2 py-1.5 text-left font-semibold text-text-main">Parameter</th>
                {data.recommended_parameters.map(channel => (
                  <th key={channel.channel_id} className="px-2 py-1.5 text-center font-semibold text-text-main">
                    Ch {channel.channel_id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border-subtle">
                <td className="px-2 py-1.5 font-medium text-text-main">Amplitude (mA)</td>
                {data.recommended_parameters.map(channel => (
                  <td key={channel.channel_id} className="px-2 py-1.5 text-center text-text-muted">
                    {channel.amplitude.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border-subtle">
                <td className="px-2 py-1.5 font-medium text-text-main">Voltage (V)</td>
                {data.recommended_parameters.map(channel => (
                  <td key={channel.channel_id} className="px-2 py-1.5 text-center text-text-muted">
                    {channel.voltage.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border-subtle">
                <td className="px-2 py-1.5 font-medium text-text-main">Frequency (Hz)</td>
                {data.recommended_parameters.map(channel => (
                  <td key={channel.channel_id} className="px-2 py-1.5 text-center text-text-muted">
                    {channel.frequency.toFixed(0)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-1.5 font-medium text-text-main">Time On (h)</td>
                {data.recommended_parameters.map(channel => (
                  <td key={channel.channel_id} className="px-2 py-1.5 text-center text-text-muted">
                    {channel.time_on_hours.toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Explanations */}
      <Card className="p-3">
        <h3 className="text-sm font-semibold text-text-main mb-2">Why these parameters?</h3>
        <div className="space-y-2 text-xs">
          {data.explanations.map((explanation, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="flex-shrink-0 text-brand-blue mt-0.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-text-main">{explanation}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
