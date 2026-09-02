import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Badge, Button, Card, EmptyState, ErrorBanner, Screen, ScreenHeader } from '../components/primitives.js';
import { useSession } from '../auth/SessionProvider.js';
import { useActiveScheduleForBranch, useShiftsForSchedule } from '../hooks/useBranchShifts.js';
import { useRpcQuery } from '../lib/useRpc.js';
import { color, space } from '../theme.js';

interface BranchOption {
  id: string;
  name: string;
}

/**
 * MOBILE-003 — Branch Schedule (Supervisor, on-the-go visibility).
 *
 * Previously took branchAccess.branchIds[0] unconditionally, which silently
 * showed the wrong branch's schedule to any genuinely multi-branch user
 * (org-wide roles, or a Supervisor/Admin granted more than one branch) — a
 * real correctness bug, not just a UX gap (see
 * docs/superpowers/specs/2026-09-03-onboarding-ux-audit-design.md §2 Phase
 * 10). branchAccess.singleBranchId (computed server-side, non-null only for
 * a caller scoped to exactly one branch) now drives the default; anyone else
 * gets an explicit picker instead of a silent guess.
 */
export function BranchScheduleScreen(): React.ReactElement {
  const { myContext } = useSession();
  const singleBranchId = myContext?.branchAccess.singleBranchId ?? null;
  const hasAnyBranchAccess = (myContext?.branchAccess.branchIds.length ?? 0) > 0;
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);

  const branchId = singleBranchId ?? selectedBranchId;
  const needsBranchPicker = hasAnyBranchAccess && singleBranchId === null && !selectedBranchId;

  const branchesQuery = useRpcQuery<BranchOption[]>('list_branches', undefined, { enabled: needsBranchPicker });
  const { activeSchedule, isLoading: scheduleLoading, error: scheduleError } = useActiveScheduleForBranch(branchId);
  const { data: shifts, isLoading: shiftsLoading, error: shiftsError } = useShiftsForSchedule(activeSchedule?.id);

  const loading = scheduleLoading || shiftsLoading;
  const error = scheduleError || shiftsError;

  return (
    <Screen>
      <ScreenHeader title="Branch Schedule" subtitle={activeSchedule ? `${activeSchedule.name} · ${activeSchedule.status}` : undefined} />
      {!hasAnyBranchAccess ? (
        <EmptyState title="No branch access" description="You don't have access to any branch yet." />
      ) : needsBranchPicker ? (
        branchesQuery.isLoading ? (
          <ActivityIndicator />
        ) : branchesQuery.error ? (
          <ErrorBanner message="Unable to load your branches right now." />
        ) : (
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '600', color: color.neutral900, marginBottom: space.md }}>Choose a branch</Text>
            {(branchesQuery.data ?? []).map((branch) => (
              <View key={branch.id} style={{ marginBottom: space.sm }}>
                <Button label={branch.name} variant="secondary" onPress={() => setSelectedBranchId(branch.id)} />
              </View>
            ))}
          </Card>
        )
      ) : (
        <>
          {!singleBranchId && selectedBranchId ? (
            <Pressable onPress={() => setSelectedBranchId(undefined)} style={{ marginBottom: space.md }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: color.brand500 }}>Change branch</Text>
            </Pressable>
          ) : null}
          {loading ? (
            <ActivityIndicator />
          ) : error ? (
            <ErrorBanner message="Unable to load the schedule right now." />
          ) : !activeSchedule ? (
            <EmptyState title="No schedules created for this period" description="Create one from the ShiftOS web app to see it here." />
          ) : (shifts ?? []).length === 0 ? (
            <EmptyState title="No shifts yet" />
          ) : (
            (shifts ?? []).map((shift) => (
              <Card key={shift.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: color.neutral900 }}>{shift.title}</Text>
                  <Badge tone={shift.status === 'cancelled' ? 'error' : 'neutral'}>{shift.status}</Badge>
                </View>
                <Text style={{ marginTop: space.xs, fontSize: 13, color: color.neutral500 }}>
                  {shift.shift_date} · {shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}
                </Text>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}
