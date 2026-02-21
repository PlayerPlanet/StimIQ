<<<<<<< HEAD
import type { ReactNode } from 'react';
=======
import type { ReactNode, MouseEvent } from 'react';
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'metric';
  hover?: boolean;
<<<<<<< HEAD
=======
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df
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
<<<<<<< HEAD
=======
  onClick,
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df
}: CardProps) {
  const baseClasses =
    'rounded-md border transition-all duration-200';

  const variantClasses =
    variant === 'metric'
      ? 'bg-brand-blue text-white border-brand-blue shadow-lg'
      : variant === 'subtle'
      ? 'bg-brand-blue-soft border-border-subtle shadow-sm'
      : 'bg-surface border-border-subtle shadow-sm';

  const hoverClasses = hover
    ? 'hover:shadow-md'
    : '';

  return (
<<<<<<< HEAD
    <div className={`${baseClasses} ${variantClasses} ${hoverClasses} ${className}`}>
=======
    <div 
      className={`${baseClasses} ${variantClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df
      {children}
    </div>
  );
}
