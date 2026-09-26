/**
 * The Admin console's pure helpers, after the design handoff's
 * `ShiftOS Admin.dc.html` (BRANCHES, orgStats, attentionItems, branchCards and
 * the branch detail header). Everything is built from the organization's real
 * branches, people and memberships — `now` is injected.
 *
 * ShiftOS has no per-branch "Branch Manager" record: a Manager's role reaches
 * every branch (grants_org_wide_branch_access), so a branch's managers are the
 * organization-wide members plus anyone on that branch whose role is named a
 * manager role. Supervisors are the members granted that branch whose role
 * runs its schedule (anything else, like Admin or Employee, is neither).
 */
import { resolveCountryValue, resolveStateValue } from '@shiftos/geography';
import type { Branch, Employee, Member } from '../../types/domain.js';
import { DAYS, readHours, type WeekHours } from '../settings/settingsModel.js';
import type { Tone } from '../scheduling/grid/scheduleFormat.js';

export type BranchStatus = 'Active' | 'Pending setup' | 'Archived';

export interface Leader {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface BranchSummary {
  branch: Branch;
  name: string;
  location: string;
  address: string;
  status: BranchStatus;
  employees: number;
  managers: Leader[];
  supervisors: Leader[];
  hours: string;
  created: string;
  /** Why the branch is flagged — null when it is operating normally. */
  attentionNote: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '12 Jan 2024' */
export function shortDay(iso: string): string {
  const at = new Date(iso);
  return `${at.getDate()} ${MONTHS[at.getMonth()]} ${at.getFullYear()}`;
}

/** 'Lagos, Nigeria' from the branch's settings (city, state, country), whatever it has. */
export function branchLocation(branch: Branch): string {
  const s = branch.settings ?? {};
  const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  const country = resolveCountryValue(text(s.country));
  const state = resolveStateValue(country?.code, text(s.state));
  const city = text(s.city);
  const region = state?.label ?? text(s.state);
  const parts = [city, region || country?.label || text(s.country)].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(', ') : 'Location not set';
}

/** '9:00 AM' from '09:00'. */
function clock(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Handoff 'Mon–Sun · 8:00 AM–10:00 PM': the days the branch keeps one set of hours; otherwise per-range, or 'Not set'. */
export function hoursSummary(hours: WeekHours | null): string {
  if (!hours) return 'Not set';
  const open = DAYS.filter((d) => !hours[d].closed);
  if (open.length === 0) return 'Closed every day';
  const same = open.every((d) => hours[d].open === hours[open[0]].open && hours[d].close === hours[open[0]].close);
  const range = `${clock(hours[open[0]].open)}–${clock(hours[open[0]].close)}`;
  if (!same) return 'Varies by day';
  const first = open[0];
  const last = open[open.length - 1];
  const contiguous = DAYS.indexOf(last) - DAYS.indexOf(first) + 1 === open.length;
  const days = open.length === 1 ? first : contiguous ? `${first}–${last}` : open.join(', ');
  return `${days} · ${range}`;
}

const isManagerRole = (member: Member): boolean => Boolean(member.role_org_wide) || /manager|owner/i.test(member.role_name);
const isSupervisorRole = (member: Member): boolean => /supervisor|lead/i.test(member.role_name);

const leader = (member: Member): Leader => ({
  id: member.id,
  name: `${member.user_first_name} ${member.user_last_name}`.trim() || member.user_email,
  role: member.user_job_title?.trim() || (member.role_org_wide ? 'Manager' : member.role_name),
  email: member.user_email
});

export function summarizeBranches(branches: Branch[], employees: Employee[], members: Member[]): BranchSummary[] {
  const live = members.filter((m) => m.is_active && !m.deleted_at);
  return branches
    .filter((b) => !b.deleted_at)
    .map((branch): BranchSummary => {
      const staff = employees.filter((e) => e.branch_id === branch.id && !e.deleted_at && e.employment_status !== 'terminated');
      const onBranch = (m: Member): boolean => Boolean(m.role_org_wide) || (m.branch_ids ?? []).includes(branch.id);
      const managers = live.filter((m) => onBranch(m) && isManagerRole(m)).map(leader);
      const supervisors = live.filter((m) => !m.role_org_wide && (m.branch_ids ?? []).includes(branch.id) && isSupervisorRole(m)).map(leader);
      const hours = readHours(branch.settings);
      const pendingSetup = branch.is_active && (staff.length === 0 || !hours);
      const status: BranchStatus = !branch.is_active ? 'Archived' : pendingSetup ? 'Pending setup' : 'Active';
      const attentionNote =
        status === 'Pending setup'
          ? 'Branch setup is incomplete.'
          : status === 'Active' && managers.length === 0
            ? 'No branch manager assigned.'
            : status === 'Active' && supervisors.length === 0
              ? 'No supervisor assigned.'
              : null;
      return {
        branch,
        name: branch.name,
        location: branchLocation(branch),
        address: branch.address?.trim() || 'Not set',
        status,
        employees: staff.length,
        managers,
        supervisors,
        hours: hoursSummary(hours),
        created: shortDay(branch.created_at),
        attentionNote
      };
    })
    .sort((a, b) => (a.status === 'Archived' ? 1 : 0) - (b.status === 'Archived' ? 1 : 0) || a.branch.created_at.localeCompare(b.branch.created_at));
}

/**
 * The plan the organization is on. ShiftOS has no billing yet — every feature
 * is free during early access, with no seat cap and no invoices — so the
 * handoff's plan card shows that, rather than an invented plan and price.
 */
export const PLAN = {
  name: 'Early access',
  price: '₦0',
  seats: (employees: number): string => `${employees} ${employees === 1 ? 'employee' : 'employees'} · no seat limit`,
  usage: 'No limit',
  renews: 'Nothing is billed during early access'
} as const;

export type BranchFilter ='All' | 'Active' | 'Attention' | 'Pending setup';
export const BRANCH_FILTERS: BranchFilter[] = ['All', 'Active', 'Attention', 'Pending setup'];

export function filterBranches(list: BranchSummary[], filter: BranchFilter): BranchSummary[] {
  if (filter === 'All') return list;
  if (filter === 'Attention') return list.filter((b) => b.attentionNote);
  return list.filter((b) => b.status === filter);
}

export const STATUS_TONE: Record<BranchStatus, Tone> = { Active: 'ok', 'Pending setup': 'warn', Archived: 'neutral' };

export interface OrgStats {
  branches: number;
  employees: number;
  managers: number;
  supervisors: number;
}

/** Handoff orgStats: active branches, and the people, managers and supervisors across them (each person counted once). */
export function orgStats(list: BranchSummary[]): OrgStats {
  const active = list.filter((b) => b.status !== 'Archived');
  return {
    branches: active.length,
    employees: active.reduce((n, b) => n + b.employees, 0),
    managers: new Set(active.flatMap((b) => b.managers.map((m) => m.id))).size,
    supervisors: new Set(active.flatMap((b) => b.supervisors.map((m) => m.id))).size
  };
}

/** Handoff runAssistant(): read-only answers and navigation — it never changes anything. */
export function answerAdmin(question: string, list: BranchSummary[]): { text: string; to: string | null } {
  const low = question.trim().toLowerCase();
  const branch = list.find((b) => low.includes(b.name.toLowerCase()));
  if (branch) return { text: `Opening ${branch.name}…`, to: `/branches/${branch.branch.id}` };
  if (/billing|subscription|plan|invoice/.test(low)) return { text: 'Opening Subscription…', to: '/subscription' };
  if (/setting/.test(low)) return { text: 'Opening Settings…', to: '/settings' };
  if (/overview|dashboard|home/.test(low)) return { text: 'Opening your organization overview…', to: '/' };
  if (/attention|issue|problem/.test(low)) {
    const notes = list.filter((b) => b.attentionNote).map((b) => `${b.name} (${b.attentionNote})`);
    return { text: notes.length ? `Needs attention: ${notes.join('; ')}.` : 'Nothing needs attention right now.', to: null };
  }
  const stats = orgStats(list);
  if (/how many employee|employee count|total employee|employees/.test(low)) {
    return { text: `You have ${stats.employees} employees across ${stats.branches} ${stats.branches === 1 ? 'branch' : 'branches'}.`, to: null };
  }
  if (/manager/.test(low)) return { text: `${stats.managers} branch ${stats.managers === 1 ? 'manager is' : 'managers are'} currently assigned across your organization.`, to: null };
  if (/branch(es)?/.test(low)) return { text: 'Opening Branches…', to: '/branches' };
  return {
    text: 'I can help you navigate — try “Open ' + (list[0]?.name ?? 'a branch') + '” or “Open Billing”, or ask about branches, leadership and subscription. I can’t make changes on your behalf.',
    to: null
  };
}
