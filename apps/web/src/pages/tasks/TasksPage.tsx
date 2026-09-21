import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { HandoffModal, ModalField, ModalFields, modalControl } from '../../components/HandoffModal.js';
import { emailKey } from '../../lib/members.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Department, Employee, Task, TaskPriority, TaskRecurrence } from '../../types/domain.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { HeaderCta } from '../people/RolePeopleTable.js';
import { ScheduleIcon } from '../scheduling/grid/ScheduleIcon.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  buildBoard,
  boardTotal,
  filterBoard,
  PRIORITY_LABEL,
  RECURRENCE_LABEL,
  TASK_FILTERS,
  tasksCount,
  tasksSubtitle,
  todayOf,
  yesterdayOf,
  type TaskCard,
  type TaskColumn,
  type TaskFilter
} from './tasksBoardModel.js';

/*
 * WEB-010 — the Manager's Tasks board, built to the design handoff
 * (`ShiftOS Dashboards.dc.html`: `PAGES["Manager/Tasks"]`, the shared toolbar
 * at markup lines 363-376 and the `kindTasks` board at 900-932). Three
 * columns of cards on the branch's real tasks; ticking a card's circle is the
 * genuine complete/reopen RPC. Sizes are the prototype's rendered ones, not
 * Tailwind approximations.
 */

const pillStyle = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });

const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'normal', 'high', 'critical'];
const RECURRENCE_OPTIONS: TaskRecurrence[] = ['none', 'daily', 'weekdays', 'weekly'];

function NewTaskModal({
  open,
  employees,
  departments,
  onClose,
  onCreate,
  pending
}: {
  open: boolean;
  employees: Employee[];
  departments: Department[];
  onClose: () => void;
  onCreate: (input: { title: string; dueTime: string; priority: TaskPriority; recurrence: TaskRecurrence; assigneeId: string }) => void;
  pending: boolean;
}): React.ReactElement {
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueTime, setDueTime] = useState('10:00');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const [error, setError] = useState<string | null>(null);

  const people = employees.filter((employee) => employee.is_active && (!departmentId || employee.department_id === departmentId));

  const submit = (): void => {
    if (!title.trim()) {
      setError('Give the task a title');
      return;
    }
    setError(null);
    onCreate({ title: title.trim(), dueTime, priority, recurrence, assigneeId });
  };

  return (
    <HandoffModal
      open={open}
      title="New task"
      subtitle="Tasks belong to a shift and have an owner."
      primary={pending ? 'Creating…' : 'Create task'}
      primaryDisabled={pending}
      onPrimary={submit}
      onClose={() => {
        setError(null);
        onClose();
      }}
    >
      <ModalFields>
        <ModalField label="Task title" required full>
          <input
            value={title}
            aria-label="Task title"
            placeholder="e.g. Check cold room temperature"
            onChange={(event) => setTitle(event.target.value)}
            className={modalControl}
          />
        </ModalField>
        <ModalField label="Department">
          <select
            value={departmentId}
            aria-label="Department"
            onChange={(event) => {
              setDepartmentId(event.target.value);
              setAssigneeId('');
            }}
            className={`${modalControl} cursor-pointer`}
          >
            <option value="">Every department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Assign to">
          <select value={assigneeId} aria-label="Assign to" onChange={(event) => setAssigneeId(event.target.value)} className={`${modalControl} cursor-pointer`}>
            <option value="">Unassigned</option>
            {people.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {`${employee.first_name} ${employee.last_name}`.trim()}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Due time" required>
          <input type="time" value={dueTime} aria-label="Due time" onChange={(event) => setDueTime(event.target.value)} className={`${modalControl} cursor-pointer`} />
        </ModalField>
        <ModalField label="Priority" required>
          <select
            value={priority}
            aria-label="Priority"
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            className={`${modalControl} cursor-pointer`}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PRIORITY_LABEL[option]}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Repeats">
          <select
            value={recurrence}
            aria-label="Repeats"
            onChange={(event) => setRecurrence(event.target.value as TaskRecurrence)}
            className={`${modalControl} cursor-pointer`}
          >
            {RECURRENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {RECURRENCE_LABEL[option]}
              </option>
            ))}
          </select>
        </ModalField>
      </ModalFields>
      <p className="mx-[22px] mb-0 mt-3.5 rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] p-3.5 text-[12.5px] leading-[1.55] text-[#57504A]">
        The task lands on today&rsquo;s board. Whoever owns it carries their department with them — that is the department the card shows. A repeating
        task comes back when this one is ticked off, not before: an unfinished check stays put.
      </p>
      {error ? <p className="mx-[22px] mb-0 mt-2.5 text-[12px] font-semibold text-[#C93A22]">{error}</p> : null}
    </HandoffModal>
  );
}

