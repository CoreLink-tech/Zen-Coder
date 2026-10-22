interface ErrorStateProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  retryLabel = "Try again",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive-soft px-6 py-14 text-center sm:py-20"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 8v5M12 16.5v.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="mx-auto max-w-sm">
        <h3 className="text-title text-destructive">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
