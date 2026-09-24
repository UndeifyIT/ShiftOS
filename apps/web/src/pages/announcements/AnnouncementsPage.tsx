import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { HandoffModal, ModalField, ModalFields, modalControl, modalSelect } from '../../components/HandoffModal.js';
import { downloadText, toCsv } from '../../lib/spreadsheet.js';
import { useRpcMutation, useRpcQueries, useRpcQuery } from '../../lib/useRpc.js';
import type { Announcement, AnnouncementAcknowledgement, AnnouncementReminderResult, Department, Employee, Member } from '../../types/domain.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { DialogNote, HeaderCta } from '../people/RolePeopleTable.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { avatarTone, initialsOf, TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  ANNOUNCEMENT_FILTERS,
  announcementsSubtitle,
  buildCards,
  countLine,
  filterCards,
  filterReceipts,
  RECEIPT_FILTERS,
  receiptsCsvRows,
  STAFF_FILTERS,
  summarizeReceipts,
  type AnnouncementCard,
  type AnnouncementFilter,
  type ReceiptFilter
} from './announcementsModel.js';

/*
 * Announcements, built to the design handoff (`ShiftOS Dashboards.dc.html`:
 * `PAGES["Manager/Announcements"]`, the shared toolbar at lines 363-376 and
 * "ANNOUNCEMENTS + READ RECEIPTS" at 1214-1284, renderVals 4966-5024).
 * Content managers (announcements.update) get the receipts layout — every card
 * carries its acknowledgement bar and the aside lists who has acknowledged the
 * selected one. Everyone else gets the handoff's Staff layout: one column with
 * an Acknowledge button per card. The prototype has no CSS reset, so the values
 * below are what it renders (13px base, `line-height: normal`).
 */

const BAR: Record<'ok' | 'warn' | 'bad', string> = { ok: '#2E9E62', warn: '#B77714', bad: '#C93A22' };
const pill = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });
const pillClass = 'inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold';

function chipClass(selected: boolean, small: boolean): string {
  return [
    'cursor-pointer border border-solid px-[13px] font-[inherit] font-bold',
    small ? 'h-[30px] rounded-[9px] text-[11.5px]' : 'h-10 rounded-[11px] text-[12.5px]',
    selected ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'
  ].join(' ');
}

function CardShell({ card, selected, children }: { card: AnnouncementCard; selected: boolean; children: React.ReactNode }): React.ReactElement {
  const border = selected ? '#F7C9B2' : card.pinned ? '#F7DFD1' : '#EBE7E3';
  return (
    <article className="rounded-[16px] border border-solid px-[18px] py-[17px]" style={{ borderColor: border, backgroundColor: card.pinned ? '#FEFAF7' : '#fff' }}>
      <div className="flex flex-wrap items-center gap-[9px]">
        <span className={pillClass} style={pill(card.audienceTone)}>
          {card.audience}
        </span>
        {card.pinned ? <span className="inline-flex items-center rounded-full bg-[#FDF0E9] px-2.5 py-1 text-[10.5px] font-extrabold text-[#C6420E]">Pinned</span> : null}
        {card.draft ? <span className={pillClass} style={pill('neutral')}>Draft</span> : null}
        <span className="ml-auto text-[11px] text-[#A79C93]">{card.time}</span>
      </div>
      <h2 className="mb-0 mt-[11px] text-[15.5px] font-extrabold tracking-[-0.015em]">{card.announcement.title}</h2>
      <p className="mb-0 mt-1.5 text-[13px] text-[#57504A] [text-wrap:pretty]">{card.announcement.content}</p>
      <div className="mt-[13px] flex flex-wrap items-center gap-2.5 border-0 border-t border-solid border-[#F2EEEA] pt-[11px]">
        <span className="text-[11.5px] text-[#857A72]">{card.author}</span>
        <span className="ml-auto flex items-center gap-[9px]">{children}</span>
      </div>
    </article>
  );
}

