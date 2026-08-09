import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../auth/SessionProvider.js';
import { HomeScreen } from '../screens/HomeScreen.js';
import { MyScheduleScreen } from '../screens/MyScheduleScreen.js';
import { BranchScheduleScreen } from '../screens/BranchScheduleScreen.js';
import { ProfileScreen } from '../screens/ProfileScreen.js';
import { color } from '../theme.js';

type Tab = 'home' | 'schedule' | 'profile';

/**
 * A deliberately dependency-light bottom-tab navigator (View/Pressable, no
 * react-navigation) — avoids pulling in several native modules whose exact
 * versions can't be verified against this Expo/React Native pairing in this
 * environment. UI-002 §9/§15: bottom navigation, 4-5 items max, single-task
 * focus — this satisfies that with plain RN primitives.
 */
export function RootNavigator(): React.ReactElement {
  const { myContext } = useSession();
  const isSupervisor = !(myContext?.branchAccess.isOrgWide ?? false) && (myContext?.branchAccess.branchIds.length ?? 0) > 0;
  const [tab, setTab] = useState<Tab>('home');

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' ? <HomeScreen onNavigate={() => setTab('schedule')} /> : null}
        {tab === 'schedule' ? (isSupervisor ? <BranchScheduleScreen /> : <MyScheduleScreen />) : null}
        {tab === 'profile' ? <ProfileScreen /> : null}
      </View>
      <View style={styles.tabBar}>
        <TabButton label="Home" active={tab === 'home'} onPress={() => setTab('home')} />
        <TabButton label="Schedule" active={tab === 'schedule'} onPress={() => setTab('schedule')} />
        <TabButton label="Profile" active={tab === 'profile'} onPress={() => setTab('profile')} />
      </View>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={styles.tabButton}
    >
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: color.neutral200,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: 20
  },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 12, fontWeight: '600', color: color.neutral500 },
  tabLabelActive: { color: color.brand600 }
});
