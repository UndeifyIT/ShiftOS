import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  ConfirmationDialog,
  DataTable,
  ErrorState,
  FormField,
  InlineError,
  Input,
  PageContainer,
  PageHeader,
  PermissionDenied,
  Select,
  SkeletonRows,
  Tabs,
  Textarea
} from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Schedule, ScheduleStatus, ScheduleVersion } from '../../types/domain.js';
import { ScheduleGrid } from './grid/ScheduleGrid.js';

const STATUS_TONE: Record<ScheduleStatus, 'neutral' | 'success' | 'warning'> = {
  draft: 'warning',
  published: 'success',
  archived: 'neutral'
};

function CreateScheduleForm(): React.ReactElement {
  const navigate = useNavigate();
  // Non-null only when this caller has exactly one accessible branch AND is
  // not org-wide (Task 1's shared single-branch concept) — in that case the
  // branch field is hidden entirely and that branch is submitted
  // automatically, same idiom as InvitationsPage's InviteMemberForm and
  // EmployeeFormPage. This is NOT the same semantics as TasksPage.tsx's
  // `requireBranchPicker` (raw branch count, no org-wide distinction) — see
  // useDefaultBranchId's own doc comment for the exact divergence; the two
  // are not interchangeable.
  const singleBranchId = useDefaultBranchId();
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: singleBranchId === null });
  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copyFromScheduleId, setCopyFromScheduleId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resolvedBranchIdForCopy = singleBranchId ?? branchId;
  const { data: candidateSchedules } = useRpcQuery<Schedule[]>(
    'list_schedules',
    resolvedBranchIdForCopy ? { branchId: resolvedBranchIdForCopy } : undefined,
    { enabled: Boolean(resolvedBranchIdForCopy) }
  );

  const duplicateMutation = useRpcMutation<{ copiedCount: number }, { sourceScheduleId: string; targetScheduleId: string }>(
    'duplicate_schedule_shifts',
    { invalidates: ['list_shifts_for_schedule', 'list_assignments_for_schedule'], onError: (err) => setError(err.message) }
  );

  const createMutation = useRpcMutation<Schedule, Record<string, unknown>>('create_schedule', {
    invalidates: ['list_schedules'],
    onSuccess: (created) => {
      if (copyFromScheduleId) {
        duplicateMutation.mutate(
          { sourceScheduleId: copyFromScheduleId, targetScheduleId: created.id },
          { onSettled: () => navigate(`/schedules/${created.id}`, { replace: true }) }
        );
      } else {
        navigate(`/schedules/${created.id}`, { replace: true });
      }
    },
    onError: (err) => setError(err.message)
  });

  return (
    <PageContainer>
      <PageHeader title="Create Schedule" />
      <Card className="max-w-xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const resolvedBranchId = singleBranchId ?? branchId;
            if (!resolvedBranchId || !name.trim() || !startDate || !endDate) {
              setError('Please fill in all fields.');
              return;
            }
            setError(null);
            createMutation.mutate({ branchId: resolvedBranchId, name: name.trim(), startDate, endDate });
          }}
          className="flex flex-col gap-4"
        >
          {singleBranchId === null ? (
            <FormField label="Branch" htmlFor="branchId" required>
              {(fieldProps) => (
                <Select {...fieldProps} value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="Select a branch" options={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))} />
              )}
            </FormField>
          ) : null}
          <FormField label="Schedule name" htmlFor="scheduleName" required>
            {(fieldProps) => <Input {...fieldProps} value={name} onChange={(e) => setName(e.target.value)} placeholder="Week of Aug 11" />}
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start date" htmlFor="startDate" required>
              {(fieldProps) => <Input {...fieldProps} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />}
            </FormField>
            <FormField label="End date" htmlFor="endDate" required>
              {(fieldProps) => <Input {...fieldProps} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />}
            </FormField>
          </div>
          <FormField label="Copy from (optional)" htmlFor="copyFromScheduleId">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={copyFromScheduleId}
                onChange={(e) => setCopyFromScheduleId(e.target.value)}
                placeholder="Start from scratch"
                options={(candidateSchedules ?? []).map((s) => ({
                  value: s.id,
                  label: `${s.name} (${new Date(`${s.start_date}T00:00:00`).toLocaleDateString()})`
                }))}
              />
            )}
          </FormField>
          {error ? <InlineError message={error} /> : null}
          <Button type="submit" loading={createMutation.isPending || duplicateMutation.isPending} className="self-start">
            Create schedule
          </Button>
        </form>
      </Card>
    </PageContainer>
  );
}

