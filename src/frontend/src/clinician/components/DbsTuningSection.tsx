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
      <div className="mt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="mt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          DBS Tuning
        </h2>
        <Card className="p-6 bg-red-50 border border-red-200">
          <p className="text-red-700">Failed to load DBS tuning recommendations.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        DBS Tuning
      </h2>

      {/* Recommended Parameters Table */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Parameters</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Parameter</th>
                {data.recommended_parameters.map(channel => (
                  <th key={channel.channel_id} className="px-4 py-3 text-center font-semibold text-gray-700">
                    Ch {channel.channel_id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">Amplitude (mA)</td>
                {data.recommended_parameters.map(channel => (
                  <td key={channel.channel_id} className="px-4 py-3 text-center text-gray-600">
                    {channel.amplitude.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">Voltage (V)</td>
                {data.recommended_parameters.map(channel => (
                  <td key={channel.channel_id} className="px-4 py-3 text-center text-gray-600">
                    {channel.voltage.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">Frequency (Hz)</td>
                {data.recommended_parameters.map(channel => (
                  <td key={channel.channel_id} className="px-4 py-3 text-center text-gray-600">
                    {channel.frequency.toFixed(0)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">Time On (h)</td>
                {data.recommended_parameters.map(channel => (
                  <td key={channel.channel_id} className="px-4 py-3 text-center text-gray-600">
                    {channel.time_on_hours.toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Explanations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Why these parameters?</h3>
        <div className="space-y-3">
          {data.explanations.map((explanation, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex-shrink-0 text-green-600 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-700">{explanation}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
