import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from './src/auth/SessionProvider.js';
import { SignInScreen } from './src/screens/SignInScreen.js';
import { NoAccessScreen } from './src/screens/NoAccessScreen.js';
import { RootNavigator } from './src/navigation/RootNavigator.js';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function Root(): React.ReactElement {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (status === 'unauthenticated') {
    return <SignInScreen />;
  }
  if (status !== 'ready') {
    return <NoAccessScreen />;
  }
  return <RootNavigator />;
}

export default function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style="dark" />
        <Root />
      </SessionProvider>
    </QueryClientProvider>
  );
}
