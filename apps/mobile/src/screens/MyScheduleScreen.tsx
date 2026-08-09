import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Badge, Card, EmptyState, ErrorBanner, Screen, ScreenHeader } from '../components/primitives.js';
import { useActiveScheduleForBranch } from '../hooks/useBranchShifts.js';
import { useMyEmployeeRecord } from '../hooks/useMyEmployeeRecord.js';
import { useMyAssignedShifts } from '../hooks/useMySchedule.js';
import { color, space } from '../theme.js';

/** MOBILE-002 — My Schedule (Staff, WF-005). */
export function MyScheduleScreen(): React.ReactElement {
  const { employee, isLoading: employeeLoading } = useMyEmployeeRecord();
  const { activeSchedule, isLoading: scheduleLoading } = useActiveScheduleForBranch(employee?.branch_id);
  const { data: shifts, isLoading: shiftsLoading, error } = useMyAssignedShifts(activeSchedule?.id, employee?.id);

  const loading = employeeLoading || scheduleLoading || shiftsLoading;

  return (
    <Screen>
      <ScreenHeader title="My Schedule" subtitle={activeSchedule ? `${activeSchedule.start_date} – ${activeSchedule.end_date}` : undefined} />
      {employeeLoading ? (
        <ActivityIndicator />
      ) : !employee ? (
        <EmptyState title="No workforce profile linked" description="Your account isn't linked to an employee record yet. Ask your administrator for help." />
      ) : loading ? (
        <ActivityIndicator />
      ) : error ? (
        <ErrorBanner message="Unable to load your schedule right now." />
      ) : !activeSchedule ? (
        <EmptyState title="No schedule published for this week" />
      ) : (shifts ?? []).length === 0 ? (
        <EmptyState title="No shifts assigned" description="You don't have any shifts on the current schedule yet." />
      ) : (
        (shifts ?? []).map((shift) => (
          <Card key={shift.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: color.neutral900 }}>{shift.title}</Text>
              <Badge tone={shift.status === 'cancelled' ? 'error' : 'success'}>{shift.status}</Badge>
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
