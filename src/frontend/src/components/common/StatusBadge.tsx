import type { ReactNode } from 'react';

interface StatusBadgeProps {
  status: 'stable' | 'monitor' | 'review' | 'neutral';
  children: ReactNode;
  size?: 'sm' | 'md';
}

/**
 * Status badge component - clinical monochrome/blue status indicators
 * No traffic-light colors, uses understated blue tones
 */
export function StatusBadge({
  status,
  children,
  size = 'md',
}: StatusBadgeProps) {
  const statusClasses = {
    stable: 'bg-brand-blue-soft text-brand-blue border border-brand-blue/30',
    monitor: 'bg-surface-alt text-text-main border border-border-subtle',
    review: 'bg-brand-navy/5 text-brand-navy border border-brand-navy/20',
    neutral: 'bg-surface-alt text-text-muted border border-border-subtle',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md ${statusClasses[status]} ${sizeClasses[size]}`}
    >
      {children}
    </span>
  );
}
