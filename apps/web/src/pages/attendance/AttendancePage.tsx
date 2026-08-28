import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  type BadgeTone,
  Button,
  Checkbox,
  DataTable,
  FormField,
  InlineError,
  Modal,
  PageContainer,
  PageHeader,
  PermissionDenied,
  Select,
  Textarea
} from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { AttendanceRecord, AttendanceStatus, Branch, Employee } from '../../types/domain.js';

/**
 * Correction-log row shape (packages/repositories/src/attendance/attendanceCorrectionRepository.ts's
 * AttendanceCorrection). Not one of Task 1's client-side domain mirrors —
 * this is the only page that reads it, so it's kept local rather than
 * added to types/domain.ts.
 */
interface AttendanceCorrection {
  id: string;
  organization_id: string;
  attendance_record_id: string;
  original_status: AttendanceStatus;
  original_clock_in: string | null;
  original_clock_out: string | null;
  corrected_status: AttendanceStatus;
  corrected_clock_in: string | null;
  corrected_clock_out: string | null;
  reason: string;
  approved_by: string | null;
  approved_at: string;
  created_at: string;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  scheduled: 'Scheduled',
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  no_show: 'No-show',
  left_early: 'Left early',
  completed: 'Completed'
};

const STATUS_TONE: Record<AttendanceStatus, BadgeTone> = {
  scheduled: 'neutral',
  present: 'success',
  late: 'warning',
  absent: 'error',
  no_show: 'error',
  left_early: 'warning',
  completed: 'success'
};

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = (
  Object.keys(STATUS_LABEL) as AttendanceStatus[]
).map((value) => ({ value, label: STATUS_LABEL[value] }));

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric'
  });
  return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function recordDate(record: AttendanceRecord): string {
  return formatDate(record.clock_in_at ?? record.created_at);
}

function canShowMarkAbsent(record: AttendanceRecord, canUpdate: boolean): boolean {
  // Mirrors AttendanceService.markAbsent's own guard: only a still-'scheduled'
  // record can be marked absent/no-show — anything already touched (present,
  // late, absent, etc.) is rejected server-side.
  return canUpdate && record.attendance_status === 'scheduled';
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function MarkAbsentForm({
  onSubmit,
  onDone
}: {
  onSubmit: (input: { noShow: boolean; notes?: string }) => Promise<unknown>;
  onDone: () => void;
}): React.ReactElement {
  const [noShow, setNoShow] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ noShow, notes: notes.trim() || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark this record absent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex items-start gap-2 text-sm text-neutral-800">
        <Checkbox checked={noShow} onChange={(e) => setNoShow(e.target.checked)} className="mt-0.5" />
        <span>
          This was a no-show <span className="text-neutral-500">(never showed up, no notice — vs. a plain excused absence)</span>
        </span>
      </label>
      <FormField label="Notes" htmlFor="markAbsentNotes" hint="Optional — visible on this record.">
        {(fieldProps) => <Textarea {...fieldProps} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </FormField>
      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={submitting} variant="destructive" fullWidth>
        {noShow ? 'Mark as no-show' : 'Mark absent'}
      </Button>
    </form>
  );
}

function CorrectionForm({
  record,
  onSubmit,
  onDone
}: {
  record: AttendanceRecord;
  onSubmit: (input: {
    correctedStatus: AttendanceStatus;
    correctedClockIn?: string;
    correctedClockOut?: string;
    reason: string;
  }) => Promise<unknown>;
  onDone: () => void;
}): React.ReactElement {
  const [status, setStatus] = useState<AttendanceStatus>(record.attendance_status);
  const [clockIn, setClockIn] = useState(toDatetimeLocalValue(record.clock_in_at));
  const [clockOut, setClockOut] = useState(toDatetimeLocalValue(record.clock_out_at));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!reason.trim()) {
      setError('A reason is required for a correction.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        correctedStatus: status,
        correctedClockIn: fromDatetimeLocalValue(clockIn),
        correctedClockOut: fromDatetimeLocalValue(clockOut),
        reason: reason.trim()
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record this correction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Corrected status" htmlFor="correctionStatus" required>
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            options={STATUS_OPTIONS}
          />
        )}
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Corrected clock in" htmlFor="correctionClockIn">
          {(fieldProps) => <input {...fieldProps} type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)} className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-[0.9375rem] text-neutral-900" />}
        </FormField>
        <FormField label="Corrected clock out" htmlFor="correctionClockOut">
          {(fieldProps) => <input {...fieldProps} type="datetime-local" value={clockOut} onChange={(e) => setClockOut(e.target.value)} className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-[0.9375rem] text-neutral-900" />}
        </FormField>
      </div>
      <FormField label="Reason" htmlFor="correctionReason" required hint="Recorded in this employee's correction history.">
        {(fieldProps) => <Textarea {...fieldProps} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </FormField>
      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={submitting} fullWidth>
        Save correction
      </Button>
    </form>
  );
}

