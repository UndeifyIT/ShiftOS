/**
 * Import Schedule — the handoff's "Pick a spreadsheet — every row is
 * validated before it lands" (`ShiftOS Dashboards.dc.html` schedImport).
 * One row per shift (or day off): who, which day, from–to, break,
 * department, note. Each row is checked against the branch's people and
 * departments and the week on screen before anything is written.
 */
import { parseSheetDate, parseSheetTime } from '../../../lib/spreadsheet.js';

export const SCHEDULE_COLUMNS = ['Employee', 'Date', 'Start Time', 'End Time'] as const;
export const SCHEDULE_OPTIONAL_COLUMNS = ['Break (minutes)', 'Department', 'Notes'] as const;

type Column = 'Employee' | 'Employee ID' | 'Email' | 'Date' | 'Start Time' | 'End Time' | 'Break' | 'Department' | 'Notes';

const ALIASES: Record<string, Column> = {
  employee: 'Employee',
  employeename: 'Employee',
  name: 'Employee',
  fullname: 'Employee',
  staff: 'Employee',
  employeeid: 'Employee ID',
  employeenumber: 'Employee ID',
  staffid: 'Employee ID',
  email: 'Email',
  emailaddress: 'Email',
  date: 'Date',
  shiftdate: 'Date',
  day: 'Date',
  start: 'Start Time',
  starttime: 'Start Time',
  from: 'Start Time',
  end: 'End Time',
  endtime: 'End Time',
  to: 'End Time',
  break: 'Break',
  breakminutes: 'Break',
  breakmins: 'Break',
  department: 'Department',
  dept: 'Department',
  notes: 'Notes',
  note: 'Notes'
};

export interface SchedulePerson {
  id: string;
  name: string;
  email: string | null;
  employeeNumber: string;
}

export interface ScheduleImportContext {
  people: SchedulePerson[];
  departments: Array<{ id: string; name: string }>;
  /** The dates a row may land on: the viewed week's days that belong to this schedule. */
  dates: string[];
  weekLabel: string;
}

export interface ScheduleImportRow {
  row: number;
  who: string;
  dateText: string;
  startText: string;
  endText: string;
  employeeId: string | null;
  employeeName: string;
  date: string | null;
  off: boolean;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number;
  departmentId: string | null;
  notes: string;
  problems: string[];
}

export interface ParsedSchedule {
  missingColumns: string[];
  rows: ScheduleImportRow[];
}

const normalize = (header: string): string => header.toLowerCase().replace(/[^a-z0-9]/g, '');
const isOff = (text: string): boolean => /^(off|day off|dayoff)$/i.test(text.trim());

