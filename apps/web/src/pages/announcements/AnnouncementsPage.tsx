import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import { AuthBanner } from '../auth/AuthInputs.js';
import { DashHeader } from '../dashboard/dashboardWidgets.js';
import { ObSelect } from '../onboarding/OnboardingFields.js';
import type { Announcement, Branch } from '../../types/domain.js';

/**
 * Announcements, recreated from `ShiftOS Dashboards.dc.html`'s
 * kindAnnouncements renderer: audience-pilled cards with type, publish state
 * and per-user acknowledgement. Managers/supervisors get the composer +
 * publish controls (announcements.create/publish permissions); staff get the
 * Acknowledge button (announcements.acknowledge). The design's
 * acknowledgement-receipts aside is omitted — the backend exposes
 * per-user acknowledgement only, no per-announcement ack counts to chart.
 */

const TYPE_LABELS: Record<string, string> = {
  general: 'General',
  policy: 'Policy',
  safety: 'Safety',
  operational: 'Operational',
  emergency: 'Emergency'
};

const TYPE_TONES: Record<string, string> = {
  general: 'bg-neutral-100 text-neutral-600',
  policy: 'bg-info-50 text-info-600',
  safety: 'bg-error-50 text-error-600',
  operational: 'bg-brand-soft text-brand-deep',
  emergency: 'bg-error-50 text-error-600'
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'draft';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AnnouncementsPage(): React.ReactElement {
  const { hasPermission } = useSession();
  const canCreate = hasPermission('announcements.create');
  const canPublish = hasPermission('announcements.publish');
  const canAcknowledge = hasPermission('announcements.acknowledge');
  const canReadBranches = hasPermission('branches.read');

  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canReadBranches });
  const { data: announcements, isLoading, refetch } = useRpcQuery<Announcement[]>('list_announcements');

  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('organization');
  const [type, setType] = useState('general');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useRpcMutation<Announcement, { branchId?: string | null; title: string; content: string; announcementType?: string }>(
    'create_announcement',
    {
      invalidates: ['list_announcements'],
      onSuccess: () => {
        setComposerOpen(false);
        setTitle('');
        setContent('');
        setError(null);
      },
      onError: (err) => setError(err.message)
    }
  );
  const publishMutation = useRpcMutation<Announcement, { announcementId: string }>('publish_announcement', {
    invalidates: ['list_announcements'],
    onError: (err) => setError(err.message)
  });
  const acknowledgeMutation = useRpcMutation<{ acknowledged: boolean }, { announcementId: string }>('acknowledge_announcement', {
    onSuccess: () => refetch(),
    onError: (err) => setError(err.message)
  });

  const visible = useMemo(
    () =>
      (announcements ?? [])
        .filter((a) => !a.deleted_at)
        .sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at)),
    [announcements]
  );

  const branchName = (branchId: string | null): string =>
    branchId ? ((branches ?? []).find((b) => b.id === branchId)?.name ?? 'Branch') : 'Organization';

  const submitComposer = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('A title and message are required.');
      return;
    }
    createMutation.mutate({
      branchId: audience === 'organization' ? null : audience,
      title: title.trim(),
      content: content.trim(),
      announcementType: type
    });
  };

  return (
    <div className="px-4 pb-10 pt-[72px] sm:px-6 lg:px-8">
      <DashHeader title="Announcements" subtitle="Operational communication that replaces the branch group chat." />

      {error ? <AuthBanner tone="bad" title={error} /> : null}

      {canCreate ? (
        <div className="mb-4">
          {composerOpen ? (
            <form onSubmit={submitComposer} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="text-[15px] font-extrabold">New announcement</h2>
              <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">Audience</span>
                  <ObSelect
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    options={[{ value: 'organization', label: 'Whole organization' }, ...(branches ?? []).map((b) => ({ value: b.id, label: b.name }))]}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">Type</span>
                  <ObSelect
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                  />
                </label>
              </div>
              <label className="mt-3.5 block">
                <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Stocktake weekend — closes 6 PM Sat"
                  className="h-[44px] w-full rounded-xl border border-neutral-300 px-[13px] text-[13.5px] outline-none transition-colors focus:border-brand-500"
                />
              </label>
              <label className="mt-3.5 block">
                <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">Message</span>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What does the branch need to know?"
                  className="w-full resize-y rounded-xl border border-neutral-300 px-[13px] py-2.5 text-[13.5px] outline-none transition-colors focus:border-brand-500"
                />
              </label>
              <div className="mt-4 flex gap-2.5">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="h-11 cursor-pointer rounded-xl bg-brand-500 px-5 text-[13.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(240,78,23,0.75)] transition-colors hover:bg-brand-600 disabled:bg-[#F5A98A]"
                >
                  {createMutation.isPending ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="h-11 cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 text-[13.5px] font-bold text-neutral-700 transition-colors hover:border-neutral-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="h-10 cursor-pointer rounded-[11px] bg-brand-500 px-4 text-[13px] font-bold text-white shadow-[0_10px_22px_-13px_rgba(240,78,23,0.75)] transition-colors hover:bg-brand-600"
            >
              + New announcement
            </button>
          )}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-neutral-500">Loading announcements…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-[20px] border border-neutral-200 bg-white px-8 py-[52px] text-center">
          <h2 className="text-[21px] font-extrabold tracking-[-0.02em]">No announcements yet</h2>
          <p className="mx-auto mt-2 max-w-[420px] text-[13.5px] leading-normal text-neutral-500">
            {canCreate
              ? 'Post the first one — branch-wide notices land here for every affected person.'
              : 'When your manager or supervisor posts a notice, it lands here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((announcement) => {
            return (
              <article key={announcement.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[#F1EDEA] px-2.5 py-1 text-[11px] font-bold text-neutral-600">
                    {branchName(announcement.branch_id)}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${TYPE_TONES[announcement.announcement_type] ?? TYPE_TONES.general}`}>
                    {TYPE_LABELS[announcement.announcement_type] ?? announcement.announcement_type}
                  </span>
                  {!announcement.is_published ? (
                    <span className="inline-flex items-center rounded-full bg-warning-50 px-2.5 py-1 text-[11px] font-bold text-warning-600">
                      Draft
                    </span>
                  ) : null}
                  <span className="ml-auto text-[11px] text-neutral-400">{timeAgo(announcement.published_at ?? announcement.created_at)}</span>
                </div>
                <h2 className="mt-[11px] text-[15.5px] font-extrabold tracking-[-0.015em] text-neutral-900">{announcement.title}</h2>
                <p className="mt-1.5 text-[13px] leading-normal text-neutral-600">{announcement.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-neutral-100 pt-[11px]">
                  <span className="text-[11.5px] text-neutral-500">
                    {announcement.is_published ? `Published ${timeAgo(announcement.published_at)}` : 'Not published yet'}
                  </span>
                  <span className="ml-auto flex flex-wrap items-center gap-2">
                    {canPublish && !announcement.is_published ? (
                      <button
                        type="button"
                        onClick={() => publishMutation.mutate({ announcementId: announcement.id })}
                        disabled={publishMutation.isPending}
                        className="h-9 cursor-pointer rounded-[10px] bg-success-500 px-[15px] text-[12.5px] font-bold text-white transition-colors hover:bg-success-600 disabled:opacity-60"
                      >
                        Publish
                      </button>
                    ) : null}
                    {canAcknowledge && announcement.is_published ? (
                      <AcknowledgeButton announcementId={announcement.id} onDone={() => refetch()} error={setError} />
                    ) : null}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Per-card acknowledgement state via has_acknowledged_announcement; swaps to a done pill after acknowledging. */
function AcknowledgeButton({
  announcementId,
  onDone,
  error
}: {
  announcementId: string;
  onDone: () => void;
  error: (message: string) => void;
}): React.ReactElement {
  const { data } = useRpcQuery<{ acknowledged: boolean }>('has_acknowledged_announcement', { announcementId });

  const acknowledge = useRpcMutation<{ acknowledged: boolean }, { announcementId: string }>('acknowledge_announcement', {
    // Without this, a successful acknowledge left the button showing
    // "Acknowledge" (not the "Acknowledged" pill) until a full page
    // reload — the mutation's own onDone only refetches the announcements
    // list, never this card's own has_acknowledged_announcement query.
    invalidates: ['has_acknowledged_announcement'],
    onSuccess: onDone,
    onError: (err) => error(err.message)
  });

  if (data?.acknowledged) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-[11px] font-bold text-success-600">
        <Check aria-hidden="true" className="size-3" /> Acknowledged
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => acknowledge.mutate({ announcementId })}
      disabled={acknowledge.isPending}
      className="h-9 cursor-pointer rounded-[10px] border border-neutral-200 bg-white px-3 text-[12.5px] font-bold text-neutral-900 transition-colors hover:border-brand-500 hover:text-brand-deep disabled:opacity-60"
    >
      {acknowledge.isPending ? 'Saving…' : 'Acknowledge'}
    </button>
  );
}
