/**
 * DBSParameterGauge - SVG-based circular telemetry gauge
 * Displays a parameter value in a circular progress arc with percentage change indicator
 */

interface DBSParameterGaugeProps {
  value: number;
  max: number;
  label: string;
  percentageChange?: number;
  showPercentageChange?: boolean;
}

export function DBSParameterGauge({
  value,
  max,
  label,
  percentageChange = 0,
  showPercentageChange = false,
}: DBSParameterGaugeProps) {
  const size = 140;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  // Normalize value to 0-1 range
  const normalizedValue = Math.min(Math.max(value, 0), max) / max;
  
  // Calculate arc length: 270 degrees of circle (270 / 360 = 0.75)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength * (1 - normalizedValue);

  // Determine color based on percentage change
  const getChangeColor = (): string => {
    if (showPercentageChange) {
      if (percentageChange > 0.5) return '#22c55e'; // Green for positive
      if (percentageChange < -0.5) return '#ef4444'; // Red for negative
      return '#9ca3af'; // Gray for no change
    }
    return '#9ca3af';
  };

  const changeColor = getChangeColor();

  // Format percentage display
  const formatChange = (): string => {
    return percentageChange >= 0 ? `+${percentageChange.toFixed(1)}%` : `${percentageChange.toFixed(1)}%`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="white"
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {/* Background arc (full progress indicator) */}
          <path
            d={`M ${size / 2} ${size / 2 - radius} 
               A ${radius} ${radius} 0 1 1 ${size / 2 - radius * 0.707} ${size / 2 + radius * 0.707}`}
            fill="none"
            stroke="#e3e9f2"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Progress arc */}
          <path
            d={`M ${size / 2} ${size / 2 - radius} 
               A ${radius} ${radius} 0 1 1 ${size / 2 - radius * 0.707} ${size / 2 + radius * 0.707}`}
            fill="none"
            stroke="#0052CC"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />

          {/* Center value text */}
          <text
            x={size / 2}
            y={size / 2 - 8}
            textAnchor="middle"
            className="text-3xl font-bold fill-text-main"
            fontSize="32"
            fontWeight="700"
          >
            {value.toFixed(1)}
          </text>

          {/* Label text */}
          <text
            x={size / 2}
            y={size / 2 + 18}
            textAnchor="middle"
            className="text-xs fill-text-muted"
            fontSize="11"
          >
            {label}
          </text>
        </svg>
      </div>

      {/* Percentage change indicator */}
      {showPercentageChange && (
        <div
          className="text-sm font-semibold text-center"
          style={{ color: changeColor }}
        >
          {formatChange()}
        </div>
      )}
    </div>
  );
}
