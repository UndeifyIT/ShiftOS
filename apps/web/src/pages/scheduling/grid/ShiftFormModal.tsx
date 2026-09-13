import React, { useEffect, useState } from 'react';
import { ScheduleIcon } from './ScheduleIcon.js';
import {
  BREAK_OPTIONS,
  TIME_OPTIONS,
  blockSpanMinutes,
  breakLabel,
  clockMinutes,
  durationText,
  minutesToClock,
  paidMinutes,
  timeLabel
} from './scheduleFormat.js';
import type { ShiftBlock } from './useScheduleWeek.js';

export interface ShiftFormValues {
  off: boolean;
  blocks: ShiftBlock[];
  note: string;
  /** Existing department picked for the shift, or null. */
  departmentId: string | null;
  /** Set when "New department…" was chosen: the name to create in this branch. */
  newDepartmentName: string;
  /** Other dates in the week to apply the same decision to (cell mode only). */
  alsoDates: string[];
  saveAsTemplate: boolean;
  templateName: string;
}

export interface ShiftFormModalProps {
  mode: 'cell' | 'tray';
  editing: boolean;
  initial: { off: boolean; blocks: ShiftBlock[]; note: string; departmentId: string | null };
  /** The branch's departments for the optional Department picker. */
  departments: Array<{ id: string; name: string }>;
  canCreateDepartment: boolean;
  employeeName?: string;
  /** The cell's date and the week's days, for the subtitle and "Also apply to" chips (cell mode). */
  date?: string;
  days: Array<{ date: string; weekday: string; label: string }>;
  saving: boolean;
  error: string | null;
  onSave: (values: ShiftFormValues) => void;
  onDelete: () => void;
  onClose: () => void;
}

const DEFAULT_BLOCK: ShiftBlock = { startTime: '09:00', endTime: '18:00', breakMinutes: 60 };
const NEW_DEPARTMENT = '__new__';

function withCurrent(options: string[], value: string): string[] {
  return options.includes(value) ? options : [...options, value].sort((a, b) => clockMinutes(a) - clockMinutes(b));
}

function selectShell(icon: 'clock' | 'coffee', label: string, select: React.ReactNode): React.ReactElement {
  return (
    <label className="block min-w-0">
      <span className="block text-[11px] font-bold text-[#57504A]">{label}</span>
      <span className="mt-[5px] flex h-10 items-center gap-1.5 rounded-[11px] border border-[#EBE7E3] bg-white px-[9px]">
        <span className="flex-none text-[#A79C93]">
          <ScheduleIcon name={icon} size={14} />
        </span>
        {select}
      </span>
    </label>
  );
}

const SELECT_CLASS = 'min-w-0 flex-auto cursor-pointer border-0 bg-transparent text-[11.5px] font-bold text-[#38312B] outline-none';

