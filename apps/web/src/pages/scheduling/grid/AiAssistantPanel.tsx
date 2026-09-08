import React, { useState } from 'react';
import { CheckCircle, Sliders, Clock, AlertTriangle, Send } from 'lucide-react';
import { Badge, Panel, QuickAction } from '@shiftos/ui';

const ACTIONS = [
  { icon: CheckCircle, label: 'Fill empty shifts', description: 'Automatically fill gaps' },
  { icon: Sliders, label: 'Balance workloads', description: 'Distribute hours evenly' },
  { icon: Clock, label: 'Avoid overtime', description: 'Prevent overtime & fatigue' },
  { icon: AlertTriangle, label: 'Resolve conflicts', description: 'Fix scheduling conflicts' }
];

/** Right-rail "AI Schedule Assistant" card — pixel match to the design handoff, every action inert until Phase 3 wires up real logic. */
export function AiAssistantPanel(): React.ReactElement {
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showComingSoon = (): void => {
    setToast('Coming soon');
    window.setTimeout(() => setToast(null), 2500);
  };

  return (
    <Panel title="AI Schedule Assistant" description="Get help optimizing your schedule." actions={<Badge tone="pending">Beta</Badge>}>
      <div className="flex flex-col gap-2">
        {ACTIONS.map((action) => (
          <QuickAction key={action.label} icon={action.icon} label={action.label} description={action.description} onClick={showComingSoon} />
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          showComingSoon();
          setQuery('');
        }}
        className="mt-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about the schedule…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none"
        />
        <button type="submit" aria-label="Send" className="text-brand-700">
          <Send size={14} />
        </button>
      </form>
      {toast ? <p className="mt-2 text-[10.5px] font-semibold text-brand-700">{toast}</p> : null}
    </Panel>
  );
}
