/**
 * Add Employee (`ShiftOS Dashboards.dc.html` lines 2295-2379, ADD_EMP_SECTIONS
 * and ADD_EMP_SUMMARY): the form's values, what's required, the create/invite
 * payloads and the live Employee Summary. Pure so it can be unit-tested.
 */
import { EMPLOYMENT_TYPE_OPTIONS, formatDay, joinPhone } from './employeeFields.js';

export interface AddEmployeeForm {
  fullName: string;
  employeeNumber: string;
  email: string;
  phoneCode: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  departmentId: string;
  hireDate: string;
  roleId: string;
  reportsToEmployeeId: string;
  employmentType: string;
  loginEmail: string;
  /** False until the login email is typed into, so it follows the email above. */
  loginEmailEdited: boolean;
  sendCredentials: boolean;
}

export const EMPTY_ADD_EMPLOYEE: AddEmployeeForm = {
  fullName: '',
  employeeNumber: '',
  email: '',
  phoneCode: '+234',
  phone: '',
  dateOfBirth: '',
  gender: '',
  departmentId: '',
  hireDate: '',
  roleId: '',
  reportsToEmployeeId: '',
  employmentType: '',
  loginEmail: '',
  loginEmailEdited: false,
  sendCredentials: true
};

export type AddEmployeeField = 'fullName' | 'email' | 'phone' | 'dateOfBirth' | 'gender' | 'departmentId' | 'hireDate' | 'roleId' | 'loginEmail';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

/** The login email actually used: the typed one, or the email above until it's edited. */
export function loginEmailOf(form: AddEmployeeForm): string {
  return (form.loginEmailEdited ? form.loginEmail : form.email).trim();
}

/**
 * Field → message for everything still missing. Role and Login Email only
 * matter when a login is being sent (a person without a login has no role),
 * and only a caller who can invite members can send one.
 */
export function validateAddEmployee(form: AddEmployeeForm, options: { today: string; canInvite: boolean }): Partial<Record<AddEmployeeField, string>> {
  const errors: Partial<Record<AddEmployeeField, string>> = {};
  const { firstName, lastName } = splitName(form.fullName);
  if (!firstName || !lastName) errors.fullName = 'Enter a first and last name';
  if (!form.email.trim()) errors.email = 'Enter an email address';
  else if (!isEmail(form.email)) errors.email = 'Enter a valid email address';
  if (form.phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a phone number';
  if (!form.dateOfBirth) errors.dateOfBirth = 'Select a date of birth';
  else if (form.dateOfBirth >= options.today) errors.dateOfBirth = 'Date of birth must be in the past';
  if (!form.gender) errors.gender = 'Select a gender';
  if (!form.departmentId) errors.departmentId = 'Select a department';
  if (!form.hireDate) errors.hireDate = 'Select a date of joining';
  if (options.canInvite && form.sendCredentials) {
    if (!form.roleId) errors.roleId = 'Select a role';
    const login = loginEmailOf(form);
    if (!login) errors.loginEmail = 'Enter a login email address';
    else if (!isEmail(login)) errors.loginEmail = 'Enter a valid login email address';
  }
  return errors;
}

export function createPayload(form: AddEmployeeForm, branchId: string): Record<string, unknown> {
  const { firstName, lastName } = splitName(form.fullName);
  return {
    branchId,
    employeeNumber: form.employeeNumber.trim() || undefined,
    firstName,
    lastName,
    email: form.email.trim(),
    phone: joinPhone(form.phoneCode, form.phone) ?? undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    gender: form.gender || undefined,
    hireDate: form.hireDate,
    departmentId: form.departmentId || undefined,
    employmentType: form.employmentType || undefined,
    reportsToEmployeeId: form.reportsToEmployeeId || undefined
  };
}

export function invitePayload(form: AddEmployeeForm, branchId: string): { email: string; firstName: string; lastName: string; roleId: string; branchIds: string[] } {
  const { firstName, lastName } = splitName(form.fullName);
  return { email: loginEmailOf(form), firstName, lastName, roleId: form.roleId, branchIds: [branchId] };
}

export interface SummaryLookups {
  departments: Array<{ value: string; label: string }>;
  roles: Array<{ value: string; label: string }>;
  managers: Array<{ value: string; label: string }>;
}

const labelOf = (options: Array<{ value: string; label: string }>, value: string): string => options.find((o) => o.value === value)?.label ?? '';

/** ADD_EMP_SUMMARY, filled in as the form is: an empty value shows "—". */
export function addEmployeeSummary(form: AddEmployeeForm, lookups: SummaryLookups): Array<{ label: string; value: string }> {
  const phone = form.phone.trim() ? joinPhone(form.phoneCode, form.phone) ?? '' : '';
  const rows: Array<[string, string]> = [
    ['Full Name', form.fullName.trim()],
    ['Employee ID', form.employeeNumber.trim()],
    ['Email Address', form.email.trim()],
    ['Phone Number', phone],
    ['Department', labelOf(lookups.departments, form.departmentId)],
    ['Role', labelOf(lookups.roles, form.roleId)],
    ['Date of Joining', formatDay(form.hireDate)],
    ['Reports To', labelOf(lookups.managers, form.reportsToEmployeeId)],
    ['Login Email', form.sendCredentials ? loginEmailOf(form) : '']
  ];
  return rows.map(([label, value]) => ({ label, value: value || '—' }));
}

export const employmentTypeLabel = (value: string | null | undefined): string => labelOf(EMPLOYMENT_TYPE_OPTIONS, value ?? '');

/** A saved draft, restored only when it parses back to the form's shape. */
export function parseDraft(raw: string | null): AddEmployeeForm | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AddEmployeeForm>;
    if (!value || typeof value !== 'object') return null;
    const form = { ...EMPTY_ADD_EMPLOYEE };
    for (const key of Object.keys(EMPTY_ADD_EMPLOYEE) as Array<keyof AddEmployeeForm>) {
      if (typeof value[key] === typeof EMPTY_ADD_EMPLOYEE[key]) (form as Record<string, unknown>)[key] = value[key];
    }
    return form;
  } catch {
    return null;
  }
}

export function isBlank(form: AddEmployeeForm): boolean {
  return (Object.keys(EMPTY_ADD_EMPLOYEE) as Array<keyof AddEmployeeForm>).every((key) => form[key] === EMPTY_ADD_EMPLOYEE[key]);
}
