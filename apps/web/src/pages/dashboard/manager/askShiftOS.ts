/**
 * Ask ShiftOS on the Manager overview — the handoff's ASK_HINTS, ASK_CHIPS and
 * keyword intents (`ShiftOS Dashboards.dc.html` lines 3147-3201), answered
 * from the branch's real data instead of the design's fixed sample answers.
 * Anything no intent recognises gets the handoff's fallback card.
 */
import { fullName } from '../../scheduling/grid/scheduleFormat.js';
import { agoText, dateRange, daysAgo, dayMonth, LEAVE_TYPE_LABEL, plural, weekdayDayMonth, type ManagerOverview } from './overviewModel.js';

export const ASK_HINTS = [
  'How many people are working today?',
  'How many staff do we have?',
  'Add a new task for the Warehouse team',
  'Post an announcement to the whole branch',
  'Show me recent activity',
  'Which invitations are still pending?',
  'Who has leave waiting on my approval?'
];

export const ASK_CHIPS = ["Who's working today?", 'How many staff do we have?', 'Add a task', 'New announcement', 'Recent activity', 'Pending invitations', 'Leave waiting on me'];

export interface AskAnswer {
  kind: 'read' | 'action';
  label: string;
  value: string;
  sub: string;
  lines: string[];
  action: { label: string; to: string };
  foot: string;
}

type Builder = (overview: ManagerOverview, now: Date) => AskAnswer;

/** '08:00:00' → '08:00' — the handoff writes shift times on the 24-hour clock. */
const hhmm = (time: string): string => time.slice(0, 5);
const clock24 = (iso: string): string => {
  const at = new Date(iso);
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
};

const workingToday: Builder = (overview) => {
  const { today, branchName } = overview.detail;
  const checkedIn = today.filter((row) => row.record?.clock_in_at).length;
  const starts = today.map((row) => row.shift.start_time).sort();
  const ends = today.map((row) => row.shift.end_time).sort();
  const byDepartment = new Map<string, typeof today>();
  for (const row of today) byDepartment.set(row.departmentName, [...(byDepartment.get(row.departmentName) ?? []), row]);
  const lines = [...byDepartment.entries()].map(([name, rows]) => {
    const inRows = rows.filter((row) => row.record?.clock_in_at);
    const late = inRows.find((row) => row.record?.attendance_status === 'late' || (row.record?.late_minutes ?? 0) > 0);
    const detail = late?.employee && late.record?.clock_in_at
      ? `${fullName(late.employee)} clocked in late (${clock24(late.record.clock_in_at)})`
      : inRows.length === rows.length
        ? 'full coverage'
        : `${plural(rows.length - inRows.length, 'person', 'people')} not in yet`;
    return `${name} — ${inRows.length} of ${rows.length} · ${detail}`;
  });
  return {
    kind: 'read',
    label: 'On shift now',
    value: `${checkedIn} of ${today.length} scheduled`,
    sub: today.length ? `${branchName} · ${plural(today.length, 'shift')} today, ${hhmm(starts[0])} – ${hhmm(ends[ends.length - 1])}` : `${branchName} · Nothing published for today`,
    lines: lines.length ? lines : ['Nobody is on a published shift today'],
    action: { label: 'See attendance', to: '/attendance' },
    foot: 'Live from clock-ins · updated a moment ago'
  };
};

