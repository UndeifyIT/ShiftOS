import React, { useEffect, useRef } from 'react';

/*
 * The design handoff's dialog (`ShiftOS Dashboards.dc.html` lines 2697-2738):
 * a 520px sheet over a dark scrim, title and subtitle, the caller's own body,
 * then Cancel + a primary button. Sizes are the prototype's rendered ones, so
 * the wrapper carries the 13px / normal-line-height base the rest of the
 * handoff pages use.
 */
export function HandoffModal({
  open,
  title,
  subtitle,
  primary,
  primaryDisabled,
  onPrimary,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  subtitle: string;
  primary: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  onClose: () => void;
  children: React.ReactNode;
}): React.ReactElement | null {
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    sheet.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(35,30,26,.46)] p-6 text-[13px] text-[#38312B] [line-height:normal]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={sheet} role="dialog" aria-modal="true" aria-label={title} className="max-h-[86vh] w-full max-w-[520px] overflow-y-auto rounded-[20px] bg-white shadow-[0_40px_90px_-40px_rgba(35,30,26,.6)]">
        <div className="flex items-start gap-3 px-[22px] pt-5">
          <div className="min-w-0 flex-auto">
            <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] [text-wrap:pretty]">{title}</h2>
            <p className="mb-0 mt-1.5 text-[12.5px] text-[#857A72]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-solid border-[#EBE7E3] bg-white text-[14px] text-[#857A72]"
          >
            ✕
          </button>
        </div>

        {children}

        <div className="mt-5 flex flex-wrap justify-end gap-[9px] border-t border-solid border-[#F2EEEA] px-[22px] py-4">
          <button type="button" onClick={onClose} className="h-11 cursor-pointer rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[17px] text-[13.5px] font-bold text-[#38312B]">
            Cancel
          </button>
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="h-11 cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-5 text-[13.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(240,78,23,.75)] disabled:opacity-70"
          >
            {primary}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The handoff's modal form grid — `repeat(auto-fit, minmax(200px, 1fr))`, 14px gap. */
export function ModalFields({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="mx-[22px] mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">{children}</div>;
}

/** A modal field: 12px bold label with the brand asterisk, then a 42px control. */
export function ModalField({ label, required, full, children }: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }): React.ReactElement {
  return (
    <label className={`block min-w-0 ${full ? 'col-[1/-1]' : ''}`}>
      <span className="mb-1.5 block text-[12px] font-bold">
        {label}
        {required ? <span className="text-[#F04E17]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export const modalControl =
  'box-border h-[42px] w-full rounded-[11px] border border-solid border-[#E4DED9] bg-white px-3 text-[13px] text-[#38312B] outline-none focus:border-[#F04E17]';
