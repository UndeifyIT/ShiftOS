import { useEffect, useRef } from 'react';

/**
 * Persists a plain-object form draft to sessionStorage under `key`, restoring
 * it once on mount via `onRestore`, then keeping it in sync as `values`
 * changes — so an accidental reload mid-form (e.g. during onboarding, before
 * anything has been saved server-side) doesn't lose what was typed.
 *
 * sessionStorage, not localStorage: a draft belongs to this tab's browsing
 * session, not the device long-term (matches SignUpPage's existing
 * `shiftos.pendingName` handoff to CompleteProfilePage). Call
 * `clearFormDraft(key)` once the form actually submits so a stale draft
 * doesn't reappear on a future visit to the same page.
 *
 * The restore effect and the write effect run in the same commit on mount —
 * `phase` exists purely to stop that first write effect from immediately
 * clobbering the draft it just read with the pre-restore default values.
 */
export function useFormDraft<T extends Record<string, unknown>>(key: string, values: T, onRestore: (saved: Partial<T>) => void): void {
  const phase = useRef<'pending' | 'restoring' | 'ready'>('pending');

  useEffect(() => {
    if (phase.current !== 'pending') return;
    const raw = window.sessionStorage.getItem(key);
    if (raw) {
      try {
        onRestore(JSON.parse(raw) as Partial<T>);
        phase.current = 'restoring';
        return;
      } catch {
        // Malformed draft — ignore, the form just starts blank.
      }
    }
    phase.current = 'ready';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase.current === 'pending') return;
    if (phase.current === 'restoring') {
      // Skip the one write that would otherwise fire this same commit, using
      // the values from before onRestore's setState landed.
      phase.current = 'ready';
      return;
    }
    window.sessionStorage.setItem(key, JSON.stringify(values));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, values]);
}

export function clearFormDraft(key: string): void {
  window.sessionStorage.removeItem(key);
}
