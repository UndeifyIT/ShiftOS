import React from 'react';

export interface TabItem {
  key: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

/** Secondary/contextual navigation within a detail screen (frontend foundation §D.5 — e.g. Employee Profile, Schedule detail). */
export function Tabs({ items, activeKey, onChange, className = '' }: TabsProps): React.ReactElement {
  return (
    <div role="tablist" className={['flex gap-1 border-b border-neutral-200', className].join(' ')}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={[
              'border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'border-brand-500 text-brand-600' : 'border-transparent text-neutral-500 hover:text-neutral-800'
            ].join(' ')}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
