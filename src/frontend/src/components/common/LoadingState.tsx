/**
 * LoadingState component - shows loading indicator
 */
export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-4 border-border-subtle border-t-brand-blue animate-spin" />
      <p className="mt-4 text-text-muted text-sm font-medium">Loading...</p>
    </div>
  );
}
