import React, { useState } from 'react';
import { Button, Modal } from '@shiftos/ui';
import type { Employee } from '../../../types/domain.js';

export interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  branchEmployees: Employee[];
  onAdd: (employeeId: string) => void;
  adding: boolean;
}

/** Roster picker (design handoff "Add Employees" modal) — multi-select, adds each pick via one add_employee_to_schedule call per selection. */
export function AddEmployeeModal({ open, onClose, branchEmployees, onAdd, adding }: AddEmployeeModalProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = branchEmployees.filter((employee) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(q) ||
      employee.employee_number.toLowerCase().includes(q)
    );
  });

  const toggle = (employeeId: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const confirm = (): void => {
    selected.forEach((employeeId) => onAdd(employeeId));
    setSelected(new Set());
    setQuery('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Employees" description="Pick everyone working this week — you can add more later.">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, role or department"
        className="mb-3 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">Nobody matches that search.</p>
        ) : (
          filtered.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => toggle(employee.id)}
              className={[
                'flex items-center gap-3 rounded-lg border px-3 py-2 text-left',
                selected.has(employee.id) ? 'border-brand-400 bg-brand-50' : 'border-transparent hover:bg-neutral-50'
              ].join(' ')}
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
                {employee.first_name[0]}
                {employee.last_name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-900">
                  {employee.first_name} {employee.last_name}
                </span>
                <span className="block text-xs text-neutral-500">{employee.employee_number}</span>
              </span>
            </button>
          ))
        )}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-neutral-500">{selected.size} selected</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={selected.size === 0} loading={adding}>
            Add to schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
}