function AssignTaskModal({
  card,
  employees,
  onClose,
  onAssign,
  pending
}: {
  card: TaskCard | null;
  employees: Employee[];
  onClose: () => void;
  onAssign: (employeeId: string) => void;
  pending: boolean;
}): React.ReactElement {
  const [employeeId, setEmployeeId] = useState('');
  const people = employees.filter((employee) => employee.is_active);

  return (
    <HandoffModal
      open={card !== null}
      title="Assign this task"
      subtitle={card ? card.title : ''}
      primary={pending ? 'Assigning…' : 'Assign task'}
      primaryDisabled={pending || !employeeId}
      onPrimary={() => onAssign(employeeId)}
      onClose={() => {
        setEmployeeId('');
        onClose();
      }}
    >
      <ModalFields>
        <ModalField label="Owner" required full>
          <select value={employeeId} aria-label="Owner" onChange={(event) => setEmployeeId(event.target.value)} className={`${modalControl} cursor-pointer`}>
            <option value="">Choose someone</option>
            {people.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {`${employee.first_name} ${employee.last_name}`.trim()}
              </option>
            ))}
          </select>
        </ModalField>
      </ModalFields>
      <p className="mx-[22px] mb-0 mt-3.5 rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] p-3.5 text-[12.5px] leading-[1.55] text-[#57504A]">
        One person is accountable for a task. They can tick it off, and the card moves to Completed.
      </p>
    </HandoffModal>
  );
}

function DeleteTaskModal({
  card,
  onClose,
  onDelete,
  pending
}: {
  card: TaskCard | null;
  onClose: () => void;
  onDelete: () => void;
  pending: boolean;
}): React.ReactElement {
  return (
    <HandoffModal
      open={card !== null}
      title="Delete this task?"
      subtitle={card ? card.title : ''}
      primary={pending ? 'Deleting…' : 'Delete task'}
      primaryDisabled={pending}
      onPrimary={onDelete}
      onClose={onClose}
    >
      <p className="mx-[22px] mb-0 mt-[18px] rounded-[13px] border border-solid border-[#F7E4DF] bg-[#FDF6F4] p-3.5 text-[12.5px] leading-[1.55] text-[#8E5A2E]">
        It leaves the board for everyone. The record is kept — deleting a task archives it, so what was done, by whom and when stays in the history and
        in the audit trail.
        {card?.repeats ? ' A repeating task stops here: no further occurrence is created.' : ''}
      </p>
    </HandoffModal>
  );
}