/** Staff layout: acknowledge once; afterwards the handoff's green "Acknowledged ✓". */
function AcknowledgeAction({ acknowledged, busy, onAcknowledge }: { acknowledged: boolean; busy: boolean; onAcknowledge: () => void }): React.ReactElement {
  if (acknowledged) {
    return (
      <span className="inline-flex h-[34px] items-center rounded-[10px] border border-solid border-[#BFE6CF] bg-[#E9F7EF] px-3.5 text-[12px] font-bold text-[#1E6B45]">Acknowledged ✓</span>
    );
  }
  return (
    <button type="button" disabled={busy} onClick={onAcknowledge} className="h-[34px] cursor-pointer rounded-[10px] border-0 bg-[#F04E17] px-3.5 font-[inherit] text-[12px] font-bold text-white disabled:opacity-70">
      {busy ? 'Saving…' : 'Acknowledge'}
    </button>
  );
}

interface NewAnnouncementDraft {
  audience: 'branch' | 'organization';
  title: string;
  content: string;
  pinned: boolean;
}
const EMPTY_DRAFT: NewAnnouncementDraft = { audience: 'branch', title: '', content: '', pinned: false };

export default function AnnouncementsPage(): React.ReactElement {
  const now = useNow();
  const navigate = useNavigate();
  const { hasPermission } = useSession();
  const { toast, show, dismiss } = useScheduleToast();
  const canManage = hasPermission('announcements.update');
  const canCreate = hasPermission('announcements.create');
  const canPublish = hasPermission('announcements.publish');
  const canAcknowledge = hasPermission('announcements.acknowledge');

  const branchId = useDefaultBranchId() ?? '';
  const scoped = branchId ? { branchId } : undefined;
  const announcementsQuery = useRpcQuery<Announcement[]>('list_announcements', scoped);
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: canManage && Boolean(branchId) && hasPermission('employees.read') });
  const { data: departments } = useRpcQuery<Department[]>('list_departments', scoped, { enabled: canManage && Boolean(branchId) && hasPermission('departments.read') });
  const { data: members } = useRpcQuery<Member[]>('list_members', undefined, { enabled: canManage && hasPermission('org.members.manage') });

  const published = useMemo(() => (announcementsQuery.data ?? []).filter((a) => a.is_published && !a.deleted_at), [announcementsQuery.data]);
  const ackQueries = useRpcQueries<AnnouncementAcknowledgement[]>(
    'list_announcement_acknowledgements',
    published.map((a) => ({ announcementId: a.id })),
    { enabled: canManage }
  );
  const acknowledgements = useMemo(() => new Map(published.map((a, index) => [a.id, ackQueries[index]?.data ?? []])), [published, ackQueries]);
  // Staff layout: whether I've acknowledged each one.
  const mineQueries = useRpcQueries<{ acknowledged: boolean }>(
    'has_acknowledged_announcement',
    published.map((a) => ({ announcementId: a.id })),
    { enabled: !canManage && canAcknowledge }
  );
  const mine = new Map(published.map((a, index) => [a.id, Boolean(mineQueries[index]?.data?.acknowledged)]));

  const cards = useMemo(
    () =>
      buildCards({
        announcements: announcementsQuery.data ?? [],
        acknowledgements,
        employees: employees ?? [],
        departments: departments ?? [],
        members: members ?? [],
        now
      }),
    [announcementsQuery.data, acknowledgements, employees, departments, members, now]
  );

  const [filter, setFilter] = useState<AnnouncementFilter>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receiptFilter, setReceiptFilter] = useState<ReceiptFilter>('Everyone');
  const [searchParams] = useSearchParams();
  // `?compose=1` (the overview's Ask ShiftOS "Open announcement form") opens the composer straight away.
  const [composeOpen, setComposeOpen] = useState(() => canCreate && searchParams.get('compose') === '1');
  const [draft, setDraft] = useState<NewAnnouncementDraft>(EMPTY_DRAFT);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [remindOpen, setRemindOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const shown = filterCards(cards, filter, query, canManage ? undefined : (card) => !card.draft && !mine.get(card.announcement.id));
  const postedCards = cards.filter((c) => !c.draft);
  const selected = postedCards.find((c) => c.announcement.id === selectedId) ?? postedCards[0] ?? null;
  const receipts = selected ? filterReceipts(selected.receipts, receiptFilter) : [];
  const summary = summarizeReceipts(selected?.receipts ?? []);

  useEffect(() => {
    if (selectedId && !postedCards.some((c) => c.announcement.id === selectedId)) setSelectedId(null);
  }, [postedCards, selectedId]);

  const publish = useRpcMutation<Announcement, { announcementId: string }>('publish_announcement', {
    invalidates: ['list_announcements'],
    onSuccess: () => show('Announcement posted · receipts tracking'),
    onError: (error) => show(error.message, 'error')
  });
  const create = useRpcMutation<Announcement, { branchId: string | null; title: string; content: string; isPinned: boolean }>('create_announcement', {
    invalidates: ['list_announcements'],
    onSuccess: (created) => {
      setComposeOpen(false);
      setDraft(EMPTY_DRAFT);
      setComposeError(null);
      if (canPublish) publish.mutate({ announcementId: created.id });
      else show('Saved as a draft · a manager will publish it');
    },
    onError: (error) => setComposeError(error.message)
  });
  const acknowledge = useRpcMutation<{ acknowledged: boolean }, { announcementId: string }>('acknowledge_announcement', {
    invalidates: ['has_acknowledged_announcement', 'list_announcement_acknowledgements'],
    onSuccess: () => show('Acknowledged'),
    onError: (error) => show(error.message, 'error')
  });
  const remind = useRpcMutation<AnnouncementReminderResult, { announcementId: string }>('remind_announcement', {
    onSuccess: (result) => {
      setRemindOpen(false);
      show(
        result.reminded
          ? `Reminder sent to ${result.reminded} ${result.reminded === 1 ? 'person' : 'people'}${result.undelivered ? ` · ${result.undelivered} undelivered` : ''}`
          : 'Nobody left to remind'
      );
    },
    onError: (error) => show(error.message, 'error')
  });

  const submitDraft = (): void => {
    if (!draft.title.trim() || !draft.content.trim()) {
      setComposeError('Add a title and a message first.');
      return;
    }
    create.mutate({
      branchId: draft.audience === 'branch' && branchId ? branchId : null,
      title: draft.title.trim(),
      content: draft.content.trim(),
      isPinned: draft.pinned
    });
  };

  const exportReceipts = (): void => {
    if (!selected) return;
    downloadText(`shiftos-receipts-${selected.announcement.id.slice(0, 8)}.csv`, toCsv(receiptsCsvRows(selected.announcement.title, receipts)));
    setExportOpen(false);
    show('Export ready · downloading');
  };

  const openCompose = (): void => {
    setComposeError(null);
    setComposeOpen(true);
  };

  const myAwaiting = published.filter((a) => !mine.get(a.id)).length;
  const subtitle = canManage
    ? announcementsSubtitle(cards)
    : !canAcknowledge
      ? countLine(cards.length)
      : myAwaiting
        ? `${myAwaiting} ${myAwaiting === 1 ? 'notice needs' : 'notices need'} your acknowledgement`
        : 'You’re up to date';

  const body = (): React.ReactNode => {
    if (announcementsQuery.isLoading) return <OverviewLoading title="Announcements" />;
    if (cards.length === 0) {
      return (
        <OverviewEmpty
          title={canCreate ? 'No announcements yet' : 'Nothing to read'}
          body={
            canCreate
              ? 'Post operational updates here instead of the WhatsApp group — and see exactly who has read them.'
              : 'Notices from your manager and supervisor appear here.'
          }
          cta={canCreate ? { label: 'Post announcement', onClick: openCompose } : { label: 'Back to my shift', onClick: () => navigate('/') }}
          secondary={null}
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
              className="box-border h-10 w-full rounded-[11px] border border-solid border-[#E4DED9] bg-white px-[13px] font-[inherit] text-[13px] text-[#38312B] outline-none placeholder:text-[#757575] focus:border-[#F04E17]"
            />
          </label>
          {(canManage ? ANNOUNCEMENT_FILTERS : STAFF_FILTERS).map((name) => (
            <button key={name} type="button" aria-pressed={filter === name} onClick={() => setFilter(name)} className={chipClass(filter === name, false)}>
              {name}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-[#A79C93]">{countLine(shown.length)}</span>
        </div>

        <div className={canManage ? 'flex flex-wrap items-start gap-4' : 'flex flex-col gap-4'}>
          <div className={canManage ? 'flex min-w-0 flex-[1.5_1_400px] flex-col gap-3' : 'flex min-w-0 flex-col gap-3'}>
            {shown.length === 0 ? (
              <p className="m-0 rounded-[16px] border border-solid border-[#EBE7E3] bg-white px-[18px] py-8 text-center text-[12.5px] text-[#857A72]">No announcements match this filter.</p>
            ) : null}
            {shown.map((card) => {
              const id = card.announcement.id;
              const isSelected = canManage && selected?.announcement.id === id;
              return (
                <CardShell key={id} card={card} selected={isSelected}>
                  {card.draft ? (
                    canPublish ? (
                      <button
                        type="button"
                        disabled={publish.isPending}
                        onClick={() => publish.mutate({ announcementId: id })}
                        className="h-[30px] cursor-pointer rounded-[9px] border-0 bg-[#F04E17] px-[11px] font-[inherit] text-[11.5px] font-bold text-white disabled:opacity-70"
                      >
                        Publish
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-[#857A72]">Not published yet</span>
                    )
                  ) : canManage ? (
                    <>
                      <span className="h-1.5 w-[104px] overflow-hidden rounded-full bg-[#F2EEEA]">
                        <span className="block h-full rounded-full" style={{ width: `${card.pct}%`, backgroundColor: BAR[card.barColor] }} />
                      </span>
                      <span className="text-[11px] font-bold text-[#857A72]">
                        {card.acknowledged} of {card.receipts.length} acknowledged
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(id);
                          setReceiptFilter('Everyone');
                        }}
                        className={[
                          'h-[30px] cursor-pointer rounded-[9px] border border-solid px-[11px] font-[inherit] text-[11.5px] font-bold',
                          isSelected ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'
                        ].join(' ')}
                      >
                        {isSelected ? 'Viewing' : 'Receipts'}
                      </button>
                    </>
                  ) : canAcknowledge ? (
                    <AcknowledgeAction
                      acknowledged={Boolean(mine.get(id))}
                      busy={acknowledge.isPending && acknowledge.variables?.announcementId === id}
                      onAcknowledge={() => acknowledge.mutate({ announcementId: id })}
                    />
                  ) : null}
                </CardShell>
              );
            })}
          </div>

          {/* 302px: the handoff's 300px basis is content-box (no CSS reset), so its 1px borders sit outside it. */}
          {canManage && selected ? (
            <aside className="min-w-0 flex-[1_1_302px] overflow-hidden rounded-[16px] border border-solid border-[#EBE7E3] bg-white">
              <div className="border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-4">
                <p className="m-0 text-[10.5px] font-extrabold uppercase tracking-[.1em] text-[#A79C93]">Acknowledgement receipts</p>
                <h2 className="mb-0 mt-[7px] text-[14.5px] font-extrabold tracking-normal [text-wrap:pretty]">{selected.announcement.title}</h2>
                <div className="mt-3 flex items-center gap-2.5">
                  <span className="h-[7px] flex-auto overflow-hidden rounded-full bg-[#F2EEEA]">
                    <span className="block h-full rounded-full" style={{ width: `${summary.pct}%`, backgroundColor: summary.complete ? BAR.ok : BAR.warn }} />
                  </span>
                  <span className="text-[12px] font-extrabold">{summary.pct}%</span>
                </div>
                <p className="mb-0 mt-2 text-[11.5px] text-[#857A72]">{summary.summary}</p>
                <div className="mt-3 flex flex-wrap gap-[5px]">
                  {RECEIPT_FILTERS.map((name) => (
                    <button key={name} type="button" aria-pressed={receiptFilter === name} onClick={() => setReceiptFilter(name)} className={chipClass(receiptFilter === name, true)}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {receipts.map((receipt) => (
                  <div key={receipt.employeeId} className="flex items-center gap-2.5 border-0 border-b border-solid border-[#F7F4F1] px-[18px] py-[11px]">
                    <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(receipt.name)}>
                      {initialsOf(receipt.name)}
                    </span>
                    <span className="min-w-0 flex-auto">
                      <span className="block truncate text-[12.5px] font-bold">{receipt.name}</span>
                      <span className="block truncate text-[11px] text-[#A79C93]">{receipt.meta}</span>
                    </span>
                    <span className={pillClass} style={pill(receipt.tone)}>
                      {receipt.status}
                    </span>
                  </div>
                ))}
                {receipts.length === 0 ? <p className="m-0 px-[18px] py-[26px] text-center text-[12.5px] text-[#857A72]">Nobody in this filter.</p> : null}
              </div>
              <div className="flex flex-wrap gap-2 border-0 border-t border-solid border-[#F2EEEA] px-[18px] py-[13px]">
                <button
                  type="button"
                  disabled={summary.outstanding === 0}
                  onClick={() => setRemindOpen(true)}
                  className="h-9 flex-auto cursor-pointer rounded-[10px] border-0 bg-[#F04E17] font-[inherit] text-[12px] font-bold text-white disabled:cursor-default disabled:opacity-60"
                >
                  {summary.remindLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  className="h-9 cursor-pointer rounded-[10px] border border-solid border-[#EBE7E3] bg-white px-3 font-[inherit] text-[12px] font-bold text-black"
                >
                  Export
                </button>
              </div>
            </aside>
          ) : null}
        </div>
      </>
    );
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title="Announcements" subtitle={subtitle} now={now} actions={canCreate && cards.length ? <HeaderCta label="New announcement" onClick={openCompose} /> : null} />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>

      <HandoffModal
        open={composeOpen}
        title="New announcement"
        subtitle="Replaces the branch WhatsApp group — with read receipts."
        primary={create.isPending || publish.isPending ? 'Posting…' : canPublish ? 'Post announcement' : 'Save draft'}
        primaryDisabled={create.isPending || publish.isPending}
        onPrimary={submitDraft}
        onClose={() => setComposeOpen(false)}
      >
        <ModalFields>
          <ModalField label="Audience" required>
            <select className={modalSelect} value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value as NewAnnouncementDraft['audience'] })}>
              {branchId ? <option value="branch">Whole branch</option> : null}
              <option value="organization">Whole organization</option>
            </select>
          </ModalField>
          <ModalField label="Title" required>
            <input className={modalControl} value={draft.title} maxLength={140} placeholder="e.g. Stocktake this Saturday" onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </ModalField>
          <ModalField label="Message" required full>
            <textarea
              className={`${modalControl} h-auto min-h-[96px] resize-y py-2.5 leading-[1.5]`}
              value={draft.content}
              placeholder="What does the team need to know?"
              onChange={(event) => setDraft({ ...draft, content: event.target.value })}
            />
          </ModalField>
          <ModalField label="Pin to top">
            <select className={modalSelect} value={draft.pinned ? 'yes' : 'no'} onChange={(event) => setDraft({ ...draft, pinned: event.target.value === 'yes' })}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </ModalField>
        </ModalFields>
        {composeError ? <p className="mx-[22px] mb-0 mt-3 text-[12.5px] font-bold text-[#C93A22]">{composeError}</p> : null}
      </HandoffModal>

      <HandoffModal
        open={remindOpen}
        title="Remind outstanding recipients?"
        subtitle={selected?.announcement.title ?? ''}
        primary={remind.isPending ? 'Sending…' : 'Send reminder'}
        primaryDisabled={remind.isPending || !selected}
        onPrimary={() => selected && remind.mutate({ announcementId: selected.announcement.id })}
        onClose={() => setRemindOpen(false)}
      >
        <DialogNote>
          Only people who haven&apos;t acknowledged it get the reminder, in ShiftOS. Anyone with no ShiftOS login is listed as undelivered and won&apos;t receive anything.
        </DialogNote>
      </HandoffModal>

      <HandoffModal open={exportOpen} title="Export" subtitle="Choose a format and range." primary="Export" primaryDisabled={!selected} onPrimary={exportReceipts} onClose={() => setExportOpen(false)}>
        <ModalFields>
          <ModalField label="Format" required>
            <input className={modalControl} value="CSV" readOnly />
          </ModalField>
          <ModalField label="Announcement" required>
            <input className={modalControl} value={selected?.announcement.title ?? ''} readOnly />
          </ModalField>
          <ModalField label="Include">
            <input className={modalControl} value={receiptFilter === 'Everyone' ? 'Everyone' : receiptFilter} readOnly />
          </ModalField>
        </ModalFields>
      </HandoffModal>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
