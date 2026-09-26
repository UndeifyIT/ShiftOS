import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCountryOptions, getRegionLabel, getStateOptions } from '@shiftos/geography';
import { useSession } from '../../auth/SessionProvider.js';
import { HandoffModal, ModalField, ModalFields, modalControl, modalSelect } from '../../components/HandoffModal.js';
import { useRpcMutation } from '../../lib/useRpc.js';
import type { Branch } from '../../types/domain.js';
import { DEFAULT_TIME_ZONE, getTimeZoneOptions, STORE_TYPES } from '../branches/branchOptions.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { AdminIcon } from './AdminIcon.js';
import { AdminPage } from './AdminShell.js';
import { AdminLoading, BranchTile, Pill } from './adminUi.js';
import { BRANCH_FILTERS, filterBranches, STATUS_TONE, type BranchFilter } from './adminModel.js';
import { useAdminOrg } from './useAdminOrg.js';

/*
 * The Admin console's Branches, built to the design handoff
 * (`ShiftOS Admin.dc.html`, "BRANCHES" markup lines 251-294): every branch as
 * a card with its people, managers, supervisors and health, filterable by
 * status. Admins open new branches here too — "Add branch" (not in the
 * prototype, which predates Admins adding branches) opens the same fields the
 * onboarding wizard and the branch form collect, and the branch is granted to
 * every Admin as it is created (074).
 */

type Draft = { name: string; storeType: string; country: string; state: string; city: string; address: string; timeZone: string };
const EMPTY: Draft = { name: '', storeType: '', country: 'NG', state: '', city: '', address: '', timeZone: DEFAULT_TIME_ZONE };

function AddBranchDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (branch: Branch) => void }): React.ReactElement {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const countries = useMemo(() => getCountryOptions(), []);
  const states = useMemo(() => getStateOptions(draft.country), [draft.country]);
  const zones = useMemo(() => getTimeZoneOptions(), []);
  const create = useRpcMutation<Branch, { name: string; address: string | null; settings: Record<string, unknown> }>('create_branch', {
    invalidates: ['list_branches'],
    onSuccess: (branch) => {
      setDraft(EMPTY);
      onCreated(branch);
    },
    onError: (err) => setError(err.message)
  });
  const set = (patch: Partial<Draft>): void => setDraft((d) => ({ ...d, ...patch }));

  const submit = (): void => {
    if (!draft.name.trim()) return setError('Give the branch a name.');
    if (!draft.storeType || !draft.country || !draft.state || !draft.city.trim() || !draft.timeZone) return setError('Store type, country, state, city and time zone are required.');
    setError(null);
    create.mutate({
      name: draft.name.trim(),
      address: draft.address.trim() || null,
      settings: { storeType: draft.storeType, country: draft.country, state: draft.state, city: draft.city.trim(), timeZone: draft.timeZone }
    });
  };

  return (
    <HandoffModal
      open={open}
      title="Add a branch"
      subtitle="It appears for every Admin straight away. Managers staff it and set its hours."
      primary={create.isPending ? 'Adding…' : 'Add branch'}
      primaryDisabled={create.isPending}
      onPrimary={submit}
      onClose={onClose}
    >
      <ModalFields>
        <ModalField label="Branch name" required full>
          <input className={modalControl} value={draft.name} placeholder="e.g. Victoria Island" onChange={(e) => set({ name: e.target.value })} />
        </ModalField>
        <ModalField label="Store type" required>
          <select className={modalSelect} value={draft.storeType} onChange={(e) => set({ storeType: e.target.value })}>
            <option value="">Choose a type</option>
            {STORE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Country" required>
          <select className={modalSelect} value={draft.country} onChange={(e) => set({ country: e.target.value, state: '' })}>
            {countries.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label={getRegionLabel(draft.country)} required>
          <select className={modalSelect} value={draft.state} onChange={(e) => set({ state: e.target.value })}>
            <option value="">Choose one</option>
            {states.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="City" required>
          <input className={modalControl} value={draft.city} placeholder="e.g. Lagos" onChange={(e) => set({ city: e.target.value })} />
        </ModalField>
        <ModalField label="Street address" full>
          <input className={modalControl} value={draft.address} placeholder="e.g. 14 Adeola Odeku Street" onChange={(e) => set({ address: e.target.value })} />
        </ModalField>
        <ModalField label="Time zone" required full>
          <select className={modalSelect} value={draft.timeZone} onChange={(e) => set({ timeZone: e.target.value })}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </ModalField>
      </ModalFields>
      {error ? <p className="mx-[22px] mb-0 mt-3 text-[12.5px] font-bold text-[#C93A22]">{error}</p> : null}
    </HandoffModal>
  );
}

export default function AdminBranchesPage(): React.ReactElement {
  const navigate = useNavigate();
  const { hasPermission } = useSession();
  const { loading, orgName, branches } = useAdminOrg();
  const { toast, show, dismiss } = useScheduleToast();
  const [filter, setFilter] = useState<BranchFilter>('All');
  const [adding, setAdding] = useState(false);
  const canAdd = hasPermission('branches.create');
  const shown = filterBranches(branches, filter);
  const count = `${branches.length} ${branches.length === 1 ? 'branch' : 'branches'}`;

  return (
    <AdminPage title="Branches" subtitle={`Every branch in ${orgName}.`} attention={branches.some((b) => b.attentionNote)}>
      {loading ? (
        <AdminLoading />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 text-[20px] font-extrabold tracking-[-0.02em]">Your Branches</h1>
            <span className="text-[12.5px] text-[#857A72]">{count}</span>
            <div className="ml-auto flex flex-wrap gap-2">
              {BRANCH_FILTERS.map((label) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={label === filter}
                  onClick={() => setFilter(label)}
                  className={`h-9 cursor-pointer rounded-[10px] border border-solid px-[13px] text-[12px] font-bold [line-height:normal] ${label === filter ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'}`}
                >
                  {label}
                </button>
              ))}
              {canAdd ? (
                <button type="button" onClick={() => setAdding(true)} className="h-9 cursor-pointer rounded-[10px] border-0 bg-[#F04E17] px-[15px] text-[12px] font-bold text-white [line-height:normal]">
                  + Add branch
                </button>
              ) : null}
            </div>
          </div>

          {branches.length === 0 ? (
            <div className="flex flex-col items-center rounded-[20px] border border-solid border-[#EBE7E3] bg-white px-8 py-[52px] text-center">
              <div className="flex size-16 items-center justify-center rounded-[20px] bg-[#FDF0E9] text-[#C6420E]">
                <AdminIcon name="store" size={32} />
              </div>
              <h2 className="mb-0 mt-5 text-[21px] font-extrabold tracking-[-0.02em]">No branches yet</h2>
              <p className="mb-0 mt-2 max-w-[420px] text-[13.5px] leading-[1.55] text-[#857A72]">
                {canAdd ? 'Add your first branch — your Managers then staff it and set its hours.' : "Your organization hasn't added any branches yet. They'll appear here once set up."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
              {shown.map((b) => (
                <button
                  key={b.branch.id}
                  type="button"
                  onClick={() => navigate(`/branches/${b.branch.id}`)}
                  className="cursor-pointer rounded-[16px] border border-solid bg-white p-[18px] text-left text-[#38312B] [line-height:normal]"
                  style={{ borderColor: b.attentionNote ? '#F3C6BD' : '#EBE7E3' }}
                >
                  <div className="flex items-center gap-3">
                    <BranchTile branch={b} size={40} radius={13} icon={19} />
                    <span className="min-w-0 flex-auto">
                      <span className="block text-[14px] font-extrabold">{b.name}</span>
                      <span className="mt-0.5 block text-[11.5px] text-[#857A72]">{b.location}</span>
                    </span>
                    <Pill tone={STATUS_TONE[b.status]}>{b.status}</Pill>
                  </div>
                  <div className="mt-3.5 grid grid-cols-3 gap-2 text-left">
                    {(
                      [
                        [b.employees, 'Employees'],
                        [b.managers.length, 'Managers'],
                        [b.supervisors.length, 'Supervisors']
                      ] as const
                    ).map(([value, label]) => (
                      <span key={label}>
                        <span className="block text-[15px] font-extrabold">{value}</span>
                        <span className="block text-[10.5px] text-[#A79C93]">{label}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mb-0 mt-3.5 border-0 border-t border-solid border-[#F2EEEA] pt-3 text-[12px] font-bold" style={{ color: b.attentionNote ? '#C93A22' : '#2E9E62' }}>
                    {b.attentionNote ?? (b.status === 'Archived' ? 'Archived — its records stay available' : 'Operating normally')}
                  </p>
                </button>
              ))}
              {shown.length === 0 ? <p className="m-0 text-[12.5px] text-[#857A72]">No branches match this filter.</p> : null}
            </div>
          )}
        </div>
      )}
      <AddBranchDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(branch) => {
          setAdding(false);
          show(`${branch.name} added`);
          navigate(`/branches/${branch.id}`);
        }}
      />
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </AdminPage>
  );
}
