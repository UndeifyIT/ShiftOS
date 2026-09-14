import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../../auth/useDefaultBranchId.js';
import { currentTime } from '../../../lib/clock.js';
import { useRpcMutation, useRpcQuery } from '../../../lib/useRpc.js';
import type { Department, Employee, EmployeeImport, ImportEmployeesResult, Role } from '../../../types/domain.js';
import { OverviewHeader } from '../../dashboard/manager/ManagerOverview.js';
import { clock12, pillDate } from '../../dashboard/manager/overviewModel.js';
import { useNow } from '../../dashboard/manager/useManagerOverview.js';
import { ScheduleIcon } from '../../scheduling/grid/ScheduleIcon.js';
import { ScheduleToast, useScheduleToast } from '../../scheduling/grid/ScheduleToast.js';
import { avatarTone, initialsOf, type Tone } from '../../scheduling/grid/scheduleFormat.js';
import {
  departmentBreakdown,
  displayDate,
  errorCount,
  hasErrors,
  importStats,
  isValid,
  issueRows,
  parseImport,
  templateRows,
  toImportPayload,
  validRowsTable,
  type ImportRow
} from './importModel.js';
import {
  card,
  HelpCard,
  HowItWorksCard,
  IconTile,
  ImportModal,
  ImportSummaryCard,
  outlineButton,
  Pill,
  primaryButton,
  RequiredColumnsCard,
  softOrangeButton,
  Stepper,
  TipsCard,
  WhatGetsImportedCards
} from './importParts.js';
import { downloadText, readSpreadsheet, SpreadsheetError, toCsv } from '../../../lib/spreadsheet.js';

type Step = 1 | 2 | 3 | 4;
type IssueTab = 'All' | 'Errors' | 'Warnings';

interface UploadedFile {
  name: string;
  table: string[][];
  uploadedAt: Date;
}

const stamp = (at: Date): string => `${pillDate(at)} · ${clock12(at)}`;
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

const IMPORT_STATUS: Record<EmployeeImport['status'], { label: string; tone: Tone }> = {
  completed: { label: 'Completed', tone: 'ok' },
  completed_with_errors: { label: 'Partial', tone: 'warn' },
  failed: { label: 'Failed', tone: 'bad' }
};

/**
 * WEB — Import Employees, the design handoff's wizard (`ShiftOS
 * Dashboards.dc.html`, "Manager/Import Employees"): upload an .xlsx or .csv,
 * see every row validated against the branch's departments, the roles people
 * can be invited as and the existing directory, then import the valid rows
 * (`import_employees`) and optionally invite them. Recent Imports is the
 * branch's real import history (`list_employee_imports`).
 */
