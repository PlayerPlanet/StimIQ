import { Card } from '../../components/common/Card';
import type { DBSParameterHistory } from '../../lib/mockData';
import type { InterpolatedDBSValues } from './TremorTimelineChart';
import { DBSParameterGauge } from './DBSParameterGauge';

interface DBSParameterComparisonProps {
  history: DBSParameterHistory;
  hoverValues?: InterpolatedDBSValues | null;
  hoverTimestamp?: string;
}

const PARAMETER_CONFIG = [
  {
    key: 'stimulationAmplitude',
    label: 'Amplitude',
    labelFull: 'Stimulation Amplitude (mA)',
    min: 0,
    max: 5,
    step: 0.1,
  },
  {
    key: 'frequency',
    label: 'Frequency',
    labelFull: 'Frequency (Hz)',
    min: 60,
    max: 180,
    step: 1,
  },
  {
    key: 'pulseWidth',
    label: 'Pulse Width',
    labelFull: 'Pulse Width (µs)',
    min: 40,
    max: 120,
    step: 1,
  },
] as const;

export function DBSParameterComparison({ history, hoverValues, hoverTimestamp }: DBSParameterComparisonProps) {
  const isHovering = hoverValues !== null && hoverValues !== undefined;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold font-heading text-text-main">
            DBS Parameter Adjustments
          </h3>
          <p className="text-sm text-text-muted">
            {isHovering
              ? `Parameters at ${hoverTimestamp ? new Date(hoverTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'hover'}`
              : 'Comparison from last visit to current visit'}
          </p>
        </div>
        {!isHovering && (
          <div className="text-xs text-text-muted text-right">
            <div>Previous: {history.previousVisitDate}</div>
            <div>Current: {history.currentVisitDate}</div>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {PARAMETER_CONFIG.map((config) => {
          const previousValue = history.previous[config.key];
          const currentValue = history.current[config.key];
          const displayValue = isHovering ? hoverValues[config.key] : currentValue;
          const percentageChange = ((currentValue - previousValue) / previousValue) * 100;

          return (
            <div key={config.key}>
              <h4 className="text-sm font-semibold text-text-main mb-4">
                {config.labelFull}
              </h4>

              {isHovering ? (
                // Hover mode: single centered gauge with interpolated value
                <div className="flex justify-center">
                  <DBSParameterGauge
                    value={displayValue}
                    max={config.max}
                    label={config.label}
                    percentageChange={percentageChange}
                    showPercentageChange={true}
                  />
                </div>
              ) : (
                // Normal mode: Previous and Current gauges side by side
                <div className="grid grid-cols-2 gap-6 md:gap-8">
                  <div className="flex justify-center">
                    <div className="text-center">
                      <p className="text-xs text-text-muted mb-3">Previous</p>
                      <DBSParameterGauge
                        value={previousValue}
                        max={config.max}
                        label={config.label}
                        percentageChange={0}
                        showPercentageChange={false}
                      />
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="text-center">
                      <p className="text-xs text-text-muted mb-3">Current</p>
                      <DBSParameterGauge
                        value={currentValue}
                        max={config.max}
                        label={config.label}
                        percentageChange={percentageChange}
                        showPercentageChange={true}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
