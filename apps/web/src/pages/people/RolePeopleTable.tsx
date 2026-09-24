import React from 'react';
import { ScheduleIcon } from '../scheduling/grid/ScheduleIcon.js';
import { avatarTone, initialsOf, TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import { SUPERVISOR_FILTERS, type SupervisorRow } from './rolePeopleModel.js';

/** One table row: the person, the three middle cells, and the status pill. */
export interface PeopleTableRow {
  id: string;
  name: string;
  sub: string;
  cells: [string, string, string];
  status: string;
  tone: Tone;
}

/** A Supervisors/Admins row as a table row (Department, Permissions, Team size). */
export const supervisorTableRow = (row: SupervisorRow): PeopleTableRow => ({ ...row, cells: [row.department, row.permissions, row.teamSize] });

/*
 * The design handoff's shared list chrome — the toolbar (markup lines 363-376)
 * and the generic table (lines 378-407) with its TABLE_GRID track, CELL text
 * and tonePill status — used by both Supervisors and Admins, which are the
 * same table with different columns.
 */

/** The handoff's shared 5-column track for the employee/supervisor/team tables. */
const TABLE_GRID = 'grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(70px,auto)]';
const CELL = 'min-w-0 truncate text-[12.5px] text-[#857A72]';

export const pillStyle = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });

export function RolePeopleTable<F extends string>({
  columns,
  filters = SUPERVISOR_FILTERS as unknown as readonly F[],
  grid = TABLE_GRID,
  rows,
  filter,
  onFilter,
  query,
  onQuery,
  searchPlaceholder,
  count,
  foot,
  actions,
  emptyLine
}: {
  /** Five headers — the last one is right-aligned (Status). */
  columns: [string, string, string, string, string];
  /** The toolbar's filter buttons (handoff `filters`) — the Supervisors page's by default. */
  filters?: readonly F[];
  /** The columns' grid track — the handoff's shared TABLE_GRID unless a page sets its own `grid`. */
  grid?: string;
  rows: PeopleTableRow[];
  filter: F;
  onFilter: (filter: F) => void;
  query: string;
  onQuery: (query: string) => void;
  searchPlaceholder: string;
  count: string;
  foot: string;
  /** The buttons in the foot's right corner (handoff `tableActions`). */
  actions?: React.ReactNode;
  emptyLine: string;
}): React.ReactElement {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="block min-w-[190px] flex-[1_1_240px]">
          <span className="sr-only">Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="box-border h-10 w-full rounded-[11px] border border-solid border-[#E4DED9] bg-white px-[13px] text-[13px] text-[#38312B] outline-none focus:border-[#F04E17]"
          />
        </label>
        {filters.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={filter === name}
            onClick={() => onFilter(name)}
            className={[
              'h-10 cursor-pointer rounded-[11px] border border-solid px-[13px] text-[12.5px] font-bold',
              filter === name ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'
            ].join(' ')}
          >
            {name}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-[#A79C93]">{count}</span>
      </div>

      <section className="overflow-hidden rounded-[16px] border border-solid border-[#EBE7E3] bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className={`grid ${grid} gap-3 border-b border-solid border-[#F2EEEA] px-[18px] py-[11px] text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[#A79C93]`}>
              {columns.map((column, index) => (
                <span key={column} className={index === columns.length - 1 ? 'min-w-0 text-right' : 'min-w-0 truncate'}>
                  {column}
                </span>
              ))}
            </div>
            {rows.length === 0 ? (
              <p className="m-0 border-b border-solid border-[#F7F4F1] px-[18px] py-3.5 text-[12.5px] text-[#A79C93]">{emptyLine}</p>
            ) : (
              rows.map((row) => (
                <div key={row.id} className={`grid ${grid} items-center gap-3 border-b border-solid border-[#F7F4F1] px-[18px] py-3`}>
                  <span className="flex min-w-0 items-center gap-[11px]">
                    <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(row.name)}>
                      {initialsOf(row.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-bold">{row.name}</span>
                      <span className="block truncate text-[11px] text-[#A79C93]">{row.sub}</span>
                    </span>
                  </span>
                  {row.cells.map((cell, index) => (
                    <span key={index} className={CELL}>
                      {cell}
                    </span>
                  ))}
                  <span className="min-w-0 text-right">
                    <span className="inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold" style={pillStyle(row.tone)}>
                      {row.status}
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 px-[18px] py-3">
          <p className="m-0 text-[11.5px] text-[#A79C93]">{foot}</p>
          {actions ? <div className="ml-auto flex gap-1.5">{actions}</div> : null}
        </div>
      </section>
    </>
  );
}

/** The handoff's foot action button (32px, 12px bold). */
export function TableAction({ label, onClick }: { label: string; onClick: () => void }): React.ReactElement {
  return (
    <button type="button" onClick={onClick} className="h-8 cursor-pointer rounded-[9px] border border-solid border-[#EBE7E3] bg-white px-3 text-[12px] font-bold text-black">
      {label}
    </button>
  );
}

/** The header's primary button (handoff `pageCta`). */
export function HeaderCta({ label, onClick }: { label: string; onClick: () => void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 cursor-pointer rounded-[11px] border-0 bg-[#F04E17] px-4 text-[13px] font-bold text-white shadow-[0_10px_22px_-13px_rgba(240,78,23,.75)]"
    >
      {label}
    </button>
  );
}

/** A small note inside a dialog, in the handoff's confirm-box styling. */
export function DialogNote({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <p className="mx-[22px] mb-0 mt-4 flex gap-2.5 rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] p-3.5 text-[13px] leading-[1.55] text-[#57504A]">
      <span className="flex-none text-[#A79C93]">
        <ScheduleIcon name="info" size={16} />
      </span>
      <span>{children}</span>
    </p>
  );
}
