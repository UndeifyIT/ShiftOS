import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import shiftyGuide from '../../assets/shifty-guide.png';
import { useSession } from '../../auth/SessionProvider.js';
import { answerQuestion, ASK_CHIPS } from '../../pages/dashboard/manager/askShiftOS.js';
import { useManagerOverview } from '../../pages/dashboard/manager/useManagerOverview.js';
import { ScheduleToast, useScheduleToast } from '../../pages/scheduling/grid/ScheduleToast.js';

/*
 * The handoff's floating Ask ShiftOS bubble (`ShiftOS Dashboards.dc.html`
 * lines 2799-2831, showFloatingAssistant): a Shifty button in the bottom-right
 * of every Manager page except the overview, which has the full Ask ShiftOS
 * card. It answers from the same branch data and intents as that card.
 */

function AskPanel({ onCollapse }: { onCollapse: () => void }): React.ReactElement {
  const navigate = useNavigate();
  // Loaded only while the panel is open; react-query shares the cache with the overview.
  const { overview, now, status } = useManagerOverview();
  const { toast, show, dismiss } = useScheduleToast();
  const [query, setQuery] = useState('');
  const [asked, setAsked] = useState<string | null>(null);
  const answer = asked && overview ? answerQuestion(asked, overview, now) : null;

  const run = (question: string): void => {
    const trimmed = question.trim();
    if (!trimmed) {
      show('Type a question, or tap one of the suggestions', 'error');
      return;
    }
    setQuery(trimmed);
    setAsked(trimmed);
  };

  const pending = asked && !answer;

  return (
    <div className="mb-2.5 box-content w-[300px] max-w-[calc(100vw-32px)] rounded-[18px] bg-[#231E1A] px-[15px] pb-[13px] pt-3.5 text-white shadow-[0_26px_54px_-26px_rgba(35,30,26,.6)]">
      <div className="flex items-center gap-[9px]">
        <span className="flex size-[26px] flex-none items-end justify-center overflow-hidden rounded-full bg-white">
          <img src={shiftyGuide} alt="Shifty" className="block h-auto w-[110%] max-w-none" />
        </span>
        <p className="m-0 flex-auto text-[12.5px] font-extrabold">Ask ShiftOS</p>
        <button type="button" onClick={onCollapse} aria-label="Minimize" className="cursor-pointer border-0 bg-transparent px-1 py-0.5 text-[14px] leading-4 text-[#B4A8A0]">
          –
        </button>
      </div>

      {answer ? (
        <button
          type="button"
          onClick={() => navigate(answer.action.to)}
          title={answer.action.label}
          className="mt-[11px] block w-full cursor-pointer rounded-[12px] border-0 bg-white px-3 py-2.5 text-left text-[#38312B]"
        >
          <p className="m-0 text-[13px] font-extrabold">{answer.value}</p>
          <p className="mb-0 mt-1 text-[11.5px] text-[#857A72]">{answer.sub}</p>
        </button>
      ) : pending ? (
        <div className="mt-[11px] rounded-[12px] bg-white px-3 py-2.5 text-[#38312B]">
          <p className="m-0 text-[13px] font-extrabold">{status === 'no-branch' ? 'No branch to ask about yet' : 'One moment…'}</p>
          <p className="mb-0 mt-1 text-[11.5px] text-[#857A72]">{status === 'no-branch' ? 'Set up your branch first, then ask again.' : 'Reading your branch data'}</p>
        </div>
      ) : null}

      <div className="relative mt-[11px] flex items-center gap-[7px] rounded-[12px] border border-solid border-[#3B322C] bg-[#1A1613] py-[5px] pl-3 pr-[5px]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              run(query);
            }
          }}
          placeholder="Ask or command…"
          aria-label="Ask ShiftOS"
          className="box-content h-8 min-w-0 flex-auto border-0 bg-transparent px-0.5 py-px text-[12.5px] text-white outline-none placeholder:text-[#757575]"
        />
        <button type="button" onClick={() => run(query)} className="h-8 cursor-pointer rounded-[9px] border-0 bg-[#F04E17] px-[13px] text-[11.5px] font-bold text-white">
          Ask
        </button>
      </div>

      <div className="mt-[9px] flex flex-wrap gap-1.5">
        {ASK_CHIPS.slice(0, 2).map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => run(label)}
            className="h-[27px] cursor-pointer rounded-full border border-solid border-[#3B322C] bg-transparent px-2.5 text-[10.5px] font-bold text-[#DED5CF]"
          >
            {label}
          </button>
        ))}
      </div>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}

export function FloatingAskShiftOS(): React.ReactElement | null {
  const { myContext } = useSession();
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(false);

  // Handoff go(): changing page always folds the bubble back up.
  useEffect(() => setExpanded(false), [pathname]);

  // Managers only (org-wide access, as RoleDashboard decides), and never on the overview itself.
  if (!myContext?.branchAccess.isOrgWide || pathname === '/') return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end text-[13px] [line-height:normal] max-[859px]:bottom-[84px] print:hidden">
      {expanded ? <AskPanel onCollapse={() => setExpanded(false)} /> : null}
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-label="Ask ShiftOS"
        aria-expanded={expanded}
        className="flex size-[52px] cursor-pointer items-center justify-center overflow-hidden rounded-full border-0 bg-[#231E1A] p-0 shadow-[0_16px_30px_-14px_rgba(35,30,26,.6)]"
      >
        <img src={shiftyGuide} alt="Shifty" className="block h-auto w-[112%] max-w-none" />
      </button>
    </div>
  );
}
