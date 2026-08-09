import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

/** UI-003 §11: cards group summaries/insights — use sparingly, not as a substitute for every container. */
export function Card({ padded = true, className = '', children, ...rest }: CardProps): React.ReactElement {
  return (
    <div
      className={['rounded-xl border border-neutral-200 bg-white shadow-sm', padded ? 'p-5' : '', className].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div className={['mb-4 flex items-center justify-between gap-3', className].join(' ')} {...rest}>
      {children}
    </div>
  );
}