export function parseScheduleImport(table: string[][], context: ScheduleImportContext): ParsedSchedule {
  const headerIndex = table.findIndex((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
  if (headerIndex < 0) return { missingColumns: [...SCHEDULE_COLUMNS], rows: [] };
  const columns = new Map<Column, number>();
  table[headerIndex].forEach((cell, index) => {
    const column = ALIASES[normalize(String(cell ?? ''))];
    if (column && !columns.has(column)) columns.set(column, index);
  });
  const hasPerson = columns.has('Employee') || columns.has('Employee ID') || columns.has('Email');
  const missingColumns = SCHEDULE_COLUMNS.filter((column) => (column === 'Employee' ? !hasPerson : !columns.has(column)));
  if (missingColumns.length) return { missingColumns, rows: [] };

  const byNumber = new Map(context.people.map((p) => [p.employeeNumber.toLowerCase(), p]));
  const byEmail = new Map(context.people.filter((p) => p.email).map((p) => [String(p.email).toLowerCase(), p]));
  const byName = new Map<string, SchedulePerson[]>();
  for (const person of context.people) {
    const key = person.name.toLowerCase().replace(/\s+/g, ' ');
    byName.set(key, [...(byName.get(key) ?? []), person]);
  }
  const departments = new Map(context.departments.map((d) => [d.name.trim().toLowerCase(), d]));
  const allowedDates = new Set(context.dates);
  const seen = new Map<string, number>();
  const rows: ScheduleImportRow[] = [];

  table.slice(headerIndex + 1).forEach((cells, offset) => {
    if (cells.every((value) => String(value ?? '').trim() === '')) return;
    const cell = (column: Column): string => {
      const index = columns.get(column);
      return index === undefined ? '' : String(cells[index] ?? '').trim();
    };
    const rowNumber = headerIndex + offset + 2;
    const problems: string[] = [];

    const number = cell('Employee ID');
    const email = cell('Email');
    const name = cell('Employee');
    let person: SchedulePerson | undefined;
    if (number) person = byNumber.get(number.toLowerCase());
    if (!person && email) person = byEmail.get(email.toLowerCase());
    if (!person && name) {
      const matches = byName.get(name.toLowerCase().replace(/\s+/g, ' ')) ?? [];
      if (matches.length > 1) problems.push('More than one person has this name — add their Employee ID');
      person = matches.length === 1 ? matches[0] : undefined;
    }
    const who = name || email || number;
    if (!who) problems.push('Employee is required');
    else if (!person && !problems.length) problems.push('Employee not found in this branch');

    const dateText = cell('Date');
    const date = parseSheetDate(dateText);
    if (!dateText) problems.push('Date is required');
    else if (!date) problems.push('Invalid date format');
    else if (!allowedDates.has(date)) problems.push(`Date isn't in ${context.weekLabel}`);

    const startText = cell('Start Time');
    const endText = cell('End Time');
    const off = isOff(startText) || isOff(endText);
    const startTime = off ? null : parseSheetTime(startText);
    const endTime = off ? null : parseSheetTime(endText);
    if (!off) {
      if (!startText) problems.push('Start time is required');
      else if (!startTime) problems.push('Invalid start time');
      if (!endText) problems.push('End time is required');
      else if (!endTime) problems.push('Invalid end time');
      if (startTime && endTime && startTime === endTime) problems.push("Start and end can't be the same");
    }

    const breakText = cell('Break');
    const breakMinutes = breakText ? Number(breakText) : 0;
    if (breakText && (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 240)) problems.push('Break must be whole minutes (0–240)');

    const departmentText = cell('Department');
    const department = departmentText ? departments.get(departmentText.toLowerCase()) : undefined;
    if (departmentText && !department) problems.push("Department doesn't exist");

    if (person && date && !problems.length) {
      const key = `${person.id}|${date}|${off ? 'off' : `${startTime}-${endTime}`}`;
      if (seen.has(key)) problems.push(`Same shift as row ${seen.get(key)}`);
      else seen.set(key, rowNumber);
    }

    rows.push({
      row: rowNumber,
      who,
      dateText,
      startText,
      endText,
      employeeId: person?.id ?? null,
      employeeName: person?.name ?? who,
      date,
      off,
      startTime,
      endTime,
      breakMinutes: problems.length ? 0 : breakMinutes,
      departmentId: department?.id ?? null,
      notes: cell('Notes'),
      problems
    });
  });

  return { missingColumns: [], rows };
}

/** 'YYYY-MM-DD' → 'MM/DD/YYYY', the date format the templates use. */
export function templateDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${month}/${day}/${year}`;
}

/** "Download Template": the columns plus a shift and a day off for one real person, on two days of this week. */
export function scheduleTemplateRows(sampleName: string, firstDate: string, secondDate: string, departmentName: string): string[][] {
  return [
    ['Employee', 'Employee ID', 'Date', 'Start Time', 'End Time', 'Break (minutes)', 'Department', 'Notes'],
    [sampleName, '', templateDate(firstDate), '07:30', '17:00', '60', departmentName, ''],
    [sampleName, '', templateDate(secondDate), 'OFF', 'OFF', '', '', 'Day off']
  ];
}
