import type { ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  variant?: 'default' | 'highlight';
}

/**
 * InfoRow component - displays a label/value pair consistently
 */
export function InfoRow({ label, value, variant = 'default' }: InfoRowProps) {
  const labelClasses =
    variant === 'highlight'
      ? 'text-text-main font-semibold'
      : 'text-text-muted font-medium';

  const valueClasses =
    variant === 'highlight' ? 'text-brand-blue font-bold' : 'text-text-main font-semibold';

  return (
    <div className="flex justify-between items-center py-3 border-b border-border-subtle last:border-b-0">
      <span className={`text-sm ${labelClasses}`}>{label}</span>
      <span className={`text-sm ${valueClasses}`}>{value}</span>
    </div>
  );
}
