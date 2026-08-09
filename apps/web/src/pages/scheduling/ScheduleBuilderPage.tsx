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
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Employee, Schedule, ScheduleStatus, ScheduleVersion, Shift } from '../../types/domain.js';
import { ShiftModal } from './ShiftModal.js';

const STATUS_TONE: Record<ScheduleStatus, 'neutral' | 'success' | 'warning'> = {
  draft: 'warning',
  published: 'success',
  archived: 'neutral'
};

function CreateScheduleForm(): React.ReactElement {
  const navigate = useNavigate();
  const { data: branches } = useRpcQuery<Branch[]>('list_branches');
  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useRpcMutation<Schedule, Record<string, unknown>>('create_schedule', {
    invalidates: ['list_schedules'],
    onSuccess: (created) => navigate(`/schedules/${created.id}`, { replace: true }),
    onError: (err) => setError(err.message)
  });

  return (
    <PageContainer>
      <PageHeader title="Create Schedule" />
      <Card className="max-w-xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!branchId || !name.trim() || !startDate || !endDate) {
              setError('Please fill in all fields.');
              return;
            }
            setError(null);
            createMutation.mutate({ branchId, name: name.trim(), startDate, endDate });
          }}
          className="flex flex-col gap-4"
        >
          <FormField label="Branch" htmlFor="branchId" required>
            {(fieldProps) => (
              <Select {...fieldProps} value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="Select a branch" options={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))} />
            )}
          </FormField>
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
          {error ? <InlineError message={error} /> : null}
          <Button type="submit" loading={createMutation.isPending} className="self-start">
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
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [changesSummary, setChangesSummary] = useState('');

  const { data: schedule, isLoading, error, refetch } = useRpcQuery<Schedule>('get_schedule', scheduleId ? { scheduleId } : undefined, {
    enabled: !!scheduleId && canRead
  });
  const { data: shifts, isLoading: shiftsLoading } = useRpcQuery<Shift[]>(
    'list_shifts_for_schedule',
    scheduleId ? { scheduleId } : undefined,
    { enabled: !!scheduleId && canRead && tab === 'shifts' }
  );
  const { data: versions, isLoading: versionsLoading } = useRpcQuery<ScheduleVersion[]>(
    'list_schedule_versions',
    scheduleId ? { scheduleId } : undefined,
    { enabled: !!scheduleId && canRead && tab === 'versions' }
  );
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: !!scheduleId && canRead });

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
        description={`${schedule.start_date} – ${schedule.end_date}`}
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
        <>
          {canCreateShift ? (
            <div className="mb-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingShift(null);
                  setShiftModalOpen(true);
                }}
              >
                Add Shift
              </Button>
            </div>
          ) : null}
          <DataTable<Shift>
            columns={[
              { key: 'title', header: 'Title', primary: true, render: (s) => s.title },
              { key: 'date', header: 'Date', render: (s) => s.shift_date },
              { key: 'time', header: 'Time', render: (s) => `${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}` },
              { key: 'status', header: 'Status', render: (s) => <Badge tone={s.status === 'cancelled' ? 'error' : 'neutral'}>{s.status}</Badge> }
            ]}
            rows={shifts ?? []}
            rowKey={(s) => s.id}
            loading={shiftsLoading}
            onRowClick={(s) => {
              setEditingShift(s);
              setShiftModalOpen(true);
            }}
            emptyTitle="No shifts yet"
            emptyDescription="At least one shift is required before this schedule can be published."
            emptyAction={canCreateShift ? { label: 'Add Shift', onClick: () => setShiftModalOpen(true) } : undefined}
          />
        </>
      ) : (
        <DataTable<ScheduleVersion>
          columns={[
            { key: 'version', header: 'Version', primary: true, render: (v) => `v${v.version_number}` },
            { key: 'summary', header: 'Changes', render: (v) => v.changes_summary ?? '—' },
            { key: 'published_at', header: 'Published', render: (v) => new Date(v.created_at).toLocaleString() }
          ]}
          rows={versions ?? []}
          rowKey={(v) => v.id}
          loading={versionsLoading}
          emptyTitle="Not published yet"
          emptyDescription="This schedule has no publish history yet."
        />
      )}

      {shiftModalOpen ? (
        <ShiftModal
          open={shiftModalOpen}
          onClose={() => setShiftModalOpen(false)}
          scheduleId={scheduleId}
          shift={editingShift}
          employees={(employees ?? []).filter((e) => e.branch_id === schedule.branch_id)}
        />
      ) : null}

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