const headcount: Builder = (overview) => {
  const { employees, departments, branchName, pendingInvitations } = overview.detail;
  const onLeave = employees.filter((e) => e.employment_status === 'on_leave').length;
  const inactive = employees.filter((e) => e.employment_status === 'inactive').length;
  const counts = departments
    .map((d) => ({ name: d.name, count: employees.filter((e) => e.department_id === d.id).length }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((d) => `${d.name} ${d.count}`);
  const departmentLines: string[] = [];
  for (let i = 0; i < counts.length && departmentLines.length < 2; i += 3) departmentLines.push(counts.slice(i, i + 3).join(' · '));
  return {
    kind: 'read',
    label: 'Headcount',
    value: plural(employees.length, 'employee'),
    sub: `${branchName} · ${plural(departments.length, 'department')} · as of today`,
    lines: [
      `${employees.length - onLeave - inactive} active · ${onLeave} on leave · ${inactive} inactive`,
      ...departmentLines,
      ...(pendingInvitations.length ? [`${plural(pendingInvitations.length, 'invitation')} still outstanding`] : [])
    ],
    action: { label: 'Open Employees', to: '/employees' },
    foot: 'Read-only — nothing was changed'
  };
};

const addTask: Builder = () => ({
  kind: 'action',
  label: 'Create a task',
  value: 'Ready to create a task',
  sub: "I'll pre-fill the shift and department — you confirm.",
  lines: ['Owner defaults to the supervisor on duty', 'Due time defaults to the end of the current shift', 'The assignee is notified the moment you save'],
  action: { label: 'Open task form', to: '/tasks?compose=1' },
  foot: 'Nothing is saved until you press Create task'
});

const announcement: Builder = (overview, now) => {
  const last = overview.detail.lastAnnouncement;
  return {
    kind: 'action',
    label: 'Post an announcement',
    value: 'Ready to post an announcement',
    sub: 'Whole branch, with read receipts on by default.',
    lines: [
      'Replaces the branch WhatsApp group',
      "You'll see who read it and who acknowledged",
      last ? `Last notice went out ${agoText(daysAgo(last.published_at ?? last.created_at, now))}` : 'This will be the branch’s first notice'
    ],
    action: { label: 'Open announcement form', to: '/announcements?compose=1' },
    foot: 'Nothing is posted until you confirm'
  };
};

const recentActivity: Builder = (overview, now) => {
  const todayCount = overview.activity.filter((event) => event.at.toDateString() === now.toDateString()).length;
  return {
    kind: 'read',
    label: 'Recent activity',
    value: plural(todayCount, 'event') + ' today',
    sub: 'Across schedules, attendance and requests',
    lines: overview.activity.length ? overview.activity.slice(0, 4).map((event) => `${event.title} · ${event.time}`) : ['Nothing has happened in the last 7 days'],
    action: { label: 'See attendance', to: '/attendance' },
    foot: 'Read-only — nothing was changed'
  };
};

const invitations: Builder = (overview, now) => {
  const pending = overview.detail.pendingInvitations;
  const daysLeft = (expiresAt: string): number => Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000);
  const expiring = pending.filter((i) => daysLeft(i.expires_at) <= 1).length;
  return {
    kind: 'read',
    label: 'Invitations',
    value: expiring ? `${pending.length} pending · ${expiring} expiring` : `${pending.length} pending`,
    sub: `Invitations sent from ${overview.detail.branchName}`,
    lines: [
      ...pending.slice(0, 3).map((i) => {
        const who = i.first_name ? `${i.first_name} ${i.last_name ?? ''}`.trim() : i.email;
        const left = daysLeft(i.expires_at);
        return `${who} · ${i.role_name} · sent ${agoText(daysAgo(i.created_at, now))}${left <= 1 ? ' (expires tomorrow)' : ''}`;
      }),
      'Invitations expire after 7 days and can be resent'
    ],
    action: { label: 'Open Invitations', to: '/invitations' },
    foot: 'Read-only — nobody was re-invited'
  };
};

const leave: Builder = (overview) => {
  const { pendingLeave, pendingSwaps, employeesById } = overview.detail;
  return {
    kind: 'read',
    label: 'Leave waiting on you',
    value: `${plural(pendingLeave.length, 'leave request')} pending`,
    sub: `Plus ${plural(pendingSwaps.length, 'swap request')} awaiting approval`,
    lines: pendingLeave.length
      ? pendingLeave.slice(0, 4).map((l) => {
          const person = employeesById.get(l.employee_id);
          return `${person ? fullName(person) : 'Employee'} · ${dateRange(l.start_date, l.end_date)} · ${LEAVE_TYPE_LABEL[l.leave_type]} · ${l.reason}`;
        })
      : ['Nothing is waiting on your approval'],
    action: { label: 'Review requests', to: '/requests' },
    foot: 'Decisions are logged against your name'
  };
};

const coverage: Builder = (overview) => {
  const { gaps } = overview.detail;
  return {
    kind: 'read',
    label: 'Coverage gaps',
    value: `${plural(gaps.length, 'gap')} this week`,
    sub: `Week of ${dayMonth(overview.weekStart)} · unfilled published slots`,
    lines: gaps.length
      ? gaps.slice(0, 4).map((gap) => `${weekdayDayMonth(gap.shift.shift_date)} · ${gap.departmentName} · ${hhmm(gap.shift.start_time)} – ${hhmm(gap.shift.end_time)} · 1 slot`)
      : ['Every published shift this week has someone on it'],
    action: { label: 'Open Schedules', to: `/schedules?week=${overview.weekStart}` },
    foot: 'Read-only — no shifts were reassigned'
  };
};

const attendanceToday: Builder = (overview) => {
  const today = overview.detail.today;
  const late = today.filter((row) => row.record && (row.record.attendance_status === 'late' || row.record.late_minutes > 0));
  const absent = today.filter((row) => row.record && (row.record.attendance_status === 'absent' || row.record.attendance_status === 'no_show'));
  const name = (row: (typeof today)[number]): string => (row.employee ? fullName(row.employee) : 'Employee');
  return {
    kind: 'read',
    label: 'Attendance today',
    value: `${late.length} late · ${absent.length} absent`,
    sub: `Today · ${today.length} scheduled`,
    lines: [
      ...late.map((row) => `${name(row)} · ${row.record?.clock_in_at ? clock24(row.record.clock_in_at) : 'late'} · ${row.record?.notes || 'no note'}`),
      ...absent.map((row) => `${name(row)} · absent${row.record?.notes ? ` · ${row.record.notes}` : ''}`)
    ].slice(0, 4).concat(late.length + absent.length === 0 ? ['Everyone due so far has clocked in on time'] : []),
    action: { label: 'Open Attendance', to: '/attendance' },
    foot: 'Live from clock-ins · updated a moment ago'
  };
};

const hours: Builder = (overview) => {
  const perPerson = new Map<string, number>();
  for (const record of overview.detail.attendanceWeek) {
    if (!record.clock_out_at) continue;
    perPerson.set(record.employee_id, (perPerson.get(record.employee_id) ?? 0) + record.worked_minutes);
  }
  const totalHours = [...perPerson.values()].reduce((sum, minutes) => sum + minutes, 0) / 60;
  const over = [...perPerson.entries()].filter(([, minutes]) => minutes > 45 * 60).map(([id]) => overview.detail.employeesById.get(id)).filter(Boolean);
  return {
    kind: 'read',
    label: 'Hours this week',
    value: `${Math.round(totalHours).toLocaleString('en-US')} hours`,
    sub: `Confirmed attendance · week of ${dayMonth(overview.weekStart)}`,
    lines: [
      perPerson.size ? `${plural(perPerson.size, 'person', 'people')} clocked out this week · average ${(totalHours / perPerson.size).toFixed(1)}h` : 'Nobody has clocked out this week yet',
      over.length ? `${plural(over.length, 'person', 'people')} over 45h — ${over.map((e) => (e ? fullName(e) : '')).join(', ')}` : 'Nobody is over 45h'
    ],
    action: { label: 'Open Attendance', to: '/attendance' },
    foot: 'Confirmed hours only — open shifts excluded'
  };
};

const INTENTS: Array<{ keys: string[]; build: Builder }> = [
  { keys: ['working today', "who's working", 'who is working', 'on shift', 'on duty', 'how many people are working'], build: workingToday },
  { keys: ['how many staff', 'how many employees', 'headcount', 'total staff', 'team size'], build: headcount },
  { keys: ['add a task', 'new task', 'assign a task', 'create a task'], build: addTask },
  { keys: ['announcement', 'announce', 'tell the team', 'post a notice'], build: announcement },
  { keys: ['recent activity', 'what happened', 'activity', 'log', 'audit'], build: recentActivity },
  { keys: ['invitation', 'invites', 'invited', 'pending invitation'], build: invitations },
  { keys: ['leave', 'time off', 'holiday', 'approval', 'waiting on me', 'requests'], build: leave },
  { keys: ['coverage', 'gap', 'unfilled', 'short'], build: coverage },
  { keys: ['late', 'absent', 'attendance today'], build: attendanceToday },
  { keys: ['hours', 'payroll', 'overtime'], build: hours }
];

function fallback(overview: ManagerOverview): AskAnswer {
  return {
    kind: 'read',
    label: `Ask me anything about ${overview.detail.branchName}`,
    value: 'I can answer that a few ways',
    sub: 'Try one of these — or tap a suggestion below.',
    lines: ['“How many people are working today?”', '“How many staff do we have?”', '“Which invitations are still pending?”', '“Add a task” or “post an announcement”'],
    action: { label: 'See recent activity', to: '/attendance' },
    foot: 'Read-only answers are instant'
  };
}

/** Handoff askRun(): the first intent with a key found in the question wins. */
export function answerQuestion(question: string, overview: ManagerOverview, now: Date): AskAnswer {
  const low = question.toLowerCase();
  const intent = INTENTS.find((candidate) => candidate.keys.some((key) => low.includes(key)));
  return intent ? intent.build(overview, now) : fallback(overview);
}

/* ---------------- Supervisor (handoff ASK_HINTS_SUP / ASK_CHIPS_SUP / ASK_INTENTS_SUP) ---------------- */

export const ASK_HINTS_SUP = [
  "Who's on my team today?",
  "How do I check this week's schedule?",
  'Any coverage gaps on my shift?',
  "Who's late or absent today?",
  'Who has leave waiting on me?',
  'How many hours has my team worked?'
];

export const ASK_CHIPS_SUP = ["Who's working today?", 'How do I see the schedule?', 'Coverage gaps', 'Attendance today', 'Leave waiting on me', 'Hours this week', 'Can I add a task?'];

/** What the signed-in supervisor may do — the answers follow their real permissions. */
export interface SupervisorAbilities {
  editSchedules: boolean;
  createTasks: boolean;
}

const supervisorSchedule = (overview: ManagerOverview, abilities: SupervisorAbilities): AskAnswer => ({
  kind: 'read',
  label: 'Schedules',
  value: abilities.editSchedules ? 'You can build and publish schedules' : 'Published by your manager',
  sub: abilities.editSchedules ? `${overview.detail.branchName} · week by week` : "You can view your team's shifts and approve swaps",
  lines: abilities.editSchedules
    ? ['Open Schedules to see every shift for the week', 'Drafts stay private until you publish them', 'Swap requests from your team route to you for approval']
    : ['Your manager publishes and edits the branch schedule', 'You can see every published shift under Schedules', 'Swap requests from your team route to you for approval'],
  action: { label: 'Open Schedules', to: `/schedules?week=${overview.weekStart}` },
  foot: abilities.editSchedules ? 'Read-only — nothing was changed' : 'Read-only — schedule changes are made by your manager'
});

const supervisorTask = (_overview: ManagerOverview, abilities: SupervisorAbilities): AskAnswer =>
  abilities.createTasks
    ? { ...addTask(_overview, new Date()), lines: ['Pick anyone on this shift as the assignee', 'Set a due time inside the shift', 'The assignee is notified the moment you save'] }
    : {
        kind: 'read',
        label: 'Not available to you',
        value: 'Only managers create tasks',
        sub: 'You can view and complete tasks assigned to your team',
        lines: ["Open Tasks to see what's assigned and mark items done", 'Ask your manager to raise a new task', 'Shift Notes is the right place to log something for handover'],
        action: { label: 'Open Tasks', to: '/tasks' },
        foot: 'Read-only — nothing was created'
      };

const SUPERVISOR_INTENTS: Array<{ keys: string[]; build: (overview: ManagerOverview, now: Date, abilities: SupervisorAbilities) => AskAnswer }> = [
  { keys: ['working today', "who's working", 'who is working', 'on my team', 'on shift', 'on duty'], build: (o, n) => workingToday(o, n) },
  { keys: ['add a task', 'new task', 'create a task', 'assign a task'], build: (o, _n, a) => supervisorTask(o, a) },
  { keys: ['schedule', 'roster', 'publish', 'shifts this week', 'next week'], build: (o, _n, a) => supervisorSchedule(o, a) },
  { keys: ['coverage', 'gap', 'unfilled', 'short'], build: (o, n) => coverage(o, n) },
  { keys: ['late', 'absent', 'attendance'], build: (o, n) => attendanceToday(o, n) },
  { keys: ['leave', 'time off', 'holiday', 'approval', 'waiting on me', 'requests'], build: (o, n) => leave(o, n) },
  { keys: ['hours', 'overtime', 'payroll'], build: (o, n) => hours(o, n) }
];

/** Handoff askRun() for the Supervisor: the first intent with a key found in the question wins. */
export function answerSupervisorQuestion(question: string, overview: ManagerOverview, now: Date, abilities: SupervisorAbilities): AskAnswer {
  const low = question.toLowerCase();
  const intent = SUPERVISOR_INTENTS.find((candidate) => candidate.keys.some((key) => low.includes(key)));
  if (intent) return intent.build(overview, now, abilities);
  return {
    kind: 'read',
    label: 'Ask me about your team or shift',
    value: 'I can answer that a few ways',
    sub: 'Try one of these — or tap a suggestion below.',
    lines: ['“Who’s on my team today?”', '“How do I check this week’s schedule?”', '“Any coverage gaps?”', '“Who has leave waiting on me?”'],
    action: { label: 'Open Attendance', to: '/attendance' },
    foot: 'Read-only answers are instant'
  };
}
