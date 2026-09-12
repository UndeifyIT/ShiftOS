import React, { useEffect } from 'react';
import { useRpcQuery } from '../../../lib/useRpc.js';
import type { ScheduleVersion } from '../../../types/domain.js';

/** Publish history for one schedule (WEB-013), opened from the publish button's "▾" menu — the handoff has no tab for it. */
export function VersionHistoryModal({ scheduleId, onClose }: { scheduleId: string; onClose: () => void }): React.ReactElement {
  const { data: versions, isLoading, error } = useRpcQuery<ScheduleVersion[]>('list_schedule_versions', { scheduleId });

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(56,49,43,.34)] p-[22px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Version history"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-[430px] flex-col rounded-[18px] bg-white shadow-[0_34px_74px_-32px_rgba(56,49,43,.5)]"
      >
        <div className="flex items-start gap-2.5 px-[18px] pb-3 pt-[18px]">
          <span className="min-w-0">
            <h2 className="m-0 text-[16px] font-extrabold tracking-[-0.02em]">Version history</h2>
            <p className="mb-0 mt-1 text-[11.5px] text-[#857A72]">Every publish records a version — nothing is overwritten.</p>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto size-7 cursor-pointer rounded-[9px] border-0 bg-[#F6F3F0] text-[12px] font-extrabold text-[#57504A]"
          >
            ✕
          </button>
        </div>
        <div className="flex-auto overflow-y-auto border-t border-[#F2EEEA] px-[18px] py-2">
          {isLoading ? <p className="m-0 py-4 text-[12px] text-[#A79C93]">Loading versions…</p> : null}
          {error ? <p className="m-0 py-4 text-[12px] text-[#C93A22]">{(error as Error).message}</p> : null}
          {!isLoading && !error && (versions ?? []).length === 0 ? (
            <p className="m-0 py-4 text-[12px] text-[#A79C93]">Not published yet — this schedule has no publish history.</p>
          ) : null}
          {(versions ?? []).map((version) => (
            <div key={version.id} className="flex items-baseline gap-3 border-b border-[#F7F4F1] py-2.5 last:border-b-0">
              <span className="text-[12.5px] font-extrabold text-[#38312B]">v{version.version}</span>
              <span className="min-w-0 flex-auto text-[11.5px] text-[#57504A]">{version.changes_summary ?? '—'}</span>
              <span className="text-[11px] text-[#A79C93]">{new Date(version.published_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
