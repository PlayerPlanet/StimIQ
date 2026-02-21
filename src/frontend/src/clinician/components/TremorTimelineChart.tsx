import { useState } from 'react';
import type { TremorTimelinePoint } from '../../lib/mockData';

export interface InterpolatedDBSValues {
  stimulationAmplitude: number;
  frequency: number;
  pulseWidth: number;
}

interface TremorTimelineChartProps {
  data: TremorTimelinePoint[];
  onHoverChange?: (values: InterpolatedDBSValues | null, timestamp?: string) => void;
}

export function TremorTimelineChart({ data, onHoverChange }: TremorTimelineChartProps) {
  const [hoverX, setHoverX] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="text-sm text-text-muted">No tremor data available.</div>
    );
  }

  const width = 640;
  const height = 180;
  const padding = 28;
  const amplitudeValues = data.map((point) => point.amplitude);
  const minAmplitude = Math.min(...amplitudeValues, 0);
  const maxAmplitude = Math.max(...amplitudeValues, 10);
  const range = maxAmplitude - minAmplitude || 1;

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (point.amplitude - minAmplitude) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const startLabel = new Date(data[0].timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endLabel = new Date(data[data.length - 1].timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    // Clamp to chart bounds
    if (svgX < padding || svgX > width - padding) {
      setHoverX(null);
      onHoverChange?.(null);
      return;
    }

    setHoverX(svgX);

    // Calculate normalized position (0 to 1) within the chart data range
    const normalizedPos = (svgX - padding) / (width - padding * 2);
    const indexFloat = normalizedPos * (data.length - 1);
    const lowerIndex = Math.floor(indexFloat);
    const upperIndex = Math.ceil(indexFloat);

    if (lowerIndex === upperIndex) {
      // Exactly on a data point
      const point = data[lowerIndex];
      onHoverChange?.({
        stimulationAmplitude: point.stimulationAmplitude,
        frequency: point.frequency,
        pulseWidth: point.pulseWidth,
      }, point.timestamp);
    } else {
      // Interpolate between two points
      const lower = data[lowerIndex];
      const upper = data[upperIndex];
      const t = indexFloat - lowerIndex; // 0 to 1

      onHoverChange?.({
        stimulationAmplitude: lower.stimulationAmplitude + (upper.stimulationAmplitude - lower.stimulationAmplitude) * t,
        frequency: lower.frequency + (upper.frequency - lower.frequency) * t,
        pulseWidth: lower.pulseWidth + (upper.pulseWidth - lower.pulseWidth) * t,
      }, lower.timestamp);
    }
  };

  const handleMouseLeave = () => {
    setHoverX(null);
    onHoverChange?.(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-text-muted mb-2">
        <span>Tremor amplitude (wearable)</span>
        <span>Scale: {minAmplitude.toFixed(1)} - {maxAmplitude.toFixed(1)}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-48 cursor-crosshair"
        role="img"
        aria-label="Tremor amplitude timeline"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <rect x="0" y="0" width={width} height={height} fill="white" rx="8" />
        <g stroke="#E3E9F2" strokeWidth="1">
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={padding}
              x2={width - padding}
              y1={padding + ratio * (height - padding * 2)}
              y2={padding + ratio * (height - padding * 2)}
            />
          ))}
        </g>
        <path d={linePath} fill="none" stroke="#0052CC" strokeWidth="2.5" />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="3" fill="#0052CC" />
        ))}
        {hoverX !== null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={padding}
            y2={height - padding}
            stroke="#0052CC"
            strokeWidth="2"
            opacity="0.4"
            strokeDasharray="4,4"
          />
        )}
      </svg>
      <div className="flex items-center justify-between text-xs text-text-muted mt-2">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}
