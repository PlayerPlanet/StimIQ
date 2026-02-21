import { useState } from 'react';
import { Card } from '../../components/common/Card';
import { InfoRow } from '../../components/common/InfoRow';
import type { ModelParameters } from '../../lib/mockData';

interface ModelParameterCardProps {
  parameters: ModelParameters;
  isEditable?: boolean;
  onUpdate?: (updated: Partial<ModelParameters>) => void;
}

/**
 * ModelParameterCard component - displays and allows editing of DBS model parameters
 */
export function ModelParameterCard({
  parameters,
  isEditable = false,
  onUpdate,
}: ModelParameterCardProps) {
  const [amplitude, setAmplitude] = useState(parameters.stimulationAmplitude);
  const [frequency, setFrequency] = useState(parameters.frequency);
  const [pulseWidth, setPulseWidth] = useState(parameters.pulseWidth);

  const handleUpdate = () => {
    if (onUpdate) {
      onUpdate({
        stimulationAmplitude: amplitude,
        frequency: frequency,
        pulseWidth: pulseWidth,
      });
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold font-heading text-text-main mb-6">
        DBS Model Parameters
      </h3>

      {isEditable ? (
        <div className="space-y-6">
          {/* Amplitude */}
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Stimulation Amplitude (mV)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={amplitude}
                onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={amplitude}
                onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                className="w-24 px-3 py-2 border border-border-subtle rounded-md focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Frequency (Hz)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="50"
                max="200"
                step="1"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="50"
                max="200"
                step="1"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
                className="w-24 px-3 py-2 border border-border-subtle rounded-md focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Pulse Width */}
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">
              Pulse Width (µs)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="30"
                max="120"
                step="1"
                value={pulseWidth}
                onChange={(e) => setPulseWidth(parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="30"
                max="120"
                step="1"
                value={pulseWidth}
                onChange={(e) => setPulseWidth(parseInt(e.target.value))}
                className="w-24 px-3 py-2 border border-border-subtle rounded-md focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Update button */}
          <button
            onClick={handleUpdate}
            className="w-full px-6 py-3 bg-brand-blue text-white font-semibold rounded-md transition-all duration-200 hover:opacity-90 mt-4"
          >
            Save Changes (Demo Only)
          </button>
        </div>
      ) : (
        // Read-only display
        <div className="space-y-2">
          <InfoRow
            label="Stimulation Amplitude"
            value={`${parameters.stimulationAmplitude} mV`}
          />
          <InfoRow label="Frequency" value={`${parameters.frequency} Hz`} />
          <InfoRow
            label="Pulse Width"
            value={`${parameters.pulseWidth} µs`}
          />
          <InfoRow
            label="Last Adjustment"
            value={parameters.lastAdjustmentDate}
          />
          <InfoRow
            label="Next Check"
            value={parameters.nextCheckDate}
          />
        </div>
      )}
    </Card>
  );
}
