import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { HandoffModal, ModalField, ModalFields, modalControl, modalSelect } from '../../components/HandoffModal.js';
import { downloadText, toCsv } from '../../lib/spreadsheet.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Department, Employee, OperationsSummaryReport } from '../../types/domain.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { HeaderCta } from '../people/RolePeopleTable.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { todayDateString, TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import { AVAILABLE_REPORTS, departmentBars, hasData, periodLabel, periods, reportMetrics, reportRows, type ReportKey } from './reportsModel.js';

/*
 * The Manager's Reports page, built to the design handoff
 * (`ShiftOS Dashboards.dc.html`: `PAGES["Manager/Reports"]`, markup lines
 * 1454-1496, renderVals 5438-5460, and the export / generateReport dialogs).
 * Every number is the branch's last 30 days from get_operations_summary_report,
 * compared with the 30 days before; every download is built from the same
 * report. The prototype has no CSS reset, so the values below are what it
 * renders (13px base, `line-height: normal`).
 */

const pill = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });
const pillClass = 'inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold';
const BAR = { ok: '#2E9E62', warn: '#B77714', bad: '#C93A22' } as const;
const DELTA = (good: boolean | null): string => (good === null ? '#A79C93' : good ? '#2E9E62' : '#B77714');

type Dialog = { kind: 'export'; key: ReportKey | 'all' } | { kind: 'generate' };

