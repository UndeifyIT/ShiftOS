import React from 'react';

export function PageContainer({ className = '', children }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={['mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8', className].join(' ')}>{children}</div>;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

/** UI-003 §4/§14: page header first, primary actions top-right, then main content. */
export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps): React.ReactElement {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {breadcrumb}
        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-neutral-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function ContentSection({
  title,
  actions,
  className = '',
  children
}: { title?: string; actions?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <section className={['mb-6', className].join(' ')}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between">
          {title ? <h2 className="text-base font-semibold text-neutral-900">{title}</h2> : <span />}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
