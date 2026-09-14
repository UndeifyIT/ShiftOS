/**
 * Turns the rows of an uploaded spreadsheet into the handoff's Import
 * Employees validation (`ShiftOS Dashboards.dc.html`, "Manager/Import
 * Employees", VALIDATE_* / IMPORT_*): column matching, per-field errors
 * ("Invalid email format", "Department doesn't exist", "Role is required",
 * "Invalid date format"), duplicates, the four validation stats, the
 * department breakdown, and the rows sent to `import_employees`.
 */

import { parseSheetDate } from '../../../lib/spreadsheet.js';

export const REQUIRED_COLUMNS = ['Full Name', 'Email', 'Phone Number', 'Department', 'Role', 'Date of Joining'] as const;
export const OPTIONAL_COLUMNS = ['Employee ID', 'Date of Birth'] as const;

type Column = (typeof REQUIRED_COLUMNS)[number] | (typeof OPTIONAL_COLUMNS)[number] | 'First Name' | 'Last Name';

const ALIASES: Record<string, Column> = {
  fullname: 'Full Name',
  name: 'Full Name',
  employeename: 'Full Name',
  firstname: 'First Name',
  lastname: 'Last Name',
  surname: 'Last Name',
  email: 'Email',
  emailaddress: 'Email',
  workemail: 'Email',
  phone: 'Phone Number',
  phonenumber: 'Phone Number',
  mobile: 'Phone Number',
  mobilenumber: 'Phone Number',
  department: 'Department',
  dept: 'Department',
  role: 'Role',
  dateofjoining: 'Date of Joining',
  joiningdate: 'Date of Joining',
  hiredate: 'Date of Joining',
  startdate: 'Date of Joining',
  employeeid: 'Employee ID',
  employeenumber: 'Employee ID',
  staffid: 'Employee ID',
  dateofbirth: 'Date of Birth',
  dob: 'Date of Birth',
  birthdate: 'Date of Birth'
};

export interface LookupDepartment {
  id: string;
  name: string;
}

export interface LookupRole {
  id: string;
  name: string;
}

export interface ValidationContext {
  departments: LookupDepartment[];
  /** Roles a person can be invited as; `null` when the viewer can't see roles, so Role isn't checked against them. */
  roles: LookupRole[] | null;
  existingEmails: Set<string>;
  existingEmployeeNumbers: Set<string>;
}

export type FieldKey = 'name' | 'email' | 'phone' | 'department' | 'role' | 'hireDate' | 'dateOfBirth' | 'employeeNumber';

export interface ImportRow {
  /** Spreadsheet row number (header = 1). */
  row: number;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  hireDateText: string;
  dateOfBirthText: string;
  employeeNumber: string;
  errors: Partial<Record<FieldKey, string>>;
  /** Set when the row repeats an email already in the file or the directory — left out of the import. */
  duplicateOf: string | null;
  firstName: string;
  lastName: string;
  hireDate: string | null;
  dateOfBirth: string | null;
  departmentId: string | null;
  roleId: string | null;
}

export interface ParsedImport {
  missingColumns: string[];
  rows: ImportRow[];
}

