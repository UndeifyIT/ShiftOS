import React, { useEffect, useState } from 'react';
import { ScheduleIcon } from './ScheduleIcon.js';
import { avatarTone, initialsOf } from './scheduleFormat.js';

export interface PickerPerson {
  id: string;
  name: string;
  meta: string;
  added: boolean;
}

export interface AddEmployeeModalProps {
  people: PickerPerson[];
  saving: boolean;
  onConfirm: (employeeIds: string[]) => void;
  onClose: () => void;
}

/** "Add Employees" roster picker — design handoff employee picker (lines 855-897): search, multi-select, "Added" tags. */
export function AddEmployeeModal({ people, saving, onConfirm, onClose }: AddEmployeeModalProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const needle = query.trim().toLowerCase();
  const rows = people.filter((person) => !needle || `${person.name} ${person.meta}`.toLowerCase().includes(needle));
  const count = selected.length;

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(56,49,43,.34)] p-[22px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Add Employees"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[430px] flex-col rounded-[18px] bg-white shadow-[0_34px_74px_-32px_rgba(56,49,43,.5)]"
      >
        <div className="flex items-start gap-2.5 px-[18px] pt-[18px]">
          <span className="min-w-0">
            <h2 className="m-0 text-[16px] font-extrabold tracking-[-0.02em]">Add Employees</h2>
            <p className="mb-0 mt-1 text-[11.5px] text-[#857A72]">Pick everyone working this week — you can add more later.</p>
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
        <div className="px-[18px] pb-2.5 pt-[13px]">
          <span className="flex h-[42px] items-center gap-2 rounded-[12px] border border-[#EBE7E3] bg-[#FDFCFB] px-[11px]">
            <span className="text-[#A79C93]">
              <ScheduleIcon name="search" size={14} />
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, role or department"
              aria-label="Search employees"
              autoFocus
              className="min-w-0 flex-auto border-0 bg-transparent px-0.5 py-px text-[12px] text-[#38312B] outline-none placeholder:text-[#757575]"
            />
          </span>
        </div>
        <div className="flex-auto overflow-y-auto px-3">
          {rows.map((person) => {
            const on = selected.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                aria-pressed={on}
                disabled={person.added}
                onClick={() => setSelected((prev) => (on ? prev.filter((id) => id !== person.id) : [...prev, person.id]))}
                className={[
                  'flex w-full items-center gap-[11px] rounded-[12px] border px-2.5 py-[9px]',
                  on ? 'border-[#F7C9B6] bg-[#FDF0E9]' : 'border-transparent bg-transparent',
                  person.added ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'
                ].join(' ')}
              >
                <span
                  className={[
                    'flex size-5 flex-none items-center justify-center rounded-[6px] text-[10px] font-extrabold',
                    person.added
                      ? 'border-[1.5px] border-[#EBE7E3] text-transparent'
                      : on
                        ? 'border-[1.5px] border-[#F04E17] bg-[#F04E17] text-white'
                        : 'border-[1.5px] border-[#DDD6D0] text-transparent'
                  ].join(' ')}
                >
                  {on ? '✓' : ''}
                </span>
                <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(person.name)}>
                  {initialsOf(person.name)}
                </span>
                <span className="min-w-0 flex-auto text-left">
                  <span className="block text-[12.5px] font-bold text-[#38312B]">{person.name}</span>
                  <span className="block text-[11px] text-[#A79C93]">{person.meta}</span>
                </span>
                {person.added ? (
                  <span className="inline-flex rounded-full bg-[#F6F3F0] px-[9px] py-[3px] text-[10px] font-extrabold text-[#A79C93]">Added</span>
                ) : null}
              </button>
            );
          })}
          {rows.length === 0 ? <p className="m-0 px-2.5 py-[26px] text-center text-[12px] text-[#A79C93]">Nobody matches that search.</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2.5 border-t border-[#F2EEEA] px-[18px] py-3.5">
          <span className="text-[11.5px] font-bold text-[#857A72]">{count ? `${count} selected` : 'Nobody selected yet'}</span>
          <span className="ml-auto flex gap-2.5">
            <button type="button" onClick={onClose} className="h-[42px] cursor-pointer rounded-[12px] border border-[#EBE7E3] bg-white px-4 text-[12.5px] font-bold text-black">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => (count ? onConfirm(selected) : onClose())}
              className="h-[42px] cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-[18px] text-[12.5px] font-bold text-white"
              style={{ opacity: count && !saving ? 1 : 0.45 }}
            >
              {count ? `Add ${count} ${count === 1 ? 'employee' : 'employees'}` : 'Add employees'}
            </button>
          </span>
        </div>
      </section>
    </div>
  );
}
