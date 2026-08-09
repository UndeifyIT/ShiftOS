import React from 'react';
import { SkeletonRows } from './Skeleton.js';
import { EmptyState } from './EmptyState.js';
import { ErrorState } from './ErrorState.js';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  /** Card view (mobile) hides secondary columns by default (UI-006 §13, UI-010 §7). */
  primary?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  onRowClick?: (row: T) => void;
}

/**
 * A single table implementation used across every ShiftOS list screen
 * (UI-006). Desktop renders a real <table>; below `md` it renders a card
 * list of primary/secondary label-value pairs instead of a horizontally
 * scrolling grid (UI-006 §13, UI-010 §7) — real tables do not translate to
 * touch screens.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowClick
}: DataTableProps<T>): React.ReactElement {
  if (loading) {
    return <SkeletonRows rows={5} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={onRetry} />;
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} primaryAction={emptyAction} />;
  }

  const primaryColumn = columns.find((c) => c.primary) ?? columns[0]!;
  const secondaryColumns = columns.filter((c) => c.key !== primaryColumn.key);

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white md:block">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 font-medium text-neutral-600">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={['border-b border-neutral-100 last:border-0', onRowClick ? 'cursor-pointer hover:bg-neutral-50' : ''].join(' ')}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-neutral-800">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <button
              type="button"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              disabled={!onRowClick}
              className="w-full rounded-xl border border-neutral-200 bg-white p-4 text-left disabled:cursor-default"
            >
              <div className="font-medium text-neutral-900">{primaryColumn.render(row)}</div>
              <dl className="mt-2 flex flex-col gap-1">
                {secondaryColumns.map((column) => (
                  <div key={column.key} className="flex justify-between gap-3 text-sm">
                    <dt className="text-neutral-500">{column.header}</dt>
                    <dd className="text-neutral-800">{column.render(row)}</dd>
                  </div>
                ))}
              </dl>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
