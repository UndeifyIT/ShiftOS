import React from 'react';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  loading?: boolean;
  tone?: 'brand' | 'neutral';
  className?: string;
}

/** Compact metric tile used across dashboards (org/branch counts, schedule totals). Loading state preserves layout (UI-006 §15) instead of collapsing. */
export function StatCard({ label, value, icon: Icon, loading = false, tone = 'neutral', className = '' }: StatCardProps): React.ReactElement {
  return (
    <div className={['rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm', className].join(' ')}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        {Icon ? (
          <span
            className={[
              'flex h-8 w-8 items-center justify-center rounded-lg',
              tone === 'brand' ? 'bg-brand-50 text-brand-600' : 'bg-neutral-100 text-neutral-500'
            ].join(' ')}
          >
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-neutral-200" />
      ) : (
        <p className="mt-1 text-3xl font-bold text-neutral-900">{value}</p>
      )}
    </div>
  );
}
