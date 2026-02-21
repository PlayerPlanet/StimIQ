interface MetricTile {
  value: string | number;
  label: string;
  isPrimary?: boolean;
}

interface MetricTilesProps {
  metrics: MetricTile[];
}

/**
 * MetricTiles component - Pfizer-inspired horizontal metric tiles
 * Clean, precise tiles with one highlighted primary tile
 */
export function MetricTiles({ metrics }: MetricTilesProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className={`
            rounded-md border transition-all duration-200
            ${
              metric.isPrimary
                ? 'bg-brand-blue text-white border-brand-blue shadow-lg'
                : 'bg-surface text-text-main border-border-subtle shadow-sm hover:shadow-md'
            }
          `}
        >
          <div className="p-6 text-center">
            <p
              className={`
                text-5xl font-bold tracking-tight mb-2 font-heading
                ${metric.isPrimary ? 'text-white' : 'text-brand-blue'}
              `}
            >
              {metric.value}
            </p>
            <p
              className={`
                text-sm font-medium
                ${metric.isPrimary ? 'text-white/80' : 'text-text-muted'}
              `}
            >
              {metric.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
