import React from 'react';
import { Text } from 'react-native';
import { Button, Card, Screen, ScreenHeader } from '../components/primitives.js';
import { useSession } from '../auth/SessionProvider.js';
import { color } from '../theme.js';

/** MOBILE-001 — Home / Today: role-adaptive daily overview (Supervisor vs. Staff). */
export function HomeScreen({ onNavigate }: { onNavigate: (tab: 'schedule') => void }): React.ReactElement {
  const { profile, myContext } = useSession();
  const isSupervisor = !(myContext?.branchAccess.isOrgWide ?? false) && (myContext?.branchAccess.branchIds.length ?? 0) > 0;

  return (
    <Screen>
      <ScreenHeader title={`Hi${profile ? `, ${profile.first_name}` : ''}`} subtitle="Here's today at a glance." />
      <Card>
        <Text style={{ fontSize: 15, fontWeight: '600', color: color.neutral900 }}>
          {isSupervisor ? "Today's branch schedule" : 'Your upcoming shifts'}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: color.neutral500 }}>
          {isSupervisor ? 'Review who is on shift and when.' : 'See what you are scheduled for this week.'}
        </Text>
        <Text style={{ height: 12 }} />
        <Button label={isSupervisor ? 'View branch schedule' : 'View my schedule'} onPress={() => onNavigate('schedule')} />
      </Card>
    </Screen>
  );
}
