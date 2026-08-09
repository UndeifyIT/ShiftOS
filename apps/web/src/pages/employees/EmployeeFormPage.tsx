import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, FormField, InlineError, Input, PageContainer, PageHeader, PermissionDenied, Select, Textarea, SkeletonRows } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Employee, EmploymentStatus } from '../../types/domain.js';

const STATUS_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' }
];

/** WEB-007 — Employee Create/Edit Form (WF-003). */
export default function EmployeeFormPage(): React.ReactElement {
  const { employeeId } = useParams<{ employeeId: string }>();
  const isCreate = !employeeId;
  const navigate = useNavigate();
  const { hasPermission } = useSession();
  const canCreate = hasPermission('employees.create');
  const canUpdate = hasPermission('employees.update');

  const { data: branches } = useRpcQuery<Branch[]>('list_branches');
  const { data: employee, isLoading } = useRpcQuery<Employee>('get_employee', employeeId ? { employeeId } : undefined, {
    enabled: !isCreate
  });

  const [branchId, setBranchId] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('active');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setBranchId(employee.branch_id);
      setEmployeeNumber(employee.employee_number);
      setFirstName(employee.first_name);
      setLastName(employee.last_name);
      setEmail(employee.email ?? '');
      setPhone(employee.phone ?? '');
      setHireDate(employee.hire_date);
      setEmploymentStatus(employee.employment_status);
      setNotes(employee.notes ?? '');
    } else if (isCreate && branches && branches.length === 1) {
      setBranchId(branches[0]!.id);
    }
  }, [employee, isCreate, branches]);

  const createMutation = useRpcMutation<Employee, Record<string, unknown>>('create_employee', {
    invalidates: ['list_employees'],
    onSuccess: (created) => navigate(`/employees/${created.id}`, { replace: true }),
    onError: (err) => setError(err.message)
  });

  const updateMutation = useRpcMutation<Employee, Record<string, unknown>>('update_employee', {
    invalidates: ['list_employees', 'get_employee'],
    onSuccess: () => navigate(`/employees/${employeeId}`, { replace: true }),
    onError: (err) => setError(err.message)
  });

  if ((isCreate && !canCreate) || (!isCreate && !canUpdate)) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }

  if (!isCreate && isLoading) {
    return (
      <PageContainer>
        <SkeletonRows rows={5} />
      </PageContainer>
    );
  }

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!branchId || !employeeNumber.trim() || !firstName.trim() || !lastName.trim() || (isCreate && !hireDate)) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    if (isCreate) {
      createMutation.mutate({
        branchId,
        employeeNumber: employeeNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        hireDate
      });
    } else {
      updateMutation.mutate({
        employeeId,
        branchId,
        employeeNumber: employeeNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        employmentStatus,
        notes: notes.trim() || undefined
      });
    }
  };

  return (
    <PageContainer>
      <PageHeader title={isCreate ? 'Add Employee' : `Edit ${employee?.first_name ?? ''} ${employee?.last_name ?? ''}`} />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Branch" htmlFor="branchId" required>
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                placeholder="Select a branch"
                options={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
          </FormField>
          <FormField label="Employee number" htmlFor="employeeNumber" required>
            {(fieldProps) => <Input {...fieldProps} value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />}
          </FormField>
          <FormField label="First name" htmlFor="firstName" required>
            {(fieldProps) => <Input {...fieldProps} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
          </FormField>
          <FormField label="Last name" htmlFor="lastName" required>
            {(fieldProps) => <Input {...fieldProps} value={lastName} onChange={(e) => setLastName(e.target.value)} />}
          </FormField>
          <FormField label="Email" htmlFor="email">
            {(fieldProps) => <Input {...fieldProps} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            {(fieldProps) => <Input {...fieldProps} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </FormField>
          {isCreate ? (
            <FormField label="Hire date" htmlFor="hireDate" required>
              {(fieldProps) => <Input {...fieldProps} type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />}
            </FormField>
          ) : (
            <FormField label="Employment status" htmlFor="employmentStatus" required>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                  options={STATUS_OPTIONS}
                />
              )}
            </FormField>
          )}
          {!isCreate ? (
            <div className="sm:col-span-2">
              <FormField label="Notes" htmlFor="notes">
                {(fieldProps) => <Textarea {...fieldProps} value={notes} onChange={(e) => setNotes(e.target.value)} />}
              </FormField>
            </div>
          ) : null}
          {error ? (
            <div className="sm:col-span-2">
              <InlineError message={error} />
            </div>
          ) : null}
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {isCreate ? 'Add employee' : 'Save changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </PageContainer>
  );
}
