

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * ErrorState component - shows error placeholder
 */
export function ErrorState({
  message = 'An error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-3xl px-lg">
      <div className="text-brand-blue text-5xl mb-lg font-bold">⚠</div>
      <p className="text-center text-text-muted mb-lg max-w-sm font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-xl py-md bg-brand-blue text-white font-bold rounded-md transition-all duration-200 ease-smooth hover:opacity-90 active:opacity-75 shadow-md hover:shadow-lg"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
