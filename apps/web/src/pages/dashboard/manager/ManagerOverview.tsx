import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoMark from '../../../assets/logo-mark.png';
import shiftyGuide from '../../../assets/shifty-guide.png';
import { ScheduleIcon } from '../../scheduling/grid/ScheduleIcon.js';
import { ScheduleToast, useScheduleToast } from '../../scheduling/grid/ScheduleToast.js';
import { avatarTone, initialsOf, TONES, type Tone } from '../../scheduling/grid/scheduleFormat.js';
import { answerQuestion, ASK_CHIPS, ASK_HINTS, type AskAnswer } from './askShiftOS.js';
import { clock12, pillDate, TONE_FG, type ManagerOverview as Overview } from './overviewModel.js';

/*
 * Markup and sizes are the handoff's own (`ShiftOS Dashboards.dc.html`,
 * "OVERVIEW (role home)", lines 92-360). The prototype has no CSS reset, so
 * every value below is what it renders — 13px base, `line-height: normal`,
 * content-box circles — not a Tailwind approximation.
 */

export const pillStyle = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });

export function Pill({ tone, style, children }: { tone?: Tone; style?: React.CSSProperties; children: React.ReactNode }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold" style={style ?? pillStyle(tone ?? 'neutral')}>
      {children}
    </span>
  );
}

export const linkButton = 'cursor-pointer border-0 bg-transparent p-0 text-[12px] font-bold text-[#C6420E] hover:text-[#F04E17]';
export const card = 'rounded-[16px] border border-solid border-[#EBE7E3] bg-white';

/** The handoff's page header (title, subtitle, date/time pill) — shared by the overview and the pages it links to. */
export function OverviewHeader({
  title = 'Branch overview',
  subtitle,
  now,
  actions
}: {
  title?: string;
  subtitle: string;
  now: Date;
  /** The page's own header buttons (handoff pageSecondary / pageCta), shown before the date pill. */
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <header className="flex flex-wrap items-start gap-4 border-b border-solid border-[#F2EEEA] bg-white px-7 pb-[18px] pt-[22px] max-[859px]:gap-2.5 max-[859px]:px-4 max-[859px]:pb-3 max-[859px]:pt-4">
      <div className="min-w-0 flex-[1_1_100%]">
        <h1 className="m-0 text-[25px] font-extrabold leading-[1.15] tracking-[-0.025em]">{title}</h1>
        <p className="mb-0 mt-[5px] text-[13px] text-[#857A72]">{subtitle}</p>
      </div>
      <div className="flex min-w-0 flex-[1_1_100%] flex-wrap items-center justify-end gap-2.5">
        {actions}
        <div className="flex flex-none items-center gap-2.5 rounded-[12px] border border-solid border-[#EBE7E3] px-3 py-[7px]">
          <span className="leading-[1.2]">
            <span className="block text-[10.5px] text-[#A79C93]">{pillDate(now)}</span>
            <span className="block text-[14px] font-extrabold">{clock12(now)}</span>
          </span>
        </div>
      </div>
    </header>
  );
}

function ShiftyCard({ onOpen, onDismiss }: { onOpen: () => void; onDismiss: () => void }): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[16px] border border-solid border-[#F7DFD1] bg-[#FEF7F2] px-[18px] py-[14px]">
      <span className="flex size-11 flex-none items-end justify-center overflow-hidden rounded-full bg-[#FDF0E9]">
        <img src={shiftyGuide} alt="Shifty, the ShiftOS assistant" className="block h-auto w-[104%] max-w-none" />
      </span>
      <div className="min-w-0 flex-[1_1_260px]">
        <p className="m-0 text-[13px] font-extrabold">Shifty · Next week&apos;s schedule isn&apos;t published yet</p>
        <p className="mb-0 mt-[3px] text-[12.5px] text-[#857A72]">Publishing by Sunday gives your team time to see their shifts and raise swaps.</p>
      </div>
      <button type="button" onClick={onOpen} className="h-9 cursor-pointer rounded-[10px] border-0 bg-[#F04E17] px-[15px] text-[12.5px] font-bold text-white">
        Open scheduling
      </button>
      <button type="button" aria-label="Dismiss Shifty guidance" onClick={onDismiss} className="cursor-pointer border-0 bg-transparent p-1.5 text-[15px] text-[#A79C93]">
        ✕
      </button>
    </div>
  );
}