/** Assign / edit a shift, or build a draft — design handoff "shift form" (lines 739-853, schedVals form*). */
export function ShiftFormModal({
  mode,
  editing,
  initial,
  departments,
  canCreateDepartment,
  employeeName,
  date,
  days,
  saving,
  error,
  onSave,
  onDelete,
  onClose
}: ShiftFormModalProps): React.ReactElement {
  const [off, setOff] = useState(initial.off);
  const [blocks, setBlocks] = useState<ShiftBlock[]>(initial.blocks.length ? initial.blocks : [DEFAULT_BLOCK]);
  const [note, setNote] = useState(initial.note);
  const [departmentChoice, setDepartmentChoice] = useState<string>(initial.departmentId ?? '');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [alsoDates, setAlsoDates] = useState<string[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const patchBlock = (index: number, patch: Partial<ShiftBlock>): void =>
    setBlocks((prev) => prev.map((block, i) => (i === index ? { ...block, ...patch } : block)));

  const addBlock = (): void =>
    setBlocks((prev) => {
      const start = clockMinutes((prev[prev.length - 1] ?? { endTime: '14:00' }).endTime) + 120;
      return [...prev, { startTime: minutesToClock(start), endTime: minutesToClock(start + 120), breakMinutes: 0 }];
    });

  const total = blocks.reduce((sum, block) => sum + paidMinutes(block.startTime, block.endTime, block.breakMinutes), 0);
  let warning = '';
  if (!off) {
    const ranges = blocks.map((block) => [clockMinutes(block.startTime), clockMinutes(block.startTime) + blockSpanMinutes(block.startTime, block.endTime)]);
    for (let i = 0; i < ranges.length; i += 1) {
      for (let j = i + 1; j < ranges.length; j += 1) {
        if (ranges[i][0] < ranges[j][1] && ranges[j][0] < ranges[i][1]) warning = 'These time blocks overlap each other — adjust one of them.';
      }
    }
    if (!warning && total > 600) warning = `That is ${durationText(total)} of paid time, over the 10-hour rule.`;
  }

  const current = days.find((day) => day.date === date);
  const title = mode === 'tray' ? (editing ? 'Edit shift draft' : 'New shift draft') : editing ? 'Edit Shift' : 'Assign Shift';
  const subtitle = mode === 'tray' ? 'Not assigned yet — drag it onto anyone once saved.' : `For ${employeeName ?? ''} on ${current ? `${current.weekday}, ${current.label}` : ''}`;
  const primary = mode === 'tray' ? (editing ? 'Save draft' : 'Add draft') : editing ? 'Save changes' : off ? 'Mark day off' : 'Assign Shift';

  const toggleStyle = (active: boolean): string =>
    [
      'h-9 flex-1 cursor-pointer rounded-[11px] text-[11.5px] font-bold',
      active ? 'border border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border border-[#EBE7E3] bg-white text-[#857A72]'
    ].join(' ');

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(56,49,43,.34)] p-[22px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[476px] overflow-y-auto rounded-[18px] bg-white px-[18px] pb-4 pt-[18px] shadow-[0_34px_74px_-32px_rgba(56,49,43,.5)]"
      >
        <div className="flex items-start gap-2.5">
          <span className="min-w-0">
            <h2 className="m-0 text-[16px] font-extrabold tracking-[-0.02em]">{title}</h2>
            <p className="mb-0 mt-1 text-[11.5px] text-[#857A72]">{subtitle}</p>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto size-7 cursor-pointer rounded-[9px] border-0 bg-[#F6F3F0] text-[12px] font-extrabold text-[#57504A]"
          >
            ✕
          </button>
        </div>

        <div className="mt-3.5 flex gap-2">
          <button type="button" onClick={() => setOff(false)} className={toggleStyle(!off)}>
            Working shift
          </button>
          <button type="button" onClick={() => setOff(true)} className={toggleStyle(off)}>
            Day off
          </button>
        </div>

        {!off ? (
          <>
            <div className="mt-3.5 flex flex-col gap-2.5">
              {blocks.map((block, index) => (
                <div key={index} className="rounded-[14px] border border-[#F2EEEA] bg-[#FDFCFB] px-3 py-[11px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-[.09em] text-[#A79C93]">
                      {blocks.length > 1 ? `Block ${index + 1}` : 'Shift times'}
                    </span>
                    <span className="text-[11px] font-bold text-[#57504A]">{durationText(paidMinutes(block.startTime, block.endTime, block.breakMinutes))}</span>
                    {blocks.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setBlocks((prev) => prev.filter((_, i) => i !== index))}
                        className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-[11px] font-bold text-[#C93A22]"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-[9px] grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-[9px]">
                    {selectShell(
                      'clock',
                      'Start Time',
                      <select value={block.startTime} onChange={(event) => patchBlock(index, { startTime: event.target.value })} className={SELECT_CLASS}>
                        {withCurrent(TIME_OPTIONS, block.startTime).map((time) => (
                          <option key={time} value={time}>
                            {timeLabel(time)}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectShell(
                      'clock',
                      'End Time',
                      <select value={block.endTime} onChange={(event) => patchBlock(index, { endTime: event.target.value })} className={SELECT_CLASS}>
                        {withCurrent(TIME_OPTIONS, block.endTime).map((time) => (
                          <option key={time} value={time}>
                            {timeLabel(time)}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectShell(
                      'coffee',
                      'Break (optional)',
                      <select
                        value={block.breakMinutes}
                        onChange={(event) => patchBlock(index, { breakMinutes: Number(event.target.value) })}
                        className={SELECT_CLASS}
                      >
                        {(BREAK_OPTIONS.some((option) => option.minutes === block.breakMinutes)
                          ? BREAK_OPTIONS
                          : [...BREAK_OPTIONS, { minutes: block.breakMinutes, label: breakLabel(block.breakMinutes) }]
                        ).map((option) => (
                          <option key={option.minutes} value={option.minutes}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addBlock}
                className="flex h-9 cursor-pointer items-center gap-[7px] self-start rounded-[11px] border border-dashed border-[#DDD6D0] bg-white px-3 text-[11.5px] font-bold text-[#C6420E] hover:border-[#F04E17] hover:bg-[#FDF0E9]"
              >
                ＋ Add another time block (split / double shift)
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-[#F2EEEA] bg-[#FDFCFB] px-3 py-2.5">
              <span className="text-[11.5px] font-bold text-[#57504A]">{blocks.length > 1 ? `${blocks.length} time blocks this day` : 'Paid time this day'}</span>
              <span className="ml-auto text-[11.5px] font-extrabold text-[#38312B]">{durationText(total)}</span>
            </div>

            <div className="mt-3.5">
              <label className="block min-w-0">
                <span className="block text-[11px] font-bold text-[#57504A]">Department (optional)</span>
                <span className="mt-[5px] flex h-10 items-center rounded-[11px] border border-[#EBE7E3] bg-white px-[9px]">
                  <select
                    value={departmentChoice}
                    onChange={(event) => setDepartmentChoice(event.target.value)}
                    aria-label="Department"
                    className={SELECT_CLASS}
                  >
                    <option value="">No department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                    {canCreateDepartment ? <option value={NEW_DEPARTMENT}>＋ New department…</option> : null}
                  </select>
                </span>
              </label>
              {departmentChoice === NEW_DEPARTMENT ? (
                <input
                  value={newDepartmentName}
                  onChange={(event) => setNewDepartmentName(event.target.value)}
                  placeholder="New department name (e.g. Bakery)"
                  aria-label="New department name"
                  autoFocus
                  className="mt-2 box-border h-[38px] w-full rounded-[11px] border border-[#EBE7E3] bg-white px-[11px] text-[12px] text-[#38312B] outline-none placeholder:text-[#757575]"
                />
              ) : null}
            </div>
          </>
        ) : null}

        {warning ? (
          <p className="mb-0 mt-[11px] rounded-[12px] border border-[#F3DFB8] bg-[#FDF8EC] px-[11px] py-[9px] text-[11.5px] font-bold text-[#7A5410]">{warning}</p>
        ) : null}

        {mode === 'cell' ? (
          <div className="mt-3.5">
            <span className="block text-[11px] font-bold text-[#57504A]">Also apply to (optional)</span>
            <div className="mt-[7px] flex flex-wrap gap-1.5">
              {days.map((day) => {
                const isCurrent = day.date === date;
                const on = alsoDates.includes(day.date);
                return (
                  <button
                    key={day.date}
                    type="button"
                    disabled={isCurrent}
                    aria-pressed={on}
                    onClick={() => setAlsoDates((prev) => (on ? prev.filter((d) => d !== day.date) : [...prev, day.date]))}
                    className={[
                      'h-[30px] rounded-[9px] px-[11px] text-[11px] font-bold',
                      isCurrent
                        ? 'cursor-default border border-[#EBE7E3] bg-[#F6F3F0] text-[#C4BBB3]'
                        : on
                          ? 'cursor-pointer border border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]'
                          : 'cursor-pointer border border-[#EBE7E3] bg-white text-[#857A72]'
                    ].join(' ')}
                  >
                    {day.weekday}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-3.5">
          <span className="flex items-baseline gap-2">
            <span className="text-[11px] font-bold text-[#57504A]">Notes (optional)</span>
            <span className="ml-auto text-[10.5px] text-[#A79C93]">{note.length}/100</span>
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 100))}
            maxLength={100}
            placeholder="Add a note…"
            aria-label="Notes"
            className="mt-1.5 box-border min-h-[62px] w-full resize-y rounded-[12px] border border-[#EBE7E3] bg-white px-[11px] py-[9px] text-[12px] text-[#38312B] outline-none placeholder:text-[#757575]"
          />
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-[9px]">
          <input
            type="checkbox"
            checked={saveAsTemplate}
            onChange={() => setSaveAsTemplate((v) => !v)}
            className="m-[3px_3px_3px_4px] size-[15px] cursor-pointer accent-[#F04E17]"
          />
          <span className="text-[11.5px] font-bold text-[#57504A]">Save as a shift template</span>
        </label>
        {saveAsTemplate ? (
          <input
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            placeholder="Template name (e.g. Warehouse Shift)"
            aria-label="Template name"
            className="mt-2 box-border h-[38px] w-full rounded-[11px] border border-[#EBE7E3] bg-white px-[11px] text-[12px] text-[#38312B] outline-none placeholder:text-[#757575]"
          />
        ) : null}

        {error ? <p className="mb-0 mt-3 rounded-[12px] border border-[#F3C6BD] bg-[#FCEDEA] px-[11px] py-[9px] text-[11.5px] font-bold text-[#A92F1B]">{error}</p> : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2.5">
          {editing ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="mr-auto h-[42px] cursor-pointer rounded-[12px] border border-[#F3C6BD] bg-white px-[15px] text-[12.5px] font-bold text-[#C93A22] disabled:opacity-60"
            >
              Delete shift
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="h-[42px] cursor-pointer rounded-[12px] border border-[#EBE7E3] bg-white px-[17px] text-[12.5px] font-bold text-black">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onSave({
                off,
                blocks,
                note: note.trim(),
                departmentId: departmentChoice && departmentChoice !== NEW_DEPARTMENT ? departmentChoice : null,
                newDepartmentName: departmentChoice === NEW_DEPARTMENT ? newDepartmentName.trim() : '',
                alsoDates,
                saveAsTemplate,
                templateName: templateName.trim()
              })
            }
            className="h-[42px] cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-[19px] text-[12.5px] font-bold text-white shadow-[0_12px_24px_-14px_rgba(240,78,23,.8)] disabled:opacity-60"
          >
            {primary}
          </button>
        </div>
      </section>
    </div>
  );
}