const normalize = (header: string): string => header.toLowerCase().replace(/[^a-z0-9]/g, '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const parseImportDate = parseSheetDate;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'May 12, 2025' — how the validation table shows a date that parsed. */
export function displayDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function parseImport(table: string[][], context: ValidationContext): ParsedImport {
  const headerIndex = table.findIndex((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
  if (headerIndex < 0) return { missingColumns: [...REQUIRED_COLUMNS], rows: [] };
  const columns = new Map<Column, number>();
  table[headerIndex].forEach((cell, index) => {
    const column = ALIASES[normalize(String(cell ?? ''))];
    if (column && !columns.has(column)) columns.set(column, index);
  });
  const hasName = columns.has('Full Name') || (columns.has('First Name') && columns.has('Last Name'));
  const missingColumns = REQUIRED_COLUMNS.filter((column) => (column === 'Full Name' ? !hasName : !columns.has(column)));
  if (missingColumns.length) return { missingColumns, rows: [] };

  const departmentsByName = new Map(context.departments.map((d) => [d.name.trim().toLowerCase(), d]));
  const rolesByName = context.roles ? new Map(context.roles.map((r) => [r.name.trim().toLowerCase(), r])) : null;
  const seenEmails = new Map<string, number>();
  const rows: ImportRow[] = [];

  table.slice(headerIndex + 1).forEach((cells, offset) => {
    if (cells.every((value) => String(value ?? '').trim() === '')) return;
    const cell = (column: Column): string => {
      const index = columns.get(column);
      return index === undefined ? '' : String(cells[index] ?? '').trim();
    };
    const rowNumber = headerIndex + offset + 2;

    const name = cell('Full Name') || `${cell('First Name')} ${cell('Last Name')}`.trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const email = cell('Email');
    const phone = cell('Phone Number');
    const department = cell('Department');
    const role = cell('Role');
    const hireDateText = cell('Date of Joining');
    const dateOfBirthText = cell('Date of Birth');
    const employeeNumber = cell('Employee ID');
    const errors: ImportRow['errors'] = {};

    if (!name) errors.name = 'Full name is required';
    else if (parts.length < 2) errors.name = 'Add a last name';

    if (!email) errors.email = 'Email is required';
    else if (!EMAIL.test(email)) errors.email = 'Invalid email format';

    if (!phone) errors.phone = 'Phone number is required';
    else if (phone.replace(/\D/g, '').length < 7) errors.phone = 'Invalid phone number';

    const departmentMatch = department ? departmentsByName.get(department.toLowerCase()) : undefined;
    if (!department) errors.department = 'Department is required';
    else if (!departmentMatch) errors.department = "Department doesn't exist";

    const roleMatch = role && rolesByName ? rolesByName.get(role.toLowerCase()) : undefined;
    if (!role) errors.role = 'Role is required';
    else if (rolesByName && !roleMatch) errors.role = "Role doesn't exist";

    const hireDate = parseImportDate(hireDateText);
    if (!hireDateText) errors.hireDate = 'Date of joining is required';
    else if (!hireDate) errors.hireDate = 'Invalid date format';

    const dateOfBirth = parseImportDate(dateOfBirthText);
    if (dateOfBirthText && !dateOfBirth) errors.dateOfBirth = 'Invalid date format';

    if (employeeNumber && context.existingEmployeeNumbers.has(employeeNumber.toLowerCase())) errors.employeeNumber = 'Employee ID already in use';

    const emailKey = email.toLowerCase();
    let duplicateOf: string | null = null;
    if (email && !errors.email) {
      if (context.existingEmails.has(emailKey)) duplicateOf = 'Already in your employee list';
      else if (seenEmails.has(emailKey)) duplicateOf = `Same email as row ${seenEmails.get(emailKey)}`;
      else seenEmails.set(emailKey, rowNumber);
    }

    rows.push({
      row: rowNumber,
      name,
      email,
      phone,
      department,
      role,
      hireDateText,
      dateOfBirthText,
      employeeNumber,
      errors,
      duplicateOf,
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
      hireDate,
      dateOfBirth,
      departmentId: departmentMatch?.id ?? null,
      roleId: roleMatch?.id ?? null
    });
  });

  return { missingColumns: [], rows };
}

export const errorCount = (row: ImportRow): number => Object.keys(row.errors).length;
export const hasErrors = (row: ImportRow): boolean => errorCount(row) > 0;
export const isValid = (row: ImportRow): boolean => !hasErrors(row) && !row.duplicateOf;

export interface ImportStats {
  total: number;
  valid: number;
  withIssues: number;
  duplicates: number;
}

export function importStats(rows: ImportRow[]): ImportStats {
  return {
    total: rows.length,
    valid: rows.filter(isValid).length,
    withIssues: rows.filter(hasErrors).length,
    duplicates: rows.filter((row) => !hasErrors(row) && row.duplicateOf).length
  };
}

const BREAKDOWN_COLORS = ['#7C3AED', '#2563EB', '#2E9E62', '#E8A33D', '#EC4899'];

/** Valid rows per department, largest first, in the handoff's breakdown colours. */
export function departmentBreakdown(rows: ImportRow[]): Array<{ name: string; n: number; color: string }> {
  const counts = new Map<string, number>();
  for (const row of rows.filter(isValid)) counts.set(row.department, (counts.get(row.department) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, n], index) => ({ name, n, color: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length] }));
}

/** The file "Download Template" hands out: every column plus one example row. */
export function templateRows(departmentName = 'Front End', roleName = 'Employee'): string[][] {
  return [
    [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS],
    ['Jane Doe', 'jane.doe@example.com', '+234 801 234 5678', departmentName, roleName, '05/12/2025', '', '03/21/1995']
  ];
}

/** "Download Issues": every row left out and why. */
export function issueRows(rows: ImportRow[]): string[][] {
  return [
    ['Row', 'Full Name', 'Email', 'Phone Number', 'Department', 'Role', 'Date of Joining', 'Problems'],
    ...rows
      .filter((row) => !isValid(row))
      .map((row) => [
        String(row.row),
        row.name,
        row.email,
        row.phone,
        row.department,
        row.role,
        row.hireDateText,
        [...Object.values(row.errors), ...(row.duplicateOf ? [row.duplicateOf] : [])].join('; ')
      ])
  ];
}

/** "Save as Template": the rows about to be imported, in the template's columns. */
export function validRowsTable(rows: ImportRow[]): string[][] {
  return [
    [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS],
    ...rows.filter(isValid).map((row) => [row.name, row.email, row.phone, row.department, row.role, row.hireDateText, row.employeeNumber, row.dateOfBirthText])
  ];
}

/** What `import_employees` receives for each valid row. */
export function toImportPayload(rows: ImportRow[], sendInvites: boolean) {
  return rows.filter(isValid).map((row) => ({
    row: row.row,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    departmentId: row.departmentId,
    hireDate: row.hireDate as string,
    dateOfBirth: row.dateOfBirth,
    employeeNumber: row.employeeNumber || undefined,
    roleId: sendInvites ? row.roleId : null
  }));
}
