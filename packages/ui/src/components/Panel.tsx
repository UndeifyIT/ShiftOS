import React from 'react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

/** Dashboard-widget container — like Card, but always titled (Card stays the general-purpose grouping primitive; UI-003 §11). Modeled on the Lovable prototype's `Panel` widget shell. */
export function Panel({ title, description, actions, className = '', children, ...rest }: PanelProps): React.ReactElement {
  return (
    <div className={['rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm', className].join(' ')} {...rest}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? <h3 className="text-sm font-semibold text-neutral-900">{title}</h3> : null}
            {description ? <p className="mt-0.5 text-xs text-neutral-500">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}