/** The handoff's task card (markup lines 911-925), plus a way to remove one. */
function BoardCard({
  card,
  onToggle,
  onAssign,
  onDelete
}: {
  card: TaskCard;
  onToggle: (() => void) | null;
  onAssign: (() => void) | null;
  onDelete: (() => void) | null;
}): React.ReactElement {
  // 17px of circle either way: filled when it is done, otherwise a 1.5px ring
  // outside those 17px — the handoff has no box-sizing reset, so the ring adds
  // to the box rather than eating into it.
  const check = `mt-px flex size-[17px] flex-none items-center justify-center rounded-full text-[10px] font-extrabold ${
    card.done ? 'border-0 bg-[#2E9E62] text-white' : 'box-content border-[1.5px] border-solid border-[#EBE7E3] bg-transparent text-transparent'
  }`;

  return (
    <article className="rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] px-[13px] py-3">
      <div className="flex items-start gap-[9px]">
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={card.done ? `Reopen ${card.title}` : `Mark ${card.title} done`}
            className={`${check} cursor-pointer p-0`}
          >
            ✓
          </button>
        ) : (
          <span className={check} aria-hidden="true">
            ✓
          </span>
        )}
        <p className="m-0 flex-auto text-[12.5px] font-bold [text-wrap:pretty]">{card.title}</p>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${card.title}`}
            title="Delete task"
            className="-mr-0.5 mt-px flex size-[18px] flex-none cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-[#C0B6AE] hover:text-[#C93A22]"
          >
            <ScheduleIcon name="trash" size={14} />
          </button>
        ) : null}
      </div>
      <p className="mb-0 mt-2 text-[11.5px] text-[#857A72]">{card.meta}</p>
      <div className="mt-[9px] flex items-center gap-[7px]">
        <span className="inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold" style={pillStyle(card.tone)}>
          {card.priority}
        </span>
        {onAssign ? (
          <button
            type="button"
            onClick={onAssign}
            aria-label={`Assign ${card.title}`}
            className="cursor-pointer border-0 bg-transparent p-0 text-[11px] text-[#A79C93] hover:underline"
          >
            {card.assignee}
          </button>
        ) : (
          <span className="text-[11px] text-[#A79C93]">{card.assignee}</span>
        )}
      </div>
    </article>
  );
}

function Board({
  columns,
  onToggle,
  onAssign,
  onDelete
}: {
  columns: TaskColumn[];
  onToggle: (card: TaskCard) => (() => void) | null;
  onAssign: (card: TaskCard) => (() => void) | null;
  onDelete: (card: TaskCard) => (() => void) | null;
}): React.ReactElement {
  return (
    // Three columns side by side, always — the handoff's own auto-fit track
    // folds them into one another on a narrow window (or at browser zoom),
    // and a board that stacks is no longer a board. Below ~790px it scrolls
    // sideways instead, the way the handoff's wide tables do.
    <div className="overflow-x-auto">
      <div className="grid min-w-[790px] grid-cols-3 items-start gap-3.5">
      {columns.map((column) => (
        <section key={column.title} className="rounded-[16px] border border-solid border-[#EBE7E3] bg-white p-3.5">
          <div className="flex items-center gap-[9px]">
            <span className="size-[9px] flex-none rounded-[3px]" style={{ background: column.dot }} />
            <h2 className="m-0 text-[13.5px] font-extrabold tracking-normal">{column.title}</h2>
            <span className="ml-auto text-[11px] font-extrabold text-[#A79C93]">{column.cards.length}</span>
          </div>
          <div className="mt-3 flex flex-col gap-[9px]">
            {column.cards.map((card) => (
              <BoardCard key={card.id} card={card} onToggle={onToggle(card)} onAssign={onAssign(card)} onDelete={onDelete(card)} />
            ))}
            {column.cards.length === 0 ? (
              <div className="rounded-[13px] border border-dashed border-[#E4DED9] px-3 py-[22px] text-center">
                <p className="m-0 text-[12.5px] font-bold text-[#857A72]">Nothing here</p>
              </div>
            ) : null}
          </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function TasksPage(): React.ReactElement {
  const now = useNow();
  const { toast, show, dismiss } = useScheduleToast();
  const { hasPermission, profile } = useSession();
  const canRead = hasPermission('tasks.read');
  const canCreate = hasPermission('tasks.create');
  const canAssign = hasPermission('tasks.assign');
  const canComplete = hasPermission('tasks.complete');
  const canUpdate = hasPermission('tasks.update');
  const canArchive = hasPermission('tasks.archive');

  // A Manager works in their own branch only — no branch picker, as the handoff has none.
  const branchId = useDefaultBranchId() ?? '';
  const scoped = branchId ? { branchId } : undefined;

  const tasksQuery = useRpcQuery<Task[]>('list_tasks', { branchId: branchId || undefined, limit: 200 }, { enabled: canRead });
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: canRead && hasPermission('employees.read') });
  const { data: departments } = useRpcQuery<Department[]>('list_departments', scoped, { enabled: canRead && hasPermission('departments.read') });
  const { data: branches } = useRpcQuery<{ id: string; name: string }[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const branchName = (branches ?? []).find((branch) => branch.id === branchId)?.name ?? 'Your branch';

  // `?compose=1` (the overview's Ask ShiftOS "Open task form") opens the form straight away.
  const [searchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(() => searchParams.get('compose') === '1');
  const [assignTarget, setAssignTarget] = useState<TaskCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskCard | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('All');
  const [query, setQuery] = useState('');

  const create = useRpcMutation<Task, Record<string, unknown>>('create_task', { invalidates: ['list_tasks'] });
  const assign = useRpcMutation<Task, { taskId: string; supervisorEmployeeId: string }>('assign_task', { invalidates: ['list_tasks'] });
  const complete = useRpcMutation<Task, { taskId: string; notes?: string }>('complete_task', { invalidates: ['list_tasks'] });
  const reopen = useRpcMutation<Task, { taskId: string }>('reopen_task', { invalidates: ['list_tasks'] });
  const archive = useRpcMutation<Task, { taskId: string }>('archive_task', { invalidates: ['list_tasks'] });

  const myEmployeeId = useMemo(() => {
    const mine = emailKey(profile?.email);
    if (!mine) return null;
    return (employees ?? []).find((employee) => emailKey(employee.email) === mine)?.id ?? null;
  }, [employees, profile]);

  const board = useMemo(
    () => buildBoard({ tasks: tasksQuery.data ?? [], employees: employees ?? [], departments: departments ?? [], now }),
    [tasksQuery.data, employees, departments, now]
  );
  const shown = filterBoard(board, filter, query, myEmployeeId);

  if (!canRead) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const createTask = async ({
    title,
    dueTime,
    priority,
    recurrence,
    assigneeId
  }: {
    title: string;
    dueTime: string;
    priority: TaskPriority;
    recurrence: TaskRecurrence;
    assigneeId: string;
  }): Promise<void> => {
    try {
      const task = await create.mutateAsync({ branchId, title, dueDate: todayOf(now), dueTime: dueTime || null, priority, recurrence });
      if (assigneeId && canAssign) await assign.mutateAsync({ taskId: task.id, supervisorEmployeeId: assigneeId });
      setCreateOpen(false);
      show('Task created');
    } catch (problem) {
      show(problem instanceof Error ? problem.message : 'Could not create the task');
    }
  };

  /** The empty state's second button: today's board seeded from yesterday's tasks. */
  const copyYesterday = async (): Promise<void> => {
    const date = yesterdayOf(now);
    const previous = (tasksQuery.data ?? []).filter((task) => task.due_date === date && !task.deleted_at && task.task_status !== 'cancelled');
    if (previous.length === 0) {
      show('Nothing to copy — yesterday had no tasks');
      return;
    }
    try {
      for (const task of previous) {
        await create.mutateAsync({
          branchId,
          title: task.title,
          description: task.description,
          dueDate: todayOf(now),
          dueTime: task.due_time,
          priority: task.priority,
          recurrence: task.recurrence
        });
      }
      show(`Copied ${previous.length} task${previous.length === 1 ? '' : 's'} from yesterday`);
    } catch (problem) {
      show(problem instanceof Error ? problem.message : "Could not copy yesterday's tasks");
    }
  };

  const toggle = (card: TaskCard) => {
    if (card.done) {
      if (!canUpdate || card.status === 'verified') return null;
      return () => {
        reopen
          .mutateAsync({ taskId: card.id })
          .then(() => show(`${card.title} reopened`))
          .catch((problem: unknown) => show(problem instanceof Error ? problem.message : 'Could not reopen the task'));
      };
    }
    if (!canComplete) return null;
    // The schema keeps an unassigned task in 'draft', and only an assigned task can be completed.
    if (card.status === 'draft') {
      return canAssign ? () => setAssignTarget(card) : () => show('Assign this task before ticking it off');
    }
    return () => {
      complete
        .mutateAsync({ taskId: card.id })
        .then(() => show(card.repeats ? `${card.title} done · the next one is on its way` : `${card.title} done`))
        .catch((problem: unknown) => show(problem instanceof Error ? problem.message : 'Could not complete the task'));
    };
  };

  const assignOf = (card: TaskCard) => (canAssign && !card.done ? () => setAssignTarget(card) : null);
  const deleteOf = (card: TaskCard) => (canArchive ? () => setDeleteTarget(card) : null);

  const deleteTask = (): void => {
    const card = deleteTarget;
    if (!card) return;
    archive
      .mutateAsync({ taskId: card.id })
      .then(() => {
        setDeleteTarget(null);
        show(`${card.title} deleted`);
      })
      .catch((problem: unknown) => show(problem instanceof Error ? problem.message : 'Could not delete the task'));
  };

  const body = (): React.ReactNode => {
    if (tasksQuery.isLoading) return <OverviewLoading />;
    if (boardTotal(board) === 0) {
      return (
        <OverviewEmpty
          title="No tasks today"
          body="Add the recurring checks that keep the branch running — cold room, floor walk, restocks."
          cta={canCreate ? { label: 'Create task', onClick: () => setCreateOpen(true) } : null}
          secondary={canCreate ? { label: 'Copy yesterday', onClick: () => void copyYesterday() } : null}
        />
      );
    }
    return (
      <>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="block min-w-[190px] flex-[1_1_240px]">
            <span className="sr-only">Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks"
              className="box-border h-10 w-full rounded-[11px] border border-solid border-[#E4DED9] bg-white px-[13px] text-[13px] text-[#38312B] outline-none focus:border-[#F04E17]"
            />
          </label>
          {TASK_FILTERS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={filter === name}
              onClick={() => setFilter(name)}
              className={[
                'h-10 cursor-pointer rounded-[11px] border border-solid px-[13px] text-[12.5px] font-bold',
                filter === name ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'
              ].join(' ')}
            >
              {name}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-[#A79C93]">{tasksCount(shown, filter)}</span>
        </div>

        <Board columns={shown} onToggle={toggle} onAssign={assignOf} onDelete={deleteOf} />
      </>
    );
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader
        title="Tasks"
        subtitle={tasksSubtitle(branchName)}
        now={now}
        actions={canCreate && boardTotal(board) > 0 ? <HeaderCta label="New task" onClick={() => setCreateOpen(true)} /> : null}
      />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>

      <NewTaskModal
        open={createOpen}
        employees={employees ?? []}
        departments={departments ?? []}
        pending={create.isPending || assign.isPending}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => void createTask(input)}
      />
      <AssignTaskModal
        key={assignTarget?.id ?? "none"}
        card={assignTarget}
        employees={employees ?? []}
        pending={assign.isPending}
        onClose={() => setAssignTarget(null)}
        onAssign={(employeeId) => {
          const card = assignTarget;
          if (!card || !employeeId) return;
          assign
            .mutateAsync({ taskId: card.id, supervisorEmployeeId: employeeId })
            .then(() => {
              setAssignTarget(null);
              show(`${card.title} assigned`);
            })
            .catch((problem: unknown) => show(problem instanceof Error ? problem.message : 'Could not assign the task'));
        }}
      />
      <DeleteTaskModal card={deleteTarget} pending={archive.isPending} onClose={() => setDeleteTarget(null)} onDelete={deleteTask} />
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
