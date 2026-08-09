import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Badge, Card, EmptyState, ErrorBanner, Screen, ScreenHeader } from '../components/primitives.js';
import { useSession } from '../auth/SessionProvider.js';
import { useActiveScheduleForBranch, useShiftsForSchedule } from '../hooks/useBranchShifts.js';
import { color, space } from '../theme.js';

/** MOBILE-003 — Branch Schedule (Supervisor, on-the-go visibility). */
export function BranchScheduleScreen(): React.ReactElement {
  const { myContext } = useSession();
  const branchId = myContext?.branchAccess.branchIds[0];
  const { activeSchedule, isLoading: scheduleLoading, error: scheduleError } = useActiveScheduleForBranch(branchId);
  const { data: shifts, isLoading: shiftsLoading, error: shiftsError } = useShiftsForSchedule(activeSchedule?.id);

  const loading = scheduleLoading || shiftsLoading;
  const error = scheduleError || shiftsError;

  return (
    <Screen>
      <ScreenHeader title="Branch Schedule" subtitle={activeSchedule ? `${activeSchedule.name} · ${activeSchedule.status}` : undefined} />
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
    </Screen>
  );
}
