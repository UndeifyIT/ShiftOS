import React from 'react';

export interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  className?: string;
}

/** Tappable icon+label tile for dashboard "shortcuts" rows (Create Schedule, Add Employee, etc.). */
export function QuickAction({ icon: Icon, label, description, onClick, className = '' }: QuickActionProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-start gap-2 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40',
        className
      ].join(' ')}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={18} />
      </span>
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      {description ? <span className="text-xs text-neutral-500">{description}</span> : null}
    </button>
  );
}