export default function ReportsPage(): React.ReactElement {
  const navigate = useNavigate();
  const now = useNow();
  const { hasPermission } = useSession();
  const { toast, show, dismiss } = useScheduleToast();
  const canRead = hasPermission('reports.read');

  const branchId = useDefaultBranchId() ?? '';
  const scoped = branchId ? { branchId } : undefined;
  const { current, previous } = periods(todayDateString(now));
  const currentQuery = useRpcQuery<OperationsSummaryReport>('get_operations_summary_report', { ...current, ...scoped }, { enabled: canRead && Boolean(branchId) });
  const previousQuery = useRpcQuery<OperationsSummaryReport>('get_operations_summary_report', { ...previous, ...scoped }, { enabled: canRead && Boolean(branchId) });
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const { data: departments } = useRpcQuery<Department[]>('list_departments', scoped, { enabled: Boolean(branchId) && hasPermission('departments.read') });
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: Boolean(branchId) && hasPermission('employees.read') });
  const branchName = (branches ?? []).find((b) => b.id === branchId)?.name ?? 'Your branch';

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [departmentId, setDepartmentId] = useState('');

  const report = currentQuery.data;
  const liveDepartments = (departments ?? []).filter((d) => d.is_active && !d.deleted_at);

  const download = (key: ReportKey): void => {
    if (!report) return;
    const rows = reportRows(key, report, departments ?? [], employees ?? [], departmentId || null);
    const name = AVAILABLE_REPORTS.find((r) => r.key === key)?.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? key;
    downloadText(`shiftos-${name}-${current.startDate}-to-${current.endDate}.csv`, toCsv(rows));
  };

  const confirm = (): void => {
    if (!dialog) return;
    if (dialog.kind === 'generate') {
      download('activity');
      show('Report ready · downloading');
    } else if (dialog.key === 'all') {
      AVAILABLE_REPORTS.forEach((r) => download(r.key));
      show('Export ready · 4 files downloading');
    } else {
      download(dialog.key);
      show('Export ready · downloading');
    }
    setDialog(null);
  };

  const openDialog = (next: Dialog): void => {
    setDepartmentId('');
    setDialog(next);
  };

  if (!canRead) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const ready = Boolean(report && hasData(report));

  const body = (): React.ReactNode => {
    if (currentQuery.isLoading || previousQuery.isLoading) return <OverviewLoading title="Reports" />;
    if (!report || !hasData(report)) {
      return (
        <OverviewEmpty
          title="Not enough data yet"
          body="Reports need at least one published week of attendance. Check back after your first full week."
          cta={{ label: 'Open scheduling', onClick: () => navigate('/schedules') }}
          secondary={null}
        />
      );
    }
    const metrics = reportMetrics(report, previousQuery.data);
    const bars = departmentBars(report, departments ?? []);
    return (
      <>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-[15px] border border-solid border-[#EBE7E3] bg-white px-[18px] py-4">
              <p className="m-0 text-[12px] font-bold text-[#857A72]">{metric.label}</p>
              <p className="mb-0 mt-2.5 text-[27px] font-extrabold leading-none tracking-[-0.03em]">{metric.value}</p>
              <p className="mb-0 mt-1.5 text-[11.5px] font-bold" style={{ color: DELTA(metric.good) }}>
                {metric.delta}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-[16px] border border-solid border-[#EBE7E3] bg-white p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">Attendance rate by department</h2>
            <span className="ml-auto text-[11.5px] text-[#A79C93]">Last 30 days</span>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {bars.length === 0 ? <p className="m-0 text-[12.5px] text-[#857A72]">No attendance has been recorded in the last 30 days.</p> : null}
            {bars.map((bar) => (
              <div key={bar.key} className="flex flex-wrap items-center gap-3">
                <span className="flex-[0_0_130px] text-[12.5px] font-bold">{bar.label}</span>
                <span className="h-2.5 flex-[1_1_160px] overflow-hidden rounded-full bg-[#F2EEEA]">
                  <span className="block h-full rounded-full" style={{ width: `${bar.pct}%`, backgroundColor: BAR[bar.tone] }} />
                </span>
                <span className="flex-[0_0_52px] text-right text-[12.5px] font-extrabold">{bar.value}</span>
                <span className={pillClass} style={pill(bar.tone)}>
                  {bar.tag}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[16px] border border-solid border-[#EBE7E3] bg-white">
          <h2 className="m-0 border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-[15px] text-[14.5px] font-extrabold tracking-normal">Available reports</h2>
          {AVAILABLE_REPORTS.map((item) => (
            <div key={item.key} className="flex flex-wrap items-center gap-3 border-0 border-b border-solid border-[#F7F4F1] px-[18px] py-[13px]">
              <span className="min-w-0 flex-[1_1_240px]">
                <span className="block text-[12.5px] font-bold">{item.title}</span>
                <span className="block text-[11.5px] text-[#857A72]">{item.body}</span>
              </span>
              <span className={pillClass} style={pill(item.tone)}>
                {item.status}
              </span>
              <button
                type="button"
                onClick={() => openDialog(item.cta === 'Generate' ? { kind: 'generate' } : { kind: 'export', key: item.key })}
                className="h-[34px] cursor-pointer rounded-[10px] border border-solid border-[#EBE7E3] bg-white px-[13px] font-[inherit] text-[12px] font-bold text-black"
              >
                {item.cta}
              </button>
            </div>
          ))}
          <p className="m-0 px-[18px] py-3 text-[11.5px] text-[#A79C93]">Reports cover published schedules and confirmed attendance only — drafts are excluded.</p>
        </section>
      </>
    );
  };

  const exportTitle = dialog?.kind === 'export' && dialog.key !== 'all' ? AVAILABLE_REPORTS.find((r) => r.key === dialog.key)?.title ?? 'Report' : 'All four reports';

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title="Reports" subtitle={`${branchName} · last 30 days`} now={now} actions={ready ? <HeaderCta label="Export all" onClick={() => openDialog({ kind: 'export', key: 'all' })} /> : null} />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>

      <HandoffModal open={dialog?.kind === 'export'} title="Export" subtitle="Choose a format and range." primary="Export" primaryDisabled={!report} onPrimary={confirm} onClose={() => setDialog(null)}>
        <ModalFields>
          <ModalField label="Format" required>
            <input className={modalControl} value="CSV" readOnly />
          </ModalField>
          <ModalField label="Range" required>
            <input className={modalControl} value={periodLabel(current)} readOnly />
          </ModalField>
          <ModalField label="Report">
            <input className={modalControl} value={exportTitle} readOnly />
          </ModalField>
          <ModalField label="Include">
            <select className={modalSelect} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">All departments</option>
              {liveDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </ModalField>
        </ModalFields>
      </HandoffModal>

      <HandoffModal
        open={dialog?.kind === 'generate'}
        title="Generate report"
        subtitle="Covers published schedules and confirmed attendance only."
        primary="Generate"
        primaryDisabled={!report}
        onPrimary={confirm}
        onClose={() => setDialog(null)}
      >
        <ModalFields>
          <ModalField label="Report" required>
            <input className={modalControl} value="Swap & leave activity" readOnly />
          </ModalField>
          <ModalField label="Period" required>
            <input className={modalControl} value={`Last 30 days · ${periodLabel(current)}`} readOnly />
          </ModalField>
          <ModalField label="Departments">
            <select className={modalSelect} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">All departments</option>
              {liveDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Format">
            <input className={modalControl} value="CSV" readOnly />
          </ModalField>
        </ModalFields>
      </HandoffModal>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
