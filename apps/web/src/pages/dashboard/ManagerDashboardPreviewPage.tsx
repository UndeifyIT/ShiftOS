import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  DashHeader,
  DashPanel,
  DashStat,
  InitialsAvatar,
  ProgressTrack,
  QuickActionCard,
  StatusPill
} from './dashboardWidgets.js';

const branches = [
  { name: 'Downtown Market', employees: 18, schedules: 3, coverage: 100, tone: 'ok' as const },
  { name: 'Riverside Store', employees: 14, schedules: 2, coverage: 78, tone: 'warn' as const },
  { name: 'Northside Express', employees: 9, schedules: 1, coverage: 50, tone: 'bad' as const }
];

export default function ManagerDashboardPreviewPage(): React.ReactElement {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <main className="min-h-screen bg-[#faf9f7] px-4 py-6 text-neutral-900 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <a href="/" className="text-lg font-extrabold tracking-[-0.03em] text-brand-deep">ShiftOS</a>
          <StatusPill tone="info">Preview mode</StatusPill>
        </div>

        <DashHeader title="Branch overview" subtitle={`Acme Retail Group - ${today}`} />

        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-3.5">
          <DashStat label="Employees" value={41} meta="across 3 branches" dotTone="primary" />
          <DashStat label="Published schedules" value={6} meta="visible to the team" dotTone="info" />
          <DashStat label="Draft schedules" value={2} meta="awaiting publish" dotTone="bad" />
          <DashStat label="Open invitations" value={4} meta="waiting on accept" dotTone="ok" />
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-4">
            <DashPanel
              title="Branch coverage"
              linkLabel="Open schedules"
              linkTo="/schedules"
              footerNote="Coverage compares each branch's active team against the largest branch."
              actionLabel="Open scheduling"
              actionTo="/schedules"
            >
              <div className="flex flex-col">
                {branches.map((branch) => (
                  <button
                    key={branch.name}
                    type="button"
                    onClick={() => navigate('/branches')}
                    className="flex flex-wrap items-center gap-2.5 border-b border-neutral-50 px-[18px] py-[13px] text-left transition-colors last:border-b-0 hover:bg-neutral-50/60"
                  >
                    <div className="flex min-w-0 flex-[1_1_190px] items-center gap-[11px]">
                      <InitialsAvatar name={branch.name} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold text-neutral-900">{branch.name}</span>
                        <span className="block truncate text-[11.5px] text-neutral-400">{branch.schedules} schedules</span>
                      </span>
                    </div>
                    <div className="min-w-[80px] flex-[0_1_110px] text-[12.5px] text-neutral-500">{branch.employees} employees</div>
                    <ProgressTrack pct={branch.coverage} tone={branch.tone} label={`${branch.coverage}% of largest team`} />
                    <div className="ml-auto flex shrink-0 justify-end"><StatusPill tone="ok">Active</StatusPill></div>
                  </button>
                ))}
              </div>
            </DashPanel>

            <DashPanel title="Needs your attention">
              <ul className="m-0 list-none p-1.5">
                <li className="flex items-center gap-3 px-[18px] py-[11px]">
                  <CheckCircle done={false} />
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold">Weekend coverage is still a draft</span><span className="block text-[11.5px] text-neutral-400">Publish it so the team sees their shifts.</span></span>
                  <StatusPill tone="warn">Scheduling</StatusPill>
                </li>
                <li className="flex items-center gap-3 px-[18px] py-[11px]">
                  <CheckCircle done={false} />
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold">4 invitations still pending</span><span className="block text-[11.5px] text-neutral-400">Resend or wait for teammates to accept.</span></span>
                  <StatusPill tone="info">Invitations</StatusPill>
                </li>
              </ul>
            </DashPanel>
          </div>

          <div className="flex min-w-0 flex-[1_1_270px] flex-col gap-4">
            <section className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
              <h2 className="text-[14.5px] font-extrabold">Quick actions</h2>
              <p className="mb-3.5 mt-0.5 text-xs text-neutral-400">Everything you run day to day</p>
              <div className="flex flex-col gap-[9px]">
                <QuickActionCard title="Publish schedules" body="Review and release the week" tone="primary" onClick={() => navigate('/schedules')} />
                <QuickActionCard title="Invite a teammate" body="Assign role and branch access" tone="info" onClick={() => navigate('/invitations')} />
                <QuickActionCard title="Add an employee" body="One person, or import a file" tone="ok" onClick={() => navigate('/employees/new')} />
                <QuickActionCard title="Open a branch" body="Spin up the next location" tone="neutral" onClick={() => navigate('/branches/new')} />
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
              <div className="flex items-center justify-between"><h2 className="text-[14.5px] font-extrabold">Recent activity</h2><button type="button" onClick={() => navigate('/schedules')} className="text-xs font-bold text-brand-deep">View all</button></div>
              <div className="mt-3 flex flex-col gap-3">
                {['Week 24 published', 'Riverside coverage updated', 'New team member invited'].map((item) => <div key={item} className="flex items-center gap-2.5"><InitialsAvatar name={item} /><span className="text-[12.5px] font-bold">{item}</span></div>)}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
