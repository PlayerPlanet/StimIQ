import type { ReactNode } from 'react';
import { Card } from './Card';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * CollapsibleSection - compact disclosure wrapper for dense clinical sections
 */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  className = '',
}: CollapsibleSectionProps) {
  return (
    <Card className={`p-0 ${className}`.trim()}>
      <details open={defaultOpen} className="group">
        <summary className="flex items-center justify-between px-3 py-2 cursor-pointer list-none">
          <span className="text-sm font-semibold text-text-main">{title}</span>
          <svg
            className="w-4 h-4 text-text-muted transition-transform duration-75 group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-3 pb-2">
          {children}
        </div>
      </details>
    </Card>
  );
}
