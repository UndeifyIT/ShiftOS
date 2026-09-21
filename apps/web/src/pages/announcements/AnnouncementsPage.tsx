import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { HandoffModal, ModalField, ModalFields, modalControl } from '../../components/HandoffModal.js';
import { useRpcMutation } from '../../lib/useRpc.js';
import type { Announcement } from '../../types/domain.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { HeaderCta } from '../people/RolePeopleTable.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { avatarTone, initialsOf, TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  ANNOUNCEMENT_FILTERS,
  announcementsCount,
  announcementsSubtitle,
  buildReceipts,
  filterCards,
  filterReceipts,
  RECEIPT_FILTERS,
  receiptSummary,
  type AnnouncementCard,
  type AnnouncementFilter,
  type ReceiptFilter
} from './announcementsModel.js';
import { useAnnouncements } from './useAnnouncements.js';

/*
 * WEB-012 — the Manager's Announcements screen, built to the design handoff
 * (`ShiftOS Dashboards.dc.html`: `PAGES["Manager/Announcements"]`, the shared
 * toolbar at markup lines 363-376 and the `kindAnnouncements` block at
 * 1215-1283): the posts on the left, each with its audience, acknowledgement
 * bar and Receipts button, and the receipts panel for the selected one on the
 * right. Sizes are the prototype's rendered ones.
 */

const pillStyle = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });

function NewAnnouncementModal({
  open,
  branchName,
  canPostOrgWide,
  onClose,
  onPost,
  pending
}: {
  open: boolean;
  branchName: string;
  canPostOrgWide: boolean;
  onClose: () => void;
  onPost: (input: { orgWide: boolean; title: string; content: string; requiresAcknowledgement: boolean; isPinned: boolean }) => void;
  pending: boolean;
}): React.ReactElement {
  const [orgWide, setOrgWide] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (): void => {
    if (!title.trim()) {
      setError('Give the announcement a title');
      return;
    }
    if (!content.trim()) {
      setError('Write the message');
      return;
    }
    setError(null);
    onPost({ orgWide, title: title.trim(), content: content.trim(), requiresAcknowledgement, isPinned });
  };

  return (
    <HandoffModal
      open={open}
      title="New announcement"
      subtitle="Replaces the branch WhatsApp group — with read receipts."
      primary={pending ? 'Posting…' : 'Post announcement'}
      primaryDisabled={pending}
      onPrimary={submit}
      onClose={() => {
        setError(null);
        onClose();
      }}
    >
      <ModalFields>
        <ModalField label="Audience" required full>
          <select
            value={orgWide ? 'organization' : 'branch'}
            aria-label="Audience"
            onChange={(event) => setOrgWide(event.target.value === 'organization')}
            className={`${modalControl} cursor-pointer`}
          >
            <option value="branch">{`Whole branch · ${branchName}`}</option>
            {canPostOrgWide ? <option value="organization">Whole organization · every branch</option> : null}
          </select>
        </ModalField>
        <ModalField label="Title" required full>
          <input value={title} aria-label="Title" placeholder="e.g. Stocktake this Saturday" onChange={(event) => setTitle(event.target.value)} className={modalControl} />
        </ModalField>
        <ModalField label="Message" required full>
          <textarea
            value={content}
            aria-label="Message"
            rows={4}
            placeholder="What does the team need to know?"
            onChange={(event) => setContent(event.target.value)}
            className={`${modalControl} h-auto resize-y py-2.5 leading-[1.5]`}
          />
        </ModalField>
        <ModalField label="Require acknowledgement">
          <select
            value={requiresAcknowledgement ? 'yes' : 'no'}
            aria-label="Require acknowledgement"
            onChange={(event) => setRequiresAcknowledgement(event.target.value === 'yes')}
            className={`${modalControl} cursor-pointer`}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </ModalField>
        <ModalField label="Pin to top">
          <select value={isPinned ? 'yes' : 'no'} aria-label="Pin to top" onChange={(event) => setIsPinned(event.target.value === 'yes')} className={`${modalControl} cursor-pointer`}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </ModalField>
      </ModalFields>
      <p className="mx-[22px] mb-0 mt-3.5 rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] p-3.5 text-[12.5px] leading-[1.55] text-[#57504A]">
        Posting publishes it straight away. Asking for acknowledgement is what fills the receipts panel — you can see who has replied and nudge the rest.
      </p>
      {error ? <p className="mx-[22px] mb-0 mt-2.5 text-[12px] font-semibold text-[#C93A22]">{error}</p> : null}
    </HandoffModal>
  );
}

