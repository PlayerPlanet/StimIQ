import type { ReactNode, MouseEvent } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'metric';
  hover?: boolean;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

/**
 * Card component - professional container with Pfizer-inspired clinical design
 * Clean surfaces with subtle shadows and precise borders
 */
export function Card({
  children,
  className = '',
  variant = 'default',
  hover = false,
  onClick,
}: CardProps) {
  const baseClasses =
    'rounded-sm border transition-all duration-75';

  const variantClasses =
    variant === 'metric'
      ? 'bg-brand-blue text-white border-brand-blue'
      : variant === 'subtle'
      ? 'bg-brand-blue-soft border-border-subtle'
      : 'bg-surface border-border-subtle';

  const hoverClasses = hover
    ? 'hover:border-brand-blue'
    : '';

  return (
    <div 
      className={`${baseClasses} ${variantClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
