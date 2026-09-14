import React, { useMemo, useRef, useState } from 'react';
import { useRpcMutation, useRpcQuery } from '../../../lib/useRpc.js';
import type { Member, Schedule, ScheduleConflict, ScheduleVersion } from '../../../types/domain.js';
import { AddEmployeeModal } from './AddEmployeeModal.js';
import { AiAssistantPanel, type AiActionKey } from './AiAssistantPanel.js';
import { ScheduleConflictsPanel } from './ScheduleConflictsPanel.js';
import { ScheduleIcon } from './ScheduleIcon.js';
import { ScheduleImportModal } from './ScheduleImportModal.js';
import type { ScheduleImportContext, ScheduleImportRow } from './scheduleImportModel.js';
import { OVER_HOURS_MINUTES, ScheduleSummaryBar } from './ScheduleSummaryBar.js';
import type { ToastTone } from './ScheduleToast.js';
import { ShiftCard, type ShiftCardMenuItem } from './ShiftCard.js';
import { ShiftCell } from './ShiftCell.js';
import { ShiftDraftsTray } from './ShiftDraftsTray.js';
import { ShiftFormModal, type ShiftFormValues } from './ShiftFormModal.js';
import { VersionHistoryModal } from './VersionHistoryModal.js';
import {
  TONES,
  avatarTone,
  clockMinutes,
  durationText,
  initialsOf,
  isoWeekNumber,
  shiftTone,
  shortDate,
  timeLabel,
  weekRangeLabel
} from './scheduleFormat.js';
import { SCHEDULE_DATA_QUERIES, cellKey, useScheduleWeek, type GridCard, type ShiftBlock, type TrayDraft } from './useScheduleWeek.js';

export interface ScheduleGridProps {
  schedule: Schedule;
  /** Org-wide Manager — sees the published/unpublished status bar and must unpublish before editing a published week. */
  isManager: boolean;
  canEdit: boolean;
  canPublish: boolean;
  /** May create a new department from the shift form (departments.create). */
  canCreateDepartment: boolean;
  /** Monday of the week being viewed; the grid's columns are always this Mon–Sun week. */
  weekStart: string;
  onNavigateWeek: (direction: -1 | 1) => void;
  onCreateNextWeek: () => void;
  showToast: (text: string, tone?: ToastTone) => void;
  /** Open Import Schedule straight away (the empty state's "Import Schedule" creates the week first, then lands here). */
  openImportOnMount?: boolean;
}

type ShiftCardData = Extract<GridCard, { kind: 'shift' }>;
type DragSource = { from: 'tray'; draftId: string } | { from: 'cell'; card: GridCard; employeeId: string; date: string };
type FormState = { mode: 'cell'; employeeId: string; date: string; card: GridCard | null } | { mode: 'tray'; draft: TrayDraft | null };

const DEFAULT_FILL: ShiftBlock = { startTime: '07:30', endTime: '17:00', breakMinutes: 60 };

function crossesMidnight(block: ShiftBlock): boolean {
  return clockMinutes(block.endTime) <= clockMinutes(block.startTime);
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong — please try again.';
}

