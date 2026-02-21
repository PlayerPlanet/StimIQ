import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/**
 * SectionHeader component - professional section titles with clinical hierarchy
 */
export function SectionHeader({
  title,
  subtitle,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-6 pb-4 border-b border-border-subtle">
      <div>
        <h2 className="text-2xl font-bold font-heading text-text-main">{title}</h2>
        {subtitle && (
          <p className="text-sm text-text-muted mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
