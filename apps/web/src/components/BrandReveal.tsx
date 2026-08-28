import React from 'react';
import { LogoMark } from '../marketing/Logo.js';

/**
 * First-load splash intro, ported exactly from `Local file check/
 * design_handoff_shiftos/ShiftOS Marketing.dc.html`'s reveal overlay
 * (`revealOn`/`revealOverlayStyle` + its componentDidMount timers):
 * full-screen #FEFCFA sheet, wordmark slides up, logo mark drops in with a
 * bounce, lockup settles, shine sweeps across "OS" once, then the whole
 * sheet scales/fades out (so-splash-out). Shows once per browser session
 * (sessionStorage key matches the prototype's `shiftos-brand-reveal-v3`),
 * and is skipped entirely under prefers-reduced-motion — both behaviors
 * identical to the design file.
 */

const SESSION_KEY = 'shiftos-brand-reveal-v3';
const HOLD_MS = 2600;
const EXIT_MS = 400;

type RevealState = 'hidden' | 'show' | 'exit';

function initialReveal(): RevealState {
  if (typeof window === 'undefined') return 'hidden';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'hidden';
  try {
    if (window.sessionStorage.getItem(SESSION_KEY) === '1') return 'hidden';
  } catch {
    // sessionStorage unavailable (private mode / disabled) — skip rather than show every load
    return 'hidden';
  }
  return 'show';
}

export function BrandReveal({ children }: { children: React.ReactNode }): React.ReactElement {
  const [reveal, setReveal] = React.useState<RevealState>(initialReveal);

  React.useEffect(() => {
    if (reveal !== 'show') return;
    const holdTimer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // ignore — best-effort session gate only
      }
      setReveal('exit');
      const exitTimer = window.setTimeout(() => setReveal('hidden'), EXIT_MS);
      return () => window.clearTimeout(exitTimer);
    }, HOLD_MS);
    return () => window.clearTimeout(holdTimer);
  }, [reveal]);

  return (
    <>
      {children}
      {reveal !== 'hidden' ? (
        <div
          role="status"
          aria-label="ShiftOS is loading"
          className={[
            'fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#FEFCFA]',
            reveal === 'exit' ? 'animate-so-splash-out' : ''
          ].join(' ')}
        >
          {/* Lockup: settles with a tiny lift after the pieces land (so-lockup-settle) */}
          <div className="animate-so-lockup-settle relative flex items-center justify-center gap-[13px]">
            <div className="relative h-[50px] w-[50px] shrink-0">
              <LogoMark className="animate-so-mark-drop absolute inset-0 h-full w-full" />
            </div>
            {/* Wordmark rises into view (so-word-in); the shine band sweeps across once (so-sweep-once) */}
            <div className="animate-so-word-in relative flex items-baseline overflow-hidden">
              <span className="font-display text-[46px] font-extrabold leading-none tracking-[-0.025em] text-[#17130F]">Shift</span>
              <span className="bg-gradient-to-r from-[#F26B1D] to-[#EF3D12] bg-clip-text font-display text-[46px] font-extrabold leading-none tracking-[-0.025em] text-transparent">
                OS
              </span>
              <span
                aria-hidden="true"
                className="animate-so-sweep-once absolute bottom-0 top-0 left-[-40%] w-[38%] bg-gradient-to-r from-transparent via-white/75 to-transparent"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
