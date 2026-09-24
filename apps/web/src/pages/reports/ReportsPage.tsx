import React from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { DashHeader, StatusPill } from '../dashboard/dashboardWidgets.js';

const REPORT_METRICS = [
  { label: 'Attendance rate', value: '91%', delta: '+3 pts vs last month', up: true },
  { label: 'Hours scheduled', value: '6,240', delta: '+180 vs last month', up: true },
  { label: 'Coverage gaps', value: '11', delta: '−4 vs last month', up: true },
  { label: 'Swap requests', value: '18', delta: '+6 vs last month', up: false }
] as const;

const REPORT_BARS = [
  { label: 'Sales Floor', value: '95%', pct: 95, tag: 'Healthy', tone: 'ok' },
  { label: 'Bakery', value: '88%', pct: 88, tag: 'Healthy', tone: 'ok' },
  { label: 'Front End', value: '78%', pct: 78, tag: 'Watch', tone: 'warn' },
  { label: 'Warehouse', value: '60%', pct: 60, tag: 'At risk', tone: 'bad' }
] as const;

const REPORT_LIST = [
  { title: 'Attendance summary', body: 'Present, late and absent per department.', status: 'Ready', tone: 'ok', cta: 'Download' },
  { title: 'Payroll hours export', body: 'Confirmed hours per employee for the pay period.', status: 'Ready', tone: 'ok', cta: 'Download' },
  { title: 'Coverage vs schedule', body: 'Where published shifts went unfilled.', status: 'Ready', tone: 'ok', cta: 'Download' },
  { title: 'Swap & leave activity', body: 'Requests raised, approved and declined per department.', status: 'New', tone: 'info', cta: 'Generate' }
] as const;

export default function ReportsPage(): React.ReactElement {
  const { hasPermission } = useSession();

  if (!hasPermission('reports.read')) {
    return (
      <div className="px-4 pb-10 pt-[72px] sm:px-6 lg:px-8">
        <DashHeader title="Reports" subtitle="Main Branch · last 30 days" />
        <div className="rounded-[16px] border border-dashed border-neutral-200 bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-extrabold text-neutral-900">Reports aren’t available for this account</p>
          <p className="mt-2 text-[12.5px] text-neutral-500">Ask a manager to grant the reporting permission.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-10 pt-[72px] sm:px-6 lg:px-8">
      <DashHeader title="Reports" subtitle="Main Branch · last 30 days" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {REPORT_METRICS.map((metric) => (
          <div key={metric.label} className="rounded-[15px] border border-[#EBE7E3] bg-white p-[16px_18px]">
            <p className="m-0 text-[12px] font-bold text-[#857A72]">{metric.label}</p>
            <p className="mt-[10px] text-[27px] font-extrabold leading-none tracking-[-0.03em] text-neutral-900">{metric.value}</p>
            <p
              className="mt-[6px] text-[11.5px] font-bold"
              style={{ color: metric.up ? '#1F9D73' : '#E28A35' }}
            >
              {metric.delta}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-[16px] border border-[#EBE7E3] bg-white p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="m-0 text-[14.5px] font-extrabold text-neutral-900">Attendance rate by department</h2>
          <span className="ml-auto text-[11.5px] text-[#A79C93]">Last 30 days</span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {REPORT_BARS.map((bar) => (
            <div key={bar.label} className="flex flex-wrap items-center gap-3">
              <span className="w-[130px] text-[12.5px] font-bold text-neutral-900">{bar.label}</span>
              <span className="h-[10px] min-w-[160px] flex-1 overflow-hidden rounded-full bg-[#F2EEEA]">
                <span
                  className={`block h-full rounded-full ${
                    bar.tone === 'ok' ? 'bg-[#2FA470]' : bar.tone === 'warn' ? 'bg-[#F0B14B]' : 'bg-[#E85B5B]'
                  }`}
                  style={{ width: `${bar.pct}%` }}
                />
              </span>
              <span className="w-[52px] text-right text-[12.5px] font-extrabold text-neutral-900">{bar.value}</span>
              <StatusPill tone={bar.tone === 'ok' ? 'ok' : bar.tone === 'warn' ? 'warn' : 'bad'}>{bar.tag}</StatusPill>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-[16px] border border-[#EBE7E3] bg-white">
        <h2 className="m-0 border-b border-[#F2EEEA] px-[18px] py-[15px] text-[14.5px] font-extrabold text-neutral-900">
          Available reports
        </h2>

        {REPORT_LIST.map((report) => (
          <div
            key={report.title}
            className="flex flex-wrap items-center gap-3 border-b border-[#F7F4F1] px-[18px] py-[13px] last:border-b-0"
          >
            <span className="min-w-0 flex-1 basis-[240px]">
              <span className="block text-[12.5px] font-bold text-neutral-900">{report.title}</span>
              <span className="mt-0.5 block text-[11.5px] text-[#857A72]">{report.body}</span>
            </span>
            <StatusPill tone={report.tone === 'ok' ? 'ok' : 'info'}>{report.status}</StatusPill>
            <button
              type="button"
              className="h-[34px] cursor-pointer rounded-[10px] border border-[#EBE7E3] bg-white px-[13px] text-[12px] font-bold text-neutral-900 transition-colors hover:border-neutral-300"
            >
              {report.cta}
            </button>
          </div>
        ))}

        <p className="m-0 px-[18px] py-[12px] text-[11.5px] text-[#A79C93]">
          Reports cover published schedules and confirmed attendance only — drafts are excluded.
        </p>
      </section>
    </div>
  );
}
