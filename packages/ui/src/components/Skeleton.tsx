import React from 'react';

export interface SkeletonProps {
  className?: string;
}

/** UI-004/UI-006 §15: initial loading uses skeletons that preserve layout, not a spinner-only blank screen. */
export function Skeleton({ className = '' }: SkeletonProps): React.ReactElement {
  return <div className={['animate-pulse rounded-md bg-neutral-200', className].join(' ')} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 3 }: { rows?: number }): React.ReactElement {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