export default function ImportEmployeesPage(): React.ReactElement {
  const navigate = useNavigate();
  const { hasPermission } = useSession();
  const canCreate = hasPermission('employees.create');
  const canInvite = hasPermission('org.members.manage');
  const now = useNow();
  const { toast, show, dismiss } = useScheduleToast();
  const fileInput = useRef<HTMLInputElement>(null);

  // Imports always land in the person's own branch; there's no branch to pick.
  const branchId = useDefaultBranchId() ?? '';

  const departmentsQuery = useRpcQuery<Department[]>('list_departments', branchId ? { branchId } : undefined, { enabled: Boolean(branchId) && hasPermission('departments.read') });
  const rolesQuery = useRpcQuery<Role[]>('list_invitable_roles', undefined, { enabled: canInvite });
  const employeesQuery = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: hasPermission('employees.read') });
  const importsQuery = useRpcQuery<EmployeeImport[]>('list_employee_imports', branchId ? { branchId } : undefined, { enabled: Boolean(branchId) && hasPermission('employees.read') });
  const lookupsReady = !departmentsQuery.isLoading && !employeesQuery.isLoading && (!canInvite || !rolesQuery.isLoading);

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [issueTab, setIssueTab] = useState<IssueTab>('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<ImportEmployeesResult | null>(null);
  const [importedAt, setImportedAt] = useState<Date | null>(null);
  const [viewing, setViewing] = useState<EmployeeImport | null>(null);

  const parsed = useMemo(() => {
    if (!file) return null;
    const employees = employeesQuery.data ?? [];
    return parseImport(file.table, {
      departments: (departmentsQuery.data ?? []).filter((d) => d.is_active && !d.deleted_at),
      roles: canInvite ? (rolesQuery.data ?? []).filter((r) => r.is_active && !r.deleted_at && !r.grants_org_wide_branch_access) : null,
      existingEmails: new Set(employees.map((e) => e.email?.toLowerCase()).filter((email): email is string => Boolean(email))),
      existingEmployeeNumbers: new Set(employees.map((e) => e.employee_number.toLowerCase()))
    });
  }, [file, departmentsQuery.data, rolesQuery.data, employeesQuery.data, canInvite]);

  // Once an import starts, the rows it was confirmed with are frozen: the refreshed directory would otherwise flag every imported row as a duplicate of itself.
  const [confirmedRows, setConfirmedRows] = useState<ImportRow[] | null>(null);
  const rows = confirmedRows ?? parsed?.rows ?? [];
  const stats = importStats(rows);
  const issueRowsList = rows.filter((row) => !isValid(row));
  const errorRows = rows.filter(hasErrors);
  const warningRows = rows.filter((row) => !hasErrors(row) && row.duplicateOf);
  const validRows = rows.filter(isValid);
  const invitesToSend = canInvite ? validRows.filter((row) => row.roleId && row.email).length : 0;

  const importMutation = useRpcMutation<ImportEmployeesResult, unknown>('import_employees', { invalidates: ['list_employees', 'list_employee_imports'] });
  const inviteMutation = useRpcMutation<unknown, unknown>('invite_member', { invalidates: ['list_invitations'] });

  if (!canCreate) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const reset = (): void => {
    setStep(1);
    setFile(null);
    setConfirmedRows(null);
    setFileError(null);
    setResult(null);
    setImportedAt(null);
    setExpanded(new Set());
    setSearch('');
    setIssueTab('All');
  };

  const acceptFile = async (picked: File | undefined): Promise<void> => {
    if (!picked) return;
    setReading(true);
    setFileError(null);
    try {
      const table = await readSpreadsheet(picked);
      const check = parseImport(table, { departments: [], roles: null, existingEmails: new Set(), existingEmployeeNumbers: new Set() });
      if (check.missingColumns.length) {
        setFileError(`Your file is missing ${check.missingColumns.length === 1 ? 'this column' : 'these columns'}: ${check.missingColumns.join(', ')}. Download the template to see the format.`);
        return;
      }
      if (check.rows.length === 0) {
        setFileError("We didn't find any employees in this file — add one person per row under the header row.");
        return;
      }
      setFile({ name: picked.name, table, uploadedAt: currentTime() });
      setExpanded(new Set());
      setStep(2);
      show(`${picked.name} uploaded · validating`);
    } catch (error) {
      setFileError(error instanceof SpreadsheetError ? error.message : "We couldn't read this file. Check it opens in Excel, then try again.");
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const runImport = async (): Promise<void> => {
    if (!file || validRows.length === 0) return;
    setConfirmedRows(rows);
    try {
      const outcome = await importMutation.mutateAsync({
        branchId,
        fileName: file.name,
        rows: toImportPayload(rows, canInvite),
        skippedCount: stats.total - stats.valid,
        sendInvites: canInvite
      });
      setResult(outcome);
      setImportedAt(currentTime());
      setStep(4);
      show(
        outcome.imported.length === 0
          ? 'Nothing was imported — see the errors below'
          : `${plural(outcome.imported.length, 'employee')} imported${outcome.invitesSent ? ' · invites sent' : ''}`,
        outcome.imported.length === 0 ? 'error' : 'success'
      );
    } catch (error) {
      setConfirmedRows(null);
      show(error instanceof Error ? error.message : 'The import failed — nothing was saved', 'error');
    }
  };

  const resendInvites = async (): Promise<void> => {
    if (!result || !branchId) return;
    const stillFailing: ImportEmployeesResult['inviteFailures'] = [];
    let sent = 0;
    for (const failure of result.inviteFailures) {
      const row = rows.find((r) => r.row === failure.row);
      if (!row?.roleId) {
        stillFailing.push(failure);
        continue;
      }
      try {
        await inviteMutation.mutateAsync({ email: row.email, firstName: row.firstName, lastName: row.lastName, roleId: row.roleId, branchIds: [branchId] });
        sent += 1;
      } catch (error) {
        stillFailing.push({ ...failure, message: error instanceof Error ? error.message : failure.message });
      }
    }
    setResult({ ...result, invitesSent: result.invitesSent + sent, inviteFailures: stillFailing });
    show(stillFailing.length ? `${plural(sent, 'invite')} sent · ${stillFailing.length} still failing` : `${plural(sent, 'invite')} resent`, stillFailing.length ? 'error' : 'success');
  };

  const next = (): void => {
    if (step === 1) {
      if (!file) show('Upload a file to continue', 'error');
      else setStep(2);
    } else if (step === 2) {
      if (errorRows.length) show('Fix the rows with issues and upload the file again, or skip them to import the valid rows', 'error');
      else if (validRows.length === 0) show('There are no valid rows to import', 'error');
      else setStep(3);
    } else if (step === 3) {
      void runImport();
    }
  };

  const doneSubs: [string, string, string] = [
    file?.name ?? 'Upload your file',
    `${stats.valid} valid, ${stats.total - stats.valid} ${stats.total - stats.valid === 1 ? 'issue' : 'issues'} skipped`,
    step === 4 ? 'Completed' : 'Confirm and import'
  ];

  const shownIssues = (issueTab === 'Errors' ? errorRows : issueTab === 'Warnings' ? warningRows : issueRowsList).filter((row) => {
    const query = search.trim().toLowerCase();
    return !query || row.name.toLowerCase().includes(query) || String(row.row) === query.replace(/^#/, '');
  });

  const summaryRows: Array<[string, string, string]> =
    step === 4 && result
      ? [
          ['Total Rows', String(stats.total), '#38312B'],
          ['Imported', String(result.imported.length), '#2E9E62'],
          ['Failed', String(result.failed.length), '#C93A22'],
          ['Invites Sent', String(result.invitesSent), '#38312B']
        ]
      : [
          ['Total Rows', String(stats.total), '#38312B'],
          ['Valid Rows', String(stats.valid), '#2E9E62'],
          ['Rows with Issues', String(stats.withIssues), '#C93A22'],
          ['Duplicates', String(stats.duplicates), '#38312B']
        ];

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader
        title="Import Employees"
        subtitle="Upload a file to import multiple employees at once."
        now={now}
      />

      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">
        <button type="button" onClick={() => navigate('/employees')} className="flex cursor-pointer items-center gap-2 self-start border-0 bg-transparent p-0 text-[13px] font-bold text-[#C6420E]">
          ← Back to Employees
        </button>

        <div className="grid grid-cols-[minmax(0,1fr)_262px] items-start gap-4 max-[859px]:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-4">
            {step < 4 ? <Stepper step={step} doneSubs={doneSubs} /> : null}

            {step === 1 ? (
              <>
                <section className={`${card} p-5`}>
                  <h2 className="m-0 text-[17px] font-extrabold tracking-normal">Step 1: Upload File</h2>
                  <p className="mb-4 mt-[5px] text-[12.5px] text-[#857A72]">
                    Upload your Excel or CSV file to get started.
                  </p>
                  {fileError ? (
                    <p role="alert" className="mb-3.5 mt-0 rounded-[13px] border border-solid border-[#F2C9BF] bg-[#FCEDEA] px-3.5 py-3 text-[12px] leading-[1.5] text-[#C93A22]">
                      {fileError}
                    </p>
                  ) : null}
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-stretch gap-4">
                    <div
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (!dragOver) setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragOver(false);
                        void acceptFile(event.dataTransfer.files[0]);
                      }}
                      className={[
                        'flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-[18px] py-[26px] text-center',
                        dragOver ? 'border-[#F04E17] bg-[#FDF0E9]' : 'border-[#E4DED9] bg-[#FDFCFB]'
                      ].join(' ')}
                    >
                      <span className="flex size-[46px] items-center justify-center rounded-[14px] bg-[#F2EEEA] text-[#857A72]">
                        <ScheduleIcon name="upload" size={20} />
                      </span>
                      <p className="mb-0 mt-3.5 text-[13px] font-bold text-[#57504A]">{reading ? 'Reading your file…' : 'Drag and drop your file here'}</p>
                      <p className="my-[9px] text-[11.5px] text-[#A79C93]">or</p>
                      <button type="button" disabled={reading} onClick={() => fileInput.current?.click()} className={softOrangeButton}>
                        📄 Choose File
                      </button>
                      <input
                        ref={fileInput}
                        type="file"
                        accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(event) => void acceptFile(event.target.files?.[0])}
                      />
                      <p className="mb-0 mt-3.5 text-[11px] text-[#A79C93]">Supports: .xlsx, .csv (Max size: 5MB)</p>
                    </div>
                    <div className="flex flex-col rounded-[14px] border border-solid border-[#EBE7E3] bg-[#FDFCFB] p-[18px]">
                      <h3 className="m-0 text-[13.5px] font-extrabold tracking-normal">Don&apos;t have a file?</h3>
                      <p className="mb-0 mt-2 text-[12px] leading-[1.55] text-[#857A72]">Download our template and add your employee details. Make sure to follow the format.</p>
                      <button
                        type="button"
                        onClick={() => {
                          const roleName = (rolesQuery.data ?? []).find((r) => !r.grants_org_wide_branch_access && /employee/i.test(r.name))?.name;
                          downloadText('shiftos-employee-import-template.csv', toCsv(templateRows(departmentsQuery.data?.[0]?.name, roleName)));
                          show('Template downloading');
                        }}
                        className={`${softOrangeButton} mt-auto self-start`}
                      >
                        <ScheduleIcon name="download" size={15} /> Download Template
                      </button>
                    </div>
                  </div>
                </section>

                <section className={`${card} overflow-hidden`}>
                  <div className="px-[18px] pb-3 pt-4">
                    <h2 className="m-0 text-[15px] font-extrabold tracking-normal">Recent Imports</h2>
                    <p className="mb-0 mt-1 text-[12px] text-[#857A72]">Your last 5 import activities.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_104px_84px_84px] gap-2.5 border-y border-solid border-[#F2EEEA] px-[18px] py-2.5 text-[9.5px] font-extrabold uppercase tracking-[.07em] text-[#A79C93]">
                        <span>File Name</span>
                        <span>Imported By</span>
                        <span>Date</span>
                        <span>Status</span>
                        <span>Records</span>
                        <span>Action</span>
                      </div>
                      {(importsQuery.data ?? []).length === 0 ? (
                        <p className="m-0 border-b border-solid border-[#F7F4F1] px-[18px] py-3 text-[12px] text-[#A79C93]">
                          {importsQuery.isLoading ? 'Loading imports…' : 'No imports yet — files you import will show here.'}
                        </p>
                      ) : (
                        (importsQuery.data ?? []).map((item) => {
                          const status = IMPORT_STATUS[item.status];
                          const created = new Date(item.created_at);
                          return (
                            <div
                              key={item.id}
                              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_104px_84px_84px] items-center gap-2.5 border-b border-solid border-[#F7F4F1] px-[18px] py-3"
                            >
                              <span className="flex min-w-0 items-center gap-[9px]">
                                <span className="text-[#2E9E62]">
                                  <ScheduleIcon name="file" size={15} />
                                </span>
                                <span className="truncate text-[12.5px] font-bold">{item.file_name}</span>
                              </span>
                              <span className="min-w-0 truncate text-[12px] text-[#57504A]">{item.imported_by_name || '—'}</span>
                              <span className="min-w-0 truncate text-[12px] text-[#857A72]">{`${pillDate(created)} ${clock12(created)}`}</span>
                              <span>
                                <Pill tone={status.tone}>{status.label}</Pill>
                              </span>
                              <span className="text-[12.5px] font-bold">{item.status === 'failed' ? item.total_rows : item.imported_count}</span>
                              <button
                                type="button"
                                onClick={() => setViewing(item)}
                                className="cursor-pointer border-0 bg-transparent p-0 text-left text-[12px] font-bold"
                                style={{ color: item.failed_count ? '#C93A22' : '#C6420E' }}
                              >
                                {item.failed_count ? 'View Errors' : 'View'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <p className="m-0 flex items-center gap-2 px-[18px] py-3 text-[11.5px] text-[#A79C93]">🔒 Your data is secure and will only be used for your organization.</p>
                </section>
              </>
            ) : null}

            {step === 2 ? (
              <section className={`${card} p-5`}>
                <h2 className="m-0 text-[17px] font-extrabold tracking-normal">Step 2: Validate Data</h2>
                <p className="mb-4 mt-[5px] text-[12.5px] text-[#857A72]">
                  {!lookupsReady
                    ? 'Checking every row against your departments, roles and employee list…'
                    : stats.withIssues
                      ? `We found ${plural(stats.withIssues, 'row')} with issues that need your attention. Please fix them to continue.`
                      : stats.duplicates
                        ? `Every row passed validation. ${plural(stats.duplicates, 'duplicate row')} will be left out.`
                        : `All ${plural(stats.total, 'row')} passed validation. You're ready to import.`}
                </p>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
                  {(
                    [
                      { label: 'Total Rows', value: stats.total, meta: 'From file', icon: 'checkCircle', tone: 'ok' },
                      { label: 'Valid Rows', value: stats.valid, meta: 'Ready to import', icon: 'checkCircle', tone: 'ok' },
                      { label: 'Rows with Issues', value: stats.withIssues, meta: 'Needs attention', icon: 'alert', tone: 'warn' },
                      { label: 'Duplicates', value: stats.duplicates, meta: stats.duplicates ? 'Will be left out' : 'No duplicates found', icon: 'info', tone: 'neutral' }
                    ] as const
                  ).map((s) => (
                    <div
                      key={s.label}
                      className="rounded-[14px] border border-solid p-[15px]"
                      style={s.tone === 'warn' ? { borderColor: '#F3DCB8', background: '#FEFAF3' } : { borderColor: '#EBE7E3', background: '#fff' }}
                    >
                      <div className="flex items-center gap-[9px]">
                        <IconTile icon={s.icon} tone={s.tone} size={28} radius={9} iconSize={14} />
                        <p className="m-0 text-[11.5px] font-bold text-[#857A72]">{s.label}</p>
                      </div>
                      <p className="mb-0 mt-2.5 text-[24px] font-extrabold leading-none tracking-[-0.03em]">{s.value}</p>
                      <p className="mb-0 mt-[5px] text-[11px] text-[#A79C93]">{s.meta}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-[18px] flex flex-wrap items-center gap-[9px]">
                  <label className="min-w-[180px] flex-[1_1_220px]">
                    <span className="sr-only">Search rows</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name or row number..."
                      className="box-border h-[38px] w-full rounded-[10px] border border-solid border-[#E4DED9] px-3 text-[12.5px] outline-none focus:border-[#F04E17]"
                    />
                  </label>
                  {(
                    [
                      ['All', issueRowsList.length],
                      ['Errors', errorRows.length],
                      ['Warnings', warningRows.length]
                    ] as const
                  ).map(([tab, count]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setIssueTab(tab)}
                      className="h-[38px] cursor-pointer rounded-[9px] border border-solid px-[13px] text-[11.5px] font-bold"
                      style={issueTab === tab ? { borderColor: '#F04E17', background: '#FDF0E9', color: '#C6420E' } : { borderColor: '#EBE7E3', background: '#fff', color: '#857A72' }}
                    >
                      {tab} ({count})
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={issueRowsList.length === 0}
                    onClick={() => {
                      downloadText(`${(file?.name ?? 'import').replace(/\.[^.]+$/, '')}-issues.csv`, toCsv(issueRows(rows)));
                      show('Issues downloading');
                    }}
                    className="ml-auto flex h-[38px] cursor-pointer items-center gap-[7px] rounded-[10px] border border-solid border-[#E4DED9] bg-white px-[13px] text-[12.5px] font-bold text-black disabled:cursor-default disabled:opacity-50"
                  >
                    <ScheduleIcon name="download" size={15} /> Download Issues
                  </button>
                </div>

                <div className="mt-3.5 overflow-hidden rounded-[14px] border border-solid border-[#EBE7E3]">
                  <div className="overflow-x-auto">
                    <div className="min-w-[720px]">
                      <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_40px] gap-2.5 border-b border-solid border-[#F2EEEA] bg-[#FDFCFB] px-3.5 py-2.5 text-[9.5px] font-extrabold uppercase tracking-[.07em] text-[#A79C93]">
                        <span>Row</span>
                        <span>Full Name</span>
                        <span>Email</span>
                        <span>Department</span>
                        <span>Role</span>
                        <span>Date of Joining</span>
                        <span>Errors</span>
                        <span />
                      </div>
                      {shownIssues.length === 0 ? (
                        <p className="m-0 px-3.5 py-[13px] text-[12px] text-[#A79C93]">{issueRowsList.length ? 'No rows match your search.' : 'No rows with issues — every row is ready to import.'}</p>
                      ) : (
                        shownIssues.map((row) => (
                          <IssueRow
                            key={row.row}
                            row={row}
                            open={expanded.has(row.row)}
                            onToggle={() =>
                              setExpanded((current) => {
                                const nextSet = new Set(current);
                                if (nextSet.has(row.row)) nextSet.delete(row.row);
                                else nextSet.add(row.row);
                                return nextSet;
                              })
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <p className="mb-0 mt-3 text-[11.5px] text-[#A79C93]">
                  Showing {shownIssues.length} of {plural(issueRowsList.length, 'row')} with issues
                </p>
              </section>
            ) : null}

            {step === 3 ? (
              <section className={`${card} p-5`}>
                <h2 className="m-0 text-[17px] font-extrabold tracking-normal">Step 3: Confirm and Import</h2>
                <p className="mb-4 mt-[5px] text-[12.5px] text-[#857A72]">You&apos;re all set! Please review the summary below and import your employees.</p>
                <div className="flex items-center gap-3 rounded-[14px] border border-solid border-[#BFE6CF] bg-[#F1FAF5] px-4 py-3.5">
                  <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-[#2E9E62] text-white">
                    <ScheduleIcon name="checkCircle" size={17} />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-extrabold text-[#1E6B45]">All set to import!</span>
                    <span className="mt-0.5 block text-[12px] text-[#2A6B4A]">
                      You have {plural(validRows.length, 'valid employee')} ready to be imported into your organization.
                    </span>
                  </span>
                </div>

                <div className="mt-4 rounded-[15px] border border-solid border-[#EBE7E3] p-[18px]">
                  <h3 className="mb-3.5 mt-0 text-[14px] font-extrabold tracking-normal">Import Summary</h3>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                    <div className="flex items-center gap-3">
                      <IconTile icon="users" tone="primary" size={40} radius={13} iconSize={18} />
                      <span>
                        <span className="block text-[26px] font-extrabold leading-none tracking-[-0.03em]">{validRows.length}</span>
                        <span className="mt-1 block text-[11.5px] text-[#857A72]">Employees to be imported</span>
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <IconTile icon="mail" tone="info" size={40} radius={13} iconSize={18} />
                      <span>
                        <span className="block text-[26px] font-extrabold leading-none tracking-[-0.03em]">{invitesToSend}</span>
                        <span className="mt-1 block text-[11.5px] font-bold">Invites will be sent</span>
                        <span className="mt-0.5 block text-[11px] text-[#857A72]">
                          {canInvite
                            ? 'Employees will receive an email with login details and setup instructions.'
                            : "You can't send invitations, so nobody will be emailed."}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 border-t border-solid border-[#F2EEEA] pt-4">
                    <div>
                      <p className="mb-2.5 mt-0 text-[12.5px] font-extrabold">Breakdown</p>
                      <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {departmentBreakdown(rows).map((b) => (
                          <li key={b.name} className="flex items-center gap-2 text-[12px]">
                            <span className="size-[9px] flex-none rounded-[3px]" style={{ background: b.color }} />
                            <span className="flex-auto text-[#57504A]">{b.name}</span>
                            <span className="font-bold">{b.n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2.5 mt-0 text-[12.5px] font-extrabold">Sample of Employees</p>
                      <ul className="m-0 flex list-none flex-col gap-[9px] p-0">
                        {validRows.slice(0, 3).map((row) => (
                          <li key={row.row} className="flex min-w-0 items-center gap-[9px]">
                            <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(row.name)}>
                              {initialsOf(row.name)}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[12px] font-bold">{row.name}</span>
                              <span className="block truncate text-[10.5px] text-[#A79C93]">{row.email}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      {validRows.length > 3 ? (
                        <span className="mt-2.5 inline-flex rounded-full bg-[#EFF4FE] px-[11px] py-1 text-[11px] font-bold text-[#1F4699]">+{validRows.length - 3} more</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-[11px] rounded-[13px] border border-solid border-[#CFE0FB] bg-[#F4F7FE] px-3.5 py-[13px]">
                    <span className="flex-none text-[#2563EB]">
                      <ScheduleIcon name="info" size={16} />
                    </span>
                    <span className="text-[12px] text-[#1F4699]">
                      <strong className="font-extrabold">What happens next?</strong> Once imported, these employees will be added to your organization and can be assigned to shifts, tasks, and
                      schedules.
                    </span>
                  </div>
                </div>
              </section>
            ) : null}

            {step === 4 && result ? (
              <SuccessView
                result={result}
                skipped={stats.total - stats.valid}
                doneSubs={doneSubs}
                onGo={navigate}
                onImportMore={reset}
              />
            ) : null}

            {step < 4 ? (
              <div className={`${card} flex flex-wrap items-center gap-2.5 px-[18px] py-3.5`}>
                <button type="button" onClick={() => navigate('/employees')} className={outlineButton}>
                  Cancel
                </button>
                {step > 1 ? (
                  <button type="button" disabled={importMutation.isPending} onClick={() => setStep((step - 1) as Step)} className={outlineButton}>
                    ← Back
                  </button>
                ) : null}
                <span className="ml-auto flex flex-wrap items-center gap-2.5">
                  {step === 2 ? (
                    <button
                      type="button"
                      disabled={!lookupsReady || validRows.length === 0}
                      onClick={() => setStep(3)}
                      className={`${outlineButton} px-[17px]`}
                    >
                      Skip &amp; Import Valid Rows
                    </button>
                  ) : null}
                  {step === 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        downloadText(`${(file?.name ?? 'import').replace(/\.[^.]+$/, '')}-template.csv`, toCsv(validRowsTable(rows)));
                        show('Saved as template');
                      }}
                      className={`${outlineButton} px-[17px]`}
                    >
                      Save as Template
                    </button>
                  ) : null}
                  <span className="flex flex-col items-end gap-[5px]">
                    <button type="button" disabled={(step === 2 && !lookupsReady) || importMutation.isPending || reading} onClick={next} className={primaryButton}>
                      {step === 1 ? 'Next →' : step === 2 ? 'Next: Import →' : importMutation.isPending ? 'Importing…' : `Import ${plural(validRows.length, 'Employee')}`}
                    </button>
                    {step === 3 ? <span className="text-[10.5px] text-[#A79C93]">🔒 This action cannot be undone.</span> : null}
                  </span>
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            {step === 1 ? (
              <>
                <HowItWorksCard />
                <RequiredColumnsCard />
              </>
            ) : file ? (
              <ImportSummaryCard
                fileName={file.name}
                meta={step === 4 && importedAt ? `Imported on ${stamp(importedAt)}` : `Uploaded on ${stamp(file.uploadedAt)}`}
                rows={summaryRows}
                footer={
                  step === 4 && result ? (
                    <div className="mt-3.5 border-t border-solid border-[#F2EEEA] pt-[13px]">
                      <p className="m-0 flex items-start gap-[9px] text-[11.5px] leading-[1.5] text-[#1E6B45]">
                        <span className="text-[#2E9E62]">
                          <ScheduleIcon name="checkCircle" size={13} />
                        </span>
                        <span>
                          <strong className="font-extrabold">{result.failed.length ? 'Done.' : 'All set!'}</strong>{' '}
                          {result.invitesSent
                            ? 'Your employees have been added to the system and email invites have been sent.'
                            : 'Your employees have been added to the system.'}
                          {result.inviteFailures.length ? ` ${plural(result.inviteFailures.length, 'invite')} couldn't be sent.` : ''}
                        </span>
                      </p>
                      {result.inviteFailures.length ? (
                        <button
                          type="button"
                          disabled={inviteMutation.isPending}
                          onClick={() => void resendInvites()}
                          className="mt-2.5 cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-bold text-[#2E9E62]"
                        >
                          {inviteMutation.isPending ? 'Resending…' : 'Resend Invites →'}
                        </button>
                      ) : null}
                    </div>
                  ) : null
                }
              />
            ) : null}
            {step === 2 ? <TipsCard /> : null}
            {step === 3 ? <WhatGetsImportedCards onLearnSecurity={() => show('The security overview page is coming soon')} /> : null}
            <HelpCard step={step} onContactSupport={() => show('Support is coming soon — the contact page is being set up')} />
          </div>
        </div>
      </div>

      {viewing ? (
        <ImportModal
          title={viewing.file_name}
          subtitle={`${IMPORT_STATUS[viewing.status].label} · ${stamp(new Date(viewing.created_at))}${viewing.imported_by_name ? ` · ${viewing.imported_by_name}` : ''}`}
          onClose={() => setViewing(null)}
        >
          <dl className="m-0 mt-4 grid grid-cols-2 gap-2.5 rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] p-3.5">
            {(
              [
                ['Imported', viewing.imported_count],
                ['Failed', viewing.failed_count],
                ['Skipped at validation', viewing.skipped_count],
                ['Invites sent', viewing.invites_sent]
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] text-[#857A72]">{label}</dt>
                <dd className="m-0 text-[18px] font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
          {viewing.errors.length ? (
            <ul className="m-0 mt-3.5 flex list-none flex-col gap-2 p-0">
              {viewing.errors.map((error) => (
                <li key={`${error.row}-${error.message}`} className="text-[12px] leading-[1.5] text-[#57504A]">
                  <strong className="font-extrabold text-[#38312B]">Row {error.row}</strong> · {error.name} — <span className="text-[#C93A22]">{error.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-0 mt-3.5 text-[12px] text-[#857A72]">Every row sent in this import was saved.</p>
          )}
        </ImportModal>
      ) : null}

      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}

function IssueRow({ row, open, onToggle }: { row: ImportRow; open: boolean; onToggle: () => void }): React.ReactElement {
  const value = (bad: boolean): string => `block text-[12px] ${bad ? 'text-[#C93A22]' : 'text-[#57504A]'}`;
  const err = (text?: string, warn = false): React.ReactNode => (text ? <span className={`mt-[3px] block text-[10.5px] ${warn ? 'text-[#B77714]' : 'text-[#C93A22]'}`}>{text}</span> : null);
  const count = errorCount(row) + (row.duplicateOf ? 1 : 0);
  const hireDate = row.hireDate && !row.errors.hireDate ? displayDate(row.hireDate) : row.hireDateText || '—';
  return (
    <div className="border-b border-solid border-[#F7F4F1]">
      <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_40px] items-start gap-2.5 px-3.5 py-[13px]">
        <span className="text-[12.5px] font-extrabold text-[#38312B]">{row.row}</span>
        <span className="min-w-0 text-[12.5px] font-bold">
          {row.name || '—'}
          {err(row.errors.name)}
        </span>
        <span className="min-w-0 break-words">
          <span className={value(Boolean(row.errors.email))}>{row.email || '—'}</span>
          {err(row.errors.email)}
          {err(row.duplicateOf ?? undefined, true)}
        </span>
        <span className="min-w-0">
          {row.errors.department ? (
            <span className="inline-flex rounded-[7px] bg-[#FCEDEA] px-2 py-0.5 text-[11.5px] font-bold text-[#C93A22]">{row.department || '—'}</span>
          ) : (
            <span className={value(false)}>{row.department}</span>
          )}
          {err(row.errors.department)}
        </span>
        <span className="min-w-0">
          <span className={value(Boolean(row.errors.role))}>{row.role || '—'}</span>
          {err(row.errors.role)}
        </span>
        <span className="min-w-0">
          <span className={value(Boolean(row.errors.hireDate))}>{hireDate}</span>
          {err(row.errors.hireDate)}
        </span>
        <span>
          <Pill tone={errorCount(row) ? 'bad' : 'warn'}>{count}</Pill>
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? 'Collapse row' : 'Expand row'}
          aria-expanded={open}
          className="size-[26px] cursor-pointer justify-self-end rounded-[8px] border-0 bg-transparent text-[12px] text-[#A79C93]"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        >
          ⌄
        </button>
      </div>
      {open ? (
        <div className="-mt-1 px-3.5 pb-3 pl-[80px] text-[11.5px] leading-[1.6] text-[#57504A]">
          <span className="block">
            Phone: {row.phone || '—'}
            {row.errors.phone ? <span className="text-[#C93A22]"> — {row.errors.phone}</span> : null}
          </span>
          <span className="block">
            Date of birth: {row.dateOfBirthText || '—'}
            {row.errors.dateOfBirth ? <span className="text-[#C93A22]"> — {row.errors.dateOfBirth}</span> : null}
          </span>
          <span className="block">
            Employee ID: {row.employeeNumber || 'Assigned automatically'}
            {row.errors.employeeNumber ? <span className="text-[#C93A22]"> — {row.errors.employeeNumber}</span> : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

const SUCCESS_NEXT: Array<{ title: string; body: string; icon: 'calendar' | 'users' | 'clipboard' | 'upload'; tone: Tone; to: string | null }> = [
  { title: 'Assign Shifts', body: 'Create schedules and assign shifts to your new team.', icon: 'calendar', tone: 'primary', to: '/schedules' },
  { title: 'View Employees', body: 'Explore the full list of employees you just imported.', icon: 'users', tone: 'info', to: '/employees' },
  { title: 'Set Up Tasks', body: 'Create and assign tasks to keep your team on track.', icon: 'clipboard', tone: 'violet', to: '/tasks' },
  { title: 'Import More', body: 'Import more employees or update your existing data.', icon: 'upload', tone: 'ok', to: null }
];

function SuccessView({
  result,
  skipped,
  doneSubs,
  onGo,
  onImportMore
}: {
  result: ImportEmployeesResult;
  skipped: number;
  doneSubs: [string, string, string];
  onGo: (to: string) => void;
  onImportMore: () => void;
}): React.ReactElement {
  const imported = result.imported.length;
  const failed = result.failed.length;
  const title = imported === 0 ? "We couldn't import these employees" : failed ? 'Your import finished with some errors' : 'Your employees have been imported successfully!';
  return (
    <>
      <section className={`${card} p-5`}>
        <Stepper step={4} doneSubs={doneSubs} framed={false} />
      </section>

      <section className={`${card} px-5 py-8 text-center`}>
        <span className="mx-auto flex size-[76px] items-center justify-center rounded-full text-white" style={{ background: imported === 0 ? '#C93A22' : '#2E9E62' }}>
          <ScheduleIcon name={imported === 0 ? 'alert' : 'checkCircle'} size={34} />
        </span>
        <h2 className="mb-0 mt-5 text-[23px] font-extrabold tracking-[-0.025em]">{title}</h2>
        <p className="mb-0 mt-[9px] text-[13px] text-[#857A72]">
          {imported === 0 ? 'None of the rows could be saved — see why below.' : `${plural(imported, 'employee')} ${imported === 1 ? 'is' : 'are'} now part of your organization.`}
        </p>
        <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 text-left">
          {(
            [
              { label: 'Employees Imported Successfully', value: imported, icon: 'users', tone: 'ok' },
              { label: 'Invites Sent via Email', value: result.invitesSent, icon: 'mail', tone: 'violet' },
              { label: 'Failed to Import', value: failed, icon: 'file', tone: 'info' },
              { label: 'Rows Skipped at Validation', value: skipped, icon: 'edit', tone: 'primary' }
            ] as const
          ).map((s) => (
            <div key={s.label} className="flex items-center gap-[11px] rounded-[14px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] p-3.5">
              <IconTile icon={s.icon} tone={s.tone} size={34} radius={11} iconSize={16} />
              <span className="min-w-0">
                <span className="block text-[22px] font-extrabold leading-none tracking-[-0.03em]">{s.value}</span>
                <span className="mt-1 block text-[11px] text-[#857A72]">{s.label}</span>
              </span>
            </div>
          ))}
        </div>
        {failed ? (
          <ul className="m-0 mt-5 flex list-none flex-col gap-2 rounded-[13px] border border-solid border-[#F2C9BF] bg-[#FCEDEA] p-3.5 text-left">
            {result.failed.map((failure) => (
              <li key={`${failure.row}-${failure.message}`} className="text-[12px] leading-[1.5] text-[#57504A]">
                <strong className="font-extrabold text-[#38312B]">Row {failure.row}</strong> · {failure.name} — <span className="text-[#C93A22]">{failure.message}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={`${card} p-5`}>
        <h3 className="m-0 text-[15px] font-extrabold tracking-normal">What would you like to do next?</h3>
        <p className="mb-4 mt-[5px] text-[12px] text-[#857A72]">We&apos;ve got a few suggestions to help you get started.</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
          {SUCCESS_NEXT.map((n) => (
            <button
              key={n.title}
              type="button"
              onClick={() => (n.to ? onGo(n.to) : onImportMore())}
              className="cursor-pointer rounded-[14px] border border-solid border-[#EBE7E3] bg-white p-4 text-left text-[13.3333px] text-black hover:border-[#F04E17]"
            >
              <IconTile icon={n.icon} tone={n.tone} size={34} radius={11} iconSize={16} />
              <span className="mt-3 block text-[13px] font-extrabold">{n.title}</span>
              <span className="mt-1 block text-[11.5px] leading-[1.5] text-[#857A72]">{n.body}</span>
              <span className="mt-3 block text-[14px] text-[#57504A]">→</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-center">
        <button type="button" onClick={() => onGo('/employees')} className={`${primaryButton} h-[46px] px-6 text-[14px]`}>
          Go to Employees →
        </button>
      </div>
    </>
  );
}
