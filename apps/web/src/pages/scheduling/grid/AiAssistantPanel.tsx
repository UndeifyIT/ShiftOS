import React, { useState } from 'react';
import { ScheduleIcon, type ScheduleIconName } from './ScheduleIcon.js';
import { TONES, type Tone } from './scheduleFormat.js';

export type AiActionKey = 'fillEmpty' | 'balance' | 'overtime' | 'resolveConflicts' | 'createNextWeek';

const ACTIONS: Array<{ key: AiActionKey; title: string; body: string; icon: ScheduleIconName; tone: Tone }> = [
  { key: 'fillEmpty', title: 'Fill empty shifts', body: 'Automatically fill gaps', icon: 'checkCircle', tone: 'ok' },
  { key: 'balance', title: 'Balance workloads', body: 'Distribute hours evenly', icon: 'sliders', tone: 'info' },
  { key: 'overtime', title: 'Avoid overtime', body: 'Prevent overtime & fatigue', icon: 'clock', tone: 'warn' },
  { key: 'resolveConflicts', title: 'Resolve conflicts', body: 'Fix scheduling conflicts', icon: 'alert', tone: 'bad' },
  { key: 'createNextWeek', title: 'Create next week', body: 'Generate from this week', icon: 'refresh', tone: 'violet' }
];

export interface AiAssistantPanelProps {
  onAction: (action: AiActionKey) => void;
  onAsk: (question: string) => void;
  asking: boolean;
}

/** Right-rail "AI Schedule Assistant" card — design handoff lines 633-654. */
export function AiAssistantPanel({ onAction, onAsk, asking }: AiAssistantPanelProps): React.ReactElement {
  const [query, setQuery] = useState('');

  const send = (): void => {
    if (!query.trim() || asking) return;
    onAsk(query.trim());
    setQuery('');
  };

  return (
    <section className="rounded-2xl border border-[#EBE7E3] bg-white px-[15px] pb-[13px] pt-[15px]">
      <div className="flex items-center gap-2">
        <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">AI Schedule Assistant</h2>
        <span className="ml-auto inline-flex rounded-full bg-[#F3EEFE] px-2 py-[3px] text-[9.5px] font-extrabold text-[#7C3AED]">Beta</span>
      </div>
      <p className="mb-0 mt-[5px] text-[11.5px] text-[#A79C93]">Get help optimizing your schedule.</p>
      <div className="mt-3 flex flex-col gap-[7px]">
        {ACTIONS.map((action) => {
          const [fg, bg] = TONES[action.tone];
          return (
            <button
              key={action.key}
              type="button"
              onClick={() => onAction(action.key)}
              className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-[#F2EEEA] bg-[#FDFCFB] px-[11px] py-2.5 text-left hover:border-[#E4DED9] hover:bg-white"
            >
              <span className="flex size-[30px] flex-none items-center justify-center rounded-[10px]" style={{ color: fg, backgroundColor: bg }}>
                <ScheduleIcon name={action.icon} size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-bold text-[#38312B]">{action.title}</span>
                <span className="block text-[10.5px] text-[#A79C93] [text-wrap:pretty]">{action.body}</span>
              </span>
            </button>
          );
        })}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="mt-[11px] flex h-10 items-center gap-2 rounded-[11px] border border-[#EBE7E3] bg-[#FDFCFB] px-2.5"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask anything about the schedule…"
          aria-label="Ask anything about the schedule"
          className="min-w-0 flex-auto border-0 bg-transparent px-0.5 py-px text-[11.5px] text-[#38312B] outline-none placeholder:text-[#757575]"
        />
        <button type="submit" aria-label="Send" disabled={asking} className="cursor-pointer border-0 bg-transparent p-0 text-[#C6420E] disabled:opacity-50">
          <ScheduleIcon name="mail" size={15} />
        </button>
      </form>
    </section>
  );
}
