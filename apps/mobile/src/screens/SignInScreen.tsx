import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, ErrorBanner, Screen } from '../components/primitives.js';
import { useSession } from '../auth/SessionProvider.js';
import { color, space } from '../theme.js';

/** SHARED-001 — Sign In, mobile layout (WF-001). */
export function SignInScreen(): React.ReactElement {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) setError(signInError);
  };

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={styles.brandName}>ShiftOS</Text>
      </View>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>Access your schedule and team tools.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          accessibilityLabel="Email"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          accessibilityLabel="Password"
        />
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      <Button label="Sign In" onPress={() => void handleSubmit()} loading={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: space.xl },
  logo: { width: 32, height: 32, borderRadius: 8, backgroundColor: color.brand500, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontWeight: '700' },
  brandName: { fontSize: 18, fontWeight: '700', color: color.neutral900 },
  title: { fontSize: 22, fontWeight: '700', color: color.neutral900 },
  subtitle: { fontSize: 14, color: color.neutral500, marginTop: 4, marginBottom: space.xl },
  field: { marginBottom: space.md },
  label: { fontSize: 13, fontWeight: '600', color: color.neutral900, marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: color.neutral300,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    color: color.neutral900
  }
});
