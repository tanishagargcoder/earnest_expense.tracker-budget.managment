import type { ReactNode } from 'react';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert--error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn--small btn--ghost" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/** Placeholder blocks shown while the first load of a page is in flight. */
export function Skeleton({ variant }: { variant: 'stats' | 'cards' | 'rows' }) {
  if (variant === 'stats') {
    return (
      <div className="stats-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton--stat" />
        ))}
      </div>
    );
  }
  if (variant === 'cards') {
    return (
      <div className="dashboard-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton--card" />
        ))}
      </div>
    );
  }
  return (
    <div className="skeleton-rows" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton skeleton--row" />
      ))}
    </div>
  );
}