function AttendanceDetailModal({
  record,
  open,
  onClose,
  employeeName
}: {
  record: AttendanceRecord | null;
  open: boolean;
  onClose: () => void;
  employeeName: string;
}): React.ReactElement {
  const {
    data: corrections,
    isLoading,
    error,
    refetch
  } = useRpcQuery<AttendanceCorrection[]>(
    'list_attendance_corrections',
    record ? { attendanceRecordId: record.id } : undefined,
    { enabled: Boolean(record) && open }
  );

  return (
    <Modal open={open} onClose={onClose} title={employeeName || 'Attendance record'} description={record ? recordDate(record) : undefined}>
      {record ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-neutral-500">Status</p>
              <Badge tone={STATUS_TONE[record.attendance_status]}>{STATUS_LABEL[record.attendance_status]}</Badge>
            </div>
            <div>
              <p className="text-neutral-500">Worked</p>
              <p className="text-neutral-800">{record.worked_minutes} min</p>
            </div>
            <div>
              <p className="text-neutral-500">Clock in</p>
              <p className="text-neutral-800">{formatTime(record.clock_in_at)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Clock out</p>
              <p className="text-neutral-800">{formatTime(record.clock_out_at)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Late</p>
              <p className="text-neutral-800">{record.late_minutes} min</p>
            </div>
            <div>
              <p className="text-neutral-500">Overtime</p>
              <p className="text-neutral-800">{record.overtime_minutes} min</p>
            </div>
          </div>
          {record.notes ? (
            <div>
              <p className="text-xs font-medium text-neutral-500">Notes</p>
              <p className="mt-1 text-sm text-neutral-800">{record.notes}</p>
            </div>
          ) : null}
          <div>
            <p className="mb-2 text-xs font-medium text-neutral-500">Correction history</p>
            {isLoading ? (
              <p className="text-sm text-neutral-500">Loading history…</p>
            ) : error ? (
              <InlineError message={(error as Error).message} />
            ) : !corrections || corrections.length === 0 ? (
              <p className="text-sm text-neutral-500">No corrections recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {corrections.map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm text-neutral-800">
                        <Badge tone={STATUS_TONE[entry.original_status]}>{STATUS_LABEL[entry.original_status]}</Badge>
                        {'→'}
                        <Badge tone={STATUS_TONE[entry.corrected_status]}>{STATUS_LABEL[entry.corrected_status]}</Badge>
                      </span>
                      <span className="text-xs text-neutral-500">{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-700">{entry.reason}</p>
                  </li>
                ))}
              </ul>
            )}
            {error ? (
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => void refetch()}>
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

/** Manager/Supervisor attendance management — see Task 3 of the Workforce Operations plan. Gated entirely by hasPermission('attendance.read'); an Employee's own clock-in/out lives on the dashboard instead (Task 6), never here. */
export default function AttendancePage(): React.ReactElement {
  const { hasPermission } = useSession();
  const canRead = hasPermission('attendance.read');
  const canUpdate = hasPermission('attendance.update');
  const canCorrect = hasPermission('attendance.correct');
  const canReadEmployees = hasPermission('employees.read');

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [branchId, setBranchId] = useState('');
  const [markAbsentTarget, setMarkAbsentTarget] = useState<AttendanceRecord | null>(null);
  const [correctTarget, setCorrectTarget] = useState<AttendanceRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<AttendanceRecord | null>(null);

  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canRead });
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canRead && canReadEmployees });

  useEffect(() => {
    if (!branchId && branches && branches.length > 0) {
      setBranchId(branches[0]!.id);
    }
  }, [branches, branchId]);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const startIso = useMemo(() => weekStart.toISOString(), [weekStart]);
  const endIso = useMemo(() => new Date(addDays(weekStart, 7).getTime() - 1).toISOString(), [weekStart]);

  const {
    data: records,
    isLoading,
    error,
    refetch
  } = useRpcQuery<AttendanceRecord[]>(
    'list_attendance_for_branch_and_range',
    { branchId, startIso, endIso },
    { enabled: canRead && Boolean(branchId) }
  );

  const employeeNameById = useMemo(
    () => new Map((employees ?? []).map((e) => [e.id, `${e.first_name} ${e.last_name}`])),
    [employees]
  );
  const branchOptions = useMemo(() => (branches ?? []).map((b) => ({ value: b.id, label: b.name })), [branches]);

  const sortedRecords = useMemo(
    () => [...(records ?? [])].sort((a, b) => (a.clock_in_at ?? a.created_at).localeCompare(b.clock_in_at ?? b.created_at)),
    [records]
  );

  const markAbsentMutation = useRpcMutation<AttendanceRecord, { shiftAssignmentId: string; noShow: boolean; notes?: string }>(
    'mark_attendance_absent',
    { invalidates: ['list_attendance_for_branch_and_range'] }
  );
  const correctionMutation = useRpcMutation<
    AttendanceRecord,
    { attendanceRecordId: string; correctedStatus: AttendanceStatus; correctedClockIn?: string; correctedClockOut?: string; reason: string }
  >('record_attendance_correction', { invalidates: ['list_attendance_for_branch_and_range', 'list_attendance_corrections'] });

  if (!canRead) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }

  const noAccessibleBranch = Boolean(branches) && branches!.length === 0;

  return (
    <PageContainer>
      <PageHeader title="Attendance" description="Attendance for the branches you can access, week by week." />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        {branchOptions.length > 1 ? (
          <div className="max-w-xs">
            <Select
              aria-label="Branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              options={branchOptions}
            />
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setWeekStart((s) => addDays(s, -7))}>
            ‹ Prev week
          </Button>
          <span className="text-sm font-medium text-neutral-700">{formatWeekLabel(weekStart, weekEnd)}</span>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart((s) => addDays(s, 7))}>
            Next week ›
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            This week
          </Button>
        </div>
      </div>

      <DataTable<AttendanceRecord>
        columns={[
          {
            key: 'employee',
            header: 'Employee',
            primary: true,
            render: (r) => (
              <button type="button" onClick={() => setDetailRecord(r)} className="text-left font-medium text-neutral-900 hover:underline">
                {employeeNameById.get(r.employee_id) ?? r.employee_id}
              </button>
            )
          },
          { key: 'date', header: 'Date', render: (r) => recordDate(r) },
          { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.attendance_status]}>{STATUS_LABEL[r.attendance_status]}</Badge> },
          { key: 'clockIn', header: 'Clock in', render: (r) => formatTime(r.clock_in_at) },
          { key: 'clockOut', header: 'Clock out', render: (r) => formatTime(r.clock_out_at) },
          { key: 'worked', header: 'Worked', render: (r) => `${r.worked_minutes}m` },
          { key: 'late', header: 'Late', render: (r) => (r.late_minutes > 0 ? `${r.late_minutes}m` : '—') },
          { key: 'overtime', header: 'OT', render: (r) => (r.overtime_minutes > 0 ? `${r.overtime_minutes}m` : '—') },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex flex-wrap items-center justify-end gap-3">
                {canShowMarkAbsent(r, canUpdate) ? (
                  <button type="button" className="text-sm font-medium text-error-600 hover:underline" onClick={() => setMarkAbsentTarget(r)}>
                    Mark absent
                  </button>
                ) : null}
                {canCorrect ? (
                  <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setCorrectTarget(r)}>
                    Correct
                  </button>
                ) : null}
              </div>
            )
          }
        ]}
        rows={sortedRecords}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? (error as Error).message : undefined}
        onRetry={() => void refetch()}
        emptyTitle={noAccessibleBranch ? 'No accessible branch' : 'No attendance records this week'}
        emptyDescription={
          noAccessibleBranch
            ? "You don't have access to any branch yet."
            : 'Records appear once a shift starts — clock-ins, marked absences and corrections all show up here.'
        }
      />

      <Modal open={Boolean(markAbsentTarget)} onClose={() => setMarkAbsentTarget(null)} title="Mark absent" description={markAbsentTarget ? employeeNameById.get(markAbsentTarget.employee_id) ?? undefined : undefined}>
        {markAbsentTarget ? (
          <MarkAbsentForm
            onSubmit={(input) => markAbsentMutation.mutateAsync({ shiftAssignmentId: markAbsentTarget.shift_assignment_id, ...input })}
            onDone={() => setMarkAbsentTarget(null)}
          />
        ) : null}
      </Modal>

      <Modal open={Boolean(correctTarget)} onClose={() => setCorrectTarget(null)} title="Correct attendance" description={correctTarget ? employeeNameById.get(correctTarget.employee_id) ?? undefined : undefined}>
        {correctTarget ? (
          <CorrectionForm
            record={correctTarget}
            onSubmit={(input) => correctionMutation.mutateAsync({ attendanceRecordId: correctTarget.id, ...input })}
            onDone={() => setCorrectTarget(null)}
          />
        ) : null}
      </Modal>

      <AttendanceDetailModal
        record={detailRecord}
        open={Boolean(detailRecord)}
        onClose={() => setDetailRecord(null)}
        employeeName={detailRecord ? employeeNameById.get(detailRecord.employee_id) ?? 'Attendance record' : ''}
      />
    </PageContainer>
  );
}
