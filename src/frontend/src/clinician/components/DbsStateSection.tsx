import { useDbsState } from '../useDbsState';
import { TremorActivityChart } from './TremorActivityChart';
import { PromScoreChart } from './PromScoreChart';
import { Card } from '../../components/common/Card';
import { LoadingState } from '../../components/common/LoadingState';

interface DbsStateSectionProps {
  patientId: string;
}

export function DbsStateSection({ patientId }: DbsStateSectionProps) {
  const { data, loading, error } = useDbsState(patientId);

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-bold text-text-main mb-2 flex items-center">
          <svg className="w-5 h-5 mr-1.5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6-6m0 0l6 6m-6-6v12" />
          </svg>
          DBS State
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6-6m0 0l6 6m-6-6v12" />
          </svg>
          DBS State
        </h2>
        <Card className="p-3 bg-red-50 border border-red-200">
          <p className="text-xs text-red-700">Failed to load DBS state data.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-text-main flex items-center">
        <svg className="w-5 h-5 mr-1.5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6-6m0 0l6 6m-6-6v12" />
        </svg>
        DBS State
      </h2>

      {/* DBS Channels Table */}
      <Card className="p-3">
        <h3 className="text-sm font-semibold text-text-main mb-2">Current DBS Treatment</h3>
        <div className="overflow-x-auto text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-alt">
                <th className="px-2 py-1.5 text-left font-semibold text-text-main">Parameter</th>
                {data.channels.map(channel => (
                  <th key={channel.channel_id} className="px-2 py-1.5 text-center font-semibold text-text-main">
                    Ch {channel.channel_id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border-subtle">
                <td className="px-2 py-1.5 font-medium text-text-main">Amplitude (mA)</td>
                {data.channels.map(channel => (
                  <td key={channel.channel_id} className="px-2 py-1.5 text-center text-text-muted">
                    {channel.amplitude.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border-subtle">
                <td className="px-2 py-1.5 font-medium text-text-main">Voltage (V)</td>
                {data.channels.map(channel => (
                  <td key={channel.channel_id} className="px-2 py-1.5 text-center text-text-muted">
                    {channel.voltage.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border-subtle">
                <td className="px-2 py-1.5 font-medium text-text-main">Frequency (Hz)</td>
                {data.channels.map(channel => (
                  <td key={channel.channel_id} className="px-2 py-1.5 text-center text-text-muted">
                    {channel.frequency.toFixed(0)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-1.5 font-medium text-text-main">Time On (h)</td>
                {data.channels.map(channel => (
                  <td key={channel.channel_id} className="px-2 py-1.5 text-center text-text-muted">
                    {channel.time_on_hours.toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Timeseries Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TremorActivityChart data={data.tremor_timeseries} />
        <PromScoreChart data={data.prom_timeseries} />
      </div>
    </div>
  );
}
