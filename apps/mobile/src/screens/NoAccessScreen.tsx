import React from 'react';
import { Text } from 'react-native';
import { Button, EmptyState, Screen, ScreenHeader } from '../components/primitives.js';
import { useSession } from '../auth/SessionProvider.js';

/**
 * Covers the 'no-profile' / 'no-organization' / 'error' session states
 * honestly. Mobile intentionally has no organization-bootstrap flow
 * (that's WEB-001, a desktop-appropriate admin action per the frontend
 * foundation doc's web/mobile split) — a mobile user who reaches this
 * screen genuinely needs an administrator to finish setting up their access.
 */
export function NoAccessScreen(): React.ReactElement {
  const { status, errorMessage, signOut, refresh } = useSession();

  const copy =
    status === 'no-profile'
      ? { title: 'Finish setting up your account', description: 'Sign in on the web to complete your profile, then come back here.' }
      : status === 'no-organization'
        ? { title: 'No organization access yet', description: 'Ask your administrator to confirm your invitation, then try again.' }
        : { title: 'Something went wrong', description: errorMessage ?? 'Please try again.' };

  return (
    <Screen>
      <ScreenHeader title="ShiftOS" />
      <EmptyState title={copy.title} description={copy.description} />
      <Text style={{ height: 12 }} />
      <Button label="Try again" variant="secondary" onPress={() => void refresh()} />
      <Text style={{ height: 8 }} />
      <Button label="Sign out" variant="destructive" onPress={() => void signOut()} />
    </Screen>
  );
}
