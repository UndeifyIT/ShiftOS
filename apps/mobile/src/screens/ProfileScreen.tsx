import React from 'react';
import { Text } from 'react-native';
import { Button, Card, Screen, ScreenHeader } from '../components/primitives.js';
import { useSession } from '../auth/SessionProvider.js';
import { color } from '../theme.js';

/** SHARED-007 — My Profile, mobile layout (view-only; editing lives on web for now). */
export function ProfileScreen(): React.ReactElement {
  const { profile, signOut } = useSession();

  return (
    <Screen>
      <ScreenHeader title="Profile" />
      <Card>
        <Text style={{ fontSize: 16, fontWeight: '600', color: color.neutral900 }}>
          {profile ? `${profile.first_name} ${profile.last_name}` : ''}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: color.neutral500 }}>{profile?.email}</Text>
      </Card>
      <Button label="Sign out" variant="destructive" onPress={() => void signOut()} />
    </Screen>
  );
}