/** WEB-012 (Schedule Builder) + WEB-013 (Version History tab) + WEB-014 (Publish Confirmation modal). */
export default function ScheduleBuilderPage(): React.ReactElement {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { hasPermission } = useSession();
  const canRead = hasPermission('schedules.read');
  const canCreateShift = hasPermission('shifts.create');
  const canPublish = hasPermission('schedules.publish');

  const [tab, setTab] = useState<'shifts' | 'versions'>('shifts');
  const [publishOpen, setPublishOpen] = useState(false);
  const [changesSummary, setChangesSummary] = useState('');

  const { data: schedule, isLoading, error, refetch } = useRpcQuery<Schedule>('get_schedule', scheduleId ? { scheduleId } : undefined, {
    enabled: !!scheduleId && canRead
  });
  const { data: versions, isLoading: versionsLoading } = useRpcQuery<ScheduleVersion[]>(
    'list_schedule_versions',
    scheduleId ? { scheduleId } : undefined,
    { enabled: !!scheduleId && canRead && tab === 'versions' }
  );

  const publishMutation = useRpcMutation<Schedule, { scheduleId: string; changesSummary?: string }>('publish_schedule', {
    invalidates: ['get_schedule', 'list_schedule_versions', 'list_schedules'],
    onSuccess: () => setPublishOpen(false)
  });

  if (!scheduleId) {
    return <CreateScheduleForm />;
  }

  if (!canRead) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <SkeletonRows rows={5} />
      </PageContainer>
    );
  }

  if (error || !schedule) {
    return (
      <PageContainer>
        <ErrorState description={(error as Error | undefined)?.message} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={schedule.name}
        description={`${new Date(schedule.start_date).toLocaleDateString()} – ${new Date(schedule.end_date).toLocaleDateString()}`}
        actions={
          <>
            <Badge tone={STATUS_TONE[schedule.status]}>{schedule.status}</Badge>
            {canPublish ? (
              <Button onClick={() => setPublishOpen(true)}>{schedule.status === 'published' ? 'Republish' : 'Publish'}</Button>
            ) : null}
          </>
        }
      />

      <Tabs
        items={[
          { key: 'shifts', label: 'Shifts' },
          { key: 'versions', label: 'Version History' }
        ]}
        activeKey={tab}
        onChange={(key) => setTab(key as 'shifts' | 'versions')}
        className="mb-5"
      />

      {tab === 'shifts' ? (
        <ScheduleGrid scheduleId={scheduleId} schedule={schedule} canEdit={canCreateShift && schedule.status !== 'archived'} />
      ) : (
        <DataTable<ScheduleVersion>
          columns={[
            { key: 'version', header: 'Version', primary: true, render: (v) => `v${v.version}` },
            { key: 'summary', header: 'Changes', render: (v) => v.changes_summary ?? '—' },
            { key: 'published_at', header: 'Published', render: (v) => new Date(v.published_at).toLocaleString() }
          ]}
          rows={versions ?? []}
          rowKey={(v) => v.id}
          loading={versionsLoading}
          emptyTitle="Not published yet"
          emptyDescription="This schedule has no publish history yet."
        />
      )}

      <ConfirmationDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onConfirm={() => publishMutation.mutate({ scheduleId, changesSummary: changesSummary.trim() || undefined })}
        title={schedule.status === 'published' ? 'Republish this schedule?' : 'Publish this schedule?'}
        description="Everyone assigned will be able to see it. Publishing records a new version — nothing is overwritten."
        confirmLabel="Publish"
        loading={publishMutation.isPending}
      >
        <FormField label="What changed (optional)" htmlFor="changesSummary">
          {(fieldProps) => <Textarea {...fieldProps} value={changesSummary} onChange={(e) => setChangesSummary(e.target.value)} />}
        </FormField>
      </ConfirmationDialog>
    </PageContainer>
  );
}