function publishedStamp(iso: string): string {
  const value = new Date(iso);
  const hours = value.getHours();
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const month = value.toLocaleString('en-US', { month: 'short' });
  return `${month} ${value.getDate()}, ${String(hours12).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** The weekly employee × day schedule — design handoff "Manager/Schedules" / "Supervisor/Schedules" (ShiftOS Dashboards.dc.html lines 465-737). */
export function ScheduleGrid({
  schedule,
  isManager,
  canEdit,
  canPublish,
  canCreateDepartment,
  weekStart,
  onNavigateWeek,
  onCreateNextWeek,
  showToast,
  openImportOnMount = false
}: ScheduleGridProps): React.ReactElement {
  const scheduleId = schedule.id;
  const week = useScheduleWeek(schedule, weekStart);
  const { days, rosterRows, cells, conflictsByCell, orderedConflicts, hours } = week;
  const published = schedule.status === 'published';

  const [tray, setTray] = useState<TrayDraft[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [publishMenuOpen, setPublishMenuOpen] = useState(false);
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(openImportOnMount && canEdit);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const draftCounter = useRef(0);
  const assistantRef = useRef<HTMLDivElement>(null);

  const invalidates = SCHEDULE_DATA_QUERIES;
  const addShift = useRpcMutation<unknown, Record<string, unknown>>('add_shift_to_employee_on_date', { invalidates });
  const updateShift = useRpcMutation<unknown, Record<string, unknown>>('update_assigned_shift_on_date', { invalidates });
  const removeShift = useRpcMutation<unknown, { assignmentId: string }>('remove_assigned_shift_on_date', { invalidates });
  const markDayOff = useRpcMutation<unknown, { scheduleId: string; employeeId: string; date: string }>('mark_day_off', { invalidates });
  const clearDayOff = useRpcMutation<unknown, { scheduleId: string; employeeId: string; date: string }>('clear_day_off', { invalidates });
  const addToRoster = useRpcMutation<unknown, { scheduleId: string; employeeId: string }>('add_employee_to_schedule', { invalidates: ['list_schedule_roster'] });
  const removeFromRoster = useRpcMutation<unknown, { scheduleId: string; employeeId: string }>('remove_employee_from_schedule', {
    invalidates: ['list_schedule_roster', ...invalidates]
  });
  const createTemplate = useRpcMutation<unknown, Record<string, unknown>>('create_shift_template', { invalidates: ['list_shift_templates'] });
  const createDepartment = useRpcMutation<{ id: string }, { branchId: string; name: string }>('create_department', { invalidates: ['list_departments'] });
  const publish = useRpcMutation<Schedule, { scheduleId: string }>('publish_schedule', { invalidates: ['get_schedule', 'list_schedules', 'list_schedule_versions'] });
  const unpublish = useRpcMutation<Schedule, { scheduleId: string }>('unpublish_schedule', { invalidates: ['get_schedule', 'list_schedules'] });
  const ask = useRpcMutation<{ answer: string }, { question: string }>('ask_assistant');

  const { data: versions } = useRpcQuery<ScheduleVersion[]>('list_schedule_versions', { scheduleId }, { enabled: isManager });
  const { data: members } = useRpcQuery<Member[]>('list_members', undefined, { enabled: isManager && published });

  const nameOf = (employeeId: string): string => rosterRows.find((row) => row.employee.id === employeeId)?.name ?? 'Unknown employee';
  const dayOf = (date: string) => days.find((day) => day.date === date);

  /** Runs a sequence of writes with one busy flag; failures surface as an error toast and return false. */
  const run = async (work: () => Promise<void>, onError?: (message: string) => void): Promise<boolean> => {
    setBusy(true);
    try {
      await work();
      return true;
    } catch (err) {
      if (onError) onError(errorText(err));
      else showToast(errorText(err), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addBlocks = async (employeeId: string, date: string, blocks: ShiftBlock[], note: string, departmentId: string | null): Promise<void> => {
    for (const [index, block] of blocks.entries()) {
      await addShift.mutateAsync({
        scheduleId,
        employeeId,
        date,
        templateId: null,
        startTime: block.startTime,
        endTime: block.endTime,
        crossesMidnight: crossesMidnight(block),
        breakMinutes: block.breakMinutes,
        notes: index === 0 && note ? note : null,
        departmentId
      });
    }
  };

  const removeCard = async (card: GridCard, employeeId: string, date: string): Promise<void> => {
    if (card.kind === 'shift') await removeShift.mutateAsync({ assignmentId: card.id });
    else await clearDayOff.mutateAsync({ scheduleId, employeeId, date });
  };

  const newDraft = (source: Omit<TrayDraft, 'id'>): TrayDraft => {
    draftCounter.current += 1;
    return { id: `draft-${draftCounter.current}`, ...source };
  };

  const draftFromCard = (card: GridCard): TrayDraft =>
    card.kind === 'shift'
      ? newDraft({ off: false, blocks: [card.block], note: card.note, departmentId: card.departmentId })
      : newDraft({ off: true, blocks: [], note: '', departmentId: null });

  const importContext = useMemo<ScheduleImportContext>(
    () => ({
      people: week.employees
        .filter((employee) => employee.is_active && !employee.deleted_at)
        .map((employee) => ({ id: employee.id, name: `${employee.first_name} ${employee.last_name}`.trim(), email: employee.email, employeeNumber: employee.employee_number })),
      departments: week.departments.map((department) => ({ id: department.id, name: department.name })),
      dates: days.filter((day) => day.inSchedule).map((day) => day.date),
      weekLabel: `Week ${isoWeekNumber(weekStart)} · ${weekRangeLabel(weekStart)}`
    }),
    [week.employees, week.departments, days, weekStart]
  );

  /** Writes each validated spreadsheet row into this week, adding people to the roster as needed; one bad row doesn't stop the rest. */
  const importRows = async (rows: ScheduleImportRow[], fileName: string): Promise<void> => {
    const rostered = new Set(rosterRows.map((row) => row.employee.id));
    const failures: string[] = [];
    setImportProgress({ done: 0, total: rows.length });
    for (const [index, row] of rows.entries()) {
      try {
        const employeeId = row.employeeId as string;
        const date = row.date as string;
        if (!rostered.has(employeeId)) {
          await addToRoster.mutateAsync({ scheduleId, employeeId });
          rostered.add(employeeId);
        }
        if (row.off) {
          await markDayOff.mutateAsync({ scheduleId, employeeId, date });
        } else {
          const block = { startTime: row.startTime as string, endTime: row.endTime as string, breakMinutes: row.breakMinutes };
          await addShift.mutateAsync({
            scheduleId,
            employeeId,
            date,
            templateId: null,
            startTime: block.startTime,
            endTime: block.endTime,
            crossesMidnight: crossesMidnight(block),
            breakMinutes: block.breakMinutes,
            notes: row.notes || null,
            departmentId: row.departmentId
          });
        }
      } catch (err) {
        failures.push(`row ${row.row}: ${errorText(err)}`);
      }
      setImportProgress({ done: index + 1, total: rows.length });
    }
    setImportProgress(null);
    setImportOpen(false);
    const landed = rows.length - failures.length;
    showToast(
      failures.length
        ? `${landed} of ${rows.length} rows imported from ${fileName} — ${failures[0]}${failures.length > 1 ? ` (+${failures.length - 1} more)` : ''}`
        : `${landed} ${landed === 1 ? 'row' : 'rows'} imported from ${fileName}`,
      failures.length ? 'error' : 'success'
    );
  };

  const readOnlyHint = isManager && published ? 'Published shifts are read-only — unpublish to edit them' : 'You can only view this schedule';

  // ---- form ----
  const formInitial =
    form?.mode === 'cell'
      ? form.card?.kind === 'shift'
        ? { off: false, blocks: [form.card.block], note: form.card.note, departmentId: form.card.departmentId }
        : { off: form.card?.kind === 'off', blocks: [], note: '', departmentId: null }
      : form?.mode === 'tray' && form.draft
        ? { off: form.draft.off, blocks: form.draft.blocks, note: form.draft.note, departmentId: form.draft.departmentId }
        : { off: false, blocks: [], note: '', departmentId: null };

  /** The form's department choice as an id, creating the department first when "New department…" was used. */
  const resolveFormDepartment = async (values: ShiftFormValues): Promise<string | null> => {
    if (values.off) return null;
    if (!values.newDepartmentName) return values.departmentId;
    const existing = week.departments.find((d) => d.name.trim().toLowerCase() === values.newDepartmentName.toLowerCase());
    if (existing) return existing.id;
    const created = await createDepartment.mutateAsync({ branchId: schedule.branch_id, name: values.newDepartmentName });
    return created.id;
  };

  const openCell = (employeeId: string, date: string, card: GridCard | null): void => {
    setMenu(null);
    setFormError(null);
    setForm({ mode: 'cell', employeeId, date, card });
  };

  const saveForm = async (values: ShiftFormValues): Promise<void> => {
    if (!form) return;
    if (form.mode === 'tray') {
      let departmentId: string | null = null;
      const resolved = await run(async () => {
        departmentId = await resolveFormDepartment(values);
      }, setFormError);
      if (!resolved) return;
      const draft = { off: values.off, blocks: values.off ? [] : values.blocks, note: values.note, departmentId };
      if (form.draft) {
        const id = form.draft.id;
        setTray((prev) => prev.map((d) => (d.id === id ? { id, ...draft } : d)));
      } else {
        setTray((prev) => [...prev, newDraft(draft)]);
      }
      setForm(null);
      showToast(form.draft ? 'Shift draft updated' : 'Shift draft ready — drag it onto anyone');
      return;
    }
    const { employeeId, date, card } = form;
    const ok = await run(async () => {
      const departmentId = await resolveFormDepartment(values);
      const apply = async (targetDate: string, primary: boolean): Promise<void> => {
        if (values.off) {
          await markDayOff.mutateAsync({ scheduleId, employeeId, date: targetDate });
          return;
        }
        if (primary && card?.kind === 'shift') {
          const [first, ...rest] = values.blocks;
          await updateShift.mutateAsync({
            assignmentId: card.id,
            startTime: first.startTime,
            endTime: first.endTime,
            crossesMidnight: crossesMidnight(first),
            breakMinutes: first.breakMinutes,
            notes: values.note || null,
            departmentId
          });
          await addBlocks(employeeId, targetDate, rest, '', departmentId);
          return;
        }
        await addBlocks(employeeId, targetDate, values.blocks, values.note, departmentId);
      };
      await apply(date, true);
      for (const extraDate of values.alsoDates) await apply(extraDate, false);
      if (values.saveAsTemplate && values.templateName && !values.off) {
        const first = values.blocks[0];
        await createTemplate.mutateAsync({
          branchId: schedule.branch_id,
          name: values.templateName,
          startTime: first.startTime,
          endTime: first.endTime,
          crossesMidnight: crossesMidnight(first)
        });
      }
    }, setFormError);
    if (!ok) return;
    setForm(null);
    const day = dayOf(date);
    const extra = values.alsoDates.length;
    showToast(`${values.off ? 'Day off saved' : 'Shift assigned'} for ${nameOf(employeeId)}${extra ? ` on ${extra + 1} days` : ` · ${day?.weekday}, ${day?.label}`}`);
  };

  const deleteFromForm = async (): Promise<void> => {
    if (!form) return;
    if (form.mode === 'tray') {
      const id = form.draft?.id;
      setTray((prev) => prev.filter((d) => d.id !== id));
      setForm(null);
      showToast('Shift removed');
      return;
    }
    const { card, employeeId, date } = form;
    if (!card) return;
    if (await run(() => removeCard(card, employeeId, date), setFormError)) {
      setForm(null);
      showToast('Shift removed');
    }
  };

  // ---- drag & drop ----
  const dropOnCell = async (employeeId: string, date: string): Promise<void> => {
    const source = dragging;
    setDragging(null);
    setDragOver(null);
    if (!source) return;
    const day = dayOf(date);
    const movedToast = `Shift moved to ${nameOf(employeeId)} · ${day?.weekday}`;
    if (source.from === 'tray') {
      const draft = tray.find((d) => d.id === source.draftId);
      if (!draft) return;
      const ok = await run(async () => {
        if (draft.off) await markDayOff.mutateAsync({ scheduleId, employeeId, date });
        else await addBlocks(employeeId, date, draft.blocks, draft.note, draft.departmentId);
      });
      if (ok) {
        setTray((prev) => prev.filter((d) => d.id !== draft.id));
        showToast(movedToast);
      }
      return;
    }
    if (source.employeeId === employeeId && source.date === date) return;
    const { card } = source;
    // Write the destination first, then clear the source, so a failed drop never loses the original shift.
    const ok = await run(async () => {
      if (card.kind === 'off') await markDayOff.mutateAsync({ scheduleId, employeeId, date });
      else await addBlocks(employeeId, date, [card.block], card.note, card.departmentId);
      await removeCard(card, source.employeeId, source.date);
    });
    if (ok) showToast(movedToast);
  };

  const dropOnTray = async (): Promise<void> => {
    const source = dragging;
    setDragging(null);
    setDragOver(null);
    if (!source || source.from !== 'cell') return;
    if (await run(() => removeCard(source.card, source.employeeId, source.date))) {
      setTray((prev) => [...prev, draftFromCard(source.card)]);
      showToast('Moved to shift drafts');
    }
  };

  // ---- card menus ----
  const cellMenu = (card: GridCard, employeeId: string, date: string): ShiftCardMenuItem[] => {
    const items: ShiftCardMenuItem[] = [
      { label: 'Edit shift', onSelect: () => openCell(employeeId, date, card) },
      {
        label: 'Duplicate',
        onSelect: () => {
          if (card.kind === 'off') {
            setTray((prev) => [...prev, draftFromCard(card)]);
            showToast('Day off copied to shift drafts — drag it onto anyone');
            return;
          }
          void run(() => addBlocks(employeeId, date, [card.block], card.note, card.departmentId)).then((ok) => ok && showToast('Shift duplicated'));
        }
      },
      {
        label: 'Move to drafts',
        onSelect: () =>
          void run(() => removeCard(card, employeeId, date)).then((ok) => {
            if (!ok) return;
            setTray((prev) => [...prev, draftFromCard(card)]);
            showToast('Moved to shift drafts');
          })
      }
    ];
    if (card.kind === 'shift') {
      items.push({
        label: 'Mark day off',
        onSelect: () => void run(() => markDayOff.mutateAsync({ scheduleId, employeeId, date }).then(() => undefined)).then((ok) => ok && showToast('Marked as day off'))
      });
    }
    items.push({ label: 'Delete', danger: true, onSelect: () => void run(() => removeCard(card, employeeId, date)).then((ok) => ok && showToast('Shift removed')) });
    return items;
  };

  /** An undecided day: nothing to duplicate or move yet, so assign a shift or mark it off. */
  const emptyDayMenu = (employeeId: string, date: string): ShiftCardMenuItem[] => [
    { label: 'Assign shift', onSelect: () => openCell(employeeId, date, null) },
    {
      label: 'Mark day off',
      onSelect: () => void run(() => markDayOff.mutateAsync({ scheduleId, employeeId, date }).then(() => undefined)).then((ok) => ok && showToast('Marked as day off'))
    }
  ];

  const trayMenu = (draft: TrayDraft): ShiftCardMenuItem[] => [
    { label: 'Edit shift', onSelect: () => setForm({ mode: 'tray', draft }) },
    {
      label: 'Duplicate',
      onSelect: () => {
        setTray((prev) => [...prev, newDraft({ off: draft.off, blocks: draft.blocks, note: draft.note, departmentId: draft.departmentId })]);
        showToast('Shift duplicated');
      }
    },
    {
      label: 'Delete',
      danger: true,
      onSelect: () => {
        setTray((prev) => prev.filter((d) => d.id !== draft.id));
        showToast('Shift removed');
      }
    }
  ];

  // ---- assistant ----
  const onAiAction = async (action: AiActionKey): Promise<void> => {
    if (action === 'createNextWeek') {
      onCreateNextWeek();
      return;
    }
    const hoursList = rosterRows.map((row) => ({ row, minutes: hours.get(row.employee.id)?.paidMinutes ?? 0 }));
    if (action === 'balance') {
      if (hoursList.length < 2) {
        showToast('Add at least two people to balance hours');
        return;
      }
      const sorted = [...hoursList].sort((a, b) => b.minutes - a.minutes);
      const most = sorted[0];
      const least = sorted[sorted.length - 1];
      const moveHours = Math.round((most.minutes - least.minutes) / 120);
      showToast(moveHours >= 1 ? `Suggested: move ${moveHours}h from ${most.row.employee.first_name} to ${least.row.employee.first_name}` : 'Hours are already evenly balanced');
      return;
    }
    if (action === 'overtime') {
      const over = hoursList.filter((entry) => entry.minutes > 40 * 60);
      if (!over.length) {
        showToast('Nobody is over 40h this week');
        return;
      }
      const busiest = days
        .map((day) => ({ day, minutes: over.reduce((sum, entry) => sum + (hours.get(entry.row.employee.id)?.minutesByDate.get(day.date) ?? 0), 0) }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 2)
        .map((entry) => entry.day.weekday);
      showToast(`${over.length} ${over.length === 1 ? 'person is' : 'people are'} over 40h — review ${busiest.join(' and ')}`);
      return;
    }
    if (!canEdit) {
      showToast(readOnlyHint);
      return;
    }
    if (action === 'fillEmpty') {
      const empty = rosterRows.flatMap((row) =>
        days.filter((day) => day.inSchedule && !(cells.get(cellKey(row.employee.id, day.date)) ?? []).length).map((day) => [row.employee.id, day.date] as const)
      );
      if (!empty.length) {
        showToast('No empty days to fill');
        return;
      }
      if (await run(async () => {
        for (const [employeeId, date] of empty) await addBlocks(employeeId, date, [DEFAULT_FILL], '', null);
      })) {
        showToast(`${empty.length} empty ${empty.length === 1 ? 'day' : 'days'} filled with 7:30 AM – 5:00 PM`);
      }
      return;
    }
    if (action === 'resolveConflicts') {
      const doubleBooked = orderedConflicts.filter((conflict) => conflict.kind === 'double_booking');
      if (!doubleBooked.length) {
        showToast(orderedConflicts.length ? 'Remaining conflicts are long shifts — shorten them to clear' : 'No conflicts to resolve');
        return;
      }
      if (await run(async () => {
        for (const conflict of doubleBooked) {
          const extras = (cells.get(cellKey(conflict.employeeId, conflict.date)) ?? []).filter((card): card is ShiftCardData => card.kind === 'shift').slice(1);
          for (const card of extras) await removeShift.mutateAsync({ assignmentId: card.id });
        }
      })) {
        showToast(`${doubleBooked.length} double-booking${doubleBooked.length === 1 ? '' : 's'} cleared`);
      }
    }
  };

  const onAsk = (question: string): void => {
    showToast('Assistant is looking at this week…');
    ask.mutate(
      { question: `About the ${weekRangeLabel(weekStart)} schedule: ${question}` },
      { onSuccess: (result) => showToast(result.answer), onError: (err) => showToast(err.message, 'error') }
    );
  };

  // ---- publish ----
  const onPublish = (): void => {
    setPublishMenuOpen(false);
    if (orderedConflicts.length) {
      showToast(`Resolve ${orderedConflicts.length} conflict${orderedConflicts.length === 1 ? '' : 's'} before publishing`, 'error');
      return;
    }
    const wasPublished = Boolean(versions?.length);
    publish.mutate(
      { scheduleId },
      {
        onSuccess: () => showToast(`Schedule ${wasPublished ? 're' : ''}published · staff can see this week`),
        onError: (err) => showToast(err.message, 'error')
      }
    );
  };

  const legend = useMemo(() => {
    const counts = new Map<string, { block: ShiftBlock; count: number }>();
    for (const list of cells.values()) {
      for (const card of list) {
        if (card.kind !== 'shift') continue;
        const key = `${card.block.startTime}-${card.block.endTime}`;
        counts.set(key, { block: card.block, count: (counts.get(key)?.count ?? 0) + 1 });
      }
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .sort((a, b) => clockMinutes(a.block.startTime) - clockMinutes(b.block.startTime))
      .map(({ block }) => ({ label: `${timeLabel(block.startTime)} - ${timeLabel(block.endTime)}`, color: TONES[shiftTone(block.startTime)][0] }));
  }, [cells]);

  const publisher = useMemo(() => {
    const latest = [...(versions ?? [])].sort((a, b) => b.version - a.version)[0];
    if (!latest) return null;
    const member = (members ?? []).find((m) => m.user_id === latest.published_by);
    const role = member ? (member.role_name === 'Owner' ? 'Manager' : member.role_name) : null;
    return { at: publishedStamp(latest.published_at), who: member ? `${member.user_first_name} ${member.user_last_name} · ${role}` : null };
  }, [versions, members]);

  const hintOne = canEdit ? 'Click a cell to assign a shift' : isManager ? 'Published shifts are read-only — unpublish to edit them' : 'These shifts are published — they cannot be changed here';
  const hintTwo = canEdit ? 'Drag a shift to another cell to move it' : isManager ? 'Unpublishing hides the week from staff until you republish' : 'Ask your supervisor for a swap if a shift does not work';

  // Matches the status bar: "Republish" only once this week has actually been published before.
  const publishLabel = isManager && versions?.length ? 'Republish Schedule' : 'Publish Schedule';
  const cardProps = (menuKey: string) => ({
    menuOpen: menu === menuKey,
    onToggleMenu: (open: boolean) => setMenu(open ? menuKey : null),
    onDragEnd: () => {
      setDragging(null);
      setDragOver(null);
    }
  });

  return (
    <>
      {isManager ? (
        published ? (
          <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-[#CDE9D8] bg-[#F1FAF4] px-[15px] py-3 text-[#206B45]">
            <span className="flex size-[26px] flex-none items-center justify-center rounded-full bg-[#2E9E62] text-white">
              <ScheduleIcon name="checkCircle" size={15} />
            </span>
            <p className="m-0 flex-[1_1_260px] text-[12.5px] text-inherit">
              <strong>Published schedule.</strong> Published {publisher?.who ? `by ${publisher.who} ` : ''}
              {publisher ? `on ${publisher.at}. ` : ''}Staff can see these shifts. Unpublish to make changes.
            </p>
            {canPublish ? (
              <span className="flex flex-wrap gap-[9px]">
                <button
                  type="button"
                  disabled={unpublish.isPending}
                  onClick={() =>
                    unpublish.mutate(
                      { scheduleId },
                      { onSuccess: () => showToast('Schedule unpublished — staff can no longer see this week'), onError: (err) => showToast(err.message, 'error') }
                    )
                  }
                  className="h-9 cursor-pointer rounded-[10px] border border-[rgba(56,49,43,.16)] bg-white px-[15px] text-[12.5px] font-bold text-[#38312B] disabled:cursor-default disabled:opacity-60"
                >
                  Unpublish to edit
                </button>
              </span>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-[#F3DFB8] bg-[#FDF8EC] px-[15px] py-3 text-[#7A5410]">
            <span className="flex size-[26px] flex-none items-center justify-center rounded-full bg-[#B77714] text-white">
              <ScheduleIcon name="alert" size={15} />
            </span>
            <p className="m-0 flex-[1_1_260px] text-[12.5px] text-inherit">
              {versions?.length ? (
                <>
                  <strong>Unpublished — you are editing.</strong> Staff no longer see this week. Make your changes, then republish so they can see it again.
                </>
              ) : (
                <>
                  <strong>Draft — not published yet.</strong> Staff can't see this week until it's published.
                </>
              )}
            </p>
            {canPublish ? (
              <span className="flex flex-wrap gap-[9px]">
                <button
                  type="button"
                  disabled={publish.isPending}
                  onClick={onPublish}
                  className="h-9 cursor-pointer rounded-[10px] border-0 bg-[#F04E17] px-[15px] text-[12.5px] font-bold text-white disabled:opacity-60"
                >
                  {versions?.length ? 'Republish Schedule' : 'Publish Schedule'}
                </button>
              </span>
            ) : null}
          </div>
        )
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-[14px] border border-[#EBE7E3] bg-white p-[5px]">
          <button
            type="button"
            onClick={() => onNavigateWeek(-1)}
            aria-label="Previous week"
            className="size-8 cursor-pointer rounded-[10px] border border-[#EBE7E3] bg-white text-[14px] text-[#57504A] hover:border-[#DDD6D0]"
          >
            ‹
          </button>
          <span className="flex items-center gap-[9px] px-3">
            <span className="text-[#A79C93]">
              <ScheduleIcon name="calendar" size={16} />
            </span>
            <span className="leading-[1.25]">
              <span className="block text-[13.5px] font-extrabold">{weekRangeLabel(weekStart)}</span>
              <span className="block text-[11px] text-[#A79C93]">Week {isoWeekNumber(weekStart)}</span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => onNavigateWeek(1)}
            aria-label="Next week"
            className="size-8 cursor-pointer rounded-[10px] border border-[#EBE7E3] bg-white text-[14px] text-[#57504A] hover:border-[#DDD6D0]"
          >
            ›
          </button>
        </div>
        {canEdit ? (
          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="flex h-[42px] cursor-pointer items-center gap-2 rounded-[12px] border border-[#EBE7E3] bg-white px-4 text-[12.5px] font-bold text-[#38312B] hover:border-[#DDD6D0]"
            >
              <ScheduleIcon name="upload" size={15} />
              Import Schedule
            </button>
            <button
              type="button"
              onClick={() => {
                assistantRef.current?.querySelector('input')?.focus();
                showToast('Ask the AI Schedule Assistant on the right, or pick one of its quick actions');
              }}
              className="flex h-[42px] cursor-pointer items-center gap-2 rounded-[12px] border border-[#E3D6FA] bg-[#F8F5FF] px-4 text-[12.5px] font-bold text-[#6D28D9] hover:border-[#C9B4F7]"
            >
              <ScheduleIcon name="bulb" size={15} />
              AI Assist
            </button>
            {canPublish ? (
              <span className="relative">
                <span className="flex items-stretch overflow-hidden rounded-[12px] shadow-[0_12px_24px_-14px_rgba(240,78,23,.8)]">
                  <button
                    type="button"
                    onClick={onPublish}
                    disabled={publish.isPending}
                    className="flex h-[42px] cursor-pointer items-center gap-2 border-0 bg-[#F04E17] px-[18px] text-[12.5px] font-bold text-white disabled:opacity-70"
                  >
                    <ScheduleIcon name="megaphone" size={15} />
                    {publishLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishMenuOpen((open) => !open)}
                    aria-label="More publish options"
                    aria-expanded={publishMenuOpen}
                    className="w-[34px] cursor-pointer border-0 border-l border-l-[rgba(255,255,255,.28)] bg-[#F04E17] text-[10px] text-white"
                  >
                    ▾
                  </button>
                </span>
                {publishMenuOpen ? (
                  <div role="menu" className="absolute right-0 top-[48px] z-30 flex w-[178px] flex-col rounded-[12px] border border-[#EBE7E3] bg-white p-[5px] shadow-[0_18px_38px_-18px_rgba(56,49,43,.42)]">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setPublishMenuOpen(false);
                        setHistoryOpen(true);
                      }}
                      className="block w-full cursor-pointer rounded-[8px] border-0 bg-transparent px-[9px] py-2 text-left text-[11.5px] font-bold text-[#38312B]"
                    >
                      Version history
                    </button>
                  </div>
                ) : null}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-[#EBE7E3] bg-white px-4 py-[11px]">
        <span className="flex flex-col gap-1">
          <span className="text-[11px] text-[#857A72]">↦ &nbsp;{hintOne}</span>
          <span className="text-[11px] text-[#857A72]">⇅ &nbsp;{hintTwo}</span>
        </span>
        <span className="ml-auto flex flex-wrap gap-x-[18px] gap-y-2">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-[7px] text-[11.5px] font-bold text-[#57504A]">
              <span className="size-[9px] flex-none rounded-[3px]" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
          <span className="flex items-center gap-[7px] text-[11.5px] font-bold text-[#57504A]">
            <span className="size-[11px] flex-none rounded-[3px] border border-[#E4DED9] bg-[#F0ECE8]" />
            OFF
          </span>
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <section className="min-w-0 flex-[1_1_640px] rounded-2xl border border-[#EBE7E3] bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[184px_repeat(7,minmax(94px,1fr))] border-b border-[#F2EEEA]">
                <span className="px-4 py-[13px] text-[11px] font-extrabold tracking-[.02em] text-[#38312B]">Employee</span>
                {days.map((day) => (
                  <span key={day.date} className="px-2 py-[11px] text-center leading-[1.3]">
                    <span className="block text-[11.5px] font-extrabold text-[#38312B]">{day.weekday}</span>
                    <span className="block text-[11px] text-[#A79C93]">{day.label}</span>
                  </span>
                ))}
              </div>

              {week.isLoading ? (
                <div className="px-5 py-[34px] text-center text-[12px] text-[#A79C93]">Loading this week…</div>
              ) : week.error ? (
                <div className="px-5 py-[34px] text-center">
                  <p className="m-0 text-[13px] font-bold text-[#57504A]">Schedule information unavailable.</p>
                  <button type="button" onClick={() => void week.refetch()} className="mt-2 cursor-pointer border-0 bg-transparent text-[12px] font-bold text-[#C6420E]">
                    Retry
                  </button>
                </div>
              ) : (
                rosterRows.map((row) => (
                  <div key={row.employee.id} className="grid grid-cols-[184px_repeat(7,minmax(94px,1fr))] border-b border-[#F7F4F1]">
                    <span className="flex min-w-0 items-center gap-2.5 py-2.5 pl-4 pr-3.5">
                      <span className="flex size-8 flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(row.name)}>
                        {initialsOf(row.name)}
                      </span>
                      <span className="min-w-0 flex-auto">
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-bold">{row.name}</span>
                        <span className="block text-[11px] text-[#A79C93]">{row.meta}</span>
                      </span>
                      {canEdit ? (
                        <button
                          type="button"
                          aria-label="Remove from this schedule"
                          onClick={(event) => {
                            event.stopPropagation();
                            void run(() => removeFromRoster.mutateAsync({ scheduleId, employeeId: row.employee.id }).then(() => undefined)).then(
                              (ok) => ok && showToast(`${row.name} removed from this schedule`)
                            );
                          }}
                          className="size-5 flex-none cursor-pointer rounded-full border-0 bg-transparent text-[11px] font-extrabold text-[#C4BBB3] hover:bg-[#FCEDEA] hover:text-[#C93A22]"
                        >
                          ✕
                        </button>
                      ) : null}
                    </span>
                    {days.map((day) => {
                      const key = cellKey(row.employee.id, day.date);
                      const cards = cells.get(key) ?? [];
                      return (
                        <ShiftCell
                          key={day.date}
                          canEdit={canEdit}
                          outOfSchedule={!day.inSchedule}
                          isDragOver={dragOver === key}
                          raised={Boolean(menu?.startsWith(`${key}|`))}
                          onClick={() => {
                            if (!busy) openCell(row.employee.id, day.date, null);
                          }}
                          onDragOver={() => setDragOver(key)}
                          onDragLeave={() => setDragOver((current) => (current === key ? null : current))}
                          onDrop={() => void dropOnCell(row.employee.id, day.date)}
                        >
                          {canEdit && cards.length === 0 ? (
                            <ShiftCard
                              empty
                              off={false}
                              blocks={[]}
                              note=""
                              conflict={false}
                              canEdit={canEdit}
                              menuItems={emptyDayMenu(row.employee.id, day.date)}
                              onOpen={() => openCell(row.employee.id, day.date, null)}
                              onDragStart={() => undefined}
                              {...cardProps(`${key}|empty`)}
                            />
                          ) : null}
                          {cards.map((card) => (
                            <ShiftCard
                              key={card.id}
                              off={card.kind === 'off'}
                              blocks={card.kind === 'shift' ? [card.block] : []}
                              note={card.kind === 'shift' ? card.note : ''}
                              department={card.kind === 'shift' ? card.departmentName : ''}
                              conflict={Boolean(conflictsByCell.get(key))}
                              canEdit={canEdit}
                              menuItems={cellMenu(card, row.employee.id, day.date)}
                              onOpen={() => openCell(row.employee.id, day.date, card)}
                              onDragStart={() => setDragging({ from: 'cell', card, employeeId: row.employee.id, date: day.date })}
                              {...cardProps(`${key}|${card.id}`)}
                            />
                          ))}
                        </ShiftCell>
                      );
                    })}
                  </div>
                ))
              )}

              {!week.isLoading && !week.error && rosterRows.length === 0 ? (
                <div className="border-b border-[#F7F4F1] px-5 py-[34px] text-center">
                  <p className="m-0 text-[13px] font-bold text-[#57504A]">Nobody on this schedule yet</p>
                  <p className="mb-0 mt-1.5 text-[12px] text-[#A79C93]">
                    Use <strong>Add Employee</strong> below to pick who is working this week — every person gets seven empty days you can fill.
                  </p>
                </div>
              ) : null}

              {canEdit ? (
                <div className="grid grid-cols-[184px_minmax(0,1fr)]">
                  <div className="border-r border-[#F7F4F1] px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="flex h-[38px] cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[11px] border border-dashed border-[#DDD6D0] bg-white px-[13px] text-[12.5px] font-bold text-[#C6420E] hover:border-[#F04E17] hover:bg-[#FDF0E9]"
                    >
                      ＋ Add Employee
                    </button>
                  </div>
                  <ShiftDraftsTray
                    hasDrafts={tray.length > 0}
                    isDragOver={dragOver === 'tray'}
                    onNewDraft={() => setForm({ mode: 'tray', draft: null })}
                    onDragOver={() => setDragOver('tray')}
                    onDragLeave={() => setDragOver((current) => (current === 'tray' ? null : current))}
                    onDrop={() => void dropOnTray()}
                  >
                    {tray.map((draft) => (
                      <ShiftCard
                        key={draft.id}
                        off={draft.off}
                        blocks={draft.blocks}
                        note={draft.note}
                        department={draft.departmentId ? (week.departmentsById.get(draft.departmentId)?.name ?? '') : ''}
                        conflict={false}
                        canEdit={canEdit}
                        menuItems={trayMenu(draft)}
                        onOpen={() => setForm({ mode: 'tray', draft })}
                        onDragStart={() => setDragging({ from: 'tray', draftId: draft.id })}
                        {...cardProps(`tray|${draft.id}`)}
                      />
                    ))}
                  </ShiftDraftsTray>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside ref={assistantRef} className="flex min-w-[240px] flex-[0_0_268px] flex-col gap-3.5">
          <AiAssistantPanel onAction={(action) => void onAiAction(action)} onAsk={onAsk} asking={ask.isPending} />
          <ScheduleConflictsPanel
            conflicts={orderedConflicts}
            nameOf={nameOf}
            onSelect={(conflict: ScheduleConflict) => {
              if (!canEdit) {
                showToast(readOnlyHint);
                return;
              }
              openCell(conflict.employeeId, conflict.date, (cells.get(cellKey(conflict.employeeId, conflict.date)) ?? [])[0] ?? null);
            }}
            onViewAll={() =>
              showToast(
                `${orderedConflicts.length} conflict${orderedConflicts.length === 1 ? '' : 's'}: ${orderedConflicts
                  .map((conflict) => `${nameOf(conflict.employeeId)} (${shortDate(conflict.date)})`)
                  .join(', ')}`
              )
            }
          />
        </aside>
      </div>

      <ScheduleSummaryBar
        rosterRows={rosterRows}
        branchEmployeeCount={week.branchEmployeeCount}
        scheduledPeople={week.scheduledPeople}
        conflictCount={orderedConflicts.length}
        totalPaidMinutes={week.totalPaidMinutes}
        coverage={week.coverage}
        hours={hours}
        open={summaryOpen}
        onToggle={() => setSummaryOpen((open) => !open)}
        onExport={() => {
          downloadCsv(`hours-week-${isoWeekNumber(weekStart)}.csv`, [
            ['Employee', 'Department', 'Paid hours', 'Shift days', 'Days off', 'Flag'],
            ...rosterRows.map((row) => {
              const summary = hours.get(row.employee.id);
              const minutes = summary?.paidMinutes ?? 0;
              return [row.name, row.meta, durationText(minutes), String(summary?.shiftDays ?? 0), String(summary?.offDays ?? 0), minutes > OVER_HOURS_MINUTES ? 'Over 45h' : ''];
            })
          ]);
          showToast('Hours per employee exported as CSV');
        }}
      />

      {form ? (
        <ShiftFormModal
          key={form.mode === 'cell' ? `${form.employeeId}:${form.date}:${form.card?.id ?? 'new'}` : `tray:${form.draft?.id ?? 'new'}`}
          mode={form.mode}
          editing={form.mode === 'cell' ? Boolean(form.card) : Boolean(form.draft)}
          initial={formInitial}
          departments={week.departments}
          canCreateDepartment={canCreateDepartment}
          employeeName={form.mode === 'cell' ? nameOf(form.employeeId) : undefined}
          date={form.mode === 'cell' ? form.date : undefined}
          days={days.filter((day) => day.inSchedule)}
          saving={busy}
          error={formError}
          onSave={(values) => void saveForm(values)}
          onDelete={() => void deleteFromForm()}
          onClose={() => setForm(null)}
        />
      ) : null}

      {pickerOpen ? (
        <AddEmployeeModal
          people={week.employees.map((employee) => {
            const name = `${employee.first_name} ${employee.last_name}`.trim();
            const department = employee.department_id ? week.departmentsById.get(employee.department_id)?.name : undefined;
            return {
              id: employee.id,
              name,
              meta: department ? `${department} · ${employee.employee_number}` : employee.employee_number,
              added: rosterRows.some((row) => row.employee.id === employee.id)
            };
          })}
          saving={busy}
          onClose={() => setPickerOpen(false)}
          onConfirm={(employeeIds) =>
            void run(async () => {
              for (const employeeId of employeeIds) await addToRoster.mutateAsync({ scheduleId, employeeId });
            }).then((ok) => {
              if (!ok) return;
              setPickerOpen(false);
              showToast(`${employeeIds.length} ${employeeIds.length === 1 ? 'employee' : 'employees'} added — click any day to build their shifts`);
            })
          }
        />
      ) : null}

      {historyOpen ? <VersionHistoryModal scheduleId={scheduleId} onClose={() => setHistoryOpen(false)} /> : null}

      {importOpen && canEdit ? (
        <ScheduleImportModal
          context={importContext}
          template={{ name: rosterRows[0]?.name ?? importContext.people[0]?.name ?? 'Jane Doe', department: week.departments[0]?.name ?? '' }}
          progress={importProgress}
          onImport={(rows, fileName) => void importRows(rows, fileName)}
          onClose={() => setImportOpen(false)}
        />
      ) : null}
    </>
  );
}
