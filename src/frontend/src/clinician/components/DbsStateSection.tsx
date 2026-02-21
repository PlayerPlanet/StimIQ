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
      <div className="mt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="mt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6-6m0 0l6 6m-6-6v12" />
          </svg>
          DBS State
        </h2>
        <Card className="p-6 bg-red-50 border border-red-200">
          <p className="text-red-700">Failed to load DBS state data.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6-6m0 0l6 6m-6-6v12" />
        </svg>
        DBS State
      </h2>

      {/* DBS Channels Table */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current DBS Treatment</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Parameter</th>
                {data.channels.map(channel => (
                  <th key={channel.channel_id} className="px-4 py-3 text-center font-semibold text-gray-700">
                    Ch {channel.channel_id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">Amplitude (mA)</td>
                {data.channels.map(channel => (
                  <td key={channel.channel_id} className="px-4 py-3 text-center text-gray-600">
                    {channel.amplitude.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">Voltage (V)</td>
                {data.channels.map(channel => (
                  <td key={channel.channel_id} className="px-4 py-3 text-center text-gray-600">
                    {channel.voltage.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">Frequency (Hz)</td>
                {data.channels.map(channel => (
                  <td key={channel.channel_id} className="px-4 py-3 text-center text-gray-600">
                    {channel.frequency.toFixed(0)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">Time On (h)</td>
                {data.channels.map(channel => (
                  <td key={channel.channel_id} className="px-4 py-3 text-center text-gray-600">
                    {channel.time_on_hours.toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Timeseries Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TremorActivityChart data={data.tremor_timeseries} />
        <PromScoreChart data={data.prom_timeseries} />
      </div>
    </div>
  );
}