/** Handoff typeStep(): types a hint, holds, erases three characters a tick, moves on — every 110ms. */
function useTypedHint(active: boolean, hints: string[]): React.RefObject<HTMLSpanElement> {
  const ref = useRef<HTMLSpanElement>(null);
  const state = useRef({ i: 0, c: 0, back: false, hold: 0 });
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      const node = ref.current;
      if (!node || document.hidden) return;
      const t = state.current;
      const current = hints[t.i % hints.length];
      if (t.hold > 0) {
        t.hold -= 1;
        return;
      }
      if (!t.back) {
        t.c += 1;
        if (t.c >= current.length) {
          t.back = true;
          t.hold = 16;
        }
      } else {
        t.c -= 3;
        if (t.c <= 0) {
          t.c = 0;
          t.back = false;
          t.hold = 3;
          t.i += 1;
        }
      }
      node.textContent = current.slice(0, Math.max(0, t.c));
    }, 110);
    return () => window.clearInterval(timer);
  }, [active, hints]);
  return ref;
}

/** The dark Ask ShiftOS card — the Manager's chips and answers by default; the Supervisor passes its own. */
export function AskShiftOSCard({
  overview,
  now,
  onToast,
  chips = ASK_CHIPS,
  hints = ASK_HINTS,
  answer: answerFor = answerQuestion
}: {
  overview: Overview;
  now: Date;
  onToast: (text: string) => void;
  chips?: string[];
  hints?: string[];
  answer?: (question: string, overview: Overview, now: Date) => AskAnswer;
}): React.ReactElement {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [asked, setAsked] = useState<string | null>(null);
  const answer = asked ? answerFor(asked, overview, now) : null;
  const typedRef = useTypedHint(!query && !asked, hints);

  const run = (question: string): void => {
    const trimmed = question.trim();
    if (!trimmed) {
      onToast('Type a question, or tap one of the suggestions');
      return;
    }
    setQuery(trimmed);
    setAsked(trimmed);
  };

  return (
    <section className="rounded-[20px] bg-[#231E1A] px-[22px] pb-[17px] pt-5 text-white shadow-[0_26px_54px_-32px_rgba(35,30,26,.75)]">
      <div className="flex flex-wrap items-center gap-[11px]">
        <span className="flex size-9 flex-none items-center justify-center overflow-hidden rounded-[12px] bg-white">
          <img src={logoMark} alt="" className="block h-[21px] w-auto" />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-[15.5px] font-extrabold tracking-[-0.015em]">Ask ShiftOS</p>
          <p className="mb-0 mt-0.5 text-[11.5px] text-[#B4A8A0]">Your branch, answered in plain language — or say what you want done.</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[rgba(240,78,23,.2)] px-2.5 py-[5px] text-[9.5px] font-extrabold uppercase tracking-[.1em] text-[#FFB08C]">
          Beta
        </span>
      </div>

      <div className="relative mt-[15px] flex flex-wrap items-center gap-2 rounded-[14px] border border-solid border-[#3B322C] bg-[#1A1613] py-[7px] pl-[15px] pr-2">
        {!query && !asked ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 max-w-[calc(100%-130px)] -translate-y-1/2 overflow-hidden whitespace-nowrap text-[14px] text-[#8B7F77]"
          >
            <span ref={typedRef} />
            <span className="animate-shiftos-caret text-[#F04E17]">▌</span>
          </span>
        ) : null}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              run(query);
            }
          }}
          aria-label="Ask ShiftOS"
          className="relative h-[42px] min-w-0 flex-[1_1_240px] border-0 bg-transparent px-0.5 py-px text-[14px] text-white outline-none"
        />
        <button type="button" onClick={() => run(query)} className="h-10 cursor-pointer rounded-[11px] border-0 bg-[#F04E17] px-[19px] text-[13px] font-bold text-white hover:bg-[#DC4611]">
          Ask
        </button>
      </div>

      <div className="mt-[11px] flex flex-wrap gap-[7px]">
        {chips.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => run(label)}
            className="h-8 cursor-pointer rounded-full border border-solid border-[#3B322C] bg-transparent px-[13px] text-[11.5px] font-bold text-[#DED5CF] hover:border-[#F04E17] hover:text-white"
          >
            {label}
          </button>
        ))}
      </div>

      {answer ? (
        <div className="mt-3.5 rounded-[16px] bg-white px-[17px] pb-[15px] pt-4 text-[#38312B]">
          <div className="flex flex-wrap items-center gap-[9px]">
            <Pill style={answer.kind === 'action' ? pillStyle('primary') : { color: '#2E9E62', backgroundColor: '#E8F5EE' }}>
              {answer.kind === 'action' ? 'Action' : 'Read-only answer'}
            </Pill>
            <p className="m-0 text-[12px] font-bold text-[#857A72]">{answer.label}</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setAsked(null);
              }}
              className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-bold text-[#A79C93]"
            >
              Clear
            </button>
          </div>
          <p className="mb-0 mt-[9px] text-[29px] font-extrabold leading-[1.1] tracking-[-0.03em] [text-wrap:pretty]">{answer.value}</p>
          <p className="mb-0 mt-[5px] text-[12.5px] text-[#857A72]">{answer.sub}</p>
          <ul className="mb-0 mt-[13px] flex list-none flex-col gap-2 p-0">
            {answer.lines.map((line) => (
              <li key={line} className="flex items-start gap-[9px] text-[12.5px] leading-[1.5] text-[#57504A]">
                <span className="mt-1.5 size-1.5 flex-none rounded-full bg-[#F04E17]" />
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-solid border-[#F2EEEA] pt-3">
            <button type="button" onClick={() => navigate(answer.action.to)} className="h-9 cursor-pointer rounded-[10px] border-0 bg-[#F04E17] px-[15px] text-[12.5px] font-bold text-white">
              {answer.action.label}
            </button>
            <p className="m-0 text-[11px] text-[#A79C93]">{answer.foot}</p>
          </div>
        </div>
      ) : null}

      <p className="mb-0 mt-3 text-[10.5px] text-[#8B7F77]">
        Read-only answers are instant. Anything that changes data opens the normal form first — so nothing happens without your confirmation.
      </p>
    </section>
  );
}

export function StatsGrid({ stats }: { stats: Overview['stats'] }): React.ReactElement {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-3.5">
      {stats.map((stat) => (
        <div key={stat.label} className={`${card} px-[18px] py-4`}>
          <div className="flex items-center gap-2.5">
            <span className="size-[9px] flex-none rounded-[3px]" style={{ backgroundColor: stat.color }} />
            <p className="m-0 text-[12.5px] font-bold text-[#857A72]">{stat.label}</p>
          </div>
          <p className="mb-0 mt-3 text-[30px] font-extrabold leading-none tracking-[-0.03em]">{stat.value}</p>
          <p className="mb-0 mt-1.5 text-[11.5px] text-[#A79C93]">{stat.meta}</p>
        </div>
      ))}
    </div>
  );
}