/** One post (handoff markup lines 1219-1243). */
function Card({
  card,
  selected,
  showReceipts,
  onSelect,
  onUnpin
}: {
  card: AnnouncementCard;
  selected: boolean;
  showReceipts: boolean;
  onSelect: () => void;
  onUnpin: (() => void) | null;
}): React.ReactElement {
  const border = selected && showReceipts ? '#F7C9B2' : card.pinned ? '#F7DFD1' : '#EBE7E3';
  return (
    <article className="rounded-[16px] border border-solid px-[18px] py-[17px]" style={{ borderColor: border, background: card.pinned ? '#FEFAF7' : '#fff' }}>
      <div className="flex flex-wrap items-center gap-[9px]">
        <span className="inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold" style={pillStyle(card.tone)}>
          {card.audience}
        </span>
        {card.pinned ? (
          onUnpin ? (
            <button
              type="button"
              onClick={onUnpin}
              title="Unpin this announcement"
              aria-label={`Unpin ${card.title}`}
              className="inline-flex cursor-pointer items-center rounded-full border-0 bg-[#FDF0E9] px-2.5 py-1 text-[10.5px] font-extrabold text-[#C6420E]"
            >
              Pinned
            </button>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[#FDF0E9] px-2.5 py-1 text-[10.5px] font-extrabold text-[#C6420E]">Pinned</span>
          )
        ) : null}
        {card.published ? null : (
          <span className="inline-flex items-center rounded-full bg-[#F4F1EE] px-2.5 py-1 text-[10.5px] font-extrabold text-[#857A72]">Draft</span>
        )}
        <span className="ml-auto text-[11px] text-[#A79C93]">{card.time}</span>
      </div>
      <h2 className="mb-0 mt-[11px] text-[15.5px] font-extrabold tracking-[-0.015em]">{card.title}</h2>
      <p className="mb-0 mt-1.5 text-[13px] text-[#57504A] [text-wrap:pretty]">{card.body}</p>
      <div className="mt-[13px] flex flex-wrap items-center gap-2.5 border-t border-solid border-[#F2EEEA] pt-[11px]">
        <span className="text-[11.5px] text-[#857A72]">{card.author}</span>
        <span className="ml-auto flex items-center gap-[9px]">
          {card.requiresAcknowledgement ? (
            <>
              <span className="h-1.5 w-[104px] overflow-hidden rounded-full bg-[#F2EEEA]">
                <span className="block h-full rounded-full" style={{ width: `${card.percent}%`, background: card.percent === 100 ? TONES.ok[0] : TONES.warn[0] }} />
              </span>
              <span className="text-[11px] font-bold text-[#857A72]">{card.ackLabel}</span>
            </>
          ) : (
            <span className="text-[11px] font-bold text-[#A79C93]">No acknowledgement asked</span>
          )}
          <button
            type="button"
            onClick={onSelect}
            className={[
              'h-[30px] cursor-pointer rounded-[9px] border border-solid px-[11px] text-[11.5px] font-bold',
              selected ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'
            ].join(' ')}
          >
            {selected ? 'Viewing' : 'Receipts'}
          </button>
        </span>
      </div>
    </article>
  );
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export default function AnnouncementsPage(): React.ReactElement {
  const now = useNow();
  const navigate = useNavigate();
  const { toast, show, dismiss } = useScheduleToast();
  const { hasPermission } = useSession();
  const canRead = hasPermission('announcements.read');
  const canCreate = hasPermission('announcements.create') && hasPermission('announcements.publish');
  const canUpdate = hasPermission('announcements.update');

  const { loading, branchId, branchName, cards, receiptsById, departments } = useAnnouncements(now);

  const [filter, setFilter] = useState<AnnouncementFilter>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receiptFilter, setReceiptFilter] = useState<ReceiptFilter>('Everyone');
  const [composeOpen, setComposeOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);

  const create = useRpcMutation<Announcement, Record<string, unknown>>('create_announcement', { invalidates: ['list_announcements'] });
  const publish = useRpcMutation<Announcement, { announcementId: string }>('publish_announcement', { invalidates: ['list_announcements'] });
  const update = useRpcMutation<Announcement, Record<string, unknown>>('update_announcement', { invalidates: ['list_announcements'] });
  const remind = useRpcMutation<{ reminded: number; unreachable: number }, { announcementId: string }>('remind_announcement', { invalidates: [] });

  const shown = filterCards(cards, filter, query);
  const selected = cards.find((card) => card.id === selectedId) ?? shown[0] ?? cards[0] ?? null;
  const receipts = useMemo(
    () => (selected ? buildReceipts(receiptsById.get(selected.id) ?? [], departments, now) : []),
    [selected, receiptsById, departments, now]
  );
  const visibleReceipts = filterReceipts(receipts, receiptFilter);
  const summary = receiptSummary(receipts);

  if (!canRead) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const post = async (input: { orgWide: boolean; title: string; content: string; requiresAcknowledgement: boolean; isPinned: boolean }): Promise<void> => {
    try {
      const announcement = await create.mutateAsync({
        branchId: input.orgWide ? null : branchId,
        title: input.title,
        content: input.content,
        announcementType: 'operational',
        requiresAcknowledgement: input.requiresAcknowledgement,
        isPinned: input.isPinned
      });
      await publish.mutateAsync({ announcementId: announcement.id });
      setComposeOpen(false);
      setSelectedId(announcement.id);
      show('Announcement posted');
    } catch (problem) {
      show(problem instanceof Error ? problem.message : 'Could not post the announcement');
    }
  };

  const unpin = (card: AnnouncementCard) => () => {
    update
      .mutateAsync({ announcementId: card.id, isPinned: false })
      .then(() => show(`${card.title} unpinned`))
      .catch((problem: unknown) => show(problem instanceof Error ? problem.message : 'Could not unpin it'));
  };

  const sendReminder = (): void => {
    if (!selected) return;
    remind
      .mutateAsync({ announcementId: selected.id })
      .then((result) => {
        setRemindOpen(false);
        show(
          result.unreachable
            ? `Reminded ${result.reminded} · ${result.unreachable} had no ShiftOS login`
            : `Reminded ${result.reminded} ${result.reminded === 1 ? 'person' : 'people'}`
        );
      })
      .catch((problem: unknown) => show(problem instanceof Error ? problem.message : 'Could not send the reminder'));
  };

  const exportCsv = (): void => {
    if (!selected) return;
    const lines = [
      ['Name', 'Detail', 'Status'].join(','),
      ...receipts.map((receipt) => [receipt.name, receipt.meta, receipt.status].map(csvEscape).join(','))
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipts-${selected.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    show(`${receipts.length} ${receipts.length === 1 ? 'row' : 'rows'} exported`);
  };

  const body = (): React.ReactNode => {
    if (loading) return <OverviewLoading />;
    if (cards.length === 0) {
      return (
        <OverviewEmpty
          title="No announcements yet"
          body="Post operational updates here instead of the WhatsApp group — and see exactly who has read them."
          cta={canCreate ? { label: 'Post announcement', onClick: () => setComposeOpen(true) } : null}
          secondary={{ label: 'Learn more', onClick: () => navigate('/recent-activity') }}
        />
      );
    }

    return (
      <>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="block min-w-[190px] flex-[1_1_240px]">
            <span className="sr-only">Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search announcements"
              className="box-border h-10 w-full rounded-[11px] border border-solid border-[#E4DED9] bg-white px-[13px] text-[13px] text-[#38312B] outline-none focus:border-[#F04E17]"
            />
          </label>
          {ANNOUNCEMENT_FILTERS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={filter === name}
              onClick={() => setFilter(name)}
              className={[
                'h-10 cursor-pointer rounded-[11px] border border-solid px-[13px] text-[12.5px] font-bold',
                filter === name ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'
              ].join(' ')}
            >
              {name}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-[#A79C93]">{announcementsCount(shown, filter)}</span>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[1.5_1_400px] flex-col gap-3">
            {shown.map((card) => (
              <Card
                key={card.id}
                card={card}
                selected={selected?.id === card.id}
                showReceipts
                onSelect={() => {
                  setSelectedId(card.id);
                  setReceiptFilter('Everyone');
                }}
                onUnpin={canUpdate ? unpin(card) : null}
              />
            ))}
            {shown.length === 0 ? (
              <p className="m-0 rounded-[16px] border border-dashed border-[#E4DED9] px-[18px] py-[26px] text-center text-[12.5px] text-[#857A72]">
                No announcements match this search.
              </p>
            ) : null}
          </div>

          <aside className="min-w-0 flex-[1_1_300px] overflow-hidden rounded-[16px] border border-solid border-[#EBE7E3] bg-white">
            <div className="border-b border-solid border-[#F2EEEA] px-[18px] py-4">
              <p className="m-0 text-[10.5px] font-extrabold uppercase tracking-[.1em] text-[#A79C93]">Acknowledgement receipts</p>
              <h2 className="mb-0 mt-[7px] text-[14.5px] font-extrabold tracking-normal [text-wrap:pretty]">{selected?.title ?? 'Nothing selected'}</h2>
              <div className="mt-3 flex items-center gap-2.5">
                <span className="h-[7px] flex-auto overflow-hidden rounded-full bg-[#F2EEEA]">
                  <span className="block h-full rounded-full" style={{ width: `${summary.percent}%`, background: summary.complete ? TONES.ok[0] : TONES.warn[0] }} />
                </span>
                <span className="text-[12px] font-extrabold">{summary.percentLabel}</span>
              </div>
              <p className="mb-0 mt-2 text-[11.5px] text-[#857A72]">{summary.summary}</p>
              <div className="mt-3 flex flex-wrap gap-[5px]">
                {RECEIPT_FILTERS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={receiptFilter === name}
                    onClick={() => setReceiptFilter(name)}
                    className={[
                      'h-[30px] cursor-pointer rounded-[9px] border border-solid px-[13px] text-[11.5px] font-bold',
                      receiptFilter === name ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'
                    ].join(' ')}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {visibleReceipts.map((receipt) => (
                <div key={receipt.employeeId} className="flex items-center gap-2.5 border-b border-solid border-[#F7F4F1] px-[18px] py-[11px]">
                  <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(receipt.name)}>
                    {initialsOf(receipt.name)}
                  </span>
                  <span className="min-w-0 flex-auto">
                    <span className="block truncate text-[12.5px] font-bold">{receipt.name}</span>
                    <span className="block truncate text-[11px] text-[#A79C93]">{receipt.meta}</span>
                  </span>
                  <span className="inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold" style={pillStyle(receipt.tone)}>
                    {receipt.status}
                  </span>
                </div>
              ))}
              {visibleReceipts.length === 0 ? <p className="m-0 px-[18px] py-[26px] text-center text-[12.5px] text-[#857A72]">Nobody in this filter.</p> : null}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-solid border-[#F2EEEA] px-[18px] py-[13px]">
              <button
                type="button"
                onClick={() => setRemindOpen(true)}
                disabled={!canUpdate || summary.outstanding === 0}
                className="h-9 flex-auto cursor-pointer rounded-[10px] border-0 bg-[#F04E17] text-[12px] font-bold text-white disabled:cursor-default disabled:opacity-60"
              >
                {summary.outstanding === 0 ? 'Everyone has acknowledged' : summary.remindLabel}
              </button>
              <button type="button" onClick={exportCsv} className="h-9 cursor-pointer rounded-[10px] border border-solid border-[#EBE7E3] bg-white px-3 text-[12px] font-bold text-black">
                Export
              </button>
            </div>
          </aside>
        </div>
      </>
    );
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader
        title="Announcements"
        subtitle={announcementsSubtitle(cards)}
        now={now}
        actions={canCreate && cards.length > 0 ? <HeaderCta label="New announcement" onClick={() => setComposeOpen(true)} /> : null}
      />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>

      <NewAnnouncementModal
        open={composeOpen}
        branchName={branchName}
        canPostOrgWide={hasPermission('organizations.read')}
        pending={create.isPending || publish.isPending}
        onClose={() => setComposeOpen(false)}
        onPost={(input) => void post(input)}
      />

      <HandoffModal
        open={remindOpen}
        title="Remind outstanding recipients?"
        subtitle={selected?.title ?? ''}
        primary={remind.isPending ? 'Sending…' : 'Send reminder'}
        primaryDisabled={remind.isPending}
        onPrimary={sendReminder}
        onClose={() => setRemindOpen(false)}
      >
        <p className="mx-[22px] mb-0 mt-[18px] rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] p-3.5 text-[12.5px] leading-[1.55] text-[#57504A]">
          Only the {summary.outstanding} {summary.outstanding === 1 ? 'person who has' : 'people who have'} not acknowledged it get a reminder. It arrives
          in ShiftOS — anyone without a login is reported back rather than counted as reached.
        </p>
      </HandoffModal>

      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
