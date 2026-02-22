import { useState } from 'react';
import { useDbsTuning } from '../useDbsTuning';
import { useDbsState } from '../useDbsState';
import { Card } from '../../components/common/Card';
import { LoadingState } from '../../components/common/LoadingState';
import dbsNoHighlight from '../../assets/dbs_no_highlight.png';
import dbsCh1 from '../../assets/dbs_ch1.png';
import dbsCh2 from '../../assets/dbs_ch2.png';
import dbsCh3 from '../../assets/dbs_ch3.png';
import dbsCh4 from '../../assets/dbs_ch4.png';
import dbsCh5 from '../../assets/dbs_ch5.png';
import dbsCh6 from '../../assets/dbs_ch6.png';
import dbsCh7 from '../../assets/dbs_ch7.png';
import dbsCh8 from '../../assets/dbs_ch8.png';

interface DbsTuningSectionProps {
  patientId: string;
}

export function DbsTuningSection({ patientId }: DbsTuningSectionProps) {
  const { data, loading, error } = useDbsTuning(patientId);
  const { data: stateData } = useDbsState(patientId);
  const [hoveredChannelId, setHoveredChannelId] = useState<number | null>(null);
  const channelHighlights = [dbsCh1, dbsCh2, dbsCh3, dbsCh4, dbsCh5, dbsCh6, dbsCh7, dbsCh8];

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-text-main mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <h2 className="text-2xl font-bold text-text-main mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const channelIds = Array.from({ length: 8 }, (_, index) => index + 1);
  const channelLookup = new Map(data.recommended_parameters.map((channel) => [channel.channel_id, channel]));
  const baselineLookup = new Map(stateData?.channels.map((channel) => [channel.channel_id, channel]) ?? []);
  const displayChannels = channelIds.map((channelId) => {
    const channel = channelLookup.get(channelId);
    return {
      channel_id: channelId,
      amplitude: channel?.amplitude ?? null,
      voltage: channel?.voltage ?? null,
      frequency: channel?.frequency ?? null,
      time_on_hours: channel?.time_on_hours ?? null,
    };
  });

  const formatNumber = (value: number | null, digits: number) =>
    value === null ? '-' : value.toFixed(digits);

  type ChannelMetric = 'amplitude' | 'voltage' | 'frequency' | 'time_on_hours';

  const getDiffColor = (channelId: number, metric: ChannelMetric, value: number | null) => {
    if (value === null) return null;
    const baseline = baselineLookup.get(channelId)?.[metric] ?? null;
    if (baseline === null || baseline === value) return null;

    const delta = (value - baseline) / Math.max(Math.abs(baseline), 1e-6);
    const magnitude = Math.min(Math.abs(delta), 1);
    const alpha = Math.min(1, Math.pow(magnitude, 0.5) * 0.95);
    if (alpha < 0.05) return null;

    if (delta > 0) {
      return `rgba(16, 185, 129, ${alpha})`;
    }

    return `rgba(239, 68, 68, ${alpha})`;
  };

  const getHeaderClasses = (channelId: number) =>
    `px-2 py-1.5 text-center font-semibold ${
      hoveredChannelId === channelId ? 'bg-brand-blue-soft text-brand-blue' : 'text-text-main'
    }`;

  const getCellClasses = (channelId: number) =>
    `px-2 py-1.5 text-center transition-colors duration-75 ${
      hoveredChannelId === channelId ? 'text-brand-blue font-semibold ring-1 ring-brand-blue/30' : 'text-text-muted'
    }`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border-subtle pb-1">
        <h2 className="text-2xl font-bold text-text-main flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        DBS Tuning
        </h2>
        <span className="text-xs uppercase tracking-wide text-text-muted">Recommendations</span>
      </div>

      {/* Recommended Parameters Table + Electrode View */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <Card className="p-3">
          <h3 className="text-sm font-semibold text-text-main mb-2">Recommended Parameters</h3>
          <div
            className="overflow-x-auto text-xs"
            onMouseLeave={() => setHoveredChannelId(null)}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-alt">
                  <th className="px-2 py-1.5 text-left font-semibold text-text-main">Parameter</th>
                  {displayChannels.map((channel) => (
                    <th
                      key={channel.channel_id}
                      className={getHeaderClasses(channel.channel_id)}
                      onMouseEnter={() => setHoveredChannelId(channel.channel_id)}
                    >
                      Ch {channel.channel_id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-subtle">
                  <td className="px-2 py-1.5 font-medium text-text-main">Amplitude (mA)</td>
                  {displayChannels.map((channel) => (
                    <td
                      key={channel.channel_id}
                      className={getCellClasses(channel.channel_id)}
                      onMouseEnter={() => setHoveredChannelId(channel.channel_id)}
                      style={{
                        backgroundColor: getDiffColor(channel.channel_id, 'amplitude', channel.amplitude) ?? undefined,
                      }}
                    >
                      {formatNumber(channel.amplitude, 1)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border-subtle">
                  <td className="px-2 py-1.5 font-medium text-text-main">Voltage (V)</td>
                  {displayChannels.map((channel) => (
                    <td
                      key={channel.channel_id}
                      className={getCellClasses(channel.channel_id)}
                      onMouseEnter={() => setHoveredChannelId(channel.channel_id)}
                      style={{
                        backgroundColor: getDiffColor(channel.channel_id, 'voltage', channel.voltage) ?? undefined,
                      }}
                    >
                      {formatNumber(channel.voltage, 1)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border-subtle">
                  <td className="px-2 py-1.5 font-medium text-text-main">Frequency (Hz)</td>
                  {displayChannels.map((channel) => (
                    <td
                      key={channel.channel_id}
                      className={getCellClasses(channel.channel_id)}
                      onMouseEnter={() => setHoveredChannelId(channel.channel_id)}
                      style={{
                        backgroundColor: getDiffColor(channel.channel_id, 'frequency', channel.frequency) ?? undefined,
                      }}
                    >
                      {formatNumber(channel.frequency, 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-2 py-1.5 font-medium text-text-main">Time On (h)</td>
                  {displayChannels.map((channel) => (
                    <td
                      key={channel.channel_id}
                      className={getCellClasses(channel.channel_id)}
                      onMouseEnter={() => setHoveredChannelId(channel.channel_id)}
                      style={{
                        backgroundColor: getDiffColor(channel.channel_id, 'time_on_hours', channel.time_on_hours) ?? undefined,
                      }}
                    >
                      {formatNumber(channel.time_on_hours, 1)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-3" data-active-channel={hoveredChannelId ?? ''}>
          <h3 className="text-sm font-semibold text-text-main mb-2">Electrode View</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-[360px]">
            <img
              src={dbsNoHighlight}
              alt="DBS electrode layout"
              className="w-full h-auto"
            />
            {hoveredChannelId !== null && channelHighlights[hoveredChannelId - 1] && (
              <img
                src={channelHighlights[hoveredChannelId - 1]}
                alt={`DBS electrode highlight channel ${hoveredChannelId}`}
                className="absolute inset-0 w-full h-auto"
              />
            )}
            </div>
          </div>
        </Card>
      </div>

      {/* Agent Reasoning */}
      <Card className="p-6 border-2 border-brand-blue/20 bg-surface-alt">
        <h3 className="text-xl font-semibold text-text-main mb-3">Agent Reasoning</h3>
        <div className="space-y-3 text-base">
          {data.explanations.map((explanation, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="flex-shrink-0 text-brand-blue mt-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-text-main leading-relaxed">{explanation}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
