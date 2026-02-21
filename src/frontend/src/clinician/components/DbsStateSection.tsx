import { useState } from 'react';
import { useDbsState } from '../useDbsState';
import { TremorActivityChart } from './TremorActivityChart';
import { PromScoreChart } from './PromScoreChart';
import { Card } from '../../components/common/Card';
import { InfoRow } from '../../components/common/InfoRow';
import type { PatientDetail } from '../../lib/types';
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

interface DbsStateSectionProps {
  patientId: string;
  patient?: PatientDetail | null;
}

export function DbsStateSection({ patientId, patient }: DbsStateSectionProps) {
  const { data, loading, error } = useDbsState(patientId);
  const [hoveredChannelId, setHoveredChannelId] = useState<number | null>(null);
  const channelHighlights = [dbsCh1, dbsCh2, dbsCh3, dbsCh4, dbsCh5, dbsCh6, dbsCh7, dbsCh8];

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-text-main mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <h2 className="text-2xl font-bold text-text-main mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const channelIds = Array.from({ length: 8 }, (_, index) => index + 1);
  const channelLookup = new Map(data.channels.map((channel) => [channel.channel_id, channel]));
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

  const getHeaderClasses = (channelId: number) =>
    `px-2 py-1.5 text-center font-semibold ${
      hoveredChannelId === channelId ? 'bg-brand-blue-soft text-brand-blue' : 'text-text-main'
    }`;

  const getCellClasses = (channelId: number) =>
    `px-2 py-1.5 text-center ${
      hoveredChannelId === channelId ? 'bg-brand-blue-soft text-brand-blue font-semibold' : 'text-text-muted'
    }`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border-subtle pb-1">
        <h2 className="text-2xl font-bold text-text-main flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6-6m0 0l6 6m-6-6v12" />
        </svg>
        DBS State
        </h2>
        <span className="text-xs uppercase tracking-wide text-text-muted">Device + Therapy</span>
      </div>

      {patient && (
        <Card className="p-3">
          <h3 className="text-sm font-semibold text-text-main mb-2">DBS Device</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoRow density="compact" label="Model" value={patient.device_model || '—'} />
            <InfoRow density="compact" label="Serial #" value={patient.device_serial || '—'} />
            <InfoRow density="compact" label="Lead Location" value={patient.lead_location || '—'} />
            <InfoRow density="compact" label="Implant Date" value={patient.implant_date ? new Date(patient.implant_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }) : '—'} />
          </div>
        </Card>
      )}

      {/* DBS Channels Table + Electrode View */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <Card className="p-3">
          <h3 className="text-sm font-semibold text-text-main mb-2">Current DBS Treatment</h3>
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

      {/* Timeseries Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TremorActivityChart data={data.tremor_timeseries} />
        <PromScoreChart data={data.prom_timeseries} />
      </div>
    </div>
  );
}
