import React, { useMemo, useState } from 'react';
import { Button } from '@shiftos/ui';
import { useRpcMutation, useRpcQuery } from '../../../lib/useRpc.js';
import type {
  Employee,
  Schedule,
  ScheduleConflict,
  ScheduleRosterEntry,
  Shift,
  ShiftAssignment
} from '../../../types/domain.js';
import { AddEmployeeModal } from './AddEmployeeModal.js';
import { AiAssistantPanel } from './AiAssistantPanel.js';
import { AssignShiftModal } from './AssignShiftModal.js';
import { ScheduleConflictsPanel } from './ScheduleConflictsPanel.js';
import { ScheduleSummaryBar } from './ScheduleSummaryBar.js';
import { ShiftCell } from './ShiftCell.js';

export interface ScheduleGridProps {
  scheduleId: string;
  schedule: Schedule;
  canEdit: boolean;
}

function activeCellKey(employeeId: string, date: string): string {
  return `${employeeId}:${date}`;
}

/** Adds `count` days to a 'YYYY-MM-DD' date string using pure UTC arithmetic — never routes through local-timezone parsing, so this is correct in every timezone (unlike `new Date(dateStr + 'T00:00:00').toISOString()`, which shifts a day early in any positive-UTC-offset timezone). */
function addDaysToDateString(dateString: string, count: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/** The weekly employee × day grid — WEB-012 replacement (design handoff "Manager/Schedules" / "Supervisor/Schedules"). */
export function ScheduleGrid({ scheduleId, schedule, canEdit }: ScheduleGridProps): React.ReactElement {
  const { data: roster, isLoading: rosterLoading } = useRpcQuery<ScheduleRosterEntry[]>('list_schedule_roster', { scheduleId });
  const { data: employees, isLoading: employeesLoading } = useRpcQuery<Employee[]>('list_employees', { branchId: schedule.branch_id });
  const { data: shifts, isLoading: shiftsLoading } = useRpcQuery<Shift[]>('list_shifts_for_schedule', { scheduleId });
  const { data: assignments, isLoading: assignmentsLoading } = useRpcQuery<ShiftAssignment[]>('list_assignments_for_schedule', { scheduleId });
  const { data: conflicts, isLoading: conflictsLoading } = useRpcQuery<ScheduleConflict[]>('get_schedule_conflicts', { scheduleId });

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{ employeeId: string; date: string; editingAssignmentId: string | null } | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [tray, setTray] = useState<Array<{ shift: Shift; assignment: ShiftAssignment }>>([]);

  const employeesById = useMemo(() => new Map((employees ?? []).map((e) => [e.id, e])), [employees]);
  const shiftsById = useMemo(() => new Map((shifts ?? []).map((s) => [s.id, s])), [shifts]);

  const days = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      result.push(addDaysToDateString(schedule.start_date, i));
    }
    return result;
  }, [schedule.start_date]);

  const cellAssignments = useMemo(() => {
    const map = new Map<string, Array<{ assignment: ShiftAssignment; shift: Shift }>>();
    for (const assignment of assignments ?? []) {
      if (assignment.assignment_status === 'cancelled' || assignment.assignment_status === 'declined') continue;
      const shift = shiftsById.get(assignment.shift_id);
      if (!shift) continue;
      const key = activeCellKey(assignment.employee_id, shift.shift_date);
      const list = map.get(key) ?? [];
      list.push({ assignment, shift });
      map.set(key, list);
    }
    return map;
  }, [assignments, shiftsById]);

  const conflictsByCell = useMemo(() => {
    const map = new Map<string, ScheduleConflict[]>();
    for (const conflict of conflicts ?? []) {
      const key = activeCellKey(conflict.employeeId, conflict.date);
      const list = map.get(key) ?? [];
      list.push(conflict);
      map.set(key, list);
    }
    return map;
  }, [conflicts]);

  const rosterEmployees = (roster ?? [])
    .map((entry) => employeesById.get(entry.employee_id))
    .filter((e): e is Employee => Boolean(e));

  const addEmployeeMutation = useRpcMutation<ScheduleRosterEntry, { scheduleId: string; employeeId: string }>(
    'add_employee_to_schedule',
    { invalidates: ['list_schedule_roster'] }
  );
  const removeEmployeeMutation = useRpcMutation<ScheduleRosterEntry, { scheduleId: string; employeeId: string }>(
    'remove_employee_from_schedule',
    { invalidates: ['list_schedule_roster'] }
  );
  const removeAssignedShiftMutation = useRpcMutation<unknown, { assignmentId: string }>('remove_assigned_shift_on_date', {
    invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule']
  });

  const handleMoveToDrafts = (card: { shift: Shift; assignment: ShiftAssignment }): void => {
    setTray((prev) => [...prev, card]);
    removeAssignedShiftMutation.mutate({ assignmentId: card.assignment.id });
  };

  const isLoading = rosterLoading || shiftsLoading || employeesLoading || assignmentsLoading || conflictsLoading;
  const scheduledCount = rosterEmployees.filter((e) => days.some((d) => cellAssignments.has(activeCellKey(e.id, d)))).length;

  const activeEmployee = activeCell ? employeesById.get(activeCell.employeeId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <div className="grid" style={{ gridTemplateColumns: '200px repeat(7, minmax(120px, 1fr))' }}>
            <div className="border-b border-r border-neutral-200 p-3 text-xs font-semibold uppercase text-neutral-400">Employee</div>
            {days.map((day) => (
              <div key={day} className="border-b border-neutral-200 p-3 text-center text-xs font-semibold text-neutral-500">
                <div>{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</div>
                <div className="text-neutral-400">{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              </div>
            ))}

            {isLoading ? (
              <div className="col-span-8 p-8 text-center text-sm text-neutral-500">Loading schedule…</div>
            ) : rosterEmployees.length === 0 ? (
              <div className="col-span-8 p-10 text-center">
                <p className="text-sm font-semibold text-neutral-700">Nobody on this schedule yet</p>
                <p className="mt-1.5 text-xs text-neutral-500">
                  Use Add Employee below to pick who is working this week — every person gets seven empty days you can fill.
                </p>
              </div>
            ) : (
              rosterEmployees.map((employee) => (
                <React.Fragment key={employee.id}>
                  <div className="flex items-center justify-between gap-2 border-b border-r border-neutral-200 p-3">
                    <span className="truncate text-sm font-semibold text-neutral-900">
                      {employee.first_name} {employee.last_name}
                    </span>
                    {canEdit ? (
                      <button
                        type="button"
                        title="Remove from schedule"
                        onClick={() => removeEmployeeMutation.mutate({ scheduleId, employeeId: employee.id })}
                        className="flex-shrink-0 text-xs text-neutral-400 hover:text-error-500"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                  {days.map((day) => {
                    const cards = cellAssignments.get(activeCellKey(employee.id, day)) ?? [];
                    const cellConflicts = conflictsByCell.get(activeCellKey(employee.id, day)) ?? [];
                    return (
                      <ShiftCell
                        key={day}
                        cards={cards}
                        scheduleId={scheduleId}
                        hasConflict={cellConflicts.length > 0}
                        canEdit={canEdit}
                        onCardClick={(card) => setActiveCell({ employeeId: employee.id, date: day, editingAssignmentId: card.assignment.id })}
                        onAddClick={() => setActiveCell({ employeeId: employee.id, date: day, editingAssignmentId: null })}
                        onMoveToDrafts={handleMoveToDrafts}
                      />
                    );
                  })}
                </React.Fragment>
              ))
            )}

            {canEdit ? (
              <div className="col-span-8 border-t border-neutral-200 p-3">
                <Button variant="secondary" size="sm" onClick={() => setAddEmployeeOpen(true)}>
                  + Add Employee
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="flex w-[268px] flex-shrink-0 flex-col gap-3.5">
          <AiAssistantPanel />
          <ScheduleConflictsPanel
            conflicts={conflicts ?? []}
            employeesById={employeesById}
            onSelectConflict={
              canEdit
                ? (conflict) => {
                    const cards = cellAssignments.get(activeCellKey(conflict.employeeId, conflict.date)) ?? [];
                    setActiveCell({ employeeId: conflict.employeeId, date: conflict.date, editingAssignmentId: cards[0]?.assignment.id ?? null });
                  }
                : undefined
            }
          />
        </aside>
      </div>

      <ScheduleSummaryBar
        totalEmployees={(employees ?? []).length}
        rosterCount={rosterEmployees.length}
        scheduledCount={scheduledCount}
        conflictCount={(conflicts ?? []).length}
        open={summaryOpen}
        onToggle={() => setSummaryOpen((v) => !v)}
        shifts={shifts ?? []}
        assignments={assignments ?? []}
        employeesById={employeesById}
        rosterEmployeeIds={rosterEmployees.map((e) => e.id)}
      />

      {addEmployeeOpen ? (
        <AddEmployeeModal
          open={addEmployeeOpen}
          onClose={() => setAddEmployeeOpen(false)}
          branchEmployees={(employees ?? []).filter((e) => !rosterEmployees.some((r) => r.id === e.id))}
          onAdd={(employeeId) => addEmployeeMutation.mutate({ scheduleId, employeeId })}
          adding={addEmployeeMutation.isPending}
        />
      ) : null}

      {activeCell ? (
        <AssignShiftModal
          open={Boolean(activeCell)}
          onClose={() => setActiveCell(null)}
          scheduleId={scheduleId}
          branchId={schedule.branch_id}
          employeeId={activeCell.employeeId}
          employeeName={activeEmployee ? `${activeEmployee.first_name} ${activeEmployee.last_name}` : ''}
          date={activeCell.date}
          existing={
            activeCell.editingAssignmentId
              ? (cellAssignments.get(activeCellKey(activeCell.employeeId, activeCell.date)) ?? []).find(
                  (c) => c.assignment.id === activeCell.editingAssignmentId
                ) ?? null
              : null
          }
        />
      ) : null}
    </div>
  );
}
