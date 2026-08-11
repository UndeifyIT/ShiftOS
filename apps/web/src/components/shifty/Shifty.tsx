import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ShiftyAvatar, ShiftyMascot } from './mascot.js';

export interface ShiftyStep {
  title: string;
  message: string;
}

export interface ShiftyProps {
  /** Canned, step-aware guidance — not a live AI backend (task §20: preserve the mascot/helper experience, don't build a real AI service yet). */
  step?: ShiftyStep;
  suggestedPrompts?: string[];
}

const CANNED_REPLIES: Record<string, string> = {
  default:
    "I'm Shifty — I can point you to the right screen, but I can't take actions for you yet. Try the navigation on the left, or check Resources for guides."
};

/**
 * Onboarding mascot/helper, ported from the Lovable prototype's
 * components/shifty/*. Intentionally UI-only: `simulateReply` below is a
 * fixed lookup, not a model call. Wiring this to a real assistant service is
 * a later backend milestone.
 */
export function Shifty({ step, suggestedPrompts = [] }: ShiftyProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: 'shifty' | 'user'; text: string }[]>([]);

  const simulateReply = (prompt: string): string => {
    const lower = prompt.toLowerCase();
    if (lower.includes('branch')) return "Branches are how ShiftOS organizes your locations. Add one from the Branches screen, or right here during setup.";
    if (lower.includes('schedule')) return 'Head to Scheduling to create a shift schedule, then publish it once you’re happy with it.';
    if (lower.includes('employee') || lower.includes('staff')) return 'Add your team from the Employees screen — photos are optional and can be added anytime.';
    if (lower.includes('invite') || lower.includes('invitation')) return "Sending account invitations isn't available yet — it's on the roadmap. For now, ask an administrator to add teammates directly.";
    return CANNED_REPLIES.default!;
  };

  const send = (prompt: string): void => {
    setMessages((prev) => [...prev, { from: 'user', text: prompt }, { from: 'shifty', text: simulateReply(prompt) }]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open ? (
        <div className="mb-3 w-80 rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between rounded-t-2xl bg-brand-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <ShiftyAvatar online className="size-8 bg-white" />
              <span className="text-sm font-semibold">Shifty</span>
            </div>
            <button type="button" aria-label="Close Shifty" onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-4">
            {step ? (
              <div className="mb-3 rounded-xl bg-brand-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{step.title}</p>
                <p className="mt-1 text-sm text-neutral-700">{step.message}</p>
              </div>
            ) : null}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <span className="flex size-16 items-end justify-center overflow-hidden rounded-2xl bg-brand-50">
                  <ShiftyMascot variant="wave" className="h-[88%] w-full" />
                </span>
                <p className="text-sm text-neutral-500">Ask me about branches, schedules, employees, or invitations.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={[
                      'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                      message.from === 'shifty' ? 'self-start bg-neutral-100 text-neutral-800' : 'self-end bg-brand-500 text-white'
                    ].join(' ')}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {suggestedPrompts.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-neutral-100 p-3">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Open Shifty helper"
        onClick={() => setOpen((value) => !value)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 shadow-lg hover:bg-brand-600"
      >
        <ShiftyMascot variant="avatar" className="size-9 rounded-full" />
      </button>
    </div>
  );
}
