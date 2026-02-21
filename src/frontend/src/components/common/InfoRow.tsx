import type { ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  variant?: 'default' | 'highlight';
  density?: 'default' | 'compact';
}

/**
 * InfoRow component - displays a label/value pair consistently
 */
export function InfoRow({
  label,
  value,
  variant = 'default',
  density = 'default',
}: InfoRowProps) {
  const labelClasses =
    variant === 'highlight'
      ? 'text-text-main font-semibold'
      : 'text-text-muted font-medium';

  const valueClasses =
    variant === 'highlight' ? 'text-brand-blue font-bold' : 'text-text-main font-semibold';

  const rowPadding = density === 'compact' ? 'py-1.5' : 'py-3';
  const textSize = density === 'compact' ? 'text-xs' : 'text-sm';

  return (
    <div className={`flex justify-between items-center ${rowPadding} border-b border-border-subtle last:border-b-0`}>
      <span className={`${textSize} ${labelClasses}`}>{label}</span>
      <span className={`${textSize} ${valueClasses}`}>{value}</span>
    </div>
  );
}