export function PanelHead({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-solid border-[#F2EEEA] px-[18px] py-[15px]">
      <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">{title}</h2>
      {children}
    </div>
  );
}

function CoveragePanel({ overview, onOpenSchedules }: { overview: Overview; onOpenSchedules: () => void }): React.ReactElement {
  return (
    <section className={card}>
      <PanelHead title="Department coverage today">
        <button type="button" onClick={onOpenSchedules} className={linkButton}>
          Open schedules
        </button>
      </PanelHead>
      <div className="flex flex-col">
        {overview.coverageRows.length === 0 ? (
          <div className="border-b border-solid border-[#F7F4F1] px-[18px] py-[13px]">
            <span className="block text-[13px] font-bold">Nobody is on a published shift today</span>
            <span className="block text-[11.5px] text-[#A79C93]">Publish this week&apos;s schedule to see coverage by department.</span>
          </div>
        ) : (
          overview.coverageRows.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-solid border-[#F7F4F1] px-[18px] py-[13px]">
              <div className="flex min-w-0 flex-[1_1_190px] items-center gap-[11px]">
                <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(row.name)}>
                  {initialsOf(row.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold">{row.name}</span>
                  <span className="block text-[11.5px] text-[#A79C93]">{row.sub}</span>
                </span>
              </div>
              <div className="min-w-20 flex-[0_1_110px] text-[12.5px] text-[#857A72]">{row.middle}</div>
              <div className="min-w-[110px] flex-[1_1_130px]">
                <div className="h-1.5 overflow-hidden rounded-full bg-[#F2EEEA]">
                  <div className="block h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.barColor }} />
                </div>
                <p className="mb-0 mt-1.5 text-[11px] text-[#A79C93]">{row.barLabel}</p>
              </div>
              <div className="ml-auto flex-none text-right">
                <Pill tone={row.tone}>{row.status}</Pill>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between px-[18px] py-3">
        <p className="m-0 text-[11.5px] text-[#A79C93]">Coverage compares checked-in staff against the published schedule.</p>
        <button
          type="button"
          onClick={onOpenSchedules}
          className="h-[34px] cursor-pointer rounded-[10px] border border-solid border-[#EBE7E3] bg-white px-3.5 text-[12.5px] font-bold text-black hover:border-[#DDD6D0]"
        >
          Open scheduling
        </button>
      </div>
    </section>
  );
}

function AttentionPanel({ overview }: { overview: Overview }): React.ReactElement {
  const items = overview.attention.length
    ? overview.attention
    : [{ title: 'Nothing needs your attention', meta: 'Everything is on track', tag: 'All clear', tone: 'ok' as Tone, done: true }];
  return (
    <section className={card}>
      <PanelHead title="Needs your attention">
        <span className="text-[11.5px] text-[#A79C93]">
          {overview.openAttentionCount} open item{overview.openAttentionCount === 1 ? '' : 's'}
        </span>
      </PanelHead>
      <ul className="m-0 list-none px-0 py-1.5">
        {items.map((item) => (
          <li key={item.title} className="flex items-center gap-3 px-[18px] py-[11px]">
            {item.done ? (
              <span className="size-[18px] flex-none rounded-full bg-[#2E9E62] shadow-[inset_0_0_0_3px_#fff,inset_0_0_0_4px_#2E9E62]" />
            ) : (
              // 18px + a 2px border each side: the handoff's content-box circle renders 22px.
              <span className="size-[22px] flex-none rounded-full border-2 border-solid border-[#EBE7E3]" />
            )}
            <span className="min-w-0 flex-auto">
              <span className="block text-[13px] font-bold">{item.title}</span>
              <span className="block text-[11.5px] text-[#A79C93]">{item.meta}</span>
            </span>
            <Pill tone={item.tone}>{item.tag}</Pill>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuickActions({ overview, go }: { overview: Overview; go: (to: string) => void }): React.ReactElement {
  const items: Array<{ title: string; body: string; tone: Tone; to: string }> = [
    { title: 'Publish schedules', body: 'Review and release next week', tone: 'primary', to: `/schedules?week=${overview.nextWeekStart}` },
    { title: 'Invite a supervisor', body: 'Assign department and permissions', tone: 'info', to: '/invitations' },
    { title: 'Add an employee', body: 'One person, or import a file', tone: 'ok', to: '/employees/new' },
    { title: 'Export payroll hours', body: overview.payrollRange, tone: 'neutral', to: '/attendance' }
  ];
  return (
    <section className={`${card} p-[18px]`}>
      <h2 className="mb-1 mt-0 text-[14.5px] font-extrabold tracking-normal">Quick actions</h2>
      <p className="mb-3.5 mt-0 text-[12px] text-[#A79C93]">Everything you run day to day</p>
      <div className="flex flex-col gap-[9px]">
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => go(item.to)}
            className="block w-full cursor-pointer rounded-[12px] border-0 px-[13px] py-[11px] text-left"
            style={{ color: TONES[item.tone][0], backgroundColor: TONES[item.tone][1] }}
          >
            <span className="block text-[12.5px] font-extrabold">{item.title}</span>
            <span className="mt-0.5 block text-[11.5px] font-medium text-[#857A72]">{item.body}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function AnnouncementsCard({ previews, go }: { previews: Overview['announcementPreviews']; go: (to: string) => void }): React.ReactElement {
  return (
    <section className={`${card} p-[18px]`}>
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">Announcements</h2>
        <button type="button" onClick={() => go('/announcements')} className={linkButton}>
          View all
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {previews.length === 0 ? (
          <article className="rounded-[12px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] px-[13px] py-3">
            <p className="m-0 text-[12.5px] font-extrabold">Nothing posted yet</p>
            <p className="mb-0 mt-1.5 text-[11.5px] leading-[1.5] text-[#857A72]">Post an update so everyone sees it in one place.</p>
          </article>
        ) : (
          previews.map((item) => (
            <article key={item.id} className="rounded-[12px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] px-[13px] py-3">
              <div className="flex items-center gap-2">
                <span className="size-[9px] flex-none rounded-[3px]" style={{ backgroundColor: item.color }} />
                <p className="m-0 text-[12.5px] font-extrabold">{item.title}</p>
              </div>
              <p className="mb-0 mt-1.5 text-[11.5px] leading-[1.5] text-[#857A72]">{item.body}</p>
              <p className="mb-0 mt-2 text-[10.5px] text-[#A79C93]">{item.meta}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function ActivityCard({ overview, go }: { overview: Overview; go: (to: string) => void }): React.ReactElement {
  const events = overview.activity.slice(0, 3);
  return (
    <section className={`${card} p-[18px]`}>
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">Recent Activity</h2>
        <button type="button" onClick={() => go('/recent-activity')} className={linkButton}>
          View all
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {events.length === 0 ? (
          <p className="m-0 text-[11px] text-[#A79C93]">Nothing has happened in the last 7 days.</p>
        ) : (
          events.map((event) => (
            <div key={event.key} className="flex items-center gap-2.5">
              <span className="flex size-[30px] flex-none items-center justify-center rounded-[9px]" style={{ color: TONE_FG[event.tone], backgroundColor: TONES[event.tone][1] }}>
                <ScheduleIcon name={event.icon} size={15} />
              </span>
              <span className="min-w-0 flex-auto">
                <span className="block truncate text-[12.5px] font-bold">{event.title}</span>
                <span className="block text-[11px] text-[#A79C93]">{event.time}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

const SHIFTY_DISMISS_KEY = 'shiftos.overview.shiftyDismissed';

function readDismissed(week: string): boolean {
  try {
    return window.sessionStorage.getItem(SHIFTY_DISMISS_KEY) === week;
  } catch {
    return false;
  }
}

export function ManagerOverviewBody({ overview, now }: { overview: Overview; now: Date }): React.ReactElement {
  const navigate = useNavigate();
  const { toast, show, dismiss } = useScheduleToast();
  const [shiftyHidden, setShiftyHidden] = useState(() => readDismissed(overview.nextWeekStart));

  const hideShifty = (): void => {
    setShiftyHidden(true);
    try {
      window.sessionStorage.setItem(SHIFTY_DISMISS_KEY, overview.nextWeekStart);
    } catch {
      // Private mode: dismissal lasts until the page is left.
    }
  };

  return (
    <>
      {overview.showShifty && !shiftyHidden ? <ShiftyCard onOpen={() => navigate(`/schedules?week=${overview.nextWeekStart}`)} onDismiss={hideShifty} /> : null}
      <AskShiftOSCard overview={overview} now={now} onToast={(text) => show(text)} />
      <StatsGrid stats={overview.stats} />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-4">
          <CoveragePanel overview={overview} onOpenSchedules={() => navigate(`/schedules?week=${overview.weekStart}`)} />
          <AttentionPanel overview={overview} />
        </div>
        <div className="flex min-w-0 flex-[1_1_270px] flex-col gap-4">
          <QuickActions overview={overview} go={navigate} />
          <AnnouncementsCard previews={overview.announcementPreviews} go={navigate} />
          <ActivityCard overview={overview} go={navigate} />
        </div>
      </div>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </>
  );
}

/** Handoff isLoading view. */
/** Handoff isLoading view; the caption reads 'Loading {page title}…'. */
export function OverviewLoading({ title = 'Branch overview' }: { title?: string }): React.ReactElement {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-3.5">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className={`${card} p-[18px]`}>
            <div className="size-[34px] animate-shiftos-pulse rounded-full bg-[#F2EEEA]" />
            <div className="mt-3.5 h-[26px] w-[60%] animate-shiftos-pulse rounded-[7px] bg-[#F2EEEA]" />
            <div className="mt-[9px] h-[11px] w-[80%] animate-shiftos-pulse rounded-[6px] bg-[#F5F2EF]" />
          </div>
        ))}
      </div>
      <div className={`${card} p-5`}>
        <div className="h-3.5 w-[180px] animate-shiftos-pulse rounded-[6px] bg-[#F2EEEA]" />
        <div className="mt-[18px] flex flex-col gap-3.5">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center gap-3.5">
              <div className="size-[30px] animate-shiftos-pulse rounded-full bg-[#F5F2EF]" />
              <div className="h-[11px] flex-auto animate-shiftos-pulse rounded-[6px] bg-[#F5F2EF]" />
              <div className="h-[11px] w-16 animate-shiftos-pulse rounded-[6px] bg-[#F5F2EF]" />
            </div>
          ))}
        </div>
      </div>
      <p className="m-0 text-[12px] text-[#A79C93]" aria-live="polite">
        Loading {title}…
      </p>
    </>
  );
}

/** Handoff isEmpty view. */
export function OverviewEmpty({
  title,
  body,
  cta,
  secondary
}: {
  title: string;
  body: string;
  cta: { label: string; onClick: () => void } | null;
  secondary: { label: string; onClick: () => void } | null;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center rounded-[20px] border border-solid border-[#EBE7E3] bg-white px-8 py-[52px] text-center">
      <div className="flex size-16 items-center justify-center rounded-[20px] bg-[#FDF0E9]">
        <img src={logoMark} alt="" className="block h-[35px] w-auto" />
      </div>
      <h2 className="mb-0 mt-5 text-[21px] font-extrabold tracking-[-0.02em]">{title}</h2>
      <p className="mb-0 mt-2 max-w-[420px] text-[13.5px] leading-[1.55] text-[#857A72]">{body}</p>
      {cta || secondary ? (
        <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
          {cta ? (
            <button
              type="button"
              onClick={cta.onClick}
              className="h-[42px] cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-5 text-[13.5px] font-bold text-white shadow-[0_10px_22px_-12px_rgba(240,78,23,.7)] hover:bg-[#DC4611]"
            >
              {cta.label}
            </button>
          ) : null}
          {secondary ? (
            <button
              type="button"
              onClick={secondary.onClick}
              className="h-[42px] cursor-pointer rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[18px] text-[13.5px] font-bold text-[#38312B] hover:border-[#DDD6D0]"
            >
              {secondary.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
