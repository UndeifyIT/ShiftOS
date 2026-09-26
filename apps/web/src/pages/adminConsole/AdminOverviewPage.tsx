import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoMark from '../../assets/logo-mark.png';
import { useSession } from '../../auth/SessionProvider.js';
import { currentTime } from '../../lib/clock.js';
import { TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import { AdminIcon, type AdminIconName } from './AdminIcon.js';
import { AdminPage } from './AdminShell.js';
import { AdminLoading, BranchTile, card, Pill } from './adminUi.js';
import { answerAdmin, PLAN } from './adminModel.js';
import { useAdminOrg } from './useAdminOrg.js';

/*
 * The Admin console's Overview, built to the design handoff
 * (`ShiftOS Admin.dc.html`, "OVERVIEW" markup lines 142-248): read-only Ask
 * ShiftOS, the organization's four counts, the plan card, what needs
 * attention and the first three branches — all from the organization's real
 * branches and people.
 */

const greeting = (at: Date): string => (at.getHours() < 12 ? 'Good morning' : at.getHours() < 17 ? 'Good afternoon' : 'Good evening');

const outlineButton = 'cursor-pointer rounded-[10px] border border-solid border-[#EBE7E3] bg-white font-bold text-[#38312B] [line-height:normal]';

export default function AdminOverviewPage(): React.ReactElement {
  const navigate = useNavigate();
  const { profile } = useSession();
  const { loading, orgName, branches, stats } = useAdminOrg();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');

  const attention = branches.filter((b) => b.attentionNote);
  const firstName = profile?.first_name?.trim() || 'there';

  const ask = (raw: string): void => {
    if (!raw.trim()) return;
    const answer = answerAdmin(raw, branches);
    setResult(answer.text);
    setQuery('');
    if (answer.to && answer.to !== '/') navigate(answer.to);
  };

  const chips = [
    { label: `Open ${branches[0]?.name ?? 'Branches'}`, q: `Open ${branches[0]?.name ?? 'branches'}` },
    { label: 'Open Billing', q: 'Open billing' },
    { label: 'Which branches need attention?', q: 'Which branches need attention?' },
    { label: 'Total employees?', q: 'How many employees do we have?' }
  ];

  const statCards: Array<{ value: number; label: string; icon: AdminIconName; tone: Tone }> = [
    { value: stats.branches, label: 'Active branches in the organization.', icon: 'store', tone: 'primary' },
    { value: stats.employees, label: 'Employees across all branches.', icon: 'users', tone: 'info' },
    { value: stats.managers, label: 'Branch managers currently assigned.', icon: 'building', tone: 'ok' },
    { value: stats.supervisors, label: 'Supervisors currently assigned.', icon: 'users', tone: 'warn' }
  ];

  return (
    <AdminPage title={`${greeting(currentTime())}, ${firstName}`} subtitle={`Here's an overview of ${orgName}.`} attention={attention.length > 0}>
      {loading ? (
        <AdminLoading />
      ) : (
        <div className="flex flex-col gap-[18px]">
          <section className="rounded-[20px] bg-[#231E1A] px-[22px] pb-[17px] pt-5 text-white shadow-[0_26px_54px_-32px_rgba(35,30,26,.75)]">
            <div className="flex flex-wrap items-center gap-[11px]">
              <span className="flex size-9 flex-none items-center justify-center overflow-hidden rounded-[12px] bg-white">
                <img src={logoMark} alt="" className="block h-[21px] w-auto" />
              </span>
              <div className="min-w-0">
                <p className="m-0 text-[15.5px] font-extrabold tracking-[-0.015em]">Ask ShiftOS</p>
                <p className="mb-0 mt-0.5 text-[11.5px] text-[#B4A8A0]">Ask about your organization, or say &quot;open {branches[0]?.name ?? 'a branch'}&quot; / &quot;open billing&quot;.</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[rgba(240,78,23,.2)] px-2.5 py-[5px] text-[9.5px] font-extrabold uppercase tracking-[.1em] text-[#FFB08C]">
                Read-only
              </span>
            </div>
            <div className="relative mt-[15px] flex flex-wrap items-center gap-2 rounded-[14px] border border-solid border-[#3B322C] bg-[#1A1613] py-[7px] pl-[15px] pr-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && ask(query)}
                placeholder="Ask a question or give a command…"
                aria-label="Ask ShiftOS"
                className="h-10 min-w-0 flex-[1_1_240px] border-0 bg-transparent p-0 text-[14px] text-white outline-none placeholder:text-[#757575]"
              />
              <button type="button" onClick={() => ask(query)} className="h-10 cursor-pointer rounded-[11px] border-0 bg-[#F04E17] px-[19px] text-[13px] font-bold text-white [line-height:normal]">
                Ask
              </button>
            </div>
            <div className="mt-[11px] flex flex-wrap gap-[7px]">
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => ask(chip.q)}
                  className="h-8 cursor-pointer rounded-full border border-solid border-[#3B322C] bg-transparent px-[13px] text-[11.5px] font-bold text-[#DED5CF] [line-height:normal] hover:border-[#F04E17] hover:text-white"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            {result ? (
              <div className="mt-3.5 rounded-[16px] bg-white px-4 py-3.5 text-[#38312B]">
                <p className="m-0 text-[12.5px] leading-[1.5]">{result}</p>
              </div>
            ) : null}
          </section>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
            {statCards.map((s) => (
              <div key={s.label} className={`${card} p-[18px]`}>
                <span className="flex size-[34px] items-center justify-center rounded-[11px]" style={{ color: TONES[s.tone][0], backgroundColor: TONES[s.tone][1] }}>
                  <AdminIcon name={s.icon} size={16} />
                </span>
                <p className="mb-0 mt-3.5 text-[26px] font-extrabold tracking-[-0.02em]">{s.value}</p>
                <p className="mb-0 mt-1 text-[12px] text-[#857A72]">{s.label}</p>
              </div>
            ))}
          </div>

          <section className="rounded-[16px] border border-solid border-[#F7DFD1] bg-[#FEFAF7] p-5">
            <div className="flex flex-wrap items-start gap-3.5">
              <div className="min-w-0 flex-[1_1_220px]">
                <p className="m-0 text-[11px] font-extrabold uppercase tracking-[.06em] text-[#A79C93]">Subscription</p>
                <p className="mb-0 mt-2 text-[22px] font-extrabold tracking-[-0.02em]">
                  {PLAN.name} <span className="text-[13px] font-bold text-[#857A72]">{PLAN.price}</span>
                </p>
                <p className="mb-0 mt-1.5 text-[12.5px] text-[#857A72]">{PLAN.seats(stats.employees)}</p>
              </div>
              <div className="min-w-[180px] flex-[1_1_220px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-bold text-[#857A72]">Usage</span>
                  <span className="text-[12px] font-bold text-[#857A72]">{PLAN.usage}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3EEE9]" />
                <p className="mb-0 mt-2 text-[11.5px] text-[#A79C93]">{PLAN.renews}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/subscription')}
                className="h-10 cursor-pointer self-center rounded-[11px] border-0 bg-[#F04E17] px-4 text-[12.5px] font-bold text-white [line-height:normal]"
              >
                Manage Subscription
              </button>
            </div>
          </section>

          {attention.length ? (
            <section className={`${card} overflow-hidden`}>
              <h2 className="m-0 border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-[15px] text-[14.5px] font-extrabold tracking-normal">Needs Attention</h2>
              {attention.map((b) => (
                <div key={b.branch.id} className="flex items-start gap-3 border-0 border-b border-solid border-[#F7F4F1] px-[18px] py-[13px]">
                  <span className="flex size-[30px] flex-none items-center justify-center rounded-[10px] bg-[#FDF4E6] text-[#B77714]">
                    <AdminIcon name="store" size={15} />
                  </span>
                  <span className="min-w-0 flex-auto">
                    <span className="block text-[13px] font-extrabold">{b.name}</span>
                    <span className="mt-0.5 block text-[12px] text-[#857A72]">{b.attentionNote}</span>
                  </span>
                  <button type="button" onClick={() => navigate(`/branches/${b.branch.id}`)} className={`${outlineButton} h-8 flex-none rounded-[9px] px-3 text-[11.5px] text-black`}>
                    View branch
                  </button>
                </div>
              ))}
            </section>
          ) : null}

          <section className={`${card} px-5 py-[18px]`}>
            <div className="flex items-center gap-3">
              <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">Your Branches</h2>
              <span className="text-[11.5px] text-[#A79C93]">
                {stats.branches} {stats.branches === 1 ? 'branch' : 'branches'}
              </span>
              <button type="button" onClick={() => navigate('/branches')} className={`${outlineButton} ml-auto h-9 px-[15px] text-[12.5px] hover:border-[#DDD6D0] hover:bg-[#FDFCFB]`}>
                View all branches →
              </button>
            </div>
            <div className="mt-3.5 flex flex-col gap-[9px]">
              {branches.length === 0 ? (
                <div className="rounded-[13px] border border-dashed border-[#E4DED9] px-4 py-5 text-center">
                  <p className="m-0 text-[12.5px] font-bold">No branches yet</p>
                  <p className="mb-0 mt-1 text-[11.5px] text-[#857A72]">Add your first branch from Branches.</p>
                </div>
              ) : null}
              {branches.slice(0, 3).map((b) => (
                <button
                  key={b.branch.id}
                  type="button"
                  onClick={() => navigate(`/branches/${b.branch.id}`)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] px-3.5 py-3 text-left text-[#38312B] [line-height:normal]"
                >
                  <BranchTile branch={b} size={40} radius={13} icon={17} />
                  <span className="min-w-0 flex-auto">
                    <span className="block text-[13px] font-bold">{b.name}</span>
                    <span className="mt-0.5 block text-[11.5px] text-[#857A72]">
                      {b.location} · {b.employees} employees
                    </span>
                  </span>
                  <Pill tone={b.attentionNote ? 'warn' : 'ok'}>
                    {b.attentionNote ? 'Attention' : 'Normal'}
                  </Pill>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </AdminPage>
  );
}
