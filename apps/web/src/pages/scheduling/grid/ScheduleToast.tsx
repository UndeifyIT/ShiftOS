import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type ToastTone = 'success' | 'error';

interface ToastState {
  text: string;
  tone: ToastTone;
  id: number;
}

/** Transient status message for the schedule screen; auto-dismisses. */
export function useScheduleToast(): { toast: ToastState | null; show: (text: string, tone?: ToastTone) => void; dismiss: () => void } {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.tone === 'error' ? 6000 : 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const show = useCallback((text: string, tone: ToastTone = 'success') => {
    counter.current += 1;
    setToast({ text, tone, id: counter.current });
  }, []);

  return { toast, show, dismiss: useCallback(() => setToast(null), []) };
}

/** Shows a toast handed over through navigation (`navigate(to, { state: { toast, tone } })`), then clears it so a reload doesn't repeat it. */
export function useRouteToast(show: (text: string, tone?: ToastTone) => void): void {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const state = location.state as { toast?: unknown; tone?: unknown } | null;
    if (!state || typeof state.toast !== 'string') return;
    show(state.toast, state.tone === 'error' ? 'error' : 'success');
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location, navigate, show]);
}

/** Bottom-centre dark toast — design handoff toast (lines 2791-2797). Errors swap the green ✓ for a red "!". */
export function ScheduleToast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }): React.ReactElement | null {
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[90] flex max-w-[min(92vw,520px)] -translate-x-1/2 items-center gap-[11px] rounded-[14px] bg-[#231E1A] px-4 py-3 text-[#FBF7F4] shadow-[0_22px_44px_-22px_rgba(35,30,26,.7)]"
    >
      <span
        aria-hidden="true"
        className={['flex size-[22px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold text-white', toast.tone === 'error' ? 'bg-[#C93A22]' : 'bg-[#2E9E62]'].join(' ')}
      >
        {toast.tone === 'error' ? '!' : '✓'}
      </span>
      <p className="m-0 text-[12.5px] font-bold">{toast.text}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="cursor-pointer border-0 bg-transparent px-1 py-0.5 text-[13px] text-[rgba(251,247,244,.6)]">
        ✕
      </button>
    </div>
  );
}
