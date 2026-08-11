import React from 'react';

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Simple prev/next + "page X of Y" control — data tables here are org-scoped and rarely deep enough to need numbered page links (UI-006 §9). */
export function Pagination({ page, pageCount, onPageChange, className = '' }: PaginationProps): React.ReactElement | null {
  if (pageCount <= 1) return null;

  return (
    <div className={['flex items-center justify-between gap-3', className].join(' ')}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>
      <span className="text-xs font-medium text-neutral-500">
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
}
